"""Jaimini essentials: Chara Karakas (degree-in-sign), simplified Arudha / Upapada."""

from __future__ import annotations

from .chart import SIGNS


def chara_karakas(chart: dict) -> dict[str, str]:
    """Seven Karakas by descending degree within sign (classical Chara Karaka rule)."""
    seven = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]
    ranked = sorted(
        seven,
        key=lambda p: chart["planets"][p]["degree_in_sign"],
        reverse=True,
    )
    keys = ["atmakaraka", "amatyakaraka", "bhratrukaraka", "matrukaraka", "putrakaraka", "gnatikaraka", "darakaraka"]
    return {keys[i]: ranked[i] for i in range(7)}


def _sign_index(sign: str) -> int:
    return SIGNS.index(sign)


def arudha_sign(lagna_sign: str, lord_sign: str) -> str:
    """Simplified Arudha Lagna: mirror formula (2*lord - lagna) mod 12."""
    li = _sign_index(lagna_sign)
    pi = _sign_index(lord_sign)
    idx = (2 * pi - li) % 12
    return SIGNS[idx]


def jaimini_snapshot(chart: dict) -> dict:
    lagna_sign = chart["lagna"]["sign"]
    lagna_lord = chart["lagna"]["sign_lord"]
    lord_sign = chart["planets"][lagna_lord]["sign"]

    twelfth_sign = SIGNS[(_sign_index(lagna_sign) + 11) % 12]
    twelfth_lord = chart["houses"][11]["lord"]
    twelfth_lord_sign = chart["planets"][twelfth_lord]["sign"]

    ck = chara_karakas(chart)
    return {
        "chara_karakas": {
            "atmakaraka": ck["atmakaraka"],
            "amatyakaraka": ck["amatyakaraka"],
            "darakaraka": ck["darakaraka"],
        },
        "arudha_lagna": arudha_sign(lagna_sign, lord_sign),
        "upapada_lagna": arudha_sign(twelfth_sign, twelfth_lord_sign),
        "current_chara_dasha_sign": None,
        "notes": "Chara Dasha (Jaimini) full cycle not computed in this build.",
    }
