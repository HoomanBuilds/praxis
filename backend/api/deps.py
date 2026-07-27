"""Shared FastAPI dependencies for PRAXIS / RegPilot.

Provides authentication via ``X-API-Key`` header and exposes the authenticated
actor identity for downstream audit logging.
"""
from __future__ import annotations

from fastapi import Depends, Header, HTTPException, status

from config import settings


def require_api_key(x_api_key: str = Header(default="", alias="X-API-Key")) -> str:
    """Validate the ``X-API-Key`` header against the configured API key.

    Returns the authenticated actor name on success.  When ``settings.api_key``
    is empty (local dev / test mode) the check is skipped and a default actor
    is returned so that the UI keeps working without keys configured.
    """
    if not settings.api_key:
        return "dev_user"
    if not x_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key. Provide X-API-Key header.",
        )
    if x_api_key != settings.api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )
    return "compliance_officer"


def get_actor(x_api_key: str = Header(default="", alias="X-API-Key")) -> str:
    """Lightweight variant: returns the actor string from the key without raising."""
    if not settings.api_key:
        return "dev_user"
    if x_api_key == settings.api_key:
        return "compliance_officer"
    return "unknown"
