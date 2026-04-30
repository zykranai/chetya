# Shastra alignment and sources

Chetya’s **reading prompts** (`backend/reading/prompts.py`) list a broad classical library so the language model stays anchored to legitimate Jyotisha discourse. The **executable chart code** implements a **Parashari-first** slice of that space plus supporting utilities.

## Implemented in code (non-exhaustive map)

| Area | Typical classical anchor | Code location (entry points) |
|------|--------------------------|------------------------------|
| Rashi chart, graha longitudes (sidereal) | Parashari basis via ephemeris | `calculations/chart.py`, `ayanamsa.py` |
| Vimshottari dasha | Standard Vimshottari from Moon nakshatra | `calculations/dasha.py` |
| Yogas (rule subsets) | Common named yogas from texts where coded | `calculations/yogas.py` |
| Doshas / transit overlays (where present) | Mixed classical + pragmatic UX guardrails | `calculations/doshas.py`, `calculations/transits.py` |
| Tajika / KP / Jaimini helpers | Partial or experimental — verify before claiming coverage | `tajika.py`, `kp.py`, `jaimini.py` |

## Validity stance

- **Texts teach principles**; **software encodes one interpretation path**. Classical plurality means two earnest pandits can disagree; Chetya should say which rule path it used when users ask.
- **Prompt citations** (e.g. “BPHS …”) must not be fabricated: prompts instruct the model to paraphrase when unsure — engineers should mirror that honesty in UI copy.

## When logic differs from a favorite guru’s manual method

Document the delta here or in the module docstring: e.g. house system, Chitra paksha ayanamsa variant, divisional emphasis, strength calculations.
