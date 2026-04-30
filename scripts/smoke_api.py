#!/usr/bin/env python3
"""Quick HTTP smoke check against the Chetya API (no pytest required).

Usage from repo root:
  PYTHONPATH=. CHETYA_JWT_SECRET=test-smoke backend/.venv/bin/python scripts/smoke_api.py

Requires dependencies already installed (FastAPI TestClient uses Starlette).
"""

from __future__ import annotations

import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

os.environ.setdefault("CHETYA_JWT_SECRET", "test-smoke")

from fastapi.testclient import TestClient

from backend.main import app


def main() -> int:
    with TestClient(app) as client:
        r = client.get("/health")
        assert r.status_code == 200, r.text
        assert r.json().get("status") == "healthy"

        gid = "00000000-0000-4000-8000-000000000001"
        gh = {"X-Chetya-Guest-Id": gid}
        r = client.get("/guest/quota", headers=gh)
        assert r.status_code == 200, r.text
        assert r.json().get("guest_prompt_limit") == 6

        r = client.post(
            "/chat/guest",
            headers=gh,
            json={"messages": [{"role": "user", "content": "Guest smoke question."}], "language": "en"},
        )
        assert r.status_code == 200, r.text
        gbody = r.json()
        assert gbody["message"]["role"] == "assistant"
        assert gbody.get("session_id") is None
        assert "guest_prompts_remaining" in gbody

        r = client.post("/auth/email", json={"email": "smoke@test.example", "language": "en"})
        assert r.status_code == 200, r.text
        tok = r.json()["access_token"]
        h = {"Authorization": f"Bearer {tok}"}

        r = client.get("/me", headers=h)
        assert r.status_code == 200, r.text

        r = client.post(
            "/chat",
            headers=h,
            json={"messages": [{"role": "user", "content": "Smoke test message."}]},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["message"]["role"] == "assistant"
        sid = body["session_id"]

        r = client.get("/chat/sessions", headers=h)
        assert r.status_code == 200
        assert isinstance(r.json().get("sessions"), list)

        r = client.get(f"/chat/sessions/{sid}/messages", headers=h)
        assert r.status_code == 200
        msgs = r.json().get("messages")
        assert isinstance(msgs, list) and len(msgs) >= 2

    print("smoke_api: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
