"""Real external-service providers.

Every provider takes a plaintext config dict (decrypted from the stored blob by the
caller) and either returns a result or raises a ``ProviderError`` with a human message.
Each Tier 1 provider also performs a real, side-effecting "test-on-connect" so the
"Connected" badge always reflects a live connection.
"""
from __future__ import annotations

import base64
import datetime as _dt
import re
import secrets
import smtplib
from email.message import EmailMessage
from email.utils import formataddr

import httpx

from config import settings

# Registry of connect-form fields per integration type. OAuth types (drive, sso)
# have no direct form — drive opens the browser consent screen, sso has no card form.
CONNECT_FIELDS: dict[str, list[dict]] = {
    "email": [
        {"name": "host", "label": "SMTP host", "placeholder": "smtp.example.com", "type": "text"},
        {"name": "port", "label": "Port", "placeholder": "587", "type": "number"},
        {"name": "username", "label": "Username", "placeholder": "notifications@example.com", "type": "text", "required": False},
        {"name": "password", "label": "Password / app password", "placeholder": "••••••••", "type": "password", "required": False},
        {"name": "from_address", "label": "From address", "placeholder": "noreply@example.com", "type": "email"},
    ],
    "slack": [
        {"name": "webhook_url", "label": "Incoming webhook URL", "placeholder": "https://hooks.slack.com/services/T…", "type": "text"},
    ],
    "jira": [
        {"name": "site", "label": "Jira site URL", "placeholder": "https://your-domain.atlassian.net", "type": "text"},
        {"name": "email", "label": "Account email", "placeholder": "you@example.com", "type": "email"},
        {"name": "api_token", "label": "API token", "placeholder": "••••••••", "type": "password"},
        {"name": "project_key", "label": "Project key (optional)", "placeholder": "PRAXIS", "type": "text"},
    ],
    "calendar": [],
    "docusign": [
        {"name": "integration_key", "label": "Integration key", "placeholder": "••••••••", "type": "password"},
        {"name": "user_id", "label": "User ID (sandbox user GUID)", "placeholder": "…", "type": "text"},
        {"name": "account_id", "label": "Account ID", "placeholder": "…", "type": "text"},
        {"name": "private_key", "label": "RSA private key (PEM)", "placeholder": "-----BEGIN RSA PRIVATE KEY-----", "type": "textarea"},
    ],
    "ldap": [
        {"name": "server", "label": "LDAP server URL", "placeholder": "ldap://localhost:389", "type": "text"},
        {"name": "bind_dn", "label": "Bind DN (Username)", "placeholder": "cn=admin,dc=praxis,dc=local", "type": "text"},
        {"name": "bind_password", "label": "Bind password", "placeholder": "••••••••", "type": "password"},
        {"name": "user_base", "label": "User search base", "placeholder": "ou=users,dc=praxis,dc=local", "type": "text", "required": False},
    ],
}


class ProviderError(Exception):
    """Human-readable connection failure — surfaced as ``last_error``."""


# ---------------------------------------------------------------------------
# Email (SMTP) — stdlib smtplib, real test email on connect.
# ---------------------------------------------------------------------------

def _smtp_send(cfg: dict, *, to: str, subject: str, body: str) -> None:
    host = (cfg.get("host") or "").strip()
    port = int(cfg.get("port") or 587)
    username = (cfg.get("username") or "").strip()
    password = cfg.get("password") or ""
    from_address = (cfg.get("from_address") or "").strip()
    if not host or not from_address:
        raise ProviderError("SMTP host and from address are required.")
    msg = EmailMessage()
    msg["From"] = formataddr(("PRAXIS Compliance", from_address))
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)
    try:
        with smtplib.SMTP(host, port, timeout=15) as server:
            server.ehlo()
            if port == 587 or port == 25:
                try:
                    server.starttls()
                    server.ehlo()
                except smtplib.SMTPNotSupportedError:
                    pass
            if username or password:
                server.login(username, password)
            server.send_message(msg)
    except smtplib.SMTPException as exc:
        raise ProviderError(f"SMTP failure: {exc}") from exc
    except OSError as exc:
        raise ProviderError(f"Could not reach {host}:{port} — {exc}") from exc


def test_email(cfg: dict) -> dict:
    """Send a real test message to the configured from-address."""
    from_address = (cfg.get("from_address") or "").strip()
    _smtp_send(
        cfg,
        to=from_address,
        subject="PRAXIS: SMTP connection test",
        body="This email confirms PRAXIS can send compliance notifications through your SMTP server.",
    )
    return {"message": f"Test email sent to {from_address}"}


def send_task_email(cfg: dict, *, to: str, title: str, obligation: str, deadline: str, action: str) -> None:
    subject = f"[PRAXIS] {action}: {title}"
    body = (
        f"PRAXIS compliance notification\n\n"
        f"Task: {title}\nObligation: {obligation}\nDeadline: {deadline}\n\n"
        f"Action: {action}.\n\nGenerated by PRAXIS — agentic compliance for SEBI-regulated intermediaries."
    )
    _smtp_send(cfg, to=to, subject=subject, body=body)


# ---------------------------------------------------------------------------
# Slack — single incoming webhook URL (no OAuth app review needed).
# ---------------------------------------------------------------------------

def post_slack_message(cfg: dict, text: str) -> None:
    webhook = (cfg.get("webhook_url") or "").strip()
    if not webhook:
        raise ProviderError("Slack webhook URL is required.")
    try:
        resp = httpx.post(webhook, json={"text": text}, timeout=15)
        if resp.status_code >= 400:
            raise ProviderError(f"Slack webhook rejected the message (HTTP {resp.status_code}).")
    except httpx.HTTPError as exc:
        raise ProviderError(f"Could not reach Slack webhook — {exc}") from exc


def test_slack(cfg: dict) -> dict:
    post_slack_message(cfg, "PRAXIS is now connected to this channel.")
    return {"message": "Test message posted to your Slack channel."}


def send_task_slack(cfg: dict, *, title: str, obligation: str, deadline: str, action: str, owner: str) -> None:
    post_slack_message(
        cfg,
        f"*[PRAXIS] {action}* · {title}\nObligation: {obligation}\nOwner: {owner}\nDeadline: {deadline}",
    )


# ---------------------------------------------------------------------------
# Jira — Cloud REST API v3, token tested via /myself on connect.
# ---------------------------------------------------------------------------

def _jira_auth(cfg: dict) -> tuple[str, dict]:
    site = (cfg.get("site") or "").rstrip("/")
    email = (cfg.get("email") or "").strip()
    token = cfg.get("api_token") or ""
    if not site or not email or not token:
        raise ProviderError("Jira site, email and API token are required.")
    raw = base64.b64encode(f"{email}:{token}".encode()).decode()
    return site, {"Authorization": f"Basic {raw}", "Accept": "application/json"}


def test_jira(cfg: dict) -> dict:
    site, headers = _jira_auth(cfg)
    try:
        resp = httpx.get(f"{site}/rest/api/3/myself", headers=headers, timeout=15)
    except httpx.HTTPError as exc:
        raise ProviderError(f"Could not reach {site} — {exc}") from exc
    if resp.status_code == 401:
        raise ProviderError("Jira rejected the credentials (HTTP 401). Check email and API token.")
    if resp.status_code != 200:
        raise ProviderError(f"Jira responded with HTTP {resp.status_code}.")
    display = resp.json().get("displayName") or resp.json().get("emailAddress") or "account"
    return {"message": f"Authenticated to Jira as {display}."}


def create_jira_issue(cfg: dict, *, summary: str, description: str) -> str:
    site, headers = _jira_auth(cfg)
    project_key = (cfg.get("project_key") or "PRAXIS").strip().upper()
    payload = {
        "fields": {
            "project": {"key": project_key},
            "summary": summary[:250],
            "description": description[:32_000],
            "issuetype": {"name": "Task"},
        }
    }
    try:
        resp = httpx.post(f"{site}/rest/api/3/issue", headers=headers, json=payload, timeout=20)
    except httpx.HTTPError as exc:
        raise ProviderError(f"Could not reach Jira — {exc}") from exc
    if resp.status_code != 201:
        raise ProviderError(f"Jira issue creation failed (HTTP {resp.status_code}).")
    return resp.json().get("key", "")


# ---------------------------------------------------------------------------
# Calendar .ics — RFC 5545 feed generated from live task/obligation deadlines.
# ---------------------------------------------------------------------------

def generate_feed_token() -> str:
    return secrets.token_urlsafe(24)


def build_ics_feed(session) -> str:
    """Build a full VCALENDAR from the same data powering the in-app calendar."""
    from sqlalchemy import select

    from db import models

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//PRAXIS Compliance//EN",
        "CALSCALE:GREGORIAN",
        "X-WR-CALNAME:PRAXIS Compliance Deadlines",
    ]
    now = _dt.datetime.now(_dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    tasks = list(session.scalars(select(models.Task).where(models.Task.deadline.isnot(None))))
    for t in tasks:
        lines.extend(_vevent(
            uid=f"task-{t.id}",
            dtstart=t.deadline.isoformat(),
            summary=f"[PRAXIS] {t.title}",
            description=f"Owner: {t.primary_owner}\nStatus: {t.status}\nObligation: {t.obligation_id}",
            stamp=now,
        ))

    obligations = list(session.scalars(select(models.Obligation).where(models.Obligation.deadline_hint.isnot(None))))
    for o in obligations:
        date = _parse_iso_date(o.deadline_hint)
        if not date:
            continue
        lines.extend(_vevent(
            uid=f"obligation-{o.id}",
            dtstart=date,
            summary=f"[PRAXIS] {o.description[:100]}",
            description=f"Functional area: {o.functional_area}\nStatus: {o.status}",
            stamp=now,
        ))

    lines.append("END:VCALENDAR")
    return "\r\n".join(lines) + "\r\n"


def _parse_iso_date(value: str) -> str | None:
    """Return an ISO yyyy-mm-dd if the hint is a real date, else None."""
    m = re.search(r"(20\d{2})-(\d{2})-(\d{2})", value or "")
    if not m:
        return None
    return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"


def _vevent(*, uid: str, dtstart: str, summary: str, description: str, stamp: str) -> list[str]:
    return [
        "BEGIN:VEVENT",
        f"UID:{uid}@praxis",
        f"DTSTAMP:{stamp}",
        f"DTSTART;VALUE=DATE:{dtstart.replace('-', '')}",
        f"SUMMARY:{_ics_escape(summary)}",
        f"DESCRIPTION:{_ics_escape(description)}",
        "END:VEVENT",
    ]


def _ics_escape(text: str) -> str:
    return (
        text.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\n", "\\n")
    )


# ---------------------------------------------------------------------------
# Google Drive — OAuth 2.0 (authorization-code) + Drive API v3 upload.
# ---------------------------------------------------------------------------

def drive_authorize_url(state: str) -> str:
    if not settings.drive_oauth_client_id:
        raise ProviderError("Google OAuth client is not configured (see README).")
    from urllib.parse import urlencode

    params = {
        "client_id": settings.drive_oauth_client_id,
        "redirect_uri": settings.drive_oauth_redirect_uri,
        "response_type": "code",
        "scope": settings.drive_oauth_scope,
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return f"{settings.drive_oauth_auth_uri}?{urlencode(params)}"


def drive_exchange_code(code: str) -> dict:
    resp = httpx.post(
        settings.drive_oauth_token_uri,
        data={
            "code": code,
            "client_id": settings.drive_oauth_client_id,
            "client_secret": settings.drive_oauth_client_secret,
            "redirect_uri": settings.drive_oauth_redirect_uri,
            "grant_type": "authorization_code",
        },
        timeout=20,
    )
    if resp.status_code != 200:
        raise ProviderError(f"Google token exchange failed (HTTP {resp.status_code}).")
    data = resp.json()
    if not data.get("refresh_token"):
        raise ProviderError("Google did not return a refresh token — re-run consent with prompt=consent.")
    return data


def _drive_access_token(cfg: dict) -> str:
    if cfg.get("access_token") and cfg.get("token_expires_at", 0) > int(_dt.datetime.now().timestamp()):
        return cfg["access_token"]
    refresh = cfg.get("refresh_token")
    if not refresh:
        raise ProviderError("Drive refresh token is missing — reconnect the integration.")
    resp = httpx.post(
        settings.drive_oauth_token_uri,
        data={
            "refresh_token": refresh,
            "client_id": settings.drive_oauth_client_id,
            "client_secret": settings.drive_oauth_client_secret,
            "grant_type": "refresh_token",
        },
        timeout=20,
    )
    if resp.status_code != 200:
        raise ProviderError("Google refresh token exchange failed — reconnect the integration.")
    data = resp.json()
    cfg["access_token"] = data["access_token"]
    cfg["token_expires_at"] = int(_dt.datetime.now().timestamp()) + int(data.get("expires_in", 3600)) - 60
    return data["access_token"]


def drive_upload(cfg: dict, *, filename: str, content_type: str, content: bytes, folder_name: str = "PRAXIS Evidence") -> dict:
    token = _drive_access_token(cfg)
    headers = {"Authorization": f"Bearer {token}"}

    def _find_folder() -> str | None:
        resp = httpx.get(
            "https://www.googleapis.com/drive/v3/files",
            params={"q": f"mimeType='application/vnd.google-apps.folder' and name='{folder_name}' and trashed=false"},
            headers=headers,
            timeout=20,
        )
        files = resp.json().get("files", []) if resp.status_code == 200 else []
        return files[0]["id"] if files else None

    folder_id = _find_folder()
    if not folder_id:
        meta = httpx.post(
            "https://www.googleapis.com/drive/v3/files",
            headers={**headers, "Content-Type": "application/json"},
            json={"name": folder_name, "mimeType": "application/vnd.google-apps.folder"},
            timeout=20,
        )
        if meta.status_code != 200:
            raise ProviderError("Could not create the PRAXIS folder in Drive.")
        folder_id = meta.json()["id"]

    files = httpx.post(
        f"https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        headers={"Authorization": f"Bearer {token}"},
        files={
            "metadata": (None, f'{{"name": "{filename}", "parents": ["{folder_id}"]}}', "application/json"),
            "file": (filename, content, content_type),
        },
        timeout=60,
    )
    if files.status_code != 200:
        raise ProviderError(f"Drive upload failed (HTTP {files.status_code}).")
    return {"file_id": files.json().get("id"), "folder_id": folder_id}


def test_drive(cfg: dict) -> dict:
    token = _drive_access_token(cfg)
    resp = httpx.get(
        "https://www.googleapis.com/drive/v3/files",
        params={"pageSize": 1},
        headers={"Authorization": f"Bearer {token}"},
        timeout=20,
    )
    if resp.status_code != 200:
        raise ProviderError(f"Drive API check failed (HTTP {resp.status_code}).")
    return {"message": "Connected to Google Drive."}


# ---------------------------------------------------------------------------
# DocuSign — eSignature sandbox via JWT grant (jose RS256 + httpx).
# ---------------------------------------------------------------------------

def _docusign_token(cfg: dict) -> str:
    from jose import jwt

    now = int(_dt.datetime.now().timestamp())
    assertion = jwt.encode(
        {
            "iss": cfg.get("integration_key") or settings.docusign_integration_key,
            "sub": cfg.get("user_id") or settings.docusign_user_id,
            "aud": settings.docusign_auth_base,
            "iat": now,
            "exp": now + 3600,
            "scope": "signature",
        },
        (cfg.get("private_key") or settings.docusign_private_key),
        algorithm="RS256",
    )
    resp = httpx.post(
        f"{settings.docusign_auth_base}/oauth/token",
        data={"grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": assertion},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=20,
    )
    if resp.status_code != 200:
        raise ProviderError(f"DocuSign JWT grant failed (HTTP {resp.status_code}).")
    return resp.json()["access_token"]


def test_docusign(cfg: dict) -> dict:
    token = _docusign_token(cfg)
    account_id = cfg.get("account_id") or settings.docusign_account_id
    resp = httpx.get(
        f"{settings.docusign_rest_base}/v2.1/accounts/{account_id}/account",
        headers={"Authorization": f"Bearer {token}"},
        timeout=20,
    )
    if resp.status_code != 200:
        raise ProviderError(f"DocuSign account check failed (HTTP {resp.status_code}).")
    name = resp.json().get("accountName") or account_id
    return {"message": f"Connected to DocuSign sandbox account {name}."}


def create_docusign_envelope(
    cfg: dict, *, pdf_bytes: bytes, filename: str, signer_email: str, signer_name: str, subject: str
) -> str:
    import json as _json

    token = _docusign_token(cfg)
    account_id = cfg.get("account_id") or settings.docusign_account_id
    base64_pdf = base64.b64encode(pdf_bytes).decode()
    doc = {
        "documentBase64": base64_pdf,
        "documentId": "1",
        "fileExtension": "pdf",
        "name": filename,
    }
    envelope = {
        "emailSubject": subject[:200],
        "documents": [doc],
        "status": "sent",
        "recipients": {
            "signers": [{"email": signer_email, "name": signer_name, "recipientId": "1", "routingOrder": "1"}]
        },
    }
    resp = httpx.post(
        f"{settings.docusign_rest_base}/v2.1/accounts/{account_id}/envelopes",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        content=_json.dumps(envelope),
        timeout=60,
    )
    if resp.status_code != 201:
        raise ProviderError(f"DocuSign envelope creation failed (HTTP {resp.status_code}).")
    return resp.json()["envelopeId"]


# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# LDAP / Active Directory — real test bind using ldap3
# ---------------------------------------------------------------------------

def test_ldap(cfg: dict) -> dict:
    import ldap3
    server_url = (cfg.get("server") or "").strip()
    bind_dn = (cfg.get("bind_dn") or "").strip()
    password = cfg.get("bind_password") or ""
    if not server_url or not bind_dn:
        raise ProviderError("LDAP server URL and Bind DN are required.")
    try:
        server = ldap3.Server(server_url, connect_timeout=5)
        conn = ldap3.Connection(server, user=bind_dn, password=password, auto_bind=True)
        user_base = (cfg.get("user_base") or "").strip()
        if user_base:
            conn.search(search_base=user_base, search_filter='(objectClass=*)', attributes=['cn'])
            count = len(conn.entries)
            return {"message": f"Connected to LDAP. Found {count} entries in search base."}
        return {"message": "Connected to LDAP server."}
    except Exception as exc:
        raise ProviderError(f"LDAP connection failed: {exc}")


# ---------------------------------------------------------------------------
# Dispatch table
# ---------------------------------------------------------------------------

def test_connection(type_: str, cfg: dict) -> dict:
    """Run the real test-on-connect for a provider. Raises ProviderError on failure."""
    if type_ == "email":
        return test_email(cfg)
    if type_ == "slack":
        return test_slack(cfg)
    if type_ == "jira":
        return test_jira(cfg)
    if type_ == "calendar":
        return {"message": "Calendar feed is live — subscribe with the URL above."}
    if type_ == "drive":
        return test_drive(cfg)
    if type_ == "docusign":
        return test_docusign(cfg)
    if type_ == "ldap":
        return test_ldap(cfg)
    raise ProviderError(f"Unknown integration type: {type_}")


def summarize(type_: str, cfg: dict) -> str:
    """Redacted, human-readable summary of what a connection is pointed at."""
    if type_ == "email":
        return (cfg.get("from_address") or "").strip() or (cfg.get("host") or "").strip()
    if type_ == "slack":
        # Show the webhook's host so it's visibly a real endpoint, never the token.
        url = (cfg.get("webhook_url") or "").strip()
        if not url:
            return ""
        host = url.split("://", 1)[-1].split("/", 1)[0]
        return f"Slack · {host}" if host else "Slack webhook"
    if type_ == "jira":
        return (cfg.get("site") or "").rstrip("/")
    if type_ == "calendar":
        return "Live .ics feed"
    if type_ == "drive":
        return "Google Drive (PRAXIS folder)"
    if type_ == "docusign":
        account = (cfg.get("account_id") or "").strip()
        return f"DocuSign sandbox · {account}" if account else "DocuSign sandbox"
    if type_ == "ldap":
        server = (cfg.get("server") or "").strip()
        if server:
            host = server.split("://", 1)[-1].split("/", 1)[0]
            return f"LDAP · {host}"
        return "LDAP server"
    return ""
