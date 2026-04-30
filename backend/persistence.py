"""Persistence: SQLAlchemy (SQLite locally; Postgres via DATABASE_URL in prod). Optional Supabase mirror."""

from __future__ import annotations

import os
from datetime import datetime
from typing import Any

from .db import repository as repo
from .db.session import SessionLocal

_supabase_client: Any = None
_supabase_failed = False


def _get_supabase():
    global _supabase_client, _supabase_failed
    if _supabase_failed:
        return None
    if _supabase_client is not None:
        return _supabase_client
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not url or not key:
        _supabase_failed = True
        return None
    try:
        from supabase import create_client

        _supabase_client = create_client(url, key)
        return _supabase_client
    except Exception:
        _supabase_failed = True
        return None


def upsert_user_chart(
    user_id: str,
    chart: dict[str, Any],
    computed_facts: dict[str, Any] | None = None,
    preferred_language: str | None = None,
) -> None:
    db = SessionLocal()
    try:
        repo.upsert_user_chart(db, user_id, chart, computed_facts, preferred_language)
    finally:
        db.close()

    cli = _get_supabase()
    if not cli:
        return
    row: dict[str, Any] = {
        "user_id": user_id,
        "chart_json": chart,
        "updated_at": datetime.utcnow().isoformat(),
    }
    if computed_facts is not None:
        row["computed_facts_json"] = computed_facts
    if preferred_language:
        row["preferred_language"] = preferred_language
    try:
        cli.table("user_charts").upsert(row, on_conflict="user_id").execute()
    except Exception:
        pass


def fetch_user_chart(user_id: str) -> dict[str, Any] | None:
    b = fetch_user_chart_bundle(user_id)
    return b.get("chart_json") if b else None


def fetch_user_chart_bundle(user_id: str) -> dict[str, Any] | None:
    db = SessionLocal()
    try:
        return repo.fetch_chart_bundle(db, user_id)
    finally:
        db.close()


def upsert_profile(user_id: str, email: str, language: str) -> None:
    db = SessionLocal()
    try:
        repo.upsert_user(db, user_id, email.lower().strip(), language)
    finally:
        db.close()

    cli = _get_supabase()
    if not cli:
        return
    row = {
        "user_id": user_id,
        "email": email.lower().strip(),
        "preferred_language": language,
        "updated_at": datetime.utcnow().isoformat(),
    }
    try:
        cli.table("profiles").upsert(row, on_conflict="user_id").execute()
    except Exception:
        pass


def fetch_profile(user_id: str) -> dict[str, Any] | None:
    db = SessionLocal()
    try:
        u = repo.get_user(db, user_id)
        if u:
            return {
                "user_id": u.id,
                "email": u.email,
                "preferred_language": u.preferred_language,
            }
    finally:
        db.close()

    cli = _get_supabase()
    if not cli:
        return None
    try:
        res = cli.table("profiles").select("*").eq("user_id", user_id).limit(1).execute()
        if res.data:
            return res.data[0]
    except Exception:
        pass
    return None


def insert_reading(user_id: str | None, reading_payload: dict[str, Any], computed_facts: dict[str, Any]) -> None:
    if not user_id:
        return
    db = SessionLocal()
    try:
        repo.insert_reading_record(db, user_id, reading_payload, computed_facts)
    finally:
        db.close()

    cli = _get_supabase()
    if not cli:
        return
    row = {
        "user_id": user_id,
        "reading_json": reading_payload,
        "computed_facts_meta": {"keys": list(computed_facts.keys())},
        "created_at": datetime.utcnow().isoformat(),
    }
    try:
        cli.table("readings").insert(row).execute()
    except Exception:
        pass
