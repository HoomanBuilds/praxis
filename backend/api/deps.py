"""Shared FastAPI dependencies for PRAXIS.

Provides authentication via ``X-API-Key`` header and exposes the authenticated
actor identity for downstream audit logging.
"""
from __future__ import annotations

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from api.routes_auth import decode_access_token
from config import settings
from db.session import get_db


_bearer = HTTPBearer(auto_error=False)


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


def _verify_bearer(
    credentials: HTTPAuthorizationCredentials | None,
    session: Session,
) -> str | None:
    if not credentials or credentials.scheme.lower() != "bearer":
        return None
    try:
        payload = decode_access_token(credentials.credentials)
    except HTTPException:
        return None
    from db import crud
    user = crud.get_user(session, payload.get("sub", ""))
    if not user or not user.is_active:
        return None
    return user.email


def require_api_key(
    x_api_key: str = Header(default="", alias="X-API-Key"),
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    session: Session = Depends(get_db),
) -> str:
    """Validate a browser bearer token or an integration API key.

    Local development remains unauthenticated only when neither credential is supplied
    and ``settings.api_key`` is empty.
    """
    actor = _verify_bearer(credentials, session)
    if actor:
        return actor
    if x_api_key:
        actor = _verify_key(x_api_key, session)
        if actor:
            return actor
    if credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired bearer token",
        )
    if not settings.api_key and not x_api_key:
        return "dev_user"
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key. Provide X-API-Key header.",
        )
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid API key",
    )


def get_actor(
    x_api_key: str = Header(default="", alias="X-API-Key"),
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    session: Session = Depends(get_db),
) -> str:
    """Lightweight variant: returns the actor string from the key without raising."""
    actor = _verify_bearer(credentials, session)
    if actor:
        return actor
    if not settings.api_key and not x_api_key:
        return "dev_user"
    if not x_api_key:
        return "unknown"
    return _verify_key(x_api_key, session) or "unknown"
