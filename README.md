# Chetya

**Chetya** is a situation-aware Vedic astrology product: it computes a sidereal chart and supporting timing layers, stores a canonical **`computed_facts`** bundle per user, and drives **structured readings** plus **multilingual guru chat** that must ground astronomical claims in that bundle—not in model improvisation.

Tagline in-app: *Not your kundli. Your life.*

## Who this is for

- People who want **chart-grounded guidance** tied to **real-life context** (work, money, family, mobility), without fear-selling remedies.
- Teams extending an auditable pipeline where **software calculations** and **model wording** are clearly separated.

## What ships in this repo

| Area | Description |
|------|--------------|
| **Backend** (`backend/`) | FastAPI API (`backend.main:app`), Swiss Ephemeris chart pipeline, SQL persistence (SQLite default; Postgres via `DATABASE_URL`), optional Supabase mirror. |
| **Web** (`web/`) | React + Vite + Tailwind client (login, reading intake, guru chat with optional mic/read‑aloud). |
| **Mobile** (`mobile/`) | Expo / React Native client (same API; configure `EXPO_PUBLIC_API_URL`). |
| **Docs** (`docs/`) | **Technical references**: shastra alignment, ephemeris pipeline, validity stance—not duplicate onboarding prose (see below). |
| **Scripts** (`scripts/`) | `smoke_api.py` API smoke test; `generate_prompts_pdf.py` optional local PDF export. |

Generated SQLite DB lives under `./data/` at runtime (not committed).

## Single onboarding document policy

- **`README.md` (this file)** is the **only** top-level product/overview doc everyone reads first.
- **Deeper technical writing** (shastras, calculation validity, ephemeris notes, model guardrails) lives under **`docs/`** as Markdown. Start at [`docs/CALCULATION_OVERVIEW.md`](docs/CALCULATION_OVERVIEW.md).

Do **not** add competing root-level `CONTRIBUTING.md`, `PROJECT.md`, etc.—extend **README** or **`docs/`** instead.

## Repository hygiene (commits & attribution)

- **Never** put IDE or assistant attribution in commit messages or source files (e.g. “Made by …”, tool/vendor plugs). Commits should state **what** changed and **why**, in neutral engineering language.
- The codebase must remain **free of promotional markers** tied to editors or codegen tools.

## Backend setup

Python **3.10+** recommended (3.9 may work with current pins).

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Run the API from the **repository root** so imports resolve:

```bash
export PYTHONPATH=.
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

### Environment variables

See `.env.example` / `backend/.env.example`:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Omit for default SQLite `./data/chetya.sqlite` |
| `CHETYA_JWT_SECRET` | **Required in production** for JWT minting |
| `GOOGLE_MAPS_API_KEY` | Birth-place geocoding |
| `ANTHROPIC_API_KEY` | LLM readings + chat (optional; deterministic fallback exists) |
| `SUPABASE_*` | Optional mirror for profiles/charts |

## Web setup

```bash
cd web
npm install
npm run dev
```

Dev uses Vite proxy **`/api` → `http://127.0.0.1:8000`**. Production/static hosts must set **`VITE_API_URL`** to the real API origin.

## Smoke test (API)

```bash
PYTHONPATH=. CHETYA_JWT_SECRET=test-smoke backend/.venv/bin/python scripts/smoke_api.py
```

Covers `/health`, auth, `/me`, `/chat`, and chat session history. Does **not** exercise Google geocoding or the full LLM path (offline chat when no Anthropic key).

Full QA still requires browser/mobile flows plus optional keys above.

## Optional PDF export

```bash
python3 scripts/generate_prompts_pdf.py
```

Writes to **`docs/_generated/`** (ignored by git). Useful for offline prompt review—not required to run the app.

## Ops notes

- PostgreSQL locally or hosted: see `docker-compose.yml`; set `DATABASE_URL` (use `postgresql+psycopg://…` with `psycopg` from `backend/requirements.txt`).
- **Production deploy** (free Postgres + hosted API + static web): [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). Repo includes a root **`Dockerfile`** for the API and **`render.yaml`** as a Render Blueprint starter.
- Never commit `.env`, `*.sqlite`, `node_modules`, `.venv`, or `.tools/`.

## Versioning

Git tags: **`vMAJOR.MINOR.PATCH`** (e.g. `v0.1.0`).
