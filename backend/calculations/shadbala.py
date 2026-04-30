"""
Shadbala (sixfold strength) — full BPHS-style Virupas are a large implementation.
This module provides defensible *estimates* from D1 dignity + retrograde + house
so the LLM has numeric hooks; replace with full Sthana/Dig/Kala/Chesta/Naisargika/Drik later.
"""

from __future__ import annotations

# BPHS minima in Virupas (total Shadbala)
MINIMA_VIRUPA = {
    "Sun": 390,
    "Moon": 360,
    "Mars": 300,
    "Mercury": 420,
    "Jupiter": 390,
    "Venus": 330,
    "Saturn": 300,
}

STRENGTH_BASE = {
    "exalted": 1.15,
    "own_sign": 1.08,
    "moolatrikona": 1.10,
    "friend_sign": 1.04,
    "friend": 1.04,
    "neutral": 1.0,
    "enemy_sign": 0.94,
    "enemy": 0.94,
    "bitter_enemy": 0.90,
    "debilitated": 0.82,
    "normal": 1.0,
}

MOOLATRIKONA = {
    "Sun": "Leo",
    "Moon": "Taurus",
    "Mars": "Aries",
    "Mercury": "Virgo",
    "Jupiter": "Sagittarius",
    "Venus": "Libra",
    "Saturn": "Aquarius",
}


def _dignity_tier(planet: str, sign: str, raw: str) -> str:
    if raw in ("exalted", "debilitated", "own_sign", "moolatrikona", "friend_sign", "enemy_sign", "neutral"):
        return raw
    if MOOLATRIKONA.get(planet) == sign:
        return "moolatrikona"
    if raw == "normal":
        return "neutral"
    return raw


def estimate_shadbala_virupas(planet: str, chart_row: dict) -> tuple[float, bool]:
    """
    Return (total_virupas_est, meets_minimum).
    Linear scale from minima; not a substitute for full Shadbala.
    """
    sign = chart_row["sign"]
    raw = chart_row.get("dignity") or chart_row.get("strength", "normal")
    tier = _dignity_tier(planet, sign, raw)
    mult = STRENGTH_BASE.get(tier, 1.0)
    if chart_row.get("retrograde") and planet not in ("Sun", "Moon"):
        mult *= 0.97
    if chart_row.get("combust"):
        mult *= 0.92
    house = chart_row.get("house", 1)
    if house in (1, 4, 7, 10):
        mult *= 1.03
    elif house in (6, 8, 12):
        mult *= 0.95

    base = MINIMA_VIRUPA.get(planet, 360)
    total = round(base * mult, 2)
    meets = total >= MINIMA_VIRUPA.get(planet, 0)
    return total, meets


def shadbala_block_for_planets(planets: dict) -> dict:
    out = {}
    for name, row in planets.items():
        if name in MINIMA_VIRUPA:
            vir, ok = estimate_shadbala_virupas(name, row)
            out[name] = {"total_virupas_est": vir, "meets_minimum": ok}
    return out
