# Chetya

Situation-aware Vedic astrology engine: chart computation, structured readings, and a multilingual guru chat grounded in stored facts.

## Layout

| Path | Role |
|------|------|
| `backend/` | FastAPI app (`backend.main:app`), Swiss Ephemeris chart pipeline, SQL persistence (SQLite by default), optional Supabase mirror |
| `web/` | React + Vite + Tailwind client |
| `mobile/` | Expo / React Native client (optional) |
| `docs/` | Product / prompts reference PDF (generated via `scripts/generate_prompts_pdf.py`) |
| `scripts/` | Helper scripts |
| `data/` | Local SQLite file (created at runtime; not committed) |

## Backend

Python 3.10+ recommended (3.9 may work with current dependency pins).

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Run from the **repository root** so imports resolve:

```bash
export PYTHONPATH=.
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Environment variables (see `.env.example`):

- `DATABASE_URL` — omit for default SQLite under `./data/chetya.sqlite`
- `CHETYA_JWT_SECRET` — required in production for JWT auth
- `GOOGLE_MAPS_API_KEY` — geocoding for birth place
- `ANTHROPIC_API_KEY` — LLM for readings and chat (optional; deterministic fallbacks exist)
- `SUPABASE_*` — optional profile/chart mirror

## Web

```bash
cd web
npm install
npm run dev
```

Dev server proxies `/api` to `http://127.0.0.1:8000` (see `web/vite.config.ts`). Set `VITE_API_URL` when the API is hosted elsewhere.

## Ops notes

- PostgreSQL: set `DATABASE_URL` (see `docker-compose.yml` for a local template).
- Do not commit `.env`, `./data/*.sqlite`, `node_modules`, or `.venv`.

## Versioning

Git tags follow `vMAJOR.MINOR.PATCH` for releases (e.g. `v0.1.0`).
