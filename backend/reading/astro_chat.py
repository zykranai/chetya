"""Guru chat: multilingual replies grounded in stored computed_facts only."""

from __future__ import annotations

import json
import os
from typing import Any

import anthropic

from .chat_situations import situation_guidance_for_messages, user_signals_self_harm
from .prompts import CONVERSATION_ASTROLOGER_SYSTEM_PROMPT


def _language_instruction(code: str) -> str:
    names = {
        "en": "English",
        "hi": "Hindi",
        "hinglish": "Hinglish (natural mix of Hindi and English as urban Indians speak)",
        "ta": "Tamil",
        "te": "Telugu",
        "bn": "Bangla",
        "mr": "Marathi",
        "gu": "Gujarati",
        "kn": "Kannada",
        "ml": "Malayalam",
        "pa": "Punjabi",
        "ur": "Urdu",
        "es": "Spanish",
        "fr": "French",
        "ar": "Arabic",
    }
    return names.get(code.lower(), code)


def _style_primer(code: str) -> str:
    c = code.lower()
    if c in ("hi", "hinglish"):
        return (
            "Tone primer: sound like a calm modern Indian guru in real conversation. "
            "Use natural Hinglish/Hindi cadence (not overdramatic, not Sanskrit-heavy), "
            "with warmth + directness."
        )
    if c in ("ta", "te", "bn", "mr", "gu", "kn", "ml", "pa", "ur"):
        return (
            "Tone primer: native conversational cadence, respectful and intimate; "
            "avoid textbook translation tone."
        )
    return (
        "Tone primer: speak like a wise, grounded Indian astrologer in person; "
        "warm, specific, emotionally present."
    )


async def run_astro_chat(
    messages: list[dict[str, str]],
    *,
    computed_facts: dict[str, Any] | None,
    user_language: str,
    user_first_name: str,
    situation_note: str | None = None,
) -> str:
    """
    Multi-turn chat: each item uses keys ``role`` (``user`` or ``assistant``) and ``content`` (text).
    """
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    lang_label = _language_instruction(user_language)

    facts_block = (
        json.dumps(computed_facts, ensure_ascii=False, default=str)
        if computed_facts
        else '{"note": "No chart on file — do not invent planetary positions; encourage user to save birth details for a full reading."}'
    )

    system = CONVERSATION_ASTROLOGER_SYSTEM_PROMPT.format(
        response_language=lang_label,
        user_first_name=user_first_name or "friend",
    )
    system += f"\n\n═══ TONE PRIMER ═══\n{_style_primer(user_language)}\n"
    situ = situation_guidance_for_messages(messages)
    if situ:
        system += "\n\n═══ SITUATION-SPECIFIC GUIDANCE (from recent user turns) ═══\n"
        system += situ + "\n"
    system += "\n\n═══ COMPUTED FACTS (source of truth for all astronomical statements) ═══\n"
    system += facts_block
    if situation_note:
        system += f"\n\n═══ EXTRA CONTEXT ═══\n{situation_note}\n"

    if not anthropic_key:
        # Offline/dev fallback — warm spoken rhythm even without the API
        last_user = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
        if user_signals_self_harm(messages):
            nm = user_first_name or "friend"
            return (
                f"{nm}, I'm really grateful you wrote this here.\n\n"
                "If you might hurt yourself, please pause — call your local emergency number now or reach someone you "
                "trust who can stay with you in person.\n\n"
                "Astrology can wait; your safety cannot."
            )
        has_chart = bool(computed_facts)
        nm = user_first_name or "friend"
        chart_note = (
            "I've got your chart pattern loaded — when we're fully wired up I'll weave dasha and transits into this properly."
            if has_chart
            else (
                "I don't see your birth chart saved yet — when you add it through a reading, our chats go much deeper "
                "and sharper."
            )
        )
        preview = last_user[:280] + ("…" if len(last_user) > 280 else "")
        return (
            f"{nm}, I'm right here with you — thanks for saying this.\n\n"
            f"You mentioned: «{preview}»\n\n"
            f"{chart_note}\n\n"
            "Let's keep it simple today: three slow breaths, then one small honest step you've been putting off "
            "(one message, one walk, one clear boundary). "
            "I'm not here to lecture — only to walk beside you. The sky sketches weather; you still steer."
        )

    client = anthropic.Anthropic(api_key=anthropic_key)
    api_messages = [{"role": m["role"], "content": m["content"]} for m in messages if m["role"] in ("user", "assistant")]

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        temperature=0.84,
        system=system,
        messages=api_messages,
    )
    blocks = getattr(response, "content", None) or []
    if not blocks:
        return ""
    first = blocks[0]
    text = getattr(first, "text", None)
    return (text or "").strip()
