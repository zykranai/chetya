import swisseph as swe
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

# Planets used in Vedic astrology
PLANETS = {
    "Sun": swe.SUN,
    "Moon": swe.MOON,
    "Mars": swe.MARS,
    "Mercury": swe.MERCURY,
    "Jupiter": swe.JUPITER,
    "Venus": swe.VENUS,
    "Saturn": swe.SATURN,
    "Rahu": swe.MEAN_NODE,
}

SIGNS = [
    "Aries",
    "Taurus",
    "Gemini",
    "Cancer",
    "Leo",
    "Virgo",
    "Libra",
    "Scorpio",
    "Sagittarius",
    "Capricorn",
    "Aquarius",
    "Pisces",
]

SIGN_LORDS = {
    "Aries": "Mars",
    "Taurus": "Venus",
    "Gemini": "Mercury",
    "Cancer": "Moon",
    "Leo": "Sun",
    "Virgo": "Mercury",
    "Libra": "Venus",
    "Scorpio": "Mars",
    "Sagittarius": "Jupiter",
    "Capricorn": "Saturn",
    "Aquarius": "Saturn",
    "Pisces": "Jupiter",
}

EXALTATION = {
    "Sun": "Aries",
    "Moon": "Taurus",
    "Mars": "Capricorn",
    "Mercury": "Virgo",
    "Jupiter": "Cancer",
    "Venus": "Pisces",
    "Saturn": "Libra",
    "Rahu": "Gemini",
    "Ketu": "Sagittarius",
}

DEBILITATION = {
    "Sun": "Libra",
    "Moon": "Scorpio",
    "Mars": "Cancer",
    "Mercury": "Pisces",
    "Jupiter": "Capricorn",
    "Venus": "Virgo",
    "Saturn": "Aries",
    "Rahu": "Sagittarius",
    "Ketu": "Gemini",
}

OWN_SIGNS = {
    "Sun": ["Leo"],
    "Moon": ["Cancer"],
    "Mars": ["Aries", "Scorpio"],
    "Mercury": ["Gemini", "Virgo"],
    "Jupiter": ["Sagittarius", "Pisces"],
    "Venus": ["Taurus", "Libra"],
    "Saturn": ["Capricorn", "Aquarius"],
}

# Whole-sign Mūlatrikōṇa reference sign (not degree-level)
MOOLATRIKONA_SIGN = {
    "Sun": "Leo",
    "Moon": "Taurus",
    "Mars": "Aries",
    "Mercury": "Virgo",
    "Jupiter": "Sagittarius",
    "Venus": "Libra",
    "Saturn": "Aquarius",
}

NATURAL_FRIENDS = {
    "Sun": {"Moon", "Mars", "Jupiter"},
    "Moon": {"Sun", "Mercury"},
    "Mars": {"Sun", "Moon", "Jupiter"},
    "Mercury": {"Sun", "Venus"},
    "Jupiter": {"Sun", "Moon", "Mars"},
    "Venus": {"Mercury", "Saturn"},
    "Saturn": {"Mercury", "Venus"},
    "Rahu": {"Mercury", "Saturn", "Venus"},
    "Ketu": {"Mars", "Jupiter"},
}

NATURAL_ENEMIES = {
    "Sun": {"Venus", "Saturn"},
    "Moon": {},
    "Mars": {"Mercury"},
    "Mercury": {"Moon"},
    "Jupiter": {"Mercury", "Venus"},
    "Venus": {"Sun", "Moon"},
    "Saturn": {"Sun", "Moon", "Mars"},
    "Rahu": {"Sun", "Moon", "Mars"},
    "Ketu": {"Sun", "Moon", "Mercury", "Venus"},
}

COMBUST_ORBS_DEG = {
    "Moon": 12,
    "Mercury": 14,
    "Venus": 10,
    "Mars": 17,
    "Jupiter": 11,
    "Saturn": 15,
}

NAKSHATRAS = [
    {"name": "Ashwini", "lord": "Ketu", "degrees": (0, 13.333)},
    {"name": "Bharani", "lord": "Venus", "degrees": (13.333, 26.667)},
    {"name": "Krittika", "lord": "Sun", "degrees": (26.667, 40)},
    {"name": "Rohini", "lord": "Moon", "degrees": (40, 53.333)},
    {"name": "Mrigashira", "lord": "Mars", "degrees": (53.333, 66.667)},
    {"name": "Ardra", "lord": "Rahu", "degrees": (66.667, 80)},
    {"name": "Punarvasu", "lord": "Jupiter", "degrees": (80, 93.333)},
    {"name": "Pushya", "lord": "Saturn", "degrees": (93.333, 106.667)},
    {"name": "Ashlesha", "lord": "Mercury", "degrees": (106.667, 120)},
    {"name": "Magha", "lord": "Ketu", "degrees": (120, 133.333)},
    {"name": "Purva Phalguni", "lord": "Venus", "degrees": (133.333, 146.667)},
    {"name": "Uttara Phalguni", "lord": "Sun", "degrees": (146.667, 160)},
    {"name": "Hasta", "lord": "Moon", "degrees": (160, 173.333)},
    {"name": "Chitra", "lord": "Mars", "degrees": (173.333, 186.667)},
    {"name": "Swati", "lord": "Rahu", "degrees": (186.667, 200)},
    {"name": "Vishakha", "lord": "Jupiter", "degrees": (200, 213.333)},
    {"name": "Anuradha", "lord": "Saturn", "degrees": (213.333, 226.667)},
    {"name": "Jyeshtha", "lord": "Mercury", "degrees": (226.667, 240)},
    {"name": "Mula", "lord": "Ketu", "degrees": (240, 253.333)},
    {"name": "Purva Ashadha", "lord": "Venus", "degrees": (253.333, 266.667)},
    {"name": "Uttara Ashadha", "lord": "Sun", "degrees": (266.667, 280)},
    {"name": "Shravana", "lord": "Moon", "degrees": (280, 293.333)},
    {"name": "Dhanishtha", "lord": "Mars", "degrees": (293.333, 306.667)},
    {"name": "Shatabhisha", "lord": "Rahu", "degrees": (306.667, 320)},
    {"name": "Purva Bhadrapada", "lord": "Jupiter", "degrees": (320, 333.333)},
    {"name": "Uttara Bhadrapada", "lord": "Saturn", "degrees": (333.333, 346.667)},
    {"name": "Revati", "lord": "Mercury", "degrees": (346.667, 360)},
]


def angular_distance_deg(a: float, b: float) -> float:
    d = abs(a - b) % 360
    return min(d, 360 - d)


def get_julian_day(dob: str, tob: str, utc_offset: float) -> float:
    """Legacy: local clock minus fixed offset (does not handle DST). Prefer julian_day_local_birth."""
    date_parts = dob.split("/")
    day, month, year = int(date_parts[0]), int(date_parts[1]), int(date_parts[2])
    time_parts = tob.split(":")
    hour = int(time_parts[0])
    minute = int(time_parts[1]) if len(time_parts) > 1 else 0
    decimal_hour = hour + minute / 60.0
    utc_hour = decimal_hour - utc_offset
    return swe.julday(year, month, day, utc_hour)


def julian_day_local_birth(dob: str, tob: str, tz_name: str) -> float:
    """Birth Julian Day UT using IANA tz rules at birth instant (historical DST)."""
    date_parts = dob.split("/")
    day, month, year = int(date_parts[0]), int(date_parts[1]), int(date_parts[2])
    time_parts = (tob or "12:00").split(":")
    hour = int(time_parts[0])
    minute = int(time_parts[1]) if len(time_parts) > 1 else 0
    tz = ZoneInfo(tz_name)
    local_dt = datetime(year, month, day, hour, minute, tzinfo=tz)
    utc_dt = local_dt.astimezone(ZoneInfo("UTC"))
    ut = utc_dt.hour + utc_dt.minute / 60.0 + utc_dt.second / 3600.0
    return swe.julday(utc_dt.year, utc_dt.month, utc_dt.day, ut)


def birth_time_metadata(dob: str, tob: str, tz_name: str, place: str) -> dict:
    """ISO timestamps, offset at birth in minutes, DST flag."""
    date_parts = dob.split("/")
    day, month, year = int(date_parts[0]), int(date_parts[1]), int(date_parts[2])
    time_parts = (tob or "12:00").split(":")
    hour = int(time_parts[0])
    minute = int(time_parts[1]) if len(time_parts) > 1 else 0
    tz = ZoneInfo(tz_name)
    local_dt = datetime(year, month, day, hour, minute, tzinfo=tz)
    utc_dt = local_dt.astimezone(ZoneInfo("UTC"))
    offset_min = int(local_dt.utcoffset().total_seconds() // 60)
    dst = local_dt.dst()
    dst_applied = dst is not None and dst != timedelta(0)
    return {
        "dob_iso": local_dt.isoformat(),
        "tob_local": f"{hour:02d}:{minute:02d}",
        "place": place,
        "tz_name": tz_name,
        "tz_offset_at_birth_minutes": offset_min,
        "dst_at_birth_applied": dst_applied,
        "utc_iso_at_birth": utc_dt.isoformat(),
    }


def get_sidereal_longitude(jd: float, planet_id: int) -> float:
    """Sidereal longitude only (backward compatible for transits)."""
    lon, _ = get_sidereal_lon_speed(jd, planet_id)
    return lon


def get_sidereal_lon_speed(jd: float, planet_id: int) -> tuple[float, float]:
    """Longitude (deg) and speed in longitude deg/day (negative = retrograde)."""
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    flags = swe.FLG_SIDEREAL | swe.FLG_SPEED
    result = swe.calc_ut(jd, planet_id, flags)
    return result[0][0], result[0][3]


def longitude_to_sign_degree(longitude: float) -> tuple:
    """Convert absolute longitude to sign and degree within sign."""
    sign_index = int(longitude / 30)
    degree_in_sign = longitude % 30
    return SIGNS[sign_index], degree_in_sign, sign_index + 1


def get_nakshatra(longitude: float) -> dict:
    """Get Nakshatra, Pada, and Nakshatra lord from longitude."""
    for nk in NAKSHATRAS:
        start, end = nk["degrees"]
        if start <= longitude < end:
            pada_size = (end - start) / 4
            pada = int((longitude - start) / pada_size) + 1
            return {
                "name": nk["name"],
                "lord": nk["lord"],
                "pada": pada,
                "degree_in_nakshatra": longitude - start,
            }
    return NAKSHATRAS[-1]


def get_planet_strength(planet_name: str, sign: str) -> str:
    """Legacy coarse strength for yogas."""
    if EXALTATION.get(planet_name) == sign:
        return "exalted"
    if DEBILITATION.get(planet_name) == sign:
        return "debilitated"
    if sign in OWN_SIGNS.get(planet_name, []):
        return "own_sign"
    return "normal"


def get_expanded_dignity(planet_name: str, sign: str) -> str:
    """Parashari-style label for computed_facts (spec-aligned)."""
    if EXALTATION.get(planet_name) == sign:
        return "exalted"
    if DEBILITATION.get(planet_name) == sign:
        return "debilitated"
    if MOOLATRIKONA_SIGN.get(planet_name) == sign:
        return "moolatrikona"
    if sign in OWN_SIGNS.get(planet_name, []):
        return "own_sign"
    lord = SIGN_LORDS[sign]
    fr = NATURAL_FRIENDS.get(planet_name, set())
    en = NATURAL_ENEMIES.get(planet_name, set())
    if lord in fr:
        return "friend_sign"
    if lord in en:
        return "enemy_sign"
    return "neutral"


def is_combust(planet_name: str, planet_lon: float, sun_lon: float) -> bool:
    if planet_name in ("Sun", "Rahu", "Ketu"):
        return False
    orb = COMBUST_ORBS_DEG.get(planet_name)
    if orb is None:
        return False
    return angular_distance_deg(planet_lon, sun_lon) < orb


def get_house_number(planet_longitude: float, lagna_longitude: float) -> int:
    """Whole sign: which house from Lagna (1–12)."""
    diff = (planet_longitude - lagna_longitude) % 360
    house = int(diff / 30) + 1
    return house


def calculate_ascendant(jd: float, lat: float, lon: float) -> float:
    """Ascendant using whole-sign compatible sidereal houses (Placidus cusps for Lagna degree)."""
    swe.set_sid_mode(swe.SIDM_LAHIRI)
    houses = swe.houses_ex(jd, lat, lon, b"P", swe.FLG_SIDEREAL)
    ascendant = houses[1][0] % 360
    return ascendant


def _houses_aspected_from(planet_name: str, planet_house: int) -> set[int]:
    """Whole-sign Graha drishti targets (1–12)."""
    h = planet_house - 1
    targets = {(h + 6) % 12 + 1}
    if planet_name == "Mars":
        targets.update({(h + 3) % 12 + 1, (h + 6) % 12 + 1, (h + 7) % 12 + 1})
    elif planet_name == "Mercury":
        targets.update({(h + 6) % 12 + 1, (h + 9) % 12 + 1})
    elif planet_name == "Jupiter":
        targets.update({(h + 4) % 12 + 1, (h + 6) % 12 + 1, (h + 8) % 12 + 1})
    elif planet_name == "Saturn":
        targets.update({(h + 2) % 12 + 1, (h + 6) % 12 + 1, (h + 9) % 12 + 1})
    elif planet_name == "Venus":
        pass
    return targets


def build_whole_sign_houses(chart: dict) -> list:
    """Twelve houses with occupants and Parashari aspects received."""
    lagna_sign_idx = chart["lagna"]["sign_number"] - 1
    planets = chart["planets"]
    occupants = {i: [] for i in range(1, 13)}
    planet_houses = {}
    for pname, pdata in planets.items():
        occupants[pdata["house"]].append(pname)
        planet_houses[pname] = pdata["house"]

    aspects_to_house = {i: [] for i in range(1, 13)}
    for pname, ph in planet_houses.items():
        for tgt in _houses_aspected_from(pname, ph):
            aspects_to_house[tgt].append(pname)

    houses = []
    for num in range(1, 13):
        sign_idx = (lagna_sign_idx + num - 1) % 12
        sign = SIGNS[sign_idx]
        lord = SIGN_LORDS[sign]
        houses.append(
            {
                "num": num,
                "sign": sign,
                "lord": lord,
                "occupants": sorted(occupants[num]),
                "aspects_received_from": sorted(set(aspects_to_house[num])),
            }
        )
    return houses


def calculate_full_chart(
    name: str,
    dob: str,
    tob: str,
    place: str,
    lat: float,
    lon: float,
    tz_name: str,
) -> dict:
    """
    Complete D1 chart with retrograde, combustion, expanded dignity.
    `tz_name` must be an IANA zone (e.g. Asia/Kolkata) from geocoding.
    """
    jd = julian_day_local_birth(dob, tob, tz_name)
    birth_meta = birth_time_metadata(dob, tob, tz_name, place)

    lagna_longitude = calculate_ascendant(jd, lat, lon)
    lagna_sign, lagna_degree, lagna_sign_num = longitude_to_sign_degree(lagna_longitude)
    lagna_nakshatra = get_nakshatra(lagna_longitude)

    planets_data = {}
    sun_lon = None

    for planet_name, planet_id in PLANETS.items():
        longitude, speed = get_sidereal_lon_speed(jd, planet_id)
        sign, degree, sign_num = longitude_to_sign_degree(longitude)
        house = get_house_number(longitude, lagna_longitude)
        nakshatra = get_nakshatra(longitude)
        strength = get_planet_strength(planet_name, sign)
        dignity = get_expanded_dignity(planet_name, sign)
        retrograde = speed < 0 if planet_name not in ("Sun", "Moon") else False

        planets_data[planet_name] = {
            "longitude": round(longitude, 4),
            "sign": sign,
            "sign_number": sign_num,
            "degree_in_sign": round(degree, 2),
            "house": house,
            "nakshatra": nakshatra["name"],
            "nakshatra_lord": nakshatra["lord"],
            "pada": nakshatra["pada"],
            "strength": strength,
            "dignity": dignity,
            "sign_lord": SIGN_LORDS[sign],
            "speed_longitude": round(speed, 6),
            "retrograde": retrograde,
        }
        if planet_name == "Sun":
            sun_lon = longitude

    for pname in list(planets_data.keys()):
        if pname != "Sun" and pname in COMBUST_ORBS_DEG:
            planets_data[pname]["combust"] = is_combust(pname, planets_data[pname]["longitude"], sun_lon)
        else:
            planets_data[pname]["combust"] = False

    rahu_longitude = planets_data["Rahu"]["longitude"]
    rahu_speed = planets_data["Rahu"]["speed_longitude"]
    ketu_longitude = (rahu_longitude + 180) % 360
    ketu_sign, ketu_degree, ketu_sign_num = longitude_to_sign_degree(ketu_longitude)
    ketu_house = get_house_number(ketu_longitude, lagna_longitude)
    ketu_nakshatra = get_nakshatra(ketu_longitude)

    planets_data["Ketu"] = {
        "longitude": round(ketu_longitude, 4),
        "sign": ketu_sign,
        "sign_number": ketu_sign_num,
        "degree_in_sign": round(ketu_degree, 2),
        "house": ketu_house,
        "nakshatra": ketu_nakshatra["name"],
        "nakshatra_lord": ketu_nakshatra["lord"],
        "pada": ketu_nakshatra["pada"],
        "strength": get_planet_strength("Ketu", ketu_sign),
        "dignity": get_expanded_dignity("Ketu", ketu_sign),
        "sign_lord": SIGN_LORDS[ketu_sign],
        "speed_longitude": round(-rahu_speed, 6),
        "retrograde": rahu_speed < 0,
        "combust": False,
    }

    chart = {
        "name": name,
        "dob": dob,
        "tob": tob,
        "place": place,
        "julian_day": jd,
        "birth_meta": birth_meta,
        "lagna": {
            "sign": lagna_sign,
            "degree": round(lagna_degree, 2),
            "sign_number": lagna_sign_num,
            "longitude": round(lagna_longitude, 4),
            "nakshatra": lagna_nakshatra["name"],
            "sign_lord": SIGN_LORDS[lagna_sign],
            "pada": lagna_nakshatra["pada"],
        },
        "planets": planets_data,
        "moon_sign": planets_data["Moon"]["sign"],
        "sun_sign": planets_data["Sun"]["sign"],
        "moon_nakshatra": planets_data["Moon"]["nakshatra"],
        "moon_nakshatra_lord": planets_data["Moon"]["nakshatra_lord"],
        "houses": build_whole_sign_houses(
            {
                "lagna": {"sign_number": lagna_sign_num},
                "planets": planets_data,
            }
        ),
    }
    return chart
