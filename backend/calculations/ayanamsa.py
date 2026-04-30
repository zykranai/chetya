"""Ayanamsa helpers — Lahiri default; IDs reserved for future KP/Raman/Pushya-Paksha."""

import swisseph as swe

SIDM_LAHIRI = swe.SIDM_LAHIRI


def get_lahiri_ayanamsa_degrees(julian_day: float) -> float:
    """Lahiri ayanamsa in degrees at Julian UT day."""
    swe.set_sid_mode(SIDM_LAHIRI)
    return swe.get_ayanamsa_ut(julian_day)


def set_sidereal_mode(mode: int = SIDM_LAHIRI) -> None:
    swe.set_sid_mode(mode)
