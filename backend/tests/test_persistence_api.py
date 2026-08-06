import pytest
from fastapi.testclient import TestClient

import schemas
from api.main import app
from db import crud, models
from db.session import session_scope


@pytest.fixture
def seeded():
    """Seed a document with two obligations, a rule and a task; return key ids."""
    with session_scope() as s:
        doc = crud.create_document(
            s, reference="SEBI/TEST/CIR/2026/1", title="Test Circular",
            file_path="/tmp/test.pdf", content_hash="seedhash-" + str(id(s)),
        )
        ob = crud.create_obligation(
            s,
            schemas.Obligation(
                identifier="TST-OB-001", document_id=doc.id,
                description="The broker shall file a confirmation by April 30.",
                source_text="...shall file a confirmation...", source_paragraph_ref="6",
                functional_area=schemas.FunctionalArea.COMPLIANCE, confidence=0.9, needs_review=True,
            ),
        )
        ob2 = crud.create_obligation(
            s,
            schemas.Obligation(
                identifier="TST-OB-002", document_id=doc.id,
                description="Maintain audit logs for two years.",
                source_text="...maintain audit logs...", source_paragraph_ref="5",
                functional_area=schemas.FunctionalArea.TECHNOLOGY, confidence=0.95,
            ),
        )
        return {"doc_id": doc.id, "ob_id": ob.id, "ob2_id": ob2.id}


def test_obligation_extraction_writes_audit_log(seeded):
    with session_scope() as s:
        rows = [a for a in s.query(models.AuditLog).filter_by(resource_id=seeded["ob_id"])]
        assert any(r.action == "obligation.extracted" for r in rows)


def test_review_obligation_sets_status_and_audit(seeded):
    with session_scope() as s:
        ob = crud.get_obligation(s, seeded["ob_id"])
        crud.review_obligation(s, ob, approve=True, reviewer="cco", note="looks good")
        assert ob.status == schemas.ObligationStatus.APPROVED.value
        assert ob.reviewer == "cco"
    with session_scope() as s:
        actions = [a.action for a in s.query(models.AuditLog).filter_by(resource_id=seeded["ob_id"])]
        assert "obligation.approved" in actions


def test_api_list_and_filter_obligations(seeded):
    client = TestClient(app)
    r = client.get("/api/obligations", params={"document_id": seeded["doc_id"]})
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 2
    assert len(body["items"]) == 2
    r2 = client.get("/api/obligations", params={"functional_area": "technology"})
    assert any(o["identifier"] == "TST-OB-002" for o in r2.json()["items"])


def test_api_approve_endpoint(seeded):
    client = TestClient(app)
    r = client.post(f"/api/obligations/{seeded['ob2_id']}/approve", json={"reviewer": "cco"})
    assert r.status_code == 200
    assert r.json()["status"] == "approved"


def test_api_dashboard_summary(seeded):
    client = TestClient(app)
    r = client.get("/api/dashboard/summary")
    assert r.status_code == 200
    body = r.json()
    assert body["total_obligations"] >= 2
    assert "compliance_score" in body
    assert body["audit_log_entries"] > 0


def test_calendar_separates_dates_from_relative_timing(seeded):
    with session_scope() as session:
        dated = crud.get_obligation(session, seeded["ob_id"])
        relative = crud.get_obligation(session, seeded["ob2_id"])
        dated.deadline_hint = "Complete by 2026-08-19"
        relative.deadline_hint = "within 10 working days"

    response = TestClient(app).get(
        "/api/calendar",
        params={"from": "2026-08-01", "to": "2026-08-31"},
    )

    assert response.status_code == 200
    body = response.json()
    dated_event = next(event for event in body["events"] if event["id"] == seeded["ob_id"])
    unscheduled = next(item for item in body["unscheduled"] if item["id"] == seeded["ob2_id"])
    assert dated_event["date"] == "2026-08-19"
    assert unscheduled["timing_hint"] == "within 10 working days"
    assert all(event["date"] != "within 10 working days" for event in body["events"])


def test_api_audit_report_no_files(seeded):
    client = TestClient(app)
    # approve so it appears as covered, then request a package without file exports
    client.post(f"/api/obligations/{seeded['ob_id']}/approve", json={"reviewer": "cco"})
    r = client.post(
        "/api/audit/report",
        json={"scope": "document", "document_id": seeded["doc_id"], "formats": []},
    )
    assert r.status_code == 200
    assert r.json()["obligation_count"] == 2


def test_document_processing_request_is_idempotent(monkeypatch):
    with session_scope() as session:
        doc = crud.create_document(
            session,
            reference="SEBI/TEST/QUEUE/1",
            title="Queue Test",
            file_path="/tmp/queue-test.pdf",
            content_hash="queue-test-hash",
        )
        document_id = doc.id

    processed = []
    monkeypatch.setattr("api.routes_documents._run_process_in_bg", lambda doc_id: processed.append(doc_id))
    client = TestClient(app)

    first = client.post(f"/api/documents/{document_id}/process")
    second = client.post(f"/api/documents/{document_id}/process")

    assert first.status_code == 200
    assert first.json()["status"] == "queued"
    assert second.status_code == 200
    assert second.json()["status"] == "queued"
    assert processed == [document_id]
    with session_scope() as session:
        assert crud.get_document(session, document_id).status == "queued"
