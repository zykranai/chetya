"""Divisional charts — Navamsa (D9) and Vargottama detection; more vargas can extend here."""

from __future__ import annotations

from .chart import SIGNS


def _navamsa_start_sign_index(rashi_index: int) -> int:
    """First Navamsa sign for movable/fixed/dual rashis (0=Aries … 11=Pisces)."""
    mod = rashi_index % 3
    if mod == 0:  # movable
        return rashi_index
    if mod == 1:  # fixed
        return (rashi_index + 8) % 12
    # dual
    return (rashi_index + 4) % 12


def longitude_to_navamsa_sign(longitude: float) -> str:
    """Whole-sign Navamsa for sidereal longitude."""
    lon = longitude % 360
    rashi_index = int(lon / 30)
    deg_in_sign = lon % 30
    piece = int(deg_in_sign / (10 + 1 / 3))  # 3°20' slices
    piece = min(piece, 8)
    start = _navamsa_start_sign_index(rashi_index)
    nav_index = (start + piece) % 12
    return SIGNS[nav_index]


def navamsa_summary_for_chart(chart_planets: dict, lagna_longitude: float) -> dict:
    """D9 lagna + planet signs for computed_facts.chart_d9_navamsa."""
    lagna_sign_n = longitude_to_navamsa_sign(lagna_longitude)
    planets_summary = []
    vargottama = []
    for name, p in chart_planets.items():
        d1 = p["sign"]
        d9 = longitude_to_navamsa_sign(p["longitude"])
        is_v = d1 == d9
        if is_v:
            vargottama.append(name)
        planets_summary.append(
            {
                "name": name,
                "sign": d9,
                "vargottama": is_v,
            }
        )
    return {
        "lagna_sign": lagna_sign_n,
        "planets_summary": planets_summary,
        "vargottama_planets": vargottama,
    }


def vargas_summary_stub(chart: dict) -> dict:
    """Placeholder flags until full D2/D10/etc. pipeline exists."""
    nav = navamsa_summary_for_chart(chart["planets"], chart["lagna"]["longitude"])
    return {
        "d2_hora_strong_in_wealth": None,
        "d10_dasamsa_career_lord_dignity": None,
        "vargottama_planets": nav["vargottama_planets"],
    }
