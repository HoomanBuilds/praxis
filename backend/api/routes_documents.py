"""Document ingestion and pipeline-trigger endpoints (§5.2.1, user workflow steps 1-5)."""
from __future__ import annotations

import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

import services
from api.serializers import document_to_dict
from db import crud
from db.session import get_db

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.post("/ingest")
async def ingest(
    file: UploadFile,
    reference: str = Query(""),
    title: str = Query(""),
    process: bool = Query(False, description="Run Phase A synchronously instead of queueing"),
    session: Session = Depends(get_db),
):
    suffix = Path(file.filename or "upload.pdf").suffix or ".pdf"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    doc, created = services.ingest_file(session, tmp_path, reference=reference, title=title)
    session.commit()

    queued = False
    if process:
        result = services.process_document(session, doc.id)
        session.commit()
        return {"document": document_to_dict(doc), "created": created, "processed": result}

    try:
        from ingestion.service import publish_process_event

        publish_process_event(doc.id)
        queued = True
    except Exception:
        queued = False  # no Redis available; caller can POST /{id}/process

    return {"document": document_to_dict(doc), "created": created, "queued": queued}


@router.get("")
def list_documents(session: Session = Depends(get_db)):
    return [document_to_dict(d) for d in crud.list_documents(session)]


@router.get("/{document_id}")
def get_document(document_id: str, session: Session = Depends(get_db)):
    doc = crud.get_document(session, document_id)
    if not doc:
        raise HTTPException(404, "Document not found")
    return document_to_dict(doc)


@router.get("/{document_id}/file")
def get_document_file(document_id: str, session: Session = Depends(get_db)):
    doc = crud.get_document(session, document_id)
    if not doc or not Path(doc.file_path).exists():
        raise HTTPException(404, "File not found")
    return FileResponse(doc.file_path, media_type="application/pdf", filename=Path(doc.file_path).name)


@router.post("/{document_id}/process")
def process(document_id: str, session: Session = Depends(get_db)):
    """Run Phase A (extraction) synchronously — no-worker path."""
    try:
        result = services.process_document(session, document_id)
        session.commit()
        return result
    except ValueError as exc:
        raise HTTPException(404, str(exc))


@router.post("/{document_id}/generate")
def generate(
    document_id: str,
    auto_approve: bool = Query(False),
    session: Session = Depends(get_db),
):
    """Run Phase B (rule → workflow → evidence) on approved obligations."""
    try:
        result = services.generate_for_document(session, document_id, auto_approve=auto_approve)
        session.commit()
        return result
    except ValueError as exc:
        raise HTTPException(404, str(exc))
