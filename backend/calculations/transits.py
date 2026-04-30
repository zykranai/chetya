import swisseph as swe
from datetime import datetime
from .chart import (
    PLANETS,
    SIGNS,
    SIGN_LORDS,
    get_sidereal_longitude,
    longitude_to_sign_degree,
    get_nakshatra,
    get_house_number,
)

ASHTAKAVARGA_RULES = {
    "Sun": {
        "Sun": [1, 2, 4, 7, 8, 9, 10, 11],
        "Moon": [3, 6, 10, 11],
        "Mars": [1, 2, 4, 7, 8, 9, 10, 11],
        "Mercury": [3, 5, 6, 9, 10, 11, 12],
        "Jupiter": [5, 6, 9, 11],
        "Venus": [6, 7, 12],
        "Saturn": [1, 2, 4, 7, 8, 9, 10, 11],
        "Lagna": [3, 4, 6, 10, 11, 12],
    },
    "Moon": {
        "Sun": [3, 6, 7, 8, 10, 11],
        "Moon": [1, 3, 6, 7, 10, 11],
        "Mars": [2, 3, 5, 6, 9, 10, 11],
        "Mercury": [1, 3, 4, 5, 7, 8, 10, 11],
        "Jupiter": [1, 4, 7, 8, 10, 11, 12],
        "Venus": [3, 4, 5, 7, 9, 10, 11],
        "Saturn": [3, 5, 6, 11],
        "Lagna": [3, 6, 10, 11],
    },
    "Jupiter": {
        "Sun": [1, 2, 3, 4, 7, 8, 9, 10, 11],
        "Moon": [2, 5, 7, 9, 11],
        "Mars": [1, 2, 4, 7, 8, 10, 11],
        "Mercury": [1, 2, 4, 5, 6, 9, 10, 11],
        "Jupiter": [1, 2, 3, 4, 7, 8, 10, 11],
        "Venus": [2, 5, 6, 9, 10, 11],
        "Saturn": [3, 5, 6, 12],
        "Lagna": [1, 2, 4, 5, 6, 7, 9, 10, 11],
    },
    "Saturn": {
        "Sun": [1, 2, 4, 7, 8, 10, 11],
        "Moon": [3, 6, 11],
        "Mars": [3, 5, 6, 10, 11, 12],
        "Mercury": [6, 8, 9, 10, 11, 12],
        "Jupiter": [5, 6, 11, 12],
        "Venus": [6, 11, 12],
        "Saturn": [3, 5, 6, 11],
        "Lagna": [1, 3, 4, 6, 10, 11],
    },
    "Mars": {
        "Sun": [3, 5, 6, 10, 11],
        "Moon": [3, 6, 11],
        "Mars": [1, 2, 4, 7, 8, 10, 11],
        "Mercury": [3, 5, 6, 11],
        "Jupiter": [6, 10, 11, 12],
        "Venus": [6, 8, 11, 12],
        "Saturn": [1, 4, 7, 8, 9, 10, 11],
        "Lagna": [1, 3, 6, 10, 11],
    },
    "Mercury": {
        "Sun": [5, 6, 9, 11, 12],
        "Moon": [2, 4, 6, 8, 10, 11],
        "Mars": [1, 2, 4, 7, 8, 9, 10, 11],
        "Mercury": [1, 3, 5, 6, 9, 10, 11, 12],
        "Jupiter": [6, 8, 11, 12],
        "Venus": [1, 2, 3, 4, 5, 8, 9, 11],
        "Saturn": [1, 2, 4, 7, 8, 9, 10, 11],
        "Lagna": [1, 2, 4, 6, 8, 10, 11],
    },
    "Venus": {
        "Sun": [8, 11, 12],
        "Moon": [1, 2, 3, 4, 5, 8, 9, 11, 12],
        "Mars": [3, 4, 6, 9, 11, 12],
        "Mercury": [3, 5, 6, 9, 11],
        "Jupiter": [5, 8, 9, 10, 11],
        "Venus": [1, 2, 3, 4, 5, 8, 9, 10, 11],
        "Saturn": [3, 4, 5, 8, 9, 10, 11],
        "Lagna": [1, 2, 3, 4, 5, 8, 9, 11],
    },
}


def calculate_ashtakavarga(natal_planets: dict, natal_lagna: dict) -> dict:
    """
    Calculate Ashtakavarga bindu scores for all 7 classical planets.
    Returns bindu count (0-8) for each planet in each of 12 signs.
    Higher = more favorable transit through that sign.
    """
    ashtakavarga = {}

    for transit_planet in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]:
        bindus = [0] * 12

        if transit_planet not in ASHTAKAVARGA_RULES:
            continue

        rules = ASHTAKAVARGA_RULES[transit_planet]

        for contributor, favorable_positions in rules.items():
            if contributor == "Lagna":
                ref_sign_num = natal_lagna["sign_number"] - 1
            elif contributor in natal_planets:
                ref_sign_num = natal_planets[contributor]["sign_number"] - 1
            else:
                continue

            for pos in favorable_positions:
                sign_index = (ref_sign_num + pos - 1) % 12
                bindus[sign_index] += 1

        ashtakavarga[transit_planet] = {SIGNS[i]: bindus[i] for i in range(12)}

    return ashtakavarga


def get_current_transits(natal_chart: dict) -> dict:
    """
    Get current positions of all planets and their transit effects.
    Returns transit positions + Ashtakavarga scores for current position.
    """
    today = datetime.now()
    jd = swe.julday(today.year, today.month, today.day, today.hour + today.minute / 60)

    swe.set_sid_mode(swe.SIDM_LAHIRI)

    transit_positions = {}
    for planet_name, planet_id in PLANETS.items():
        longitude = get_sidereal_longitude(jd, planet_id)
        sign, degree, sign_num = longitude_to_sign_degree(longitude)
        nakshatra = get_nakshatra(longitude)
        house_from_moon = get_house_number(longitude, natal_chart["planets"]["Moon"]["longitude"])

        transit_positions[planet_name] = {
            "sign": sign,
            "degree": round(degree, 2),
            "longitude": round(longitude, 4),
            "nakshatra": nakshatra["name"],
            "house_from_moon": house_from_moon,
            "house_from_lagna": get_house_number(longitude, natal_chart["lagna"]["longitude"]),
        }

    # Add Ketu transit
    rahu_lon = transit_positions["Rahu"]["longitude"]
    ketu_lon = (rahu_lon + 180) % 360
    ketu_sign, ketu_deg, _ = longitude_to_sign_degree(ketu_lon)
    transit_positions["Ketu"] = {
        "sign": ketu_sign,
        "degree": round(ketu_deg, 2),
        "longitude": round(ketu_lon, 4),
        "house_from_moon": get_house_number(ketu_lon, natal_chart["planets"]["Moon"]["longitude"]),
        "house_from_lagna": get_house_number(ketu_lon, natal_chart["lagna"]["longitude"]),
    }

    # Calculate Ashtakavarga scores
    ashtakavarga = calculate_ashtakavarga(natal_chart["planets"], natal_chart["lagna"])

    # Add bindu scores to transit data
    for planet_name in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]:
        if planet_name in transit_positions and planet_name in ashtakavarga:
            current_sign = transit_positions[planet_name]["sign"]
            bindu_score = ashtakavarga[planet_name].get(current_sign, 0)
            transit_positions[planet_name]["bindu_score"] = bindu_score
            transit_positions[planet_name]["transit_strength"] = (
                "strong" if bindu_score >= 5 else "moderate" if bindu_score >= 3 else "weak"
            )

    # Sade Sati check (simple phase by sign adjacency)
    moon_sign = natal_chart["planets"]["Moon"]["sign"]
    moon_sign_idx = SIGNS.index(moon_sign)
    saturn_sign = transit_positions["Saturn"]["sign"]
    saturn_sign_idx = SIGNS.index(saturn_sign)
    sade_sati_signs = [
        SIGNS[(moon_sign_idx - 1) % 12],
        moon_sign,
        SIGNS[(moon_sign_idx + 1) % 12],
    ]
    sade_sati_active = saturn_sign in sade_sati_signs

    return {
        "date": today.strftime("%d %B %Y"),
        "positions": transit_positions,
        "ashtakavarga": ashtakavarga,
        "sade_sati": {
            "active": sade_sati_active,
            "saturn_sign": saturn_sign,
            "moon_sign": moon_sign,
            "phase": (
                "starting"
                if saturn_sign == sade_sati_signs[0]
                else "peak"
                if saturn_sign == moon_sign
                else "ending"
                if saturn_sign == sade_sati_signs[2]
                else "not_active"
            ),
        },
    }

