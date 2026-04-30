#!/usr/bin/env bash
# Full-stack demo: SQLite DB under ./data/, API :8000, web :5173 (via Vite proxy /api → API).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT/data"

echo "Chetya demo"
echo "  1. Backend: cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000"
echo "  2. Web:     cd web && npm install && npm run dev"
echo ""
echo "SQLite file: $ROOT/data/chetya.sqlite"
echo "Open http://127.0.0.1:5173 — API proxied to http://127.0.0.1:8000"
