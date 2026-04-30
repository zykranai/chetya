"""Match recent user text to common life contexts and append short guru-style instructions.

Phrase matching only (no extra network call). Consumed from ``reading.astro_chat.run_astro_chat``.
"""

from __future__ import annotations

import re
from typing import Iterable

# (tag, phrases to search as substrings in lowered text, guidance block)
_RULES: tuple[tuple[str, tuple[str, ...], str], ...] = (
    (
        "crisis_self_harm",
        (
            "suicide",
            "kill myself",
            "end my life",
            "want to die",
            "better off dead",
            "self-harm",
            "self harm",
            "cut myself",
            "hang myself",
            "jump off",
            "no reason to live",
            "आत्महत्या",
            "खुदकुशी",
            "मर जाऊं",
            "जीना नहीं",
            "खुद को खत्म",
        ),
        (
            "**Crisis — highest priority.** Do NOT give astrology as the primary response. "
            "Respond with warmth, validate pain briefly, urge immediate in-person help: local emergency number, "
            "trusted person nearby, or suicide/crisis helpline for their country. "
            "Keep chart talk minimal or none until safety is addressed."
        ),
    ),
    (
        "acute_anxiety_panic",
        (
            "panic attack",
            "can't breathe",
            "cant breathe",
            "heart racing",
            "going crazy",
            "dying right now",
            "अटैक",
            "घबराहट",
            "सांस नहीं",
        ),
        (
            "They may be acutely distressed. Lead with grounding (slow breath, cold water on wrists, feet on floor). "
            "Encourage medical/emergency care if symptoms are severe or unclear. "
            "Then, only lightly, mention chart timing if COMPUTED FACTS support it — never replace clinical care."
        ),
    ),
    (
        "grief_loss",
        (
            "died",
            "death",
            "funeral",
            "passed away",
            "lost my father",
            "lost my mother",
            "miscarriage",
            "bereavement",
            "गुज़र गए",
            "गुजर गए",
            "दुनिया छोड़",
            "अंतिम संस्कार",
        ),
        (
            "Grief context: slow pace, no rushing into remedies. Acknowledge loss without clichés. "
            "Offer gentle ritual options only if asked — mantra/rest/daan framed as optional comfort, not obligation."
        ),
    ),
    (
        "relationship_marriage",
        (
            "breakup",
            "divorce",
            "cheating",
            "affair",
            "boyfriend",
            "girlfriend",
            "fiancé",
            "fiance",
            "mother-in-law",
            "in-laws",
            "saas",
            "shaadi",
            "love marriage",
            "relationship",
            "पति",
            "पत्नी",
            "प्रेम",
            "तलाक",
            "ब्रेकअप",
            "सास",
        ),
        (
            "Relationship tone: avoid blame stories; speak to dignity and clarity. "
            "Use houses/karakas/dasha **only** when stated in COMPUTED FACTS. "
            "One practical boundary/thought-reframe + optional calm remedy tier."
        ),
    ),
    (
        "career_workplace",
        (
            "promotion",
            "job loss",
            "laid off",
            "boss",
            "toxic workplace",
            "interview",
            "startup",
            "resign",
            "notice period",
            "नौकरी",
            "प्रमोशन",
            "बॉस",
            "इंटरव्यू",
        ),
        (
            "Career stress: separate facts vs fear. Tie advice to dasha/transits **only** from COMPUTED FACTS. "
            "Give one tactical next step for this week + what *not* to do impulsively."
        ),
    ),
    (
        "money_debt",
        (
            "debt",
            "loan",
            "emi",
            "bankruptcy",
            "credit card",
            "financial crunch",
            "कर्ज़",
            "कर्ज",
            "बकाया",
            "पैसों की तंगी",
        ),
        (
            "Money fear: no shame language. Practical budgeting mindset + ethical earning angle. "
            "Remedies must stay affordable first (daan items they can manage); never push gemstones as fix-all."
        ),
    ),
    (
        "legal_authorities",
        (
            "court",
            "fir",
            "police",
            "lawyer",
            "litigation",
            "visa refusal",
            "क़ानूनी",
            "कोर्ट",
            "पुलिस",
            "वकील",
        ),
        (
            "Legal/authority matters: you are not a lawyer. Give calm nervous-system grounding + classical cautions "
            "about impulsive speech/actions; urge qualified legal counsel for procedure."
        ),
    ),
    (
        "health_body_symptoms",
        (
            "diagnosis",
            "fever",
            "tumor",
            "tumour",
            "chemotherapy",
            "pregnant",
            "miscarriage risk",
            "chest pain",
            "बुखार",
            "गर्भावस्था",
            "डॉक्टर ने कहा",
        ),
        (
            "Health symptoms mentioned: do **not** diagnose or contradict doctors. "
            "Chart angles only as supportive lifestyle timing if COMPUTED FACTS allow; encourage clinical care."
        ),
    ),
    (
        "education_exams",
        (
            "exam",
            "jee",
            "neet",
            "board exams",
            "admission",
            "university",
            "परीक्षा",
            "रिज़ल्ट",
            "एडमिशन",
        ),
        (
            "Studies/exams: realistic effort framing + Mercury/Jupiter/5th-house themes **only** from COMPUTED FACTS. "
            "Offer study rhythm + sleep hygiene; avoid guarantees about ranks/scores."
        ),
    ),
    (
        "relocation_migration",
        (
            "visa",
            "permanent resident",
            "green card",
            "work permit",
            "abroad",
            "moving countries",
            "settle overseas",
            "वीज़ा",
            "विदेश",
        ),
        (
            "Relocation: acknowledge practical uncertainty (paperwork, economy). "
            "Use chart indicators for travel/12th/foreign themes **only** if present in COMPUTED FACTS; avoid certainty."
        ),
    ),
    (
        "family_pressure",
        (
            "parents forcing",
            "family pressure",
            "log kya kahenge",
            "expectations",
            "धर्मसंकट",
            "मां बाप",
            "परिवार का दबाव",
        ),
        (
            "Family pressure: honour duty vs authenticity without melodrama. "
            "Offer respectful scripts they can use + boundary-setting; remedies optional and gentle."
        ),
    ),
    (
        "spiritual_confusion",
        (
            "which mantra",
            "meditation",
            "spiritual path",
            "awakening",
            "kundalini",
            "उपासना",
            "मंत्र",
            "ध्यान",
        ),
        (
            "Spiritual seeking: avoid guru-grandstanding. Simple daily discipline first; "
            "cite mantra/graha alignment only when grounded in COMPUTED FACTS or classical karaka logic."
        ),
    ),
    (
        "skeptic_challenge",
        (
            "don't believe",
            "do not believe",
            "fake astrology",
            "science says",
            "बकवास",
            "विश्वास नहीं",
            "फेक",
        ),
        (
            "Skeptic tone: stay respectful. Separate testable timing themes from superstition; "
            "invite them to compare predictions against lived experience without arguing."
        ),
    ),
    (
        "anger_blame_fate",
        (
            "why me",
            "planets hate",
            "curse",
            "bad luck only",
            "सब बर्बाद",
            "भाग्य खराब",
            "ग्रह खराब",
        ),
        (
            "Anger at fate: validate frustration; reframe dasha as seasons, not punishment. "
            "Never shame them for emotion; offer agency + one stabilising habit."
        ),
    ),
    (
        "gratitude_celebration",
        (
            "thank you",
            "good news",
            "got the job",
            "engaged",
            "baby born",
            "शुभ समाचार",
            "धन्यवाद",
            "खुशखबरी",
        ),
        (
            "Celebration energy: mirror joy briefly; anchor gratitude with one humble caution about hubris/over-speed "
            "only if chart timing suggests it per COMPUTED FACTS."
        ),
    ),
    (
        "timing_when_will",
        (
            "when will",
            "how long until",
            "kab hoga",
            "कब होगा",
            "कब तक",
            "timing for",
        ),
        (
            "Timing questions: give windows only when dasha/transit data is explicit in COMPUTED FACTS; "
            "otherwise explain what info is missing (birth-time precision, prashna, etc.) without inventing dates."
        ),
    ),
)

_WS_RE = re.compile(r"\s+")


def _recent_user_blob(messages: Iterable[dict[str, str]], *, max_messages: int = 4) -> str:
    texts: list[str] = []
    for m in reversed(list(messages)):
        if m.get("role") != "user":
            continue
        c = (m.get("content") or "").strip()
        if c:
            texts.append(c)
        if len(texts) >= max_messages:
            break
    blob = "\n".join(reversed(texts))
    return _WS_RE.sub(" ", blob).strip()


def _normalize(text: str) -> str:
    return text.casefold()


def user_signals_self_harm(messages: list[dict[str, str]]) -> bool:
    """True when recent user text matches crisis / self-harm phrases."""
    blob_raw = _recent_user_blob(messages)
    if not blob_raw:
        return False
    hay = _normalize(blob_raw)
    for tag, phrases, _ in _RULES:
        if tag == "crisis_self_harm":
            return any(p.casefold() in hay for p in phrases)
    return False


def situation_guidance_for_messages(messages: list[dict[str, str]]) -> str | None:
    """Return extra system instructions for `run_astro_chat`, or None."""
    blob_raw = _recent_user_blob(messages)
    if not blob_raw:
        return None
    hay = _normalize(blob_raw)

    for tag, phrases, guidance in _RULES:
        if tag == "crisis_self_harm" and any(p.casefold() in hay for p in phrases):
            return f"### Crisis — safety first\n{guidance}"

    blocks: list[str] = []
    seen: set[str] = set()
    for tag, phrases, guidance in _RULES:
        if tag == "crisis_self_harm":
            continue
        if any(p.casefold() in hay for p in phrases):
            if tag in seen:
                continue
            seen.add(tag)
            title = tag.replace("_", " ").title()
            blocks.append(f"### {title}\n{guidance}")

    if not blocks:
        return None
    return "\n\n".join(blocks[:4])
