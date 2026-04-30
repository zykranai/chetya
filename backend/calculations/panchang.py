"""Drik Panchanga elements from Sun/Moon longitudes (approximate; no LMT correction)."""

from __future__ import annotations

from datetime import datetime

import swisseph as swe

from .chart import SIGNS, get_nakshatra, get_sidereal_longitude, PLANETS

TITHI_NAMES = [
    "Pratipada",
    "Dvitiya",
    "Tritiya",
    "Chaturthi",
    "Panchami",
    "Shashthi",
    "Saptami",
    "Ashtami",
    "Navami",
    "Dashami",
    "Ekadashi",
    "Dwadashi",
    "Trayodashi",
    "Chaturdashi",
    "Purnima/Amavasya",
]

VARA_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def _sun_moon_longitudes(jd_ut: float) -> tuple[float, float]:
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    sun_lon = get_sidereal_longitude(jd_ut, PLANETS["Sun"])
    moon_lon = get_sidereal_longitude(jd_ut, PLANETS["Moon"])
    return sun_lon, moon_lon


def panchang_for_jd(jd_ut: float, local_dt: datetime | None = None) -> dict:
    sun_lon, moon_lon = _sun_moon_longitudes(jd_ut)
    diff = (moon_lon - sun_lon) % 360
    tithi_index = int(diff / 12)  # 30 tithis in cycle
    paksha = "Shukla" if tithi_index < 15 else "Krishna"
    tithi_name = TITHI_NAMES[min(tithi_index % 15, 14)]

    yoga_lon = (sun_lon + moon_lon) % 360
    yoga_index = int(yoga_lon / (360 / 27))
    YOGA_NAMES = [
        "Vishkumbha",
        "Priti",
        "Ayushman",
        "Saubhagya",
        "Shobhana",
        "Atiganda",
        "Sukarma",
        "Dhriti",
        "Shoola",
        "Ganda",
        "Vriddhi",
        "Dhruva",
        "Vyaghata",
        "Harshana",
        "Vajra",
        "Siddhi",
        "Vyatipata",
        "Variyan",
        "Parigha",
        "Shiva",
        "Siddha",
        "Sadhya",
        "Shubha",
        "Shukla",
        "Brahma",
        "Indra",
        "Vaidhriti",
    ]

    karana_index = int((diff % 12) / 6)
    KARANAS = ["Bava", "Balava", "Kaulava", "Taitila", "Garaja", "Vanija", "Vishti", "Shakuni"]
    karana = KARANAS[karana_index % len(KARANAS)]

    nk = get_nakshatra(moon_lon)

    if local_dt:
        vara = VARA_NAMES[local_dt.weekday()]
        iso = local_dt.isoformat()
    else:
        vara = None
        iso = None

    return {
        "tithi": f"{paksha} {tithi_name}",
        "vara": vara,
        "nakshatra": nk["name"],
        "yoga": YOGA_NAMES[yoga_index % 27],
        "karana": karana,
        "rahu_kaal": None,
        "abhijit_muhurta": None,
        "is_inauspicious_window_now": None,
        "as_of_iso": iso,
        "notes": "Rahu Kaal / Abhijit require latitude-local sunrise; not computed here.",
    }


def panchang_now(lat: float, lon: float, tz_name: str) -> dict:
    """Build Panchanga for current instant in user's timezone."""
    from zoneinfo import ZoneInfo

    tz = ZoneInfo(tz_name)
    now = datetime.now(tz)
    jd_ut = swe.julday(now.year, now.month, now.day, now.hour + now.minute / 60.0)
    # Adjust JD to UTC properly:
    utc_now = now.astimezone(ZoneInfo("UTC"))
    jd_ut = swe.julday(
        utc_now.year,
        utc_now.month,
        utc_now.day,
        utc_now.hour + utc_now.minute / 60.0 + utc_now.second / 3600.0,
    )
    p = panchang_for_jd(jd_ut, local_dt=now)
    p["as_of_iso"] = now.isoformat()
    return p
