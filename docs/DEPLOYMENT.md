# Production deployment (free tier friendly)

This guide splits the stack into three pieces that all offer usable **free** tiers:

1. **PostgreSQL** — managed database (recommended: **Neon** or **Supabase** Postgres).
2. **API** — FastAPI backend (`Dockerfile` in repo root).
3. **Web** — static Vite build on **Cloudflare Pages**, **Vercel**, or **Netlify**.

Local parity: `docker compose up -d db` and `DATABASE_URL=postgresql+psycopg://chetya:chetya@localhost:5432/chetya`.

---

## 1. Create a free Postgres database

### Option A — Neon (recommended)

1. Sign up at [https://neon.tech](https://neon.tech).
2. Create a project → copy the **connection string** (role `neondb_owner`, database `neondb`).
3. Ensure it includes SSL, e.g. `?sslmode=require` at the end.

Use it as **`DATABASE_URL`** for the API. Neon accepts URLs like:

```text
postgresql+psycopg://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
```

(`postgresql://` also works if you omit the driver; SQLAlchemy resolves `psycopg` when installed.)

### Option B — Supabase

1. Create a project at [https://supabase.com](https://supabase.com).
2. **Project Settings → Database → Connection string** (URI mode, Postgres).
3. Prefer the **Transaction** pooler URL for serverless hosts if offered; otherwise direct connection is fine for a single API instance.

Set **`DATABASE_URL`** on the API service only (do not expose it in the browser).

---

## 2. Deploy the API (Docker)

The repo root **`Dockerfile`** builds **only the backend** (`backend/` + `scripts/`). Images run:

`uvicorn backend.main:app --host 0.0.0.0 --port $PORT`

### Render (example)

1. New **Web Service** → connect this GitHub repo.
2. **Runtime**: Docker (Dockerfile path `./Dockerfile`, context `.`).
3. **Health check path**: `/health`.
4. **Environment** (minimum):

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Neon/Supabase URI |
| `CHETYA_JWT_SECRET` | Yes | Long random string |
| `ANTHROPIC_API_KEY` | No | LLM quality; app has offline fallback |
| `GOOGLE_MAPS_API_KEY` | No | Needed for birth-place geocoding on readings |

Optional: `SUPABASE_*` if you use Supabase mirror features.

5. Note the public URL, e.g. `https://chetya-api.onrender.com`.

Free Render web services **spin down** after idle; first request may take ~30–60s.

### Fly.io / Railway / other

Same container image: set `DATABASE_URL`, `CHETYA_JWT_SECRET`, and bind to **`PORT`** if the platform sets it (the Dockerfile respects `PORT`).

---

## 3. Deploy the web app (static)

Build injects the API base URL at **build time**:

```bash
cd web
npm ci
VITE_API_URL=https://your-api-host.example.com npm run build
```

Output is **`web/dist/`**.

### Cloudflare Pages

1. Connect repo; **Root directory**: `web`.
2. Build command: `npm run build`.
3. Build output directory: `dist`.
4. Environment variable: **`VITE_API_URL`** = your API origin (no trailing slash), e.g. `https://chetya-api.onrender.com`.
5. **SPA routing**: With Vite’s default output there is **no** root `404.html`, so Pages treats the site as an SPA and maps unknown paths to the shell automatically — **no** `_redirects` catch‑all is needed (and `/* → /index.html 200` is rejected as an infinite loop).

### Vercel

1. Import repo; set **Root Directory** to `web`.
2. Framework preset: Vite (or leave auto).
3. Add env **`VITE_API_URL`** for Production (same value as above).
4. `web/vercel.json` includes SPA rewrites for `/try`, `/chat`, etc.

### Netlify

1. Base directory: `web`, build: `npm run build`, publish: `dist`.
2. Set **`VITE_API_URL`** in Netlify UI.
3. SPA routing: `web/netlify.toml` (do **not** use `public/_redirects` with `/* → /index.html` on Cloudflare Pages — it breaks deploys; Pages enables SPA fallback automatically when there is no root `404.html`).

---

## 4. Smoke-test production

```bash
curl -sS https://YOUR_API_HOST/health
```

Expect JSON with `"status": "healthy"`. Full scripted checks (`scripts/smoke_api.py`) run against a **local** TestClient by default; against production you can mirror those requests with `curl` using your deployed `/auth/email`, `/chat`, etc.

---

## 5. Mobile

Set **`EXPO_PUBLIC_API_URL`** (or your app’s equivalent) to the same API origin as **`VITE_API_URL`**.

---

## 6. Security checklist

- Never commit real `.env` or database URLs.
- Use a strong **`CHETYA_JWT_SECRET`** in production.
- Restrict CORS in `backend/main.py` from `["*"]` to your web origin once domains are stable (optional hardening).

---

## Optional: Render Blueprint

Repo includes **`render.yaml`** as a starting point: link the repo in Render → **Blueprints** and set secret env vars in the dashboard.
