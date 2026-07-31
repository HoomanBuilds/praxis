"""Integration tests: crypto round-trip, connect/disconnect status transitions,
the private .ics feed, ICS escaping, and the structural "no secrets in GET" rule.
Providers are mocked at the seam (``providers.test_connection``) so tests run hermetically;
what they assert is the *state machine* around connections plus the storage/transport rules.
"""
from __future__ import annotations

from fastapi.testclient import TestClient

import pytest
from integrations import providers
from integrations.crypto import decrypt_config, encrypt_config
from db import crud, models
from db.session import session_scope


@pytest.fixture(autouse=True)
def _clean_integrations():
    yield
    from sqlalchemy import select
    with session_scope() as s:
        for row in list(s.scalars(select(models.Integration))):
            s.delete(row)


def test_crypto_round_trip():
    blob = encrypt_config({"webhook_url": "https://hooks.slack.com/T_SECRET", "password": "hunter2"})
    assert blob and blob != '{"webhook_url": "https://hooks.slack.com/T_SECRET"}'
    assert decrypt_config(blob) == {"webhook_url": "https://hooks.slack.com/T_SECRET", "password": "hunter2"}
    assert decrypt_config(None) == {}
    assert decrypt_config("not-a-fernet-blob") == {}


def test_email_connect_success_then_disconnect(monkeypatch):
    monkeypatch.setattr(providers, "test_connection", lambda type_, cfg: {"message": "test email sent"})
    client = TestClient(_app())
    r = client.post("/api/integrations/email/connect", json={"fields": {
        "host": "smtp.example.com", "port": "587",
        "username": "notify@example.com", "password": "s3cr3t-app-pw",
        "from_address": "noreply@example.com",
    }})
    assert r.status_code == 200
    assert r.json()["status"] == "connected"

    state = {i["type"]: i for i in client.get("/api/integrations").json()}
    assert state["email"]["status"] == "connected"
    assert state["email"]["configured_as"] == "noreply@example.com"

    d = client.post("/api/integrations/email/disconnect")
    assert d.status_code == 200
    state = {i["type"]: i for i in client.get("/api/integrations").json()}
    assert state["email"]["status"] == "not_connected"


def test_first_connect_failure_keeps_card_not_connected(monkeypatch):
    """A failed *first* connect returns the message to the dialog but must not flip
    a never-connected card to Error — that badge means 'was connected, now broken'."""
    def boom(type_, cfg):
        raise providers.ProviderError("Slack webhook URL is required.")
    monkeypatch.setattr(providers, "test_connection", boom)
    client = TestClient(_app())
    r = client.post("/api/integrations/slack/connect", json={"fields": {"webhook_url": ""}})
    assert r.status_code == 200
    assert r.json()["ok"] is False
    assert "Slack webhook URL is required" in r.json()["message"]
    state = {i["type"]: i for i in client.get("/api/integrations").json()}
    assert state["slack"]["status"] == "not_connected"
    assert state["slack"]["last_error"] is None


def test_reconnect_failure_marks_previously_connected_card_error(monkeypatch):
    """A card that WAS connected and then fails a reconnect must flip to Error
    with a human-readable reason so the badge reflects the broken connection."""
    monkeypatch.setattr(providers, "test_connection", lambda type_, cfg: {"message": "ok"})
    client = TestClient(_app())
    client.post("/api/integrations/email/connect", json={"fields": {
        "host": "smtp.example.com", "port": "587", "username": "", "password": "",
        "from_address": "noreply@example.com",
    }})

    def boom(type_, cfg):
        raise providers.ProviderError("Connection refused to smtp.example.com:587")
    monkeypatch.setattr(providers, "test_connection", boom)
    r = client.post("/api/integrations/email/connect", json={"fields": {
        "host": "smtp.example.com", "port": "587", "username": "", "password": "",
        "from_address": "noreply@example.com",
    }})
    assert r.json()["ok"] is False
    state = {i["type"]: i for i in client.get("/api/integrations").json()}
    assert state["email"]["status"] == "error"
    assert "Connection refused" in state["email"]["last_error"]


def test_get_integrations_never_returns_config_or_secrets(monkeypatch):
    monkeypatch.setattr(providers, "test_connection", lambda type_, cfg: {"message": "ok"})
    client = TestClient(_app())
    secret = "super-sensitive-app-password-9f2c"
    client.post("/api/integrations/email/connect", json={"fields": {
        "host": "smtp.example.com", "port": "587", "username": "u@example.com",
        "password": secret, "from_address": "noreply@example.com",
    }})
    body = client.get("/api/integrations").text
    assert secret not in body
    assert '"config"' not in body


def test_get_integrations_lists_all_types():
    client = TestClient(_app())
    types = {i["type"] for i in client.get("/api/integrations").json()}
    assert types == {"email", "slack", "jira", "calendar", "docusign", "drive", "sso"}
    drive = next(i for i in client.get("/api/integrations").json() if i["type"] == "drive")
    assert drive["status"] == "not_connected"


def test_calendar_feed_token_flow(monkeypatch):
    monkeypatch.setattr(providers, "test_connection", lambda type_, cfg: {"message": "feed live"})
    client = TestClient(_app())
    r = client.post("/api/integrations/calendar/connect", json={"fields": {}})
    assert r.status_code == 200
    data = r.json()
    assert data["feed_url"].startswith("/api/calendar/feed.ics?token=")
    good = data["feed_url"].split("token=")[1]

    assert client.get("/api/calendar/feed.ics", params={"token": "bad-token"}).status_code == 403
    feed = client.get("/api/calendar/feed.ics", params={"token": good})
    assert feed.status_code == 200
    assert feed.headers["content-type"].startswith("text/calendar")
    assert "BEGIN:VCALENDAR" in feed.text
    assert "END:VCALENDAR" in feed.text

    client.post("/api/integrations/calendar/disconnect")
    assert client.get("/api/calendar/feed.ics", params={"token": good}).status_code == 404


def test_ics_escaping(seeded_with_task):
    from sqlalchemy import select
    with session_scope() as s:
        t = s.scalar(select(models.Task).where(models.Task.id == seeded_with_task["task_id"]))
        t.title = 'Comma, semicolon; and "quotes" — board resolution'
        t.deadline = _dt(2026, 12, 31, 0, 0, 0)
        s.flush()
        feed = providers.build_ics_feed(s)

    assert 'Comma\\, semicolon\\;' in feed
    assert 'DTSTART;VALUE=DATE:20261231' in feed
    assert feed.count("BEGIN:VEVENT") == feed.count("END:VEVENT")
    assert "\\" not in feed.replace("\\,", "").replace("\\;", "").replace("\\n", "").replace("\\\\", "")


def test_evidence_upload_lands_on_local_disk(monkeypatch, tmp_path, seeded_with_task):
    import api.routes_compliance as rc
    monkeypatch.setattr(rc, "REPO_ROOT", tmp_path)
    client = TestClient(_app())
    req_id = seeded_with_task["requirement_id"]
    r = client.post(
        f"/api/evidence/{req_id}/upload",
        files={"file": ("board_resolution.pdf", b"%PDF-1.4 fake", "application/pdf")},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["target"] == "local"
    assert body["file_name"] == "board_resolution.pdf"
    assert (tmp_path / "data" / "evidence" / seeded_with_task["ob_id"] / "board_resolution.pdf").exists()

    ev = client.get("/api/evidence").json()
    row = [e for e in ev if e["id"] == req_id][0]
    assert row["upload_target"] == "local"
    assert row["file_name"] == "board_resolution.pdf"


def test_evidence_upload_falls_back_to_local_when_drive_fails(monkeypatch, tmp_path, seeded_with_task):
    import api.routes_compliance as rc
    monkeypatch.setattr(rc, "REPO_ROOT", tmp_path)
    with session_scope() as s:
        crud.set_integration(
            s, "drive",
            config_encrypted=encrypt_config({"refresh_token": "dummy"}), configured_as="Google Drive",
        )
        row = crud.get_integration(s, "drive")
        row.status = "connected"
        s.flush()
    monkeypatch.setattr(providers, "drive_upload", lambda *a, **k: (_ for _ in ()).throw(providers.ProviderError("Google 403")))
    client = TestClient(_app())
    r = client.post(
        f"/api/evidence/{seeded_with_task['requirement_id']}/upload",
        files={"file": ("note.txt", b"hello", "text/plain")},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["target"] == "local"
    assert "Drive upload failed" in body["note"]


def test_overdue_sweep_notifies_once(monkeypatch, seeded_with_task):
    """The overdue sweep must handle raw ORM rows (no double-snapshot) and fire a
    single notification per task (guarded by overdue_notified_at)."""
    from datetime import datetime as _dt, timezone as _tz, timedelta
    from sqlalchemy import select
    sent: list[tuple] = []

    def fake_send(cfg, *, to, title, obligation, deadline, action):
        sent.append((to, title, action))

    monkeypatch.setattr(providers, "send_task_email", fake_send)

    class SyncThread:
        def __init__(self, target=None, **kwargs):
            self._target = target

        def start(self):
            self._target()

    from integrations import notify
    monkeypatch.setattr(notify.threading, "Thread", SyncThread)

    with session_scope() as s:
        crud.set_integration(
            s, "email",
            config_encrypted=encrypt_config({
                "host": "smtp.example.com", "port": "587",
                "username": "", "password": "", "from_address": "noreply@example.com",
            }),
            configured_as="noreply@example.com",
        )

    with session_scope() as s:
        t = s.scalar(select(models.Task).where(models.Task.id == seeded_with_task["task_id"]))
        t.deadline = _dt.now(_tz.utc) - timedelta(days=1)
        s.flush()

    from integrations import notify
    assert notify.check_overdue_and_notify() == [seeded_with_task["task_id"]]
    assert notify.check_overdue_and_notify() == []
    assert len(sent) == 1
    assert sent[0][0] == "cco@example.com"
    assert "overdue" in sent[0][2]


def _app():
    from api.main import app
    return app


from datetime import datetime as _dt  # noqa: E402


@pytest.fixture
def seeded_with_task():
    """One obligation with a rule, a task and an evidence requirement."""
    import schemas
    with session_scope() as s:
        doc = crud.create_document(
            s, reference="SEBI/TEST/CIR/2026/2", title="Test Circular 2",
            file_path="/tmp/test2.pdf", content_hash="inthash-" + str(id(s)),
        )
        ob = crud.create_obligation(
            s,
            schemas.Obligation(
                identifier="TST-OB-002", document_id=doc.id,
                description="File a confirmation by December 31.",
                source_text="...shall file a confirmation...", source_paragraph_ref="2",
                functional_area="compliance", confidence=0.9, needs_review=True,
            ),
        )
        rule = models.Rule(
            obligation_id=ob.id, rule_type="deadline", evaluation_criterion="filed before deadline",
            timeline="yearly", threshold_value=None,
        )
        s.add(rule)
        s.flush()
        task = models.Task(
            obligation_id=ob.id, rule_id=rule.id, title="File confirmation",
            description="Submit to the exchange", functional_area="compliance",
            primary_owner="CCO", owner_email="cco@example.com", reviewer="Compliance",
            workflow_template="filing", deadline=_dt(2026, 12, 31), status="todo",
        )
        s.add(task)
        s.flush()
        req = models.EvidenceRequirement(
            obligation_id=ob.id, document_type="Board resolution", required_content="Signed copy",
            collector="Legal", retention_period="5 years",
        )
        s.add(req)
        s.flush()
        return {"ob_id": ob.id, "task_id": task.id, "requirement_id": req.id}
