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
    assert len(r.json()) == 2
    r2 = client.get("/api/obligations", params={"functional_area": "technology"})
    assert any(o["identifier"] == "TST-OB-002" for o in r2.json())


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
