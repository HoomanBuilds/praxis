"""Integration connect/disconnect/status endpoints (Tier 1-3).

Design constraints:
  - ``config`` (the Fernet-encrypted credentials blob) is NEVER returned. The GET
    endpoint exposes only public state + a redacted ``configured_as`` summary.
  - "Connected" means a real, side-effecting test succeeded (test email sent, test
    Slack message posted, Jira /myself OK, DocuSign JWT grant OK, Drive OAuth OK).
  - Disconnect actually clears the stored credentials so no further sends can occur.
"""
from __future__ import annotations

import secrets

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.deps import AuthedActor, require_role
from config import settings
from db import crud
from db.session import get_db
from integrations import providers
from integrations.crypto import encrypt_config

router = APIRouter(prefix="/api/integrations", tags=["integrations"])

SSO_TYPES = {"sso": "SSO (OIDC / Keycloak)"}


class ConnectRequest(BaseModel):
    fields: dict[str, str] = {}


def _public_state(row, type_: str) -> dict:
    base = {
        "type": type_,
        "name": (SSO_TYPES.get(type_, "") or ""),
        "status": row.status if row else "not_connected",
        "connected_at": row.connected_at.isoformat() if row and row.connected_at else None,
        "last_used_at": row.last_used_at.isoformat() if row and row.last_used_at else None,
        "last_error": row.last_error if row else None,
        "configured_as": row.configured_as if row else "",
        "fields": providers.CONNECT_FIELDS.get(type_, []),
    }
    if type_ == "calendar" and row and row.status == "connected":
        # The feed URL embeds the secret token — shown once at connect, never in GET.
        base["feed_configured"] = True
    if type_ == "drive":
        base["oauth_configured"] = bool(settings.drive_oauth_client_id and settings.drive_oauth_client_secret)
    if type_ == "sso":
        base["keycloak_configured"] = bool(settings.keycloak_url and settings.keycloak_client_id)
    return base


def _calendar_token_masked(row) -> str:
    from integrations.crypto import decrypt_config
    cfg = decrypt_config(row.config)
    return (cfg.get("feed_token") or "")[:8] + "…" if cfg.get("feed_token") else ""


@router.get("")
def list_integrations(session: Session = Depends(get_db)):
    rows = {r.type: r for r in crud.list_integrations(session)}
    out = []
    # drive has no connect form (OAuth popup) but must appear in the status list.
    for type_ in list(providers.CONNECT_FIELDS.keys()) + ["drive", "sso"]:
        row = rows.get(type_)
        state = _public_state(row, type_)
        if type_ == "sso":
            state["status"], state["last_error"] = _sso_status(session)
            if state["status"] == "connected":
                state["configured_as"] = f"Keycloak demo realm · {settings.keycloak_realm}"
        out.append(state)
    return out


def _sso_status(session) -> tuple[str, str | None]:
    """SSO has no stored credentials — its real connection is the OIDC discovery
    endpoint of the demo Keycloak realm. Status reflects actual reachability."""
    import httpx

    if not settings.keycloak_url:
        return "not_connected", None
    issuer = f"{settings.keycloak_url}/realms/{settings.keycloak_realm}"
    try:
        resp = httpx.get(f"{issuer}/.well-known/openid-configuration", timeout=4)
        if resp.status_code == 200:
            return "connected", None
        return "error", f"Keycloak unreachable (HTTP {resp.status_code})"
    except Exception as exc:
        return "error", f"Keycloak unreachable — {exc}"


@router.post("/{type_}/connect")
def connect_integration(
    type_: str,
    body: ConnectRequest,
    session: Session = Depends(get_db),
    actor: AuthedActor = Depends(require_role("admin")),
):
    if type_ not in providers.CONNECT_FIELDS:
        raise HTTPException(404, f"Unknown integration type: {type_}")

    # Google Drive is an OAuth code flow — this endpoint returns the consent URL and
    # stashes a pending state; the /callback endpoint completes the connection.
    if type_ == "drive":
        if not settings.drive_oauth_client_id:
            raise HTTPException(400, "Google OAuth client is not configured (see README).")
        state = secrets.token_urlsafe(16)
        config_enc = encrypt_config({"oauth_state": state})
        crud.set_integration(session, "drive", config_encrypted=config_enc, status="not_connected", actor=actor.actor_label)
        return {
            "ok": True,
            "oauth": True,
            "state": state,
            "authorize_url": providers.drive_authorize_url(state),
        }

    fields = {k: (v or "").strip() if isinstance(v, str) else v for k, v in body.fields.items()}
    try:
        result = providers.test_connection(type_, fields)
    except providers.ProviderError as exc:
        # Mark Error only if the card was previously connected and is now broken —
        # a failed *first* connect leaves the card "Not connected" (the failure is
        # surfaced in the connect dialog) so fresh cards never look broken.
        row = crud.get_integration(session, type_)
        if row:
            row.status = "error"
            row.last_error = str(exc)
            session.flush()
        return {"ok": False, "status": "error", "message": str(exc)}

    # Calendar "connect" has no credentials — it mints the secret feed token.
    if type_ == "calendar":
        fields = {"feed_token": providers.generate_feed_token()}
    configured_as = providers.summarize(type_, fields) or "connected"

    row = crud.set_integration(
        session, type_, config_encrypted=encrypt_config(fields), configured_as=configured_as, actor=actor.actor_label
    )
    response = {
        "ok": True,
        "status": "connected",
        "message": result.get("message", "Connected."),
    }
    if type_ == "calendar":
        # One-time reveal of the subscribe URL (the token is a credential).
        response["feed_url"] = f"/api/calendar/feed.ics?token={fields['feed_token']}"
    return response


@router.post("/{type_}/disconnect")
def disconnect_integration(
    type_: str,
    session: Session = Depends(get_db),
    actor: AuthedActor = Depends(require_role("admin")),
):
    row = crud.disconnect_integration(session, type_, actor=actor.actor_label)
    if not row:
        raise HTTPException(404, f"Integration not found: {type_}")
    return {"ok": True, "status": "not_connected", "message": f"{type_} disconnected."}


# --- Google Drive OAuth callback (popup flow) -------------------------------

_DRIVE_CLOSE_PAGE = """<!doctype html><html><body><script>
  if (window.opener) {{
    window.opener.postMessage({{ type: "praxis:drive-connected", ok: {ok} }}, "{origin}");
    window.close();
  }} else {{
    document.body.innerHTML = "<p>Drive {result}. You can close this tab.</p>";
  }}
</script></body></html>"""


@router.get("/drive/callback")
def drive_callback(code: str, state: str, request: Request, session: Session = Depends(get_db)):
    """Completes the Drive OAuth code exchange started by connect (popup flow)."""
    from integrations import providers
    from integrations.crypto import decrypt_config, encrypt_config

    row = crud.get_integration(session, "drive")
    pending = decrypt_config(row.config) if row else {}
    if pending.get("oauth_state") != state:
        return HTMLResponse(_DRIVE_CLOSE_PAGE.format(ok="false", result="authorization failed (state mismatch)", origin=settings.frontend_url))
    try:
        tokens = providers.drive_exchange_code(code)
    except providers.ProviderError as exc:
        return HTMLResponse(_DRIVE_CLOSE_PAGE.format(ok="false", result=str(exc), origin=settings.frontend_url))

    cfg = {
        "refresh_token": tokens["refresh_token"],
        "access_token": tokens.get("access_token", ""),
        "token_expires_at": 0,  # force a refresh on first use
    }
    crud.set_integration(
        session,
        "drive",
        config_encrypted=encrypt_config(cfg),
        configured_as="Google Drive (PRAXIS folder)",
        actor="compliance_officer",
    )
    return HTMLResponse(_DRIVE_CLOSE_PAGE.format(ok="true", result="connected to Google Drive", origin=settings.frontend_url))
