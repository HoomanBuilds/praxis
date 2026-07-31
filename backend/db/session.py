"""Database engine / session management.

Lazily builds a single SQLAlchemy engine from ``settings.database_url`` and exposes a
session factory plus helpers for FastAPI dependency injection and standalone scripts.
"""
from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from config import settings
from db.models import Base

_engine: Engine | None = None
_SessionLocal: sessionmaker[Session] | None = None


def _build_engine() -> Engine:
    url = settings.database_url
    connect_args = {}
    if url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
        engine = create_engine(url, future=True, pool_pre_ping=True, connect_args=connect_args)

        @event.listens_for(engine, "connect")
        def _sqlite_connect(dbapi_conn, _record):  # noqa: ANN001
            # WAL allows readers during long writes (background processing); busy_timeout
            # makes concurrent writers wait briefly instead of erroring immediately.
            cur = dbapi_conn.cursor()
            cur.execute("PRAGMA journal_mode=WAL")
            cur.execute("PRAGMA busy_timeout=15000")
            cur.execute("PRAGMA synchronous=NORMAL")
            cur.close()

        return engine
    return create_engine(url, future=True, pool_pre_ping=True, connect_args=connect_args)


def get_engine() -> Engine:
    global _engine
    if _engine is None:
        _engine = _build_engine()
    return _engine


def get_session_factory() -> sessionmaker[Session]:
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(bind=get_engine(), autoflush=False, expire_on_commit=False)
    return _SessionLocal


def init_db() -> None:
    """Create all tables. Idempotent — safe to call on every startup."""
    Base.metadata.create_all(bind=get_engine())
    _ensure_columns(get_engine())


# Lightweight forward migrations: ``create_all`` never alters existing tables, so new
# columns on shipped tables are added here (idempotent, both SQLite and Postgres).
_NEW_COLUMNS: dict[str, list[tuple[str, str]]] = {
    "obligations": [("scores_reference", "VARCHAR(255)")],
    "tasks": [
        ("jira_issue_key", "VARCHAR(64)"),
        ("docusign_envelope_id", "VARCHAR(64)"),
        ("overdue_notified_at", "DATETIME"),
    ],
    "evidence_requirements": [
        ("uploaded_at", "DATETIME"),
        ("upload_target", "VARCHAR(16)"),
        ("file_name", "VARCHAR(255)"),
        ("file_path", "VARCHAR(512)"),
        ("external_url", "VARCHAR(1024)"),
    ],
}


def _ensure_columns(engine: Engine) -> None:
    from sqlalchemy import inspect, text

    insp = inspect(engine)
    with engine.begin() as conn:
        for table, columns in _NEW_COLUMNS.items():
            if table not in insp.get_table_names():
                continue
            existing = {c["name"] for c in insp.get_columns(table)}
            for name, ddl_type in columns:
                if name in existing:
                    continue
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl_type}"))
                print(f"[db] migration: added {table}.{name}")


@contextmanager
def session_scope() -> Iterator[Session]:
    """Transactional session for scripts/workers."""
    session = get_session_factory()()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_db() -> Iterator[Session]:
    """FastAPI dependency."""
    session = get_session_factory()()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
