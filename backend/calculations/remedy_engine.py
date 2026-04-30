"""Tiered remedy candidates with functional-benefic/malefic guards for the LLM."""

from __future__ import annotations

from typing import Any

from .chart import SIGN_LORDS, SIGNS


def dusthana_lords(lagna_sign: str) -> list[str]:
    """Lords of 6th, 8th, and 12th from Lagna (whole sign)."""
    idx = SIGNS.index(lagna_sign)
    h6_sign = SIGNS[(idx + 5) % 12]
    h8_sign = SIGNS[(idx + 7) % 12]
    h12_sign = SIGNS[(idx + 11) % 12]
    return [SIGN_LORDS[h6_sign], SIGN_LORDS[h8_sign], SIGN_LORDS[h12_sign]]


def build_remedy_candidates(
    chart: dict,
    situational: dict[str, Any],
    main_concern: str,
) -> dict[str, Any]:
    """Structured tiers + do-not-strengthen list for gemstones."""
    lagna = chart["lagna"]["sign"]
    dlords = dusthana_lords(lagna)
    afflicted = [p for p in dlords if chart["planets"][p]["dignity"] in ("debilitated", "enemy_sign")]
    supportive = []
    for p in ["Jupiter", "Venus", "Mercury"]:
        if chart["planets"][p]["house"] in (1, 5, 9, 10, 11):
            supportive.append(p)

    do_not = [f"{p} (dusthana lord)" for p in dlords]

    tier_free = []
    for i, line in enumerate(situational.get("free", [])[:4]):
        tier_free.append(
            {
                "type": "mantra" if "Mantra" in line else "behavioral",
                "title": f"Free remedy {i + 1}",
                "detail": line,
                "shastra": "Classical graha upaya / Lal Kitab style practical",
            }
        )

    tier_affordable = []
    for i, line in enumerate(situational.get("affordable", [])[:3]):
        tier_affordable.append(
            {
                "type": "daan" if "Donat" in line or "donat" in line else "rudraksha",
                "title": f"Affordable remedy {i + 1}",
                "detail": line,
                "shastra": "Daan / Rudraksha references",
            }
        )

    tier_elevated = []
    for line in situational.get("premium", [])[:2]:
        tier_elevated.append(
            {
                "type": "ratna_upratna" if "gemstone" in line.lower() or "Gemstone" in line else "puja",
                "title": "Elevated option",
                "detail": line,
                "shastra": "Garuda Purana Ratnadhyay / temple protocols",
                "warning": "Trial periods recommended for ratna; consult only if chart supports it.",
            }
        )

    return {
        "afflicted_planets": list(dict.fromkeys(afflicted)),
        "supportive_planets_to_strengthen": list(dict.fromkeys(supportive)),
        "do_not_strengthen": do_not,
        "tier_free": tier_free,
        "tier_affordable": tier_affordable,
        "tier_elevated": tier_elevated,
        "main_concern": main_concern,
    }
