"""KP sub-lords — placeholder until full 249-zone engine is implemented."""

KP_STUB_NOTE = "KP cuspal sub-lords and ruling planets require KP ayanamsa + Placidus; not computed in this build."


def kp_stub() -> dict:
    return {"status": "not_implemented", "note": KP_STUB_NOTE}
