"""Engine + session factory. Default: SQLite file under repo ./data/. Production: set DATABASE_URL."""

from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from .models import Base

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_DATA_DIR = _REPO_ROOT / "data"
_DEFAULT_SQLITE = f"sqlite:///{_DATA_DIR / 'chetya.sqlite'}"

def _strip_channel_binding_param(url: str) -> str:
    """Neon adds channel_binding=require; psycopg + some TLS stacks fail on Render — drop it."""
    if "channel_binding" not in url.lower():
        return url
    parsed = urlparse(url)
    pairs = [(k, v) for k, v in parse_qsl(parsed.query, keep_blank_values=True) if k.lower() != "channel_binding"]
    new_query = urlencode(pairs)
    return urlunparse(parsed._replace(query=new_query))


def _normalize_database_url(url: str) -> str:
    """Neon/Postgres URIs often use postgresql://; we ship psycopg3 only (no psycopg2)."""
    u = url.strip().lstrip("\ufeff")  # Excel/docs BOM when pasting into Render
    if not u:
        return _DEFAULT_SQLITE
    head = u.split("://", 1)[0].lower()
    if head == "postgresql" or head == "postgres":
        u = "postgresql+psycopg://" + u.split("://", 1)[1]
    u = _strip_channel_binding_param(u)
    return u


DATABASE_URL = _normalize_database_url(os.getenv("DATABASE_URL") or _DEFAULT_SQLITE)

_CONNECT_ARGS: dict = {}
if DATABASE_URL.startswith("sqlite"):
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    _CONNECT_ARGS["check_same_thread"] = False

engine = create_engine(DATABASE_URL, connect_args=_CONNECT_ARGS, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def get_database_url_safe() -> str:
    """Masked URL for health checks (no password leak)."""
    u = DATABASE_URL
    if "@" in u and "://" in u:
        head, tail = u.split("://", 1)
        if "@" in tail:
            creds, host = tail.rsplit("@", 1)
            return f"{head}://***@{host}"
    return u.split("?")[0][:80]
