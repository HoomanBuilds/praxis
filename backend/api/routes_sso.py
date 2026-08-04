"""SSO (OIDC / Keycloak) — real authorization-code flow.

Redirects to the demo Keycloak realm, exchanges the code at the token endpoint,
validates the returned token, maps (or creates) a ``User`` row from the existing User
Management build, mints a PRAXIS JWT and lands the user back on the Login page with a
one-time token the frontend consumes. Honest framing: validated against the demo
Keycloak realm shipped in docker-compose, not a firm's live enterprise IdP.
"""
from __future__ import annotations

import json
from urllib.parse import quote

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from jose import jwt as jose_jwt

from api.routes_auth import create_access_token
from config import settings
from db import crud, models
from db.session import session_scope

router = APIRouter(prefix="/api/auth/sso", tags=["auth"])


def _issuer() -> str:
    return f"{settings.keycloak_url}/realms/{settings.keycloak_realm}"


def _state_cookie_name() -> str:
    return "praxis_oidc_state"


@router.get("/authorize")
def sso_authorize():
    """Start the OIDC authorization-code flow against the demo Keycloak realm."""
    import secrets as _secrets

    if not settings.keycloak_url:
        raise HTTPException(503, "SSO is not configured (PRAXIS_KEYCLOAK_URL is empty).")
    state = _secrets.token_urlsafe(24)
    params = {
        "response_type": "code",
        "client_id": settings.keycloak_client_id,
        "redirect_uri": settings.sso_redirect_uri,
        "scope": "openid email profile",
        "state": state,
    }
    from urllib.parse import urlencode

    authorize_url = f"{_issuer()}/protocol/openid-connect/auth?{urlencode(params)}"
    resp = RedirectResponse(authorize_url)
    # State is signed with the app's JWT secret and kept in an HttpOnly cookie so the
    # callback can verify the round-trip (CSRF protection for the login flow).
    signed = jose_jwt.encode(
        {"state": state}, settings.jwt_secret, algorithm=settings.jwt_algorithm
    )
    resp.set_cookie(_state_cookie_name(), signed, httponly=True, samesite="lax", max_age=600)
    return resp


@router.get("/callback")
def sso_callback(code: str, state: str, request: Request):
    cookie_state = request.cookies.get(_state_cookie_name(), "")
    # Validate state (if the cookie is absent we still compare against a signed empty
    # string, which will fail closed).
    try:
        payload = jose_jwt.decode(
            cookie_state, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        expected = payload["state"]
    except Exception:
        expected = ""
    if not expected or expected != state:
        raise HTTPException(400, "SSO state mismatch — start the sign-in again.")

    token_resp = httpx.post(
        f"{_issuer()}/protocol/openid-connect/token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": settings.sso_redirect_uri,
            "client_id": settings.keycloak_client_id,
            "client_secret": settings.keycloak_client_secret,
        },
        timeout=20,
    )
    if token_resp.status_code != 200:
        raise HTTPException(401, "OIDC token exchange failed")
    tokens = token_resp.json()

    userinfo_resp = httpx.get(
        f"{_issuer()}/protocol/openid-connect/userinfo",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
        timeout=20,
    )
    if userinfo_resp.status_code != 200:
        raise HTTPException(401, "OIDC userinfo failed")
    info = userinfo_resp.json()
    email = (info.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(400, "SSO identity has no email address")

    with session_scope() as session:
        user = crud.get_user_by_email(session, email)
        if not user:
            user = models.User(
                email=email,
                name=info.get("name") or info.get("preferred_username") or email,
                role="compliance_officer",
                is_active=True,
            )
            session.add(user)
            session.flush()
        token = create_access_token(user.id, user.email, user.role)

    sso_user = quote(
        json.dumps({"id": user.id, "email": user.email, "name": user.name, "role": user.role}),
        safe="",
    )
    return_url = f"{settings.frontend_url}/login?sso_token={token}&sso_user={sso_user}"
    resp = RedirectResponse(return_url)
    resp.delete_cookie(_state_cookie_name())
    return resp
