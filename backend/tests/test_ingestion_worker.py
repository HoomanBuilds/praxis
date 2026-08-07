from db import crud
from db.session import session_scope
from ingestion import worker


def test_interrupted_documents_become_retryable():
    with session_scope() as session:
        interrupted = crud.create_document(
            session,
            reference="SEBI/WORKER/INTERRUPTED",
            title="Interrupted regulation",
            file_path="/tmp/interrupted-regulation.pdf",
            content_hash="worker-interrupted-document",
        )
        interrupted.status = "extracting"
        interrupted_id = interrupted.id
        queued = crud.create_document(
            session,
            reference="SEBI/WORKER/QUEUED",
            title="Queued regulation",
            file_path="/tmp/queued-regulation.pdf",
            content_hash="worker-queued-document",
        )
        queued.status = "queued"
        queued_id = queued.id

    assert worker._recover_interrupted_documents() >= 1

    with session_scope() as session:
        interrupted = crud.get_document(session, interrupted_id)
        queued = crud.get_document(session, queued_id)
        assert interrupted.status == "extraction_failed"
        assert "Select Retry" in interrupted.error
        assert queued.status == "queued"
