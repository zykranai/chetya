"""Engine + session factory. Default: SQLite file under repo ./data/. Production: set DATABASE_URL."""

from __future__ import annotations

import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from .models import Base

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_DATA_DIR = _REPO_ROOT / "data"
_DEFAULT_SQLITE = f"sqlite:///{_DATA_DIR / 'chetya.sqlite'}"

DATABASE_URL = os.getenv("DATABASE_URL", _DEFAULT_SQLITE)

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
