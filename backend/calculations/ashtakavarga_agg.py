"""Sarvashtakavarga (337 bindus total across 12 signs) from per-planet BAV tables."""

from __future__ import annotations

from .chart import SIGNS


def sarvashtakavarga_per_house(ashtakavarga_by_planet: dict) -> list[int]:
    """
    Sum bindus for each sign (house index 0=Aries …), trikona/ekadhipatya not applied.
    Returns 12 integers (one per zodiac sign).
    """
    totals = [0] * 12
    for planet_data in ashtakavarga_by_planet.values():
        for i, sign in enumerate(SIGNS):
            totals[i] += planet_data.get(sign, 0)
    return totals


def sav_total(totals: list[int]) -> int:
    return sum(totals)


def transit_bindu_for_sign(ashtakavarga_by_planet: dict, planet: str, sign: str) -> int:
    return ashtakavarga_by_planet.get(planet, {}).get(sign, 0)
