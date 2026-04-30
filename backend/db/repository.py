from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .models import ChatMessage, ChatSession, ReadingRecord, User, UserChart


class SessionForbidden(Exception):
    """Chat session exists but belongs to another user."""


def upsert_user(db: Session, user_id: str, email: str, language: str) -> User:
    row = db.get(User, user_id)
    if row:
        row.email = email
        row.preferred_language = language
    else:
        row = User(id=user_id, email=email, preferred_language=language)
        db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_user(db: Session, user_id: str) -> User | None:
    return db.get(User, user_id)


def upsert_user_chart(
    db: Session,
    user_id: str,
    chart: dict[str, Any],
    computed_facts: dict[str, Any] | None,
    preferred_language: str | None,
) -> None:
    row = db.get(UserChart, user_id)
    if row:
        row.chart_json = chart
        if computed_facts is not None:
            row.computed_facts_json = computed_facts
        if preferred_language:
            row.preferred_language = preferred_language
        row.updated_at = datetime.utcnow()
    else:
        db.add(
            UserChart(
                user_id=user_id,
                chart_json=chart,
                computed_facts_json=computed_facts,
                preferred_language=preferred_language,
            )
        )
    db.commit()


def fetch_chart_bundle(db: Session, user_id: str) -> dict[str, Any] | None:
    chart = db.get(UserChart, user_id)
    if not chart:
        return None
    return {
        "chart_json": chart.chart_json,
        "computed_facts_json": chart.computed_facts_json,
        "preferred_language": chart.preferred_language,
    }


def insert_reading_record(
    db: Session,
    user_id: str,
    reading_payload: dict[str, Any],
    computed_facts: dict[str, Any],
) -> None:
    meta = {"keys": list(computed_facts.keys())}
    db.add(
        ReadingRecord(
            user_id=user_id,
            reading_json=reading_payload,
            computed_facts_meta=meta,
        )
    )
    db.commit()


def ensure_chat_session(db: Session, user_id: str, session_id: str, title: str | None = None) -> ChatSession:
    row = db.get(ChatSession, session_id)
    now = datetime.utcnow()
    if row:
        if row.user_id != user_id:
            raise SessionForbidden()
        row.updated_at = now
        if title and not row.title:
            row.title = title[:200]
        db.commit()
        db.refresh(row)
        return row
    row = ChatSession(id=session_id, user_id=user_id, title=title[:200] if title else None)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def replace_session_messages(
    db: Session,
    user_id: str,
    session_id: str,
    messages: list[dict[str, str]],
) -> None:
    """Replace all messages for a session (full transcript)."""
    existing = db.get(ChatSession, session_id)
    if existing is not None and existing.user_id != user_id:
        raise SessionForbidden()
    if existing is None:
        ensure_chat_session(db, user_id, session_id)
    db.execute(delete(ChatMessage).where(ChatMessage.session_id == session_id))
    for m in messages:
        if m.get("role") not in ("user", "assistant") or not m.get("content"):
            continue
        db.add(
            ChatMessage(
                session_id=session_id,
                role=m["role"],
                content=m["content"],
            )
        )
    s = db.get(ChatSession, session_id)
    if s:
        s.updated_at = datetime.utcnow()
        if not s.title and messages:
            first_user = next((x["content"] for x in messages if x["role"] == "user"), None)
            if first_user:
                s.title = first_user[:120] + ("…" if len(first_user) > 120 else "")
    db.commit()


def list_chat_sessions(db: Session, user_id: str, limit: int = 30) -> list[dict[str, Any]]:
    q = (
        select(ChatSession)
        .where(ChatSession.user_id == user_id)
        .order_by(ChatSession.updated_at.desc())
        .limit(limit)
    )
    rows = db.execute(q).scalars().all()
    return [
        {
            "id": r.id,
            "title": r.title or "Conversation",
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in rows
    ]


def get_session_messages(db: Session, user_id: str, session_id: str) -> list[dict[str, str]]:
    sess = db.execute(
        select(ChatSession).where(ChatSession.id == session_id, ChatSession.user_id == user_id)
    ).scalar_one_or_none()
    if not sess:
        return []
    q = select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.id.asc())
    msgs = db.execute(q).scalars().all()
    return [{"role": m.role, "content": m.content} for m in msgs]
