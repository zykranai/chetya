def detect_yogas(chart: dict) -> list:
    """
    Detect the 25 most important Yogas from the birth chart.
    Each yoga has: name, present (bool), strength, description, effect.
    """
    planets = chart["planets"]
    lagna = chart["lagna"]
    detected = []

    def house(planet_name):
        return planets[planet_name]["house"]

    def sign(planet_name):
        return planets[planet_name]["sign"]

    def strength(planet_name):
        return planets[planet_name]["strength"]

    def same_house(p1, p2):
        return house(p1) == house(p2)

    def in_kendra(planet_name):
        return house(planet_name) in [1, 4, 7, 10]

    def in_trikona(planet_name):
        return house(planet_name) in [1, 5, 9]

    # 1. Gajakesari Yoga
    moon_house = house("Moon")
    jup_house = house("Jupiter")
    gaja_diff = abs(moon_house - jup_house)
    gajakesari = (
        same_house("Moon", "Jupiter")
        or gaja_diff in [3, 6]
        or (12 - gaja_diff) in [3, 6]
    )
    detected.append(
        {
            "name": "Gajakesari Yoga",
            "present": gajakesari,
            "strength": "high" if gajakesari and strength("Jupiter") == "exalted" else "medium",
            "effect": "Intelligence, wealth, respected social status, blessings of Lakshmi" if gajakesari else None,
        }
    )

    # 2. Raj Yoga (Kendra-Trikona connection)
    kendra_lords_in_trikona = (
        (in_kendra("Jupiter") and in_trikona("Jupiter"))
        or (in_kendra("Venus") and in_trikona("Venus"))
        or (in_kendra("Mercury") and in_trikona("Mercury"))
    )
    raj_yoga = kendra_lords_in_trikona or (in_kendra("Sun") and in_trikona("Moon"))
    detected.append(
        {
            "name": "Raj Yoga",
            "present": raj_yoga,
            "strength": "high" if raj_yoga else None,
            "effect": "Power, authority, success, leadership position" if raj_yoga else None,
        }
    )

    # 3. Budhaditya Yoga
    budhaditya = same_house("Sun", "Mercury")
    detected.append(
        {
            "name": "Budhaditya Yoga",
            "present": budhaditya,
            "strength": "high" if strength("Mercury") != "debilitated" else "low",
            "effect": "Sharp intellect, excellent communication, success in business and writing" if budhaditya else None,
        }
    )

    # 4. Hamsa Yoga (Jupiter in own/exalted in Kendra)
    hamsa = in_kendra("Jupiter") and strength("Jupiter") in ["exalted", "own_sign"]
    detected.append(
        {
            "name": "Hamsa Yoga (Panch Mahapurush)",
            "present": hamsa,
            "strength": "very_high" if hamsa else None,
            "effect": "Wisdom, spiritual authority, good character, respected teacher or guide" if hamsa else None,
        }
    )

    # 5. Malavya Yoga (Venus in own/exalted in Kendra)
    malavya = in_kendra("Venus") and strength("Venus") in ["exalted", "own_sign"]
    detected.append(
        {
            "name": "Malavya Yoga (Panch Mahapurush)",
            "present": malavya,
            "strength": "very_high" if malavya else None,
            "effect": "Beauty, luxury, artistic talent, happy married life, material comfort" if malavya else None,
        }
    )

    # 6. Ruchaka Yoga (Mars in own/exalted in Kendra)
    ruchaka = in_kendra("Mars") and strength("Mars") in ["exalted", "own_sign"]
    detected.append(
        {
            "name": "Ruchaka Yoga (Panch Mahapurush)",
            "present": ruchaka,
            "strength": "very_high" if ruchaka else None,
            "effect": "Courage, physical strength, leadership in army/police/sports, commander energy" if ruchaka else None,
        }
    )

    # 7. Bhadra Yoga (Mercury in own/exalted in Kendra)
    bhadra = in_kendra("Mercury") and strength("Mercury") in ["exalted", "own_sign"]
    detected.append(
        {
            "name": "Bhadra Yoga (Panch Mahapurush)",
            "present": bhadra,
            "strength": "very_high" if bhadra else None,
            "effect": "Intellect, business success, eloquence, trade, communication mastery" if bhadra else None,
        }
    )

    # 8. Shasha Yoga (Saturn in own/exalted in Kendra)
    shasha = in_kendra("Saturn") and strength("Saturn") in ["exalted", "own_sign"]
    detected.append(
        {
            "name": "Shasha Yoga (Panch Mahapurush)",
            "present": shasha,
            "strength": "very_high" if shasha else None,
            "effect": "Discipline, political power, mass leadership, service to humanity" if shasha else None,
        }
    )

    # 9. Dhana Yoga (2nd and 11th lord connection)
    sun_moon_in_wealth_houses = house("Jupiter") in [2, 11] and house("Venus") in [2, 11]
    detected.append(
        {
            "name": "Dhana Yoga",
            "present": sun_moon_in_wealth_houses,
            "strength": "medium",
            "effect": "Wealth accumulation, multiple income sources, financial prosperity" if sun_moon_in_wealth_houses else None,
        }
    )

    # 10. Vipreet Raj Yoga (6/8/12 lords in each other's houses)
    dushthana_lords_exchange = house("Saturn") in [6, 8, 12] and house("Rahu") in [6, 8, 12]
    detected.append(
        {
            "name": "Vipreet Raj Yoga",
            "present": dushthana_lords_exchange,
            "strength": "medium",
            "effect": "Rise after great difficulty, unexpected success, phoenix energy" if dushthana_lords_exchange else None,
        }
    )

    # 11. Kaal Sarp Yoga
    rahu_house = house("Rahu")
    ketu_house = house("Ketu")
    all_planet_houses = [house(p) for p in ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"]]

    rahu_to_ketu = []
    h = rahu_house
    while h != ketu_house:
        rahu_to_ketu.append(h)
        h = (h % 12) + 1

    kaal_sarp = all(ph in rahu_to_ketu for ph in all_planet_houses)
    detected.append(
        {
            "name": "Kaal Sarp Yoga",
            "present": kaal_sarp,
            "strength": "challenging",
            "effect": "All planets between Rahu-Ketu axis. Obstacles before breakthrough. Late success. Ancestral karma. Can be overcome with Rahu-Ketu remedies." if kaal_sarp else None,
        }
    )

    # 12. Manglik Dosha
    mars_house = house("Mars")
    manglik = mars_house in [1, 2, 4, 7, 8, 12]
    # Check cancellations
    manglik_cancelled = (
        strength("Mars") == "exalted"
        or lagna["sign"] in ["Aries", "Scorpio"]
        or sign("Mars") in ["Aries", "Scorpio", "Capricorn"]
    )
    detected.append(
        {
            "name": "Manglik Dosha",
            "present": manglik and not manglik_cancelled,
            "strength": "present_cancelled" if manglik and manglik_cancelled else ("present" if manglik else "absent"),
            "effect": "Mars intensity in marriage sector. Match with Manglik partner or perform Kumbh Vivah remedy." if (manglik and not manglik_cancelled) else None,
        }
    )

    # 13. Neecha Bhanga Raj Yoga (debilitation cancellation)
    debilitated_planets = [p for p in planets if planets[p]["strength"] == "debilitated"]
    neecha_bhanga = False
    for dp in debilitated_planets:
        lord_of_sign = planets[dp]["sign_lord"]
        if in_kendra(lord_of_sign) or in_trikona(lord_of_sign):
            neecha_bhanga = True
            break
    detected.append(
        {
            "name": "Neecha Bhanga Raj Yoga",
            "present": neecha_bhanga,
            "strength": "medium",
            "effect": "Debilitated planet's weakness cancelled. Difficult early life but strong rise after 30." if neecha_bhanga else None,
        }
    )

    # 14. Chandra Mangal Yoga
    chandra_mangal = same_house("Moon", "Mars")
    detected.append(
        {
            "name": "Chandra Mangal Yoga",
            "present": chandra_mangal,
            "strength": "medium",
            "effect": "Emotional intensity, earning through real estate or mother's support, entrepreneurial drive" if chandra_mangal else None,
        }
    )

    # 15. Guru Chandal Yoga
    guru_chandal = same_house("Jupiter", "Rahu")
    detected.append(
        {
            "name": "Guru Chandal Yoga",
            "present": guru_chandal,
            "strength": "challenging",
            "effect": "Jupiter with Rahu — unconventional wisdom, foreign connection, disrupted tradition. Can be powerful if Jupiter is strong." if guru_chandal else None,
        }
    )

    return [y for y in detected if y["present"]]

