"""Shared FastAPI dependencies for PRAXIS.

Provides authentication via ``X-API-Key`` header and exposes the authenticated
actor identity for downstream audit logging.
"""
from __future__ import annotations

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from config import settings
from db.session import get_db


def _verify_key(x_api_key: str, session: Session) -> str | None:
    """Check DB-stored keys first, fall back to settings.api_key."""
    from db import crud
    import hashlib
    key_hash = hashlib.sha256(x_api_key.encode()).hexdigest()
    db_key = crud.get_api_key_by_hash(session, key_hash)
    if db_key:
        return db_key.label or "api_user"
    if settings.api_key and x_api_key == settings.api_key:
        return "compliance_officer"
    return None


def require_api_key(x_api_key: str = Header(default="", alias="X-API-Key"), session: Session = Depends(get_db)) -> str:
    """Validate the ``X-API-Key`` header against DB keys or settings.api_key.

    When ``settings.api_key`` is empty (local dev / test mode) the check is
    skipped and a default actor is returned so the UI keeps working.
    """
    if not settings.api_key and not x_api_key:
        return "dev_user"
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key. Provide X-API-Key header.",
        )
    actor = _verify_key(x_api_key, session)
    if actor:
        return actor
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid API key",
    )


def get_actor(x_api_key: str = Header(default="", alias="X-API-Key"), session: Session = Depends(get_db)) -> str:
    """Lightweight variant: returns the actor string from the key without raising."""
    if not settings.api_key and not x_api_key:
        return "dev_user"
    if not x_api_key:
        return "unknown"
    return _verify_key(x_api_key, session) or "unknown"
