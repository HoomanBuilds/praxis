"""Shared FastAPI dependencies for PRAXIS.

Provides authentication via a JWT bearer token (issued by ``/api/auth/login`` or SSO)
or a service-to-service ``X-API-Key`` header, and exposes the authenticated actor
identity for downstream authorization checks and audit logging. There is no
unauthenticated fallback: a request presenting neither credential is rejected.
"""
from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from config import settings
from db.session import get_db

_bearer = HTTPBearer(auto_error=False)

# viewer < compliance_officer < admin
_ROLE_RANK = {"viewer": 0, "compliance_officer": 1, "admin": 2}


@dataclass(frozen=True)
class AuthedActor:
    """The resolved identity of an authenticated request."""

    id: str
    email: str
    role: str
    actor_label: str  # what gets written into audit_log.actor / crud "actor" params


def decode_token(credentials: HTTPAuthorizationCredentials = Depends(_bearer)) -> dict:
    """Decode+validate a bearer JWT. Used directly by ``GET /api/auth/me``."""
    if not credentials:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        return jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")


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


def require_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    x_api_key: str = Header(default="", alias="X-API-Key"),
    session: Session = Depends(get_db),
) -> AuthedActor:
    """Resolve the authenticated actor: JWT bearer token first, then ``X-API-Key``.

    Neither credential present, or both invalid, is a 401 — there is no dev/empty-key
    bypass. API-key callers carry no per-user identity, so they resolve to a
    ``compliance_officer``-equivalent role (matches the pre-existing label convention).
    """
    if credentials:
        try:
            payload = jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        except JWTError:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
        from db import crud
        user = crud.get_user(session, payload.get("sub", ""))
        if not user or not user.is_active:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")
        return AuthedActor(id=user.id, email=user.email, role=user.role, actor_label=user.email)

    if x_api_key:
        label = _verify_key(x_api_key, session)
        if label:
            return AuthedActor(id="", email="", role="compliance_officer", actor_label=label)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid API key")

    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated. Provide a Bearer token or X-API-Key header.")


def require_role(min_role: str):
    """Dependency factory: 403s when the resolved actor's role ranks below ``min_role``."""

    def _check(actor: AuthedActor = Depends(require_user)) -> AuthedActor:
        if _ROLE_RANK.get(actor.role, -1) < _ROLE_RANK.get(min_role, 99):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient permissions")
        return actor

    return _check


def get_actor(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    x_api_key: str = Header(default="", alias="X-API-Key"),
    session: Session = Depends(get_db),
) -> AuthedActor:
    """Lightweight variant of ``require_user``: resolves the actor if possible, never raises."""
    try:
        return require_user(credentials=credentials, x_api_key=x_api_key, session=session)
    except HTTPException:
        return AuthedActor(id="", email="", role="viewer", actor_label="unknown")
