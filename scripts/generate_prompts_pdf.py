#!/usr/bin/env python3
"""
Generate docs/_generated/Chetya_Prompts_and_Product_Guide.pdf from backend prompts + roadmap text (local only; folder is gitignored).
Run from repo root: python3 scripts/generate_prompts_pdf.py
Requires: pip install reportlab
"""

from __future__ import annotations

import os
import sys

# Repo root on path
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(ROOT, "backend"))

from reading.prompts import CHAT_PROMPT, DAILY_READING_PROMPT, MASTER_SYSTEM_PROMPT

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        PageBreak,
        Paragraph,
        Preformatted,
        SimpleDocTemplate,
        Spacer,
    )
except ImportError as e:
    print("Install reportlab: pip install reportlab", file=sys.stderr)
    raise e

_GEN_DIR = os.path.join(ROOT, "docs", "_generated")
os.makedirs(_GEN_DIR, exist_ok=True)
OUTPUT = os.path.join(_GEN_DIR, "Chetya_Prompts_and_Product_Guide.pdf")


FUTURE_PROMPTS_GUIDE = """
ADDITIONAL PROMPTS YOU CAN ADD (templates — customize for Chetya)

1) VOICE_SESSION_SYSTEM_PROMPT — Used when the user is in a live voice call.
   - Instruct the model to respond in short, speakable segments (15–25 seconds).
   - Require acknowledgment of emotional tone without clinical diagnosis.
   - Inject: computed_facts summary + situation_context + optional ASR transcript of last turn.
   - Safety: if user expresses self-harm, pause astrology and give crisis resources (country-aware).

2) CHAT_WITH_TOOLS_SYSTEM_PROMPT — For multi-turn chat with function calling.
   - Tools: get_transits_today, get_dasha_window, search_remedy_matrix, log_journal_entry.
   - Rule: call tools before stating planetary facts; never invent ephemeris.

3) PRASHNA_INSTANT_SYSTEM_PROMPT — Chart cast at question time (Prashna).
   - Only when user asks a specific timed question and app supplies Prashna chart JSON.

4) WELLNESS_CONTEXT_USER_MESSAGE — Structured slot for “whole person” inputs:
   - sleep_hours, stress_level_1_10, exercise, diet_notes, chronic_conditions (non-diagnostic),
   - living_situation (alone / family / PG / abroad), climate_zone.
   - Bridge to Ayurveda × Jyotisha rules in MASTER prompt without claiming medical authority.

5) FOLLOW_UP_SUMMARY_PROMPT — After long chat/voice session, produce:
   - themes discussed, commitments user made, remedy trials to track, next check-in date.

6) TTS_STYLE_PROMPT — Optional short instructions for ElevenLabs / PlayHT style:
   - calm, warm, regional accent preference (hi-IN / en-IN).
"""


PRODUCT_ROADMAP = """
BUILDING CHAT + VOICE “ASTROLOGER” (architecture sketch)

Goals
- Users talk or type; the app listens (speech-to-text), understands context, and responds with
  chart-grounded explanations + personalized remedies (environment, finances, mental/physical notes).

Suggested stack (you can swap vendors)
- Mobile: React Native / Expo (existing), microphone permission, WebSocket or HTTP streaming.
- Speech: cloud STT (Google Speech-to-Text, Deepgram, AssemblyAI) with streaming for “real-time listening”.
- Response: your hosted LLM with MASTER_SYSTEM_PROMPT + computed_facts always injected.
- Speech output: TTS (Google, Azure, ElevenLabs) for “astrologer voice”.

Data flow (voice session)
1. User completes birth intake → backend stores chart + computed_facts snapshot (Supabase).
2. User starts voice session → client streams audio chunks → STT yields partial transcript.
3. Each turn: send { transcript, computed_facts subset, situation_context, wellness_context, prior_turns }.
4. Model replies with JSON or short structured text → TTS plays → optional text on screen.

Personalization levers (already partly in Chetya)
- situation_context: age, location_type, financial_level, main_concern, language.
- Extend user profile: climate, housing, stress/sleep (self-reported), timezone for Panchanga.

Safety & ethics (non-negotiable)
- No medical or legal diagnosis; encourage professionals when needed.
- Anti-fear, anti-extraction (already in MASTER prompt).
- Voice adds urgency — reinforce warm refusal scripts for crisis language.

What to build next (practical order)
1. POST /chat/completions — multi-turn with CHAT_PROMPT + chart context + message history.
2. Optional: WebSocket endpoint for streaming tokens + session id.
3. Integrate STT/TTS in mobile; show transcript + model reply.
4. Add wellness_context fields to ReadingRequest and computed_facts assembly.
5. Session summary endpoint using FOLLOW_UP pattern for retention.
"""


def build_story():
    styles = getSampleStyleSheet()
    mono_style = ParagraphStyle(
        "MonoBlock",
        fontName="Courier",
        fontSize=7,
        leading=8.5,
    )
    title = ParagraphStyle(
        name="Title",
        parent=styles["Heading1"],
        fontSize=18,
        spaceAfter=12,
        textColor=colors.HexColor("#1a1a2e"),
    )
    h2 = ParagraphStyle(
        name="H2",
        parent=styles["Heading2"],
        fontSize=13,
        spaceBefore=14,
        spaceAfter=8,
        textColor=colors.HexColor("#16213e"),
    )
    body = ParagraphStyle(
        name="Body",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
    )

    story = []

    story.append(Paragraph("Chetya — Prompt Library and Product Guide", title))
    story.append(
        Paragraph(
            "Generated for product and engineering planning. Contains production prompts, "
            "ideas for additional prompts, and a concise roadmap for chat and voice experiences.",
            body,
        )
    )
    story.append(Spacer(1, 0.5 * cm))

    story.append(Paragraph("1. MASTER_SYSTEM_PROMPT (full reading — JSON output)", h2))
    story.append(Preformatted(MASTER_SYSTEM_PROMPT.strip(), mono_style))
    story.append(PageBreak())

    story.append(Paragraph("2. DAILY_READING_PROMPT", h2))
    story.append(Preformatted(DAILY_READING_PROMPT.strip(), mono_style))
    story.append(Spacer(1, 0.4 * cm))

    story.append(Paragraph("3. CHAT_PROMPT (follow-up; not yet wired to HTTP in MVP)", h2))
    story.append(Preformatted(CHAT_PROMPT.strip(), mono_style))
    story.append(PageBreak())

    story.append(Paragraph("4. Additional prompts you can add", h2))
    story.append(Preformatted(FUTURE_PROMPTS_GUIDE.strip(), mono_style))
    story.append(PageBreak())

    story.append(Paragraph("5. Chat, voice, and personalization roadmap", h2))
    story.append(Preformatted(PRODUCT_ROADMAP.strip(), mono_style))

    return story


def main():
    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title="Chetya Prompts and Product Guide",
        author="Chetya",
    )
    doc.build(build_story())
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()
