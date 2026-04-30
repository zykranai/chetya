"""Email-based session JWT (Chetya) + optional Supabase access-token verification."""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from jwt.exceptions import InvalidTokenError

JWT_SECRET = os.getenv("CHETYA_JWT_SECRET", "chetya-dev-only-change-in-production")
JWT_ALG = "HS256"
JWT_EXPIRY_DAYS = int(os.getenv("CHETYA_JWT_EXPIRY_DAYS", "60"))

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")  # Project Settings → JWT Secret


def user_id_from_email(email: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, email.lower().strip()))


def create_session_token(email: str, language: str) -> tuple[str, str]:
    """Return (access_token, user_id)."""
    email_n = email.lower().strip()
    user_id = user_id_from_email(email_n)
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email_n,
        "language": language,
        "iat": now,
        "exp": now + timedelta(days=JWT_EXPIRY_DAYS),
        "iss": "chetya",
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)
    return token, user_id


def decode_chetya_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG], options={"require": ["sub", "exp"]})


def decode_supabase_token(token: str) -> dict[str, Any]:
    if not SUPABASE_JWT_SECRET:
        raise InvalidTokenError("Supabase JWT secret not configured")
    # Supabase uses aud claim "authenticated"
    return jwt.decode(
        token,
        SUPABASE_JWT_SECRET,
        algorithms=[JWT_ALG],
        audience="authenticated",
        options={"verify_aud": True},
    )


def resolve_user_from_bearer(token: str) -> dict[str, Any]:
    """Normalize claims to { user_id, email, language }."""
    try:
        p = decode_chetya_token(token)
        return {
            "user_id": p["sub"],
            "email": p.get("email", ""),
            "language": p.get("language", "en"),
        }
    except jwt.PyJWTError:
        pass
    try:
        p = decode_supabase_token(token)
        meta = p.get("user_metadata") or {}
        app_meta = p.get("app_metadata") or {}
        lang = meta.get("preferred_language") or app_meta.get("language") or "en"
        return {
            "user_id": p["sub"],
            "email": p.get("email", ""),
            "language": lang,
        }
    except Exception:
        raise InvalidTokenError("Invalid token")


def refresh_language_claim(email: str, language: str) -> tuple[str, str]:
    """New token when user updates language."""
    return create_session_token(email, language)
