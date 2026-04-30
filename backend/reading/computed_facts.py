"""Assemble the canonical `computed_facts` JSON for the LLM user message."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from ..calculations.ayanamsa import get_lahiri_ayanamsa_degrees
from ..calculations.ashtakavarga_agg import sarvashtakavarga_per_house, sav_total, transit_bindu_for_sign
from ..calculations.chart import angular_distance_deg
from ..calculations.dasha import vimshottari_period_blocks
from ..calculations.doshas import assemble_doshas
from ..calculations.jaimini import jaimini_snapshot
from ..calculations.kp import kp_stub
from ..calculations.panchang import panchang_now
from ..calculations.remedy_engine import build_remedy_candidates
from ..calculations.shadbala import estimate_shadbala_virupas
from ..calculations.tajika import tajika_stub
from ..calculations.vargas import navamsa_summary_for_chart, vargas_summary_stub


LOCATION_MAP = {
    "home": "urban_india",
    "away": "urban_india",
    "abroad": "foreign_residence",
}


FINANCIAL_MAP = {
    "low": "low",
    "medium": "middle",
    "high": "high",
    "struggling": "low",
}


YOGA_REF = {
    "Gajakesari Yoga": "BPHS Ch.36",
    "Raj Yoga": "BPHS Ch.41",
    "Budhaditya Yoga": "Phaladeepika 6",
    "Hamsa Yoga (Panch Mahapurush)": "BPHS Ch.75",
    "Malavya Yoga (Panch Mahapurush)": "BPHS Ch.75",
    "Ruchaka Yoga (Panch Mahapurush)": "BPHS Ch.75",
    "Bhadra Yoga (Panch Mahapurush)": "BPHS Ch.75",
    "Shasha Yoga (Panch Mahapurush)": "BPHS Ch.75",
    "Dhana Yoga": "Phaladeepika 6",
    "Vipreet Raj Yoga": "BPHS Ch.47",
    "Kaal Sarp Yoga": "Phaladeepika 6",
    "Manglik Dosha": "Classical matching texts",
    "Neecha Bhanga Raj Yoga": "BPHS Ch.45",
    "Chandra Mangal Yoga": "BPHS Ch.39",
    "Guru Chandal Yoga": "Phaladeepika 6",
}


def _lang_norm(code: str) -> str:
    c = (code or "en").lower()
    if c in ("hi", "hindi"):
        return "hindi"
    if c in ("hinglish", "hi-en"):
        return "hinglish"
    return "english"


def _effect_keywords(effect: str | None) -> list[str]:
    if not effect:
        return []
    chunks = effect.replace("—", ",").split(",")
    return [c.strip() for c in chunks if c.strip()][:8]


def _notable_transit_aspects(chart: dict, transits: dict) -> list[str]:
    notes = []
    natal_sun = chart["planets"]["Sun"]["longitude"]
    natal_moon = chart["planets"]["Moon"]["longitude"]
    tp = transits["positions"]
    if angular_distance_deg(tp["Saturn"]["longitude"], natal_sun) >= 165:
        notes.append("Saturn opposing natal Sun")
    if angular_distance_deg(tp["Saturn"]["longitude"], natal_moon) >= 165:
        notes.append("Saturn opposing natal Moon")
    if angular_distance_deg(tp["Jupiter"]["longitude"], natal_moon) <= 15:
        notes.append("Jupiter conjunct natal Moon (approx)")
    return notes


def build_computed_facts(
    user_intake: dict[str, Any],
    geo_data: dict[str, Any],
    chart: dict[str, Any],
    all_dashas: list,
    current_dasha: dict,
    yogas: list[dict],
    numerology: dict,
    transits: dict,
    remedies: dict,
) -> dict[str, Any]:
    birth = chart.get("birth_meta") or {}
    tz_name = geo_data.get("timezone_str") or "UTC"

    planets_out = []
    for pname, prow in chart["planets"].items():
        if pname in ("Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"):
            vir, meets = estimate_shadbala_virupas(pname, prow)
        else:
            vir, meets = None, None
        planets_out.append(
            {
                "name": pname,
                "sign": prow["sign"],
                "degrees": prow["degree_in_sign"],
                "house": prow["house"],
                "nakshatra": prow["nakshatra"],
                "pada": prow["pada"],
                "retrograde": prow.get("retrograde", False),
                "combust": prow.get("combust", False),
                "dignity": prow.get("dignity", prow.get("strength")),
                "shadbala_total_rupas": vir,
                "shadbala_meets_minimum": meets,
            }
        )

    nav = navamsa_summary_for_chart(chart["planets"], chart["lagna"]["longitude"])
    vsum = vargas_summary_stub(chart)

    dasha_block = vimshottari_period_blocks(all_dashas, current_dasha)

    yogas_present = []
    for y in yogas:
        if not y.get("present", True):
            continue
        strength = y.get("strength") or "moderate"
        if strength in ("very_high", "high"):
            sk = "strong"
        elif strength in ("challenging", "medium"):
            sk = "moderate"
        else:
            sk = "weak"
        yogas_present.append(
            {
                "name": y["name"].replace(" Yoga", "").replace(" (Panch Mahapurush)", ""),
                "strength": sk,
                "effect_keywords": _effect_keywords(y.get("effect")),
                "shastra_ref": YOGA_REF.get(y["name"], "Classical Parashari canon"),
            }
        )

    doshas = assemble_doshas(chart, transits)
    av = transits.get("ashtakavarga") or {}
    sav12 = sarvashtakavarga_per_house(av)
    sat_sign = transits["positions"]["Saturn"]["sign"]
    sbind = transit_bindu_for_sign(av, "Saturn", sat_sign)

    sat_house_moon = transits["positions"]["Saturn"].get("house_from_moon")
    jup_house_moon = transits["positions"]["Jupiter"].get("house_from_moon")

    transits_today = {
        "as_of_iso": datetime.now().isoformat(),
        "saturn": {
            "sign": sat_sign,
            "house_from_natal_moon": sat_house_moon,
            "is_sade_sati": (transits.get("sade_sati") or {}).get("active", False),
            "phase": (transits.get("sade_sati") or {}).get("phase"),
        },
        "jupiter": {
            "sign": transits["positions"]["Jupiter"]["sign"],
            "house_from_natal_moon": jup_house_moon,
            "is_favorable_per_chandra": (jup_house_moon in (1, 5, 9)) if jup_house_moon else None,
        },
        "rahu": {
            "sign": transits["positions"]["Rahu"]["sign"],
            "house_from_natal_moon": transits["positions"]["Rahu"].get("house_from_moon"),
        },
        "notable_aspects_to_natal": _notable_transit_aspects(chart, transits),
    }

    try:
        panchang = panchang_now(geo_data["lat"], geo_data["lon"], tz_name)
    except Exception:
        panchang = {"notes": "Panchanga unavailable"}

    ch = numerology.get("chaldean") or {}
    remedy_candidates = build_remedy_candidates(chart, remedies, user_intake.get("main_concern", "general"))

    return {
        "framework": {
            "ayanamsa": "Lahiri",
            "house_system": "whole_sign",
            "dasha_system": "Vimshottari",
            "ayanamsa_value_degrees": round(get_lahiri_ayanamsa_degrees(chart["julian_day"]), 4),
        },
        "birth": {
            "name": user_intake.get("name"),
            "dob_iso": birth.get("dob_iso"),
            "tob_local": birth.get("tob_local"),
            "place": birth.get("place") or user_intake.get("place"),
            "lat": geo_data.get("lat"),
            "lon": geo_data.get("lon"),
            "tz_name": tz_name,
            "tz_offset_at_birth_minutes": birth.get("tz_offset_at_birth_minutes"),
            "dst_at_birth_applied": birth.get("dst_at_birth_applied"),
        },
        "situation_context": {
            "age": user_intake.get("age"),
            "location_type": LOCATION_MAP.get(user_intake.get("location_type", "home"), "urban_india"),
            "location_type_raw": user_intake.get("location_type"),
            "financial_situation": user_intake.get("financial_situation"),
            "financial_level": FINANCIAL_MAP.get(user_intake.get("financial_level", "medium"), "middle"),
            "main_concern": user_intake.get("main_concern"),
            "specific_question": user_intake.get("specific_question"),
            "language": _lang_norm(user_intake.get("language", "en")),
        },
        "chart_d1": {
            "lagna": {
                "sign": chart["lagna"]["sign"],
                "degrees": chart["lagna"]["degree"],
                "nakshatra": chart["lagna"]["nakshatra"],
                "pada": chart["lagna"]["pada"],
            },
            "planets": planets_out,
            "houses": chart.get("houses", []),
        },
        "chart_d9_navamsa": {
            "lagna_sign": nav["lagna_sign"],
            "planets_summary": nav["planets_summary"],
        },
        "vargas_summary": vsum,
        "vimshottari_dasha": dasha_block,
        "jaimini": jaimini_snapshot(chart),
        "yogas_present": yogas_present,
        "doshas_present": doshas,
        "ashtakavarga": {
            "sav_total": sav_total(sav12),
            "sav_per_house": sav12,
            "current_transit_bindus": {
                "saturn_in_sign": sat_sign,
                "saturn_bindus_there": sbind,
                "verdict": "productive" if sbind >= 4 else "mixed" if sbind >= 3 else "sparse",
            },
        },
        "transits_today": transits_today,
        "panchang_today": panchang,
        "numerology": {
            "mulank": ch.get("mulank"),
            "mulank_planet": ch.get("mulank_planet"),
            "bhagyank": ch.get("bhagyank"),
            "bhagyank_planet": ch.get("bhagyank_planet"),
            "naamank": numerology.get("naamank"),
        },
        "varshaphal_current_year": tajika_stub(),
        "kp": kp_stub(),
        "remedy_candidates": remedy_candidates,
        "prior_context": user_intake.get("prior_context"),
    }
