"""Graha doshas derived from computed chart + transits (no fabrication)."""

from __future__ import annotations

from typing import Any

from .chart import SIGNS


def _mars_houses_manglik() -> set[int]:
    return {1, 2, 4, 7, 8, 12}


def mangal_dosha_detail(chart: dict) -> dict | None:
    """Lagna / Moon / Venus placement checks + classical cancellations."""
    mars = chart["planets"]["Mars"]
    targets = _mars_houses_manglik()
    lagna_h = mars["house"]
    moon_h = chart["planets"]["Moon"]["house"]
    venus_h = chart["planets"]["Venus"]["house"]

    scope = []
    scope_neg = []
    if lagna_h in targets:
        scope.append("Lagna")
    if moon_h in targets:
        scope_neg.append("Moon")
    if venus_h in targets:
        scope_neg.append("Venus")

    if not scope and not scope_neg:
        return None

    cancellations = []
    if mars["strength"] == "exalted":
        cancellations.append("Mars exalted")
    if chart["lagna"]["sign"] in ("Aries", "Scorpio"):
        cancellations.append("Mars rules Lagna sign")
    if mars["sign"] in ("Aries", "Scorpio", "Capricorn"):
        cancellations.append("Mars in own/exalted sign (partial cancellation per common rule)")

    is_partial = len(cancellations) > 0 and (scope or scope_neg)
    active = (scope or scope_neg) and len(cancellations) < 2

    return {
        "name": "Mangal Dosha",
        "scope": scope or ["Lagna"],
        "scope_negative": scope_neg,
        "is_partial": is_partial,
        "cancellation_factors": cancellations,
        "active_for_matching": bool(scope or scope_neg) and not cancellations,
    }


def sade_sati_block(transits: dict) -> dict | None:
    s = transits.get("sade_sati") or {}
    if not s.get("active"):
        return None
    return {
        "name": "Sade Sati",
        "phase": s.get("phase"),
        "saturn_sign": s.get("saturn_sign"),
        "moon_sign": s.get("moon_sign"),
        "ends": None,
    }


def kaal_sarp_from_chart(chart: dict) -> dict | None:
    """All classical planets hemmed between Rahu and Ketu along zodiac (simplified whole-sign)."""
    planets = chart["planets"]
    rahu_lon = planets["Rahu"]["longitude"]
    ketu_lon = planets["Ketu"]["longitude"]

    def between(lon: float) -> bool:
        # Rahu forward arc to Ketu (not crossing) — use longitude line
        if rahu_lon < ketu_lon:
            return rahu_lon < lon < ketu_lon
        return lon > rahu_lon or lon < ketu_lon

    classical = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]
    inside = all(between(planets[p]["longitude"]) for p in classical)
    if not inside:
        return None
    return {
        "name": "Kaal Sarp Yoga",
        "variety": None,
        "note": "All seven planets between Rahu-Ketu arc (computed geometrically).",
    }


def assemble_doshas(chart: dict, transits: dict) -> list[dict[str, Any]]:
    out = []
    m = mangal_dosha_detail(chart)
    if m:
        out.append(m)
    s = sade_sati_block(transits)
    if s:
        out.append(s)
    k = kaal_sarp_from_chart(chart)
    if k:
        out.append(k)
    return out
