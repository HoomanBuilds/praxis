"""Persistence helpers + audit logging.

Thin functions over the ORM that keep the pipeline, worker and API in sync, and ensure
every mutating action writes an append-only ``audit_log`` row (§10.3). The pipeline never
talks to the ORM directly; it goes through these helpers so audit logging is centralised.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

import schemas
from db import models


# ---------------------------------------------------------------------------
# Audit
# ---------------------------------------------------------------------------


def record_audit(
    session: Session,
    *,
    action: str,
    resource_type: str,
    resource_id: str,
    actor: str = "system",
    before: Optional[dict] = None,
    after: Optional[dict] = None,
    prompt_version: Optional[str] = None,
    prompt_hash: Optional[str] = None,
) -> models.AuditLog:
    entry = models.AuditLog(
        action=action,
        actor=actor,
        resource_type=resource_type,
        resource_id=resource_id,
        before=before,
        after=after,
    )
    session.add(entry)
    return entry


def create_comment(session: Session, obligation_id: str, author: str, body: str) -> models.ObligationComment:
    row = models.ObligationComment(obligation_id=obligation_id, author=author or "compliance_officer", body=body)
    session.add(row)
    session.flush()
    record_audit(
        session, action="comment.added", resource_type="obligation", resource_id=obligation_id,
        actor=author or "compliance_officer", after={"comment": body[:200]},
    )
    return row


def list_comments(session: Session, obligation_id: str) -> list[models.ObligationComment]:
    return list(
        session.scalars(
            select(models.ObligationComment)
            .where(models.ObligationComment.obligation_id == obligation_id)
            .order_by(models.ObligationComment.created_at.asc())
        )
    )


def list_activity(
    session: Session, limit: int = 60, resource_id: Optional[str] = None
) -> list[models.AuditLog]:
    """Recent audit-log entries, newest first — the source of the live activity feed."""
    stmt = select(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).limit(limit)
    if resource_id:
        stmt = (
            select(models.AuditLog)
            .where(models.AuditLog.resource_id == resource_id)
            .order_by(models.AuditLog.timestamp.desc())
            .limit(limit)
        )
    return list(session.scalars(stmt))


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------


def create_document(
    session: Session,
    *,
    reference: str,
    title: str,
    file_path: str,
    content_hash: str,
    source_url: str = "",
    actor: str = "ingestion",
) -> models.Document:
    doc = models.Document(
        reference=reference,
        title=title,
        file_path=file_path,
        content_hash=content_hash,
        source_url=source_url,
        status=schemas.DocumentStatus.INGESTED.value,
    )
    session.add(doc)
    session.flush()
    record_audit(
        session,
        action="document.ingested",
        resource_type="document",
        resource_id=doc.id,
        actor=actor,
        after={"reference": reference, "title": title},
    )
    return doc


def get_document(session: Session, document_id: str) -> Optional[models.Document]:
    return session.get(models.Document, document_id)


def find_document_by_hash(session: Session, content_hash: str) -> Optional[models.Document]:
    return session.scalar(
        select(models.Document).where(models.Document.content_hash == content_hash)
    )


def list_documents(session: Session) -> list[models.Document]:
    return list(session.scalars(select(models.Document).order_by(models.Document.ingested_at.desc())))


def set_document_status(session: Session, doc: models.Document, status: str) -> None:
    doc.status = status
    session.flush()


# ---------------------------------------------------------------------------
# Obligations
# ---------------------------------------------------------------------------


def create_obligation(
    session: Session, obligation: schemas.Obligation, actor: str = "obligation_extraction_agent"
) -> models.Obligation:
    row = models.Obligation(
        document_id=obligation.document_id,
        identifier=obligation.identifier,
        description=obligation.description,
        source_text=obligation.source_text,
        source_paragraph_ref=obligation.source_paragraph_ref,
        functional_area=obligation.functional_area.value,
        modification_type=obligation.modification_type.value,
        confidence=obligation.confidence,
        deadline_hint=obligation.deadline_hint,
        linked_prior_obligation_id=obligation.linked_prior_obligation_id,
        extraction_method=obligation.extraction_method,
        status=obligation.status.value,
        needs_review=obligation.needs_review,
    )
    session.add(row)
    session.flush()
    record_audit(
        session,
        action="obligation.extracted",
        resource_type="obligation",
        resource_id=row.id,
        actor=actor,
        after={"identifier": row.identifier, "confidence": row.confidence},
    )
    return row


def get_obligation(session: Session, obligation_id: str) -> Optional[models.Obligation]:
    return session.get(models.Obligation, obligation_id)


def delete_obligation(session: Session, obligation: models.Obligation) -> None:
    """Delete an obligation and cascade to rules, tasks, evidence via ORM cascade."""
    record_audit(
        session,
        action="obligation.deleted",
        resource_type="obligation",
        resource_id=obligation.id,
        actor="system",
        after={"description": obligation.description[:200], "document_id": obligation.document_id},
    )
    session.delete(obligation)


def list_obligations(
    session: Session,
    *,
    document_id: Optional[str] = None,
    status: Optional[str] = None,
    functional_area: Optional[str] = None,
) -> list[models.Obligation]:
    stmt = select(models.Obligation)
    if document_id:
        stmt = stmt.where(models.Obligation.document_id == document_id)
    if status:
        stmt = stmt.where(models.Obligation.status == status)
    if functional_area:
        stmt = stmt.where(models.Obligation.functional_area == functional_area)
    stmt = stmt.order_by(models.Obligation.created_at.asc())
    return list(session.scalars(stmt))


def review_obligation(
    session: Session,
    obligation: models.Obligation,
    *,
    approve: bool,
    reviewer: str,
    note: Optional[str] = None,
) -> models.Obligation:
    before = {"status": obligation.status}
    obligation.status = (
        schemas.ObligationStatus.APPROVED.value if approve else schemas.ObligationStatus.REJECTED.value
    )
    obligation.needs_review = False
    obligation.reviewer = reviewer
    obligation.reviewed_at = datetime.now(timezone.utc)
    session.flush()
    record_audit(
        session,
        action="obligation.approved" if approve else "obligation.rejected",
        resource_type="obligation",
        resource_id=obligation.id,
        actor=reviewer,
        before=before,
        after={"status": obligation.status, "note": note},
    )
    return obligation


def edit_obligation(
    session: Session,
    obligation: models.Obligation,
    edit: schemas.ObligationEdit,
    reviewer: str = "compliance_officer",
) -> models.Obligation:
    before = {
        "description": obligation.description,
        "functional_area": obligation.functional_area,
        "modification_type": obligation.modification_type,
    }
    if edit.description is not None:
        obligation.description = edit.description
    if edit.functional_area is not None:
        obligation.functional_area = edit.functional_area.value
    if edit.modification_type is not None:
        obligation.modification_type = edit.modification_type.value
    obligation.status = schemas.ObligationStatus.EDITED.value
    obligation.reviewer = reviewer
    obligation.reviewed_at = datetime.now(timezone.utc)
    session.flush()
    record_audit(
        session,
        action="obligation.edited",
        resource_type="obligation",
        resource_id=obligation.id,
        actor=reviewer,
        before=before,
        after={
            "description": obligation.description,
            "functional_area": obligation.functional_area,
            "modification_type": obligation.modification_type,
        },
    )
    return obligation


def approved_obligations(session: Session, document_id: str) -> list[models.Obligation]:
    approved = {
        schemas.ObligationStatus.APPROVED.value,
        schemas.ObligationStatus.EDITED.value,
    }
    return [o for o in list_obligations(session, document_id=document_id) if o.status in approved]


# ---------------------------------------------------------------------------
# Rules / Tasks / Evidence
# ---------------------------------------------------------------------------


def create_rule(
    session: Session, obligation_id: str, rule: schemas.ComplianceRule, actor: str = "rule_generation_agent"
) -> models.Rule:
    row = models.Rule(
        id=rule.rule_id,
        obligation_id=obligation_id,
        rule_type=rule.rule_type.value,
        evaluation_criterion=rule.evaluation_criterion,
        timeline=rule.timeline,
        threshold_value=rule.threshold_value,
        is_qualitative=rule.is_qualitative,
        evidence_type=rule.evidence_type,
        schema_json=rule.model_dump(mode="json"),
    )
    session.add(row)
    session.flush()
    record_audit(
        session,
        action="rule.generated",
        resource_type="rule",
        resource_id=row.id,
        actor=actor,
        after={"rule_type": row.rule_type, "obligation_id": obligation_id},
    )
    return row


def create_task(
    session: Session, task: schemas.WorkflowTask, actor: str = "workflow_mapping_agent"
) -> models.Task:
    row = models.Task(
        id=task.task_id,
        obligation_id=task.obligation_id,
        rule_id=task.rule_id,
        title=task.title,
        description=task.description,
        functional_area=task.functional_area.value,
        primary_owner=task.primary_owner,
        owner_email=task.owner_email,
        reviewer=task.reviewer,
        workflow_template=task.workflow_template,
        deadline=task.deadline,
        status=task.status.value,
        depends_on_task_id=task.depends_on_task_id,
    )
    session.add(row)
    session.flush()
    record_audit(
        session,
        action="task.assigned",
        resource_type="task",
        resource_id=row.id,
        actor=actor,
        after={"owner": row.primary_owner, "deadline": str(row.deadline)},
    )
    return row


def create_evidence_requirement(
    session: Session, req: schemas.EvidenceRequirement, actor: str = "evidence_mapping_agent"
) -> models.EvidenceRequirement:
    row = models.EvidenceRequirement(
        id=req.requirement_id,
        obligation_id=req.obligation_id,
        document_type=req.document_type,
        required_content=req.required_content,
        collector=req.collector,
        retention_period=req.retention_period,
    )
    session.add(row)
    session.flush()
    return row


def list_rules(session: Session, obligation_id: Optional[str] = None) -> list[models.Rule]:
    stmt = select(models.Rule)
    if obligation_id:
        stmt = stmt.where(models.Rule.obligation_id == obligation_id)
    return list(session.scalars(stmt))


def list_tasks(session: Session, obligation_id: Optional[str] = None) -> list[models.Task]:
    stmt = select(models.Task)
    if obligation_id:
        stmt = stmt.where(models.Task.obligation_id == obligation_id)
    return list(session.scalars(stmt))


def list_evidence_requirements(
    session: Session, obligation_id: Optional[str] = None
) -> list[models.EvidenceRequirement]:
    stmt = select(models.EvidenceRequirement)
    if obligation_id:
        stmt = stmt.where(models.EvidenceRequirement.obligation_id == obligation_id)
    return list(session.scalars(stmt))
