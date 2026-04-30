import anthropic
import json
import os
from datetime import datetime

from ..calculations.chart import calculate_full_chart
from ..calculations.dasha import calculate_dasha_periods, get_current_dasha
from ..calculations.yogas import detect_yogas
from ..calculations.numerology import calculate_all_numerology
from ..calculations.transits import get_current_transits
from .remedy_matrix import get_situational_remedies
from ..persistence import insert_reading, upsert_user_chart
from .computed_facts import build_computed_facts
from .prompts import MASTER_SYSTEM_PROMPT, DAILY_READING_PROMPT
from .response_validate import extract_json_object, validate_reading_payload


def _deterministic_reading_json(user_intake: dict, computed_facts: dict, remedies: dict) -> dict:
    """Return a valid reading-shaped dict without calling the model (dev / no API key)."""
    dasha = computed_facts.get("vimshottari_dasha") or {}
    maha = (dasha.get("current_maha") or {}).get("lord", "—")
    antar = (dasha.get("current_antar") or {}).get("lord", "—")
    concern = user_intake.get("main_concern", "general")
    free = computed_facts.get("remedy_candidates", {}).get("tier_free") or []
    free_blurb = free[0]["detail"] if free else "Establish a calm daily mantra practice."
    moon_row = next((p for p in computed_facts["chart_d1"]["planets"] if p["name"] == "Moon"), None)
    moon_sign = moon_row["sign"] if moon_row else "your Moon sign"

    return {
        "opening": (
            f"Your chart anchors identity in {computed_facts['chart_d1']['lagna']['sign']} Lagna "
            f"with Moon in {moon_sign}."
        ),
        "current_season": f"Vimshottari highlights Mahadasha of {maha} with Antardasha of {antar}. Use this window for disciplined progress.",
        "concern_response": f"Regarding {concern}: lean on the planetary emphasis already listed in computed_facts—avoid guessing beyond those facts.",
        "guidance": "Stay consistent with small daily actions; align effort with the strongest bindu areas in Ashtakavarga when choosing timing.",
        "remedies": {
            "free": {
                "type": "mantra",
                "title": "Grounding practice",
                "description": free_blurb,
                "shastra_basis": "Mantra Mahodadhi — bija vibration discipline",
            },
            "affordable": {
                "type": "daan",
                "title": "Saturday/lunar discipline",
                "description": "Offer simple food or grains according to your planetary emphasis—keep charity symbolic if abroad.",
                "shastra_basis": "Brihat Samhita — proportionate charity",
            },
            "elevated": None,
        },
        "closing": "Agency stays with you—the chart sketches weather, you still steer the boat.",
        "shastra_citations": ["BPHS — graha bala principles"],
        "frameworks_used": ["Parashari", "Vimshottari", "Ashtakavarga"],
    }


async def generate_reading(user_intake: dict, geo_data: dict) -> dict:
    """Compute the chart bundle, request a JSON reading from the model, validate, then persist."""
    tz_name = geo_data.get("timezone_str") or "UTC"

    chart = calculate_full_chart(
        name=user_intake["name"],
        dob=user_intake["dob"],
        tob=user_intake.get("tob") or "12:00",
        place=user_intake["place"],
        lat=geo_data["lat"],
        lon=geo_data["lon"],
        tz_name=tz_name,
    )

    all_dashas = calculate_dasha_periods(
        dob=user_intake["dob"],
        moon_longitude=chart["planets"]["Moon"]["longitude"],
        moon_nakshatra=chart["planets"]["Moon"]["nakshatra"],
    )
    current_dasha = get_current_dasha(all_dashas)

    yogas = detect_yogas(chart)
    numerology = calculate_all_numerology(full_name=user_intake["name"], dob=user_intake["dob"])
    transits = get_current_transits(chart)

    remedy_planet = current_dasha.get("antardasha") or current_dasha.get("mahadasha") or "Saturn"
    remedies = get_situational_remedies(
        planet=remedy_planet,
        age=user_intake["age"],
        situation=user_intake["financial_situation"],
        location_type=user_intake["location_type"],
        financial_level=user_intake.get("financial_level", "medium"),
    )

    computed_facts = build_computed_facts(
        user_intake=user_intake,
        geo_data=geo_data,
        chart=chart,
        all_dashas=all_dashas,
        current_dasha=current_dasha,
        yogas=yogas,
        numerology=numerology,
        transits=transits,
        remedies=remedies,
    )

    chart_summary = {
        "lagna": chart["lagna"]["sign"],
        "moon_sign": chart["moon_sign"],
        "moon_nakshatra": chart["moon_nakshatra"],
        "current_dasha": current_dasha,
        "active_yogas": [y["name"] for y in yogas],
        "sade_sati": transits["sade_sati"],
    }

    user_msg = json.dumps(
        {
            "computed_facts": computed_facts,
            "note": "Respond ONLY with the JSON object specified in the system prompt.",
        },
        ensure_ascii=False,
        default=str,
    )

    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if not anthropic_key:
        reading_json = _deterministic_reading_json(user_intake, computed_facts, remedies)
        out = {
            "reading": reading_json,
            "reading_text": json.dumps(reading_json, ensure_ascii=False),
            "chart_summary": chart_summary,
            "remedies": remedies,
            "all_dashas": all_dashas[:5],
            "computed_facts": computed_facts,
            "generated_at": datetime.now().isoformat(),
            "validation": {"skipped": True, "reason": "no ANTHROPIC_API_KEY"},
        }
        uid = user_intake.get("user_id")
        if uid:
            upsert_user_chart(
                uid,
                chart,
                computed_facts=computed_facts,
                preferred_language=user_intake.get("language"),
            )
            insert_reading(uid, reading_json, computed_facts)
        return out

    client = anthropic.Anthropic(api_key=anthropic_key)
    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=MASTER_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_msg}],
    )
    raw_text = response.content[0].text
    reading_json = extract_json_object(raw_text)
    if reading_json is None:
        reading_json = _deterministic_reading_json(user_intake, computed_facts, remedies)
        validation_ok, issues = False, ["model_output_not_json"]
    else:
        validation_ok, issues = validate_reading_payload(reading_json, computed_facts)

    out = {
        "reading": reading_json,
        "reading_text": json.dumps(reading_json, ensure_ascii=False),
        "chart_summary": chart_summary,
        "remedies": remedies,
        "all_dashas": all_dashas[:5],
        "computed_facts": computed_facts,
        "generated_at": datetime.now().isoformat(),
        "validation": {"ok": validation_ok, "issues": issues, "raw_model_sample": raw_text[:500]},
    }

    uid = user_intake.get("user_id")
    if uid:
        upsert_user_chart(
            uid,
            chart,
            computed_facts=computed_facts,
            preferred_language=user_intake.get("language"),
        )
        insert_reading(uid, reading_json, computed_facts)

    return out


async def generate_daily_reading(chart: dict, language: str = "en") -> str:
    """Today's personalized micro-reading (text)."""
    transits = get_current_transits(chart)
    today_moon = transits["positions"]["Moon"]

    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    first_name = chart.get("name", "Dear").split()[0] or "Dear"

    if not anthropic_key:
        house_m = today_moon.get("house_from_moon", "Unknown")
        house_l = today_moon.get("house_from_lagna", "Unknown")
        bindu = today_moon.get("bindu_score", "N/A")
        strength = today_moon.get("transit_strength", "N/A")
        return (
            f"{first_name} ji, aaj Moon ka focus natal Moon/Lagna ke context me house {house_m} me activate ho raha hai. "
            f"Aaj ka ek specific action: {('journal your emotions for 10 minutes' if language.startswith('en') else 'apni emotions 10 minute note karo')}. "
            f"Mindful: house {house_l} matters today (Ashtakavarga bindu {bindu}, {strength})."
        )

    client = anthropic.Anthropic(api_key=anthropic_key)

    context = f"""
User's natal chart:
Moon Sign: {chart['moon_sign']} in {chart['moon_nakshatra']} Nakshatra
Lagna: {chart['lagna']['sign']}

Today's Moon:
Sign: {today_moon['sign']}
Nakshatra: {today_moon['nakshatra']}
House from natal Moon: {today_moon['house_from_moon']}
House from Lagna: {today_moon['house_from_lagna']}
Bindu score: {today_moon.get('bindu_score', 'N/A')}
Date: {transits['date']}

User's first name: {first_name}
Language: {language}
"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=200,
        system=DAILY_READING_PROMPT.format(language=language),
        messages=[{"role": "user", "content": context}],
    )

    return response.content[0].text
