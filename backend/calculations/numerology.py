from __future__ import annotations


def reduce_number(n: int, keep_master: bool = True) -> int:
    """Reduce to single digit, keeping master numbers 11, 22, 33."""
    while n > 9:
        if keep_master and n in [11, 22, 33]:
            break
        n = sum(int(d) for d in str(n))
    return n


LETTER_VALUES_PYTHAGOREAN = {
    "A": 1,
    "B": 2,
    "C": 3,
    "D": 4,
    "E": 5,
    "F": 6,
    "G": 7,
    "H": 8,
    "I": 9,
    "J": 1,
    "K": 2,
    "L": 3,
    "M": 4,
    "N": 5,
    "O": 6,
    "P": 7,
    "Q": 8,
    "R": 9,
    "S": 1,
    "T": 2,
    "U": 3,
    "V": 4,
    "W": 5,
    "X": 6,
    "Y": 7,
    "Z": 8,
}

VOWELS = set("AEIOU")

LIFE_PATH_MEANINGS = {
    1: "The Leader — born to initiate, create, and forge new paths. Independence and originality define your soul's mission.",
    2: "The Diplomat — born for partnership, sensitivity, and harmony. You heal through listening and cooperation.",
    3: "The Creator — born to express, communicate, and inspire joy. Words, art, and connection are your gifts.",
    4: "The Builder — born for structure, discipline, and lasting foundations. You make dreams practical.",
    5: "The Freedom Seeker — born for change, adventure, and versatility. You teach through experience.",
    6: "The Nurturer — born for family, service, and beauty. Love and responsibility are your calling.",
    7: "The Seeker — born for introspection, wisdom, and spiritual understanding. Silence reveals your truth.",
    8: "The Achiever — born for material mastery, leadership, and karma. Power and abundance are your tests.",
    9: "The Humanitarian — born for completion, compassion, and universal love. You are here to serve all.",
    11: "Master Intuitive — born with heightened spiritual sensitivity and the mission to inspire humanity.",
    22: "Master Builder — born to turn the most ambitious dreams into lasting reality on the world stage.",
    33: "Master Teacher — born to uplift humanity through unconditional love and creative service.",
}


def calculate_life_path(dob: str) -> dict:
    """Calculate Life Path Number from date of birth."""
    parts = dob.split("/")
    day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
    day_reduced = reduce_number(day)
    month_reduced = reduce_number(month)
    year_reduced = reduce_number(sum(int(d) for d in str(year)))
    total = day_reduced + month_reduced + year_reduced
    life_path = reduce_number(total)
    return {
        "number": life_path,
        "meaning": LIFE_PATH_MEANINGS.get(life_path, ""),
        "is_master": life_path in [11, 22, 33],
    }


def calculate_destiny_number(full_name: str) -> dict:
    """Calculate Destiny/Expression Number from all letters in full name."""
    name_clean = full_name.upper().replace(" ", "")
    total = sum(LETTER_VALUES_PYTHAGOREAN.get(c, 0) for c in name_clean)
    destiny = reduce_number(total)
    return {
        "number": destiny,
        "is_master": destiny in [11, 22, 33],
    }


def calculate_soul_urge(full_name: str) -> dict:
    """Calculate Soul Urge (Heart's Desire) from vowels only."""
    name_clean = full_name.upper().replace(" ", "")
    total = sum(LETTER_VALUES_PYTHAGOREAN.get(c, 0) for c in name_clean if c in VOWELS)
    soul_urge = reduce_number(total)
    return {
        "number": soul_urge,
        "is_master": soul_urge in [11, 22, 33],
    }


def calculate_personality_number(full_name: str) -> dict:
    """Calculate Personality Number from consonants only."""
    name_clean = full_name.upper().replace(" ", "")
    total = sum(LETTER_VALUES_PYTHAGOREAN.get(c, 0) for c in name_clean if c not in VOWELS)
    personality = reduce_number(total)
    return {
        "number": personality,
        "is_master": personality in [11, 22, 33],
    }


def calculate_personal_year(dob: str, year: int = None) -> int:
    """Calculate Personal Year number for current or given year."""
    import datetime

    if year is None:
        year = datetime.datetime.now().year
    parts = dob.split("/")
    day, month = int(parts[0]), int(parts[1])
    total = reduce_number(day) + reduce_number(month) + reduce_number(sum(int(d) for d in str(year)))
    return reduce_number(total)


CHALDEAN_VALUES = {
    "A": 1,
    "B": 2,
    "C": 3,
    "D": 4,
    "E": 5,
    "F": 8,
    "G": 3,
    "H": 5,
    "I": 1,
    "J": 1,
    "K": 2,
    "L": 3,
    "M": 4,
    "N": 5,
    "O": 7,
    "P": 8,
    "Q": 1,
    "R": 2,
    "S": 3,
    "T": 4,
    "U": 6,
    "V": 6,
    "W": 6,
    "X": 5,
    "Y": 1,
    "Z": 7,
}

NUMBER_PLANET = {
    1: "Sun",
    2: "Moon",
    3: "Jupiter",
    4: "Rahu",
    5: "Mercury",
    6: "Venus",
    7: "Ketu",
    8: "Saturn",
    9: "Mars",
}


def chaldean_mulank_bhagyank(dob: str) -> dict:
    """Mulank = reduced birth day; Bhagyank = reduced sum of all DOB digits (common Ank Jyotish rule)."""
    parts = dob.split("/")
    day, month, year = int(parts[0]), int(parts[1]), int(parts[2])
    mulank = reduce_number(day)
    digit_sum = sum(int(c) for c in f"{day:02d}{month:02d}{year}")
    bhagyank = reduce_number(digit_sum)
    return {
        "mulank": mulank,
        "mulank_planet": NUMBER_PLANET.get(mulank),
        "bhagyank": bhagyank,
        "bhagyank_planet": NUMBER_PLANET.get(bhagyank),
    }


def chaldean_naamank(full_name: str) -> int | None:
    """Expression using Chaldean letter values (spec: Naamank)."""
    name_clean = full_name.upper().replace(" ", "")
    if not name_clean:
        return None
    total = sum(CHALDEAN_VALUES.get(c, 0) for c in name_clean if c.isalpha())
    if total == 0:
        return None
    return reduce_number(total, keep_master=False)


def calculate_all_numerology(full_name: str, dob: str) -> dict:
    """Calculate all numerology numbers from name and date of birth."""
    life_path = calculate_life_path(dob)
    destiny = calculate_destiny_number(full_name)
    soul_urge = calculate_soul_urge(full_name)
    personality = calculate_personality_number(full_name)
    personal_year = calculate_personal_year(dob)

    # Birthday number
    parts = dob.split("/")
    birthday_num = reduce_number(int(parts[0]))

    # Maturity number
    maturity = reduce_number(life_path["number"] + destiny["number"])

    ck = chaldean_mulank_bhagyank(dob)
    naam = chaldean_naamank(full_name)

    return {
        "life_path": life_path,
        "destiny": destiny,
        "soul_urge": soul_urge,
        "personality": personality,
        "personal_year": personal_year,
        "birthday_number": birthday_num,
        "maturity_number": maturity,
        "chaldean": ck,
        "naamank": naam,
    }

