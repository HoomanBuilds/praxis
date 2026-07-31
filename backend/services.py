"""Orchestration layer binding the LangGraph pipeline to persistence.

The CLI, the Redis worker and the FastAPI app all drive the system through these functions
so behaviour (and audit logging) is identical regardless of entry point. The two-phase,
human-in-the-loop flow is enforced here: ``process_document`` produces obligations that are
*pending review*; ``generate_for_document`` only acts on obligations a human has approved
(unless ``auto_approve`` is set for demos/tests).
"""
from __future__ import annotations

import hashlib
import shutil
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from agents import obligation_extraction, parser, regulation_extraction
from config import settings
from db import crud, models
from graph import pipeline
from preprocessing import classifier, document_type, fingerprint
from rag import corpus_index
from schemas import (
    FunctionalArea,
    ModificationType,
    Obligation,
    ObligationStatus,
)


# ---------------------------------------------------------------------------
# Ingestion
# ---------------------------------------------------------------------------


def _hash_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(65536), b""):
            h.update(block)
    return h.hexdigest()


def ingest_file(
    session: Session,
    source_path: str,
    *,
    reference: str = "",
    title: str = "",
    source_url: str = "",
    actor: str = "ingestion",
) -> tuple[models.Document, bool]:
    """Store a document immutably and create its record. Returns (document, created)."""
    content_hash = _hash_file(source_path)
    existing = crud.find_document_by_hash(session, content_hash)
    if existing:
        return existing, False  # dedup (§5.2.1)

    Path(settings.doc_store_path).mkdir(parents=True, exist_ok=True)
    dest = Path(settings.doc_store_path) / f"{content_hash[:16]}_{Path(source_path).name}"
    if Path(source_path).resolve() != dest.resolve():
        shutil.copy2(source_path, dest)

    doc = crud.create_document(
        session,
        reference=reference or Path(source_path).stem,
        title=title or Path(source_path).stem.replace("_", " ").title(),
        file_path=str(dest),
        content_hash=content_hash,
        source_url=source_url,
        actor=actor,
    )
    return doc, True


# ---------------------------------------------------------------------------
# Phase A — extraction
# ---------------------------------------------------------------------------


def process_document(session: Session, document_id: str) -> dict:
    """Phase A — the scale-aware pre-processing funnel:

        parse → classify (drop non-regulatory) → diff (skip unchanged, master circulars)
              → hybrid extract (deterministic regex / LLM) → persist obligations.
    """
    doc = crud.get_document(session, document_id)
    if not doc:
        raise ValueError(f"Document {document_id} not found")

    # Idempotent re-processing: drop only pending/rejected extractions (cascades to rules/tasks/evidence).
    # Approved/edited obligations are preserved to avoid data loss.
    for stale in crud.list_obligations(session, document_id=doc.id):
        if stale.status not in (ObligationStatus.APPROVED.value, ObligationStatus.EDITED.value):
            crud.delete_obligation(session, stale)
    session.flush()

    crud.set_document_status(session, doc, "extracting")

    # 1. Parse + structure.
    parsed = parser.parse_document(doc.file_path)
    doc.parse_quality = parsed.parse_quality
    doc.used_ocr = parsed.used_ocr
    doc.page_count = parsed.page_count

    if parsed.parse_quality < settings.parse_quality_min:
        doc.status = "needs_human_parse"
        doc.error = f"Parse quality {parsed.parse_quality} below {settings.parse_quality_min}"
        session.flush()
        return {"document_id": doc.id, "status": doc.status, "parse_quality": parsed.parse_quality}

    # 2. Document type + family (drives incremental processing).
    doc_type = document_type.detect_document_type(parsed, doc.title, doc.reference)
    family = document_type.family_key(doc.title, doc.reference)
    doc.document_type = doc_type.value
    doc.family_key = family

    # 3. Candidate filter — drop TOC / definitions / annexures / recitals (no AI).
    candidates, classify_tally = classifier.filter_candidates(parsed.sections)

    # 4. Diff engine — for master circulars, process only new/changed sections.
    if doc_type == document_type.DocumentType.MASTER_CIRCULAR:
        diff = fingerprint.diff_sections(session, family, candidates)
        to_process = diff.to_process
        diff_stats = diff.stats()
    else:
        to_process = candidates
        diff_stats = {"new": len(candidates), "changed": 0, "unchanged_skipped": 0}

    # 5. Regulatory context (one LLM call) + 6. hybrid obligation extraction.
    context = regulation_extraction.extract_regulatory_context(parsed, doc.reference)
    doc.regulatory_context = context.model_dump(mode="json")
    obligations, extract_stats = obligation_extraction.extract_obligations(doc.id, to_process, context)

    # 7. Persist obligations + index for cross-reference search.
    flagged_identifiers = []
    for ob in obligations:
        row = crud.create_obligation(session, ob)
        if ob.needs_review:
            flagged_identifiers.append(ob.identifier)
        corpus_index.index_obligation(
            row.id, ob.description,
            {"document_id": doc.id, "identifier": ob.identifier, "functional_area": ob.functional_area.value},
        )

    # Notify connected channels (email/Slack) that obligations need human review.
    if flagged_identifiers:
        from integrations import notify
        notify.notify_obligations_flagged(len(flagged_identifiers), flagged_identifiers)

    # 8. Store fingerprints so the next release of this family diffs correctly.
    fingerprint.store_fingerprints(session, family, doc.id, candidates)

    funnel = {
        "document_type": doc_type.value,
        "total_sections": len(parsed.sections),
        "classified": classify_tally,
        "candidates": len(candidates),
        "diff": diff_stats,
        "sections_sent_to_extractor": len(to_process),
        **extract_stats,
        "llm_calls": extract_stats["llm_sections"] + 1,  # + the regulatory-context call
    }
    doc.funnel = funnel
    doc.status = "awaiting_review"
    session.flush()

    return {
        "document_id": doc.id,
        "status": doc.status,
        "obligations": len(obligations),
        "flagged_for_review": [o.identifier for o in obligations if o.needs_review],
        "parse_quality": doc.parse_quality,
        "funnel": funnel,
    }


# ---------------------------------------------------------------------------
# Phase B — generation (post human approval)
# ---------------------------------------------------------------------------


def _orm_to_schema(o: models.Obligation) -> Obligation:
    """Convert a persisted obligation to a schema object for Phase B. The DB id is used as
    the identifier so generated rules/tasks/evidence reference a valid foreign key."""
    return Obligation(
        identifier=o.id,
        document_id=o.document_id,
        description=o.description,
        source_text=o.source_text,
        source_paragraph_ref=o.source_paragraph_ref,
        functional_area=FunctionalArea(o.functional_area),
        modification_type=ModificationType(o.modification_type),
        confidence=o.confidence,
        deadline_hint=o.deadline_hint,
        status=ObligationStatus(o.status),
        needs_review=o.needs_review,
    )


def approve_all_pending(session: Session, document_id: str, reviewer: str = "auto_approver") -> int:
    pending = crud.list_obligations(
        session, document_id=document_id, status=ObligationStatus.PENDING_REVIEW.value
    )
    for ob in pending:
        crud.review_obligation(session, ob, approve=True, reviewer=reviewer, note="auto-approved")
    return len(pending)


def generate_for_document(
    session: Session, document_id: str, *, auto_approve: bool = False, actor: str = "compliance_officer"
) -> dict:
    doc = crud.get_document(session, document_id)
    if not doc:
        raise ValueError(f"Document {document_id} not found")

    if auto_approve:
        approve_all_pending(session, document_id, reviewer=actor)

    approved = crud.approved_obligations(session, document_id)
    if not approved:
        return {"document_id": document_id, "status": doc.status, "message": "No approved obligations to generate from."}

    crud.set_document_status(session, doc, "generating")
    effective_date = (doc.regulatory_context or {}).get("effective_date")

    schema_obligations = [_orm_to_schema(o) for o in approved]
    state = pipeline.run_generation(schema_obligations, effective_date)

    # Idempotent Phase B: drop any artifacts from a previous generate run first.
    for ob in approved:
        crud.reset_artifacts(session, ob.id)
    for obligation_id, rule in state.rules.items():
        crud.create_rule(session, obligation_id, rule)
    from integrations import notify
    for task in state.tasks:
        crud.create_task(session, task)
        notify.notify_task_created(task)
    for req in state.evidence:
        crud.create_evidence_requirement(session, req)

    doc.status = "completed"
    session.flush()
    return {
        "document_id": document_id,
        "status": doc.status,
        "obligations_processed": len(approved),
        "rules": len(state.rules),
        "tasks": len(state.tasks),
        "evidence_requirements": len(state.evidence),
        "logs": state.logs,
    }
