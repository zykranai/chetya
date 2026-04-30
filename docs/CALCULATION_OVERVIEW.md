# Calculation overview

This folder holds **technical references** for how Chetya computes charts and why those choices are standard in software Jyotisha. It does **not** replace classical study or human judgment.

Start here, then read the linked topic files.

## Pipeline (high level)

1. **Birth place → coordinates & timezone** (`backend/utils/geocoding.py`) via Google Geocoding API + `timezonefinder` + `zoneinfo`.
2. **Sidereal chart (D1)** (`backend/calculations/chart.py`) using **Swiss Ephemeris** (`pyswisseph`) with **Lahiri ayanamsa** unless your code fixes another ayanamsa (see `ayanamsa.py`).
3. **Derived layers**: Vimshottari dasha (`dasha.py`), yogas (`yogas.py`), Ashtakavarga-related logic where implemented, transits (`transits.py`), numerology snapshot (`numerology.py`), remedies scaffolding (`reading/remedy_matrix.py`, calculations helpers).
4. **Canonical bundle for the LLM** (`reading/computed_facts.py`) — everything the guru chat and reading generator may cite must flow from this JSON; the model must not invent positions.

## Topic files

| File | Contents |
|------|-----------|
| [SHASTRA_AND_SOURCES.md](./SHASTRA_AND_SOURCES.md) | Classical frameworks the product aligns with (Parashari-first; others where coded). |
| [EPHEMERIS_AND_PIPELINE.md](./EPHEMERIS_AND_PIPELINE.md) | Swiss Ephemeris, ayanamsa, house systems, validation boundaries. |
| [MODEL_AND_GUARDRAILS.md](./MODEL_AND_GUARDRAILS.md) | How readings/chat use `computed_facts`, safety, anti-fear posture. |

## Validity (what “correct” means here)

- **Astronomical core**: Ephemeris positions for a given UTC instant are deterministic and auditable against Swiss Ephemeris tables / reference apps using the same ayanamsa.
- **Interpretive layer**: House rulerships, yogas, dasha ordering follow rule sets encoded in Python; where traditions disagree, code picks one explicit path — documented in the files above and in inline comments near the logic.
- **Software limits**: Wrong birth time, wrong place, or unknown ayanamsa choice limits accuracy; the app should state uncertainty instead of fabricating detail.

## Contributing technical notes

When you change a calculation, update the relevant markdown here and, if needed, the docstring at the top of the Python module so engineers and auditors stay aligned.
