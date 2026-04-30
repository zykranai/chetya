# Model usage and guardrails

## Data contract

- **`computed_facts`** is assembled once per reading pipeline (`reading/computed_facts.py`) and stored for authenticated users (SQL / optional Supabase mirror).
- **Guru chat** (`reading/astro_chat.py`) receives this blob as the only astronomical truth source for factual statements.
- If facts are missing (no chart on file), prompts instruct the model **not** to invent planetary positions.

## Situation-aware behaviour

`reading/chat_situations.py` adds short behavioural hints when user text matches common life contexts (crisis language, grief, legal stress, etc.). Crisis cues prioritise **human safety** over astrology.

## Tone and ethics (product)

Prompts emphasise: anti-fear, anti-extraction, tiered remedies (free/simple first), no death-timing theatre, redirect medical/legal crises to professionals. These are **policy**, not ephemeris.

## Operational notes

- Without `ANTHROPIC_API_KEY`, chat and readings use **deterministic fallbacks** — sufficient for engineering demos, not a substitute for full pastoral QA with the LLM enabled.
- Temperature and max tokens are tuned in `astro_chat.py` / `generator.py`; adjust deliberately — higher creativity increases hallucination risk against `computed_facts`.
