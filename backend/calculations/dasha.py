from __future__ import annotations

from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

# Vimshottari Dasha periods in years
DASHA_YEARS = {
    "Ketu": 7,
    "Venus": 20,
    "Sun": 6,
    "Moon": 10,
    "Mars": 7,
    "Rahu": 18,
    "Jupiter": 16,
    "Saturn": 19,
    "Mercury": 17,
}

DASHA_ORDER = [
    "Ketu",
    "Venus",
    "Sun",
    "Moon",
    "Mars",
    "Rahu",
    "Jupiter",
    "Saturn",
    "Mercury",
]

# Nakshatra to Dasha lord mapping
NAKSHATRA_LORDS = {
    "Ashwini": "Ketu",
    "Bharani": "Venus",
    "Krittika": "Sun",
    "Rohini": "Moon",
    "Mrigashira": "Mars",
    "Ardra": "Rahu",
    "Punarvasu": "Jupiter",
    "Pushya": "Saturn",
    "Ashlesha": "Mercury",
    "Magha": "Ketu",
    "Purva Phalguni": "Venus",
    "Uttara Phalguni": "Sun",
    "Hasta": "Moon",
    "Chitra": "Mars",
    "Swati": "Rahu",
    "Vishakha": "Jupiter",
    "Anuradha": "Saturn",
    "Jyeshtha": "Mercury",
    "Mula": "Ketu",
    "Purva Ashadha": "Venus",
    "Uttara Ashadha": "Sun",
    "Shravana": "Moon",
    "Dhanishtha": "Mars",
    "Shatabhisha": "Rahu",
    "Purva Bhadrapada": "Jupiter",
    "Uttara Bhadrapada": "Saturn",
    "Revati": "Mercury",
}

NAKSHATRA_EXTENTS = {
    "Ashwini": 0,
    "Bharani": 13.333,
    "Krittika": 26.667,
    "Rohini": 40,
    "Mrigashira": 53.333,
    "Ardra": 66.667,
    "Punarvasu": 80,
    "Pushya": 93.333,
    "Ashlesha": 106.667,
    "Magha": 120,
    "Purva Phalguni": 133.333,
    "Uttara Phalguni": 146.667,
    "Hasta": 160,
    "Chitra": 173.333,
    "Swati": 186.667,
    "Vishakha": 200,
    "Anuradha": 213.333,
    "Jyeshtha": 226.667,
    "Mula": 240,
    "Purva Ashadha": 253.333,
    "Uttara Ashadha": 266.667,
    "Shravana": 280,
    "Dhanishtha": 293.333,
    "Shatabhisha": 306.667,
    "Purva Bhadrapada": 320,
    "Uttara Bhadrapada": 333.333,
    "Revati": 346.667,
}


def get_balance_at_birth(moon_longitude: float, moon_nakshatra: str) -> float:
    """
    Calculate the balance of the first Dasha at birth.
    Returns the fraction of the first Dasha remaining at birth (0 to 1).
    """
    nakshatra_start = NAKSHATRA_EXTENTS[moon_nakshatra]
    nakshatra_size = 13.333
    degree_in_nakshatra = moon_longitude - nakshatra_start
    if degree_in_nakshatra < 0:
        degree_in_nakshatra += 360
    fraction_elapsed = degree_in_nakshatra / nakshatra_size
    balance = 1 - fraction_elapsed
    return balance


def calculate_dasha_periods(dob: str, moon_longitude: float, moon_nakshatra: str) -> list:
    """
    Calculate all Vimshottari Dasha periods with exact start/end dates.
    Returns list of Mahadashas, each with Antardashas and Pratyantardashas.
    """
    date_parts = dob.split("/")
    birth_date = datetime(int(date_parts[2]), int(date_parts[1]), int(date_parts[0]))

    # Find starting Dasha lord from Moon's Nakshatra
    starting_lord = NAKSHATRA_LORDS[moon_nakshatra]
    starting_index = DASHA_ORDER.index(starting_lord)

    # Calculate balance of first Dasha
    balance = get_balance_at_birth(moon_longitude, moon_nakshatra)
    first_dasha_years = DASHA_YEARS[starting_lord] * balance

    all_dashas = []
    current_date = birth_date

    total_cycle = list(DASHA_ORDER[starting_index:]) + list(DASHA_ORDER[:starting_index])

    for i, maha_lord in enumerate(total_cycle):
        if i == 0:
            maha_years = first_dasha_years
        else:
            maha_years = DASHA_YEARS[maha_lord]

        maha_days = maha_years * 365.25
        maha_end = current_date + timedelta(days=maha_days)

        antardashas = calculate_antardashas(maha_lord, current_date, maha_years)

        all_dashas.append(
            {
                "lord": maha_lord,
                "start": current_date.strftime("%d %b %Y"),
                "end": maha_end.strftime("%d %b %Y"),
                "years": round(maha_years, 2),
                "antardashas": antardashas,
            }
        )

        current_date = maha_end

        if current_date.year > birth_date.year + 125:
            break

    return all_dashas


def calculate_antardashas(maha_lord: str, maha_start: datetime, maha_years: float) -> list:
    """Calculate all Antardashas within a Mahadasha with exact dates."""
    maha_index = DASHA_ORDER.index(maha_lord)
    antar_order = list(DASHA_ORDER[maha_index:]) + list(DASHA_ORDER[:maha_index])

    antardashas = []
    current_date = maha_start
    total_years = sum(DASHA_YEARS.values())

    for antar_lord in antar_order:
        antar_years = (DASHA_YEARS[maha_lord] * DASHA_YEARS[antar_lord]) / total_years
        antar_days = antar_years * 365.25
        antar_end = current_date + timedelta(days=antar_days)

        pratyantardashas = calculate_pratyantardashas(maha_lord, antar_lord, current_date, antar_years)

        antardashas.append(
            {
                "lord": antar_lord,
                "start": current_date.strftime("%d %b %Y"),
                "end": antar_end.strftime("%d %b %Y"),
                "days": round(antar_days),
                "pratyantardashas": pratyantardashas,
            }
        )

        current_date = antar_end

    return antardashas


def calculate_pratyantardashas(maha_lord: str, antar_lord: str, antar_start: datetime, antar_years: float) -> list:
    """Calculate Pratyantar Dasha (sub-sub periods) with exact dates."""
    antar_index = DASHA_ORDER.index(antar_lord)
    pratyantar_order = list(DASHA_ORDER[antar_index:]) + list(DASHA_ORDER[:antar_index])

    pratyantardashas = []
    current_date = antar_start
    total_years = sum(DASHA_YEARS.values())

    for pratyantar_lord in pratyantar_order:
        pratyantar_years = (
            DASHA_YEARS[maha_lord] * DASHA_YEARS[antar_lord] * DASHA_YEARS[pratyantar_lord]
        ) / (total_years**2)

        pratyantar_days = pratyantar_years * 365.25
        pratyantar_end = current_date + timedelta(days=pratyantar_days)

        pratyantardashas.append(
            {
                "lord": pratyantar_lord,
                "start": current_date.strftime("%d %b %Y"),
                "end": pratyantar_end.strftime("%d %b %Y"),
                "days": round(pratyantar_days),
            }
        )

        current_date = pratyantar_end

    return pratyantardashas


def get_current_dasha(all_dashas: list, today: datetime = None) -> dict:
    """Find the currently active Mahadasha, Antardasha, and Pratyantar Dasha."""
    if today is None:
        today = datetime.now()

    for maha in all_dashas:
        maha_start = datetime.strptime(maha["start"], "%d %b %Y")
        maha_end = datetime.strptime(maha["end"], "%d %b %Y")

        if maha_start <= today <= maha_end:
            current_maha = maha["lord"]
            current_antar = None
            current_pratyantar = None
            antar_end_date = None
            pratyantar_end_date = None

            for antar in maha["antardashas"]:
                antar_start = datetime.strptime(antar["start"], "%d %b %Y")
                antar_end = datetime.strptime(antar["end"], "%d %b %Y")

                if antar_start <= today <= antar_end:
                    current_antar = antar["lord"]
                    antar_end_date = antar["end"]

                    for pratyantar in antar["pratyantardashas"]:
                        p_start = datetime.strptime(pratyantar["start"], "%d %b %Y")
                        p_end = datetime.strptime(pratyantar["end"], "%d %b %Y")

                        if p_start <= today <= p_end:
                            current_pratyantar = pratyantar["lord"]
                            pratyantar_end_date = pratyantar["end"]
                            break

                    break

            return {
                "mahadasha": current_maha,
                "mahadasha_end": maha["end"],
                "antardasha": current_antar,
                "antardasha_end": antar_end_date,
                "pratyantar": current_pratyantar,
                "pratyantar_end": pratyantar_end_date,
            }

    return {}


def _parse_dasha_date(s: str) -> datetime:
    return datetime.strptime(s, "%d %b %Y")


def next_three_antardashas(all_dashas: list, today: datetime | None = None) -> list[dict]:
    """Next three Antardashas after the current one (chronological across Mahadas)."""
    if today is None:
        today = datetime.now()
    flat = []
    for maha in all_dashas:
        for antar in maha["antardashas"]:
            flat.append(antar)
    flat.sort(key=lambda a: _parse_dasha_date(a["start"]))
    for i, antar in enumerate(flat):
        if _parse_dasha_date(antar["start"]) <= today <= _parse_dasha_date(antar["end"]):
            nxt = flat[i + 1 : i + 4]
            return [
                {
                    "lord": a["lord"],
                    "start": a["start"],
                    "end": a["end"],
                    "start_iso": _parse_dasha_date(a["start"]).date().isoformat(),
                    "end_iso": _parse_dasha_date(a["end"]).date().isoformat(),
                }
                for a in nxt[:3]
            ]
    return []


def vimshottari_period_blocks(all_dashas: list, current: dict, today: datetime | None = None) -> dict:
    """Shape matching computed_facts.vimshottari_dasha (ISO dates where possible)."""
    if today is None:
        today = datetime.now()
    out = {
        "current_maha": None,
        "current_antar": None,
        "current_pratyantar": None,
        "next_3_antars": next_three_antardashas(all_dashas, today),
    }
    for maha in all_dashas:
        ms, me = _parse_dasha_date(maha["start"]), _parse_dasha_date(maha["end"])
        if ms <= today <= me:
            out["current_maha"] = {
                "lord": maha["lord"],
                "start": ms.date().isoformat(),
                "end": me.date().isoformat(),
            }
            for antar in maha["antardashas"]:
                a_start, a_end = _parse_dasha_date(antar["start"]), _parse_dasha_date(antar["end"])
                if a_start <= today <= a_end:
                    out["current_antar"] = {
                        "lord": antar["lord"],
                        "start": a_start.date().isoformat(),
                        "end": a_end.date().isoformat(),
                    }
                    for pr in antar["pratyantardashas"]:
                        ps, pe = _parse_dasha_date(pr["start"]), _parse_dasha_date(pr["end"])
                        if ps <= today <= pe:
                            out["current_pratyantar"] = {
                                "lord": pr["lord"],
                                "start": ps.date().isoformat(),
                                "end": pe.date().isoformat(),
                            }
                            break
                    break
            break
    return out

