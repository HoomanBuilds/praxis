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
        prompt_version=prompt_version,
        prompt_hash=prompt_hash,
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
    if edit.scores_reference is not None:
        obligation.scores_reference = edit.scores_reference.strip() or None
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
            "scores_reference": obligation.scores_reference,
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


def get_evidence_requirement(
    session: Session, requirement_id: str
) -> Optional[models.EvidenceRequirement]:
    return session.scalar(
        select(models.EvidenceRequirement).where(
            models.EvidenceRequirement.id == requirement_id
        )
    )


def reset_artifacts(session: Session, obligation_id: str) -> None:
    """Delete rules/tasks/evidence for one obligation (used by Phase B so re-running
    generate is idempotent rather than duplicating the workflow)."""
    for model in (models.Rule, models.Task, models.EvidenceRequirement):
        for row in list(session.scalars(select(model).where(model.obligation_id == obligation_id))):
            session.delete(row)
    session.flush()


# --- Users ---


def create_user(session: Session, email: str, name: str, password: str, role: str = "viewer") -> models.User:
    from db.models import hash_password
    user = models.User(email=email, name=name, hashed_password=hash_password(password), role=role)
    session.add(user)
    session.flush()
    record_audit(session, action="user.created", resource_type="user", resource_id=user.id, after={"email": email, "role": role})
    return user


def get_user_by_email(session: Session, email: str) -> Optional[models.User]:
    return session.scalar(select(models.User).where(models.User.email == email))


def get_user(session: Session, user_id: str) -> Optional[models.User]:
    return session.get(models.User, user_id)


def list_users(session: Session) -> list[models.User]:
    return list(session.scalars(select(models.User).order_by(models.User.created_at.desc())))


def update_user_role(session: Session, user: models.User, role: str, actor: str = "system") -> models.User:
    before = {"role": user.role}
    user.role = role
    session.flush()
    record_audit(session, action="user.role_changed", resource_type="user", resource_id=user.id, actor=actor, before=before, after={"role": role})
    return user


def deactivate_user(session: Session, user: models.User, actor: str = "system") -> models.User:
    user.is_active = False
    session.flush()
    record_audit(session, action="user.deactivated", resource_type="user", resource_id=user.id, actor=actor)
    return user


# --- Notifications ---


def create_notification(session: Session, *, user_id: str, title: str, body: str, category: str = "system", resource_type: str = "", resource_id: str = "") -> models.Notification:
    n = models.Notification(user_id=user_id, title=title, body=body, category=category, resource_type=resource_type, resource_id=resource_id)
    session.add(n)
    session.flush()
    return n


def list_notifications(session: Session, user_id: str, unread_only: bool = False) -> list[models.Notification]:
    stmt = select(models.Notification).where(models.Notification.user_id == user_id)
    if unread_only:
        stmt = stmt.where(models.Notification.is_read == False)
    return list(session.scalars(stmt.order_by(models.Notification.created_at.desc()).limit(100)))


def mark_notification_read(session: Session, notification_id: str) -> Optional[models.Notification]:
    n = session.get(models.Notification, notification_id)
    if n:
        n.is_read = True
        session.flush()
    return n


def mark_all_notifications_read(session: Session, user_id: str) -> int:
    from sqlalchemy import update
    stmt = update(models.Notification).where(models.Notification.user_id == user_id, models.Notification.is_read == False).values(is_read=True)
    result = session.execute(stmt)
    session.flush()
    return result.rowcount


# --- Watch Sources / Hits ---


def create_watch_source(session: Session, *, name: str, url: str, source_type: str = "regulatory") -> models.WatchSource:
    src = models.WatchSource(name=name, url=url, source_type=source_type)
    session.add(src)
    session.flush()
    record_audit(session, action="watch.source_added", resource_type="watch_source", resource_id=src.id, after={"name": name})
    return src


def list_watch_sources(session: Session) -> list[models.WatchSource]:
    return list(session.scalars(select(models.WatchSource).order_by(models.WatchSource.created_at.desc())))


def delete_watch_source(session: Session, source_id: str) -> bool:
    src = session.get(models.WatchSource, source_id)
    if not src:
        return False
    session.delete(src)
    session.flush()
    return True


def create_watch_hit(session: Session, *, source_id: str, title: str, url: str, summary: str, relevance_score: float = 0.0) -> models.WatchHit:
    h = models.WatchHit(source_id=source_id, title=title, url=url, summary=summary, relevance_score=relevance_score)
    session.add(h)
    session.flush()
    return h


def list_watch_hits(session: Session, source_id: Optional[str] = None, reviewed_only: Optional[bool] = None) -> list[models.WatchHit]:
    stmt = select(models.WatchHit)
    if source_id:
        stmt = stmt.where(models.WatchHit.source_id == source_id)
    if reviewed_only is not None:
        stmt = stmt.where(models.WatchHit.is_reviewed == reviewed_only)
    return list(session.scalars(stmt.order_by(models.WatchHit.created_at.desc()).limit(100)))


def mark_hit_reviewed(session: Session, hit_id: str) -> Optional[models.WatchHit]:
    h = session.get(models.WatchHit, hit_id)
    if h:
        h.is_reviewed = True
        session.flush()
    return h


# --- Task updates ---


def update_task(session: Session, task_id: str, updates: schemas.TaskUpdate, actor: str = "system") -> Optional[models.Task]:
    task = session.get(models.Task, task_id)
    if not task:
        return None
    before = {"status": task.status, "primary_owner": task.primary_owner, "deadline": str(task.deadline) if task.deadline else None}
    if updates.status is not None:
        task.status = updates.status
    if updates.primary_owner is not None:
        task.primary_owner = updates.primary_owner
    if updates.owner_email is not None:
        task.owner_email = updates.owner_email
    if updates.deadline is not None:
        from datetime import date as _date
        task.deadline = _date.fromisoformat(updates.deadline) if updates.deadline else None
    session.flush()
    record_audit(session, action="task.updated", resource_type="task", resource_id=task_id, actor=actor, before=before, after={"status": task.status})
    return task


# --- Filings ---


def create_filing(session: Session, *, obligation_id: str, task_id: Optional[str] = None, filing_type: str = "", notes: str = "", actor: str = "system") -> models.Filing:
    f = models.Filing(obligation_id=obligation_id, task_id=task_id, filing_type=filing_type, notes=notes)
    session.add(f)
    session.flush()
    record_audit(session, action="filing.created", resource_type="filing", resource_id=f.id, actor=actor, after={"obligation_id": obligation_id, "filing_type": filing_type})
    return f


def list_filings(session: Session, status: Optional[str] = None) -> list[models.Filing]:
    stmt = select(models.Filing)
    if status:
        stmt = stmt.where(models.Filing.status == status)
    return list(session.scalars(stmt.order_by(models.Filing.created_at.desc())))


def get_filing(session: Session, filing_id: str) -> Optional[models.Filing]:
    return session.get(models.Filing, filing_id)


def update_filing(session: Session, filing_id: str, updates: schemas.FilingUpdate, actor: str = "system") -> Optional[models.Filing]:
    f = session.get(models.Filing, filing_id)
    if not f:
        return None
    if updates.status is not None:
        f.status = updates.status
    if updates.confirmation_reference is not None:
        f.confirmation_reference = updates.confirmation_reference
    if updates.notes is not None:
        f.notes = updates.notes
    session.flush()
    return f


def submit_filing(session: Session, filing_id: str, confirmation_reference: str, actor: str = "system") -> Optional[models.Filing]:
    f = session.get(models.Filing, filing_id)
    if not f:
        return None
    from datetime import datetime, timezone as _tz
    f.status = "filed"
    f.submitted_at = datetime.now(_tz.utc)
    f.confirmation_reference = confirmation_reference
    session.flush()
    record_audit(session, action="filing.submitted", resource_type="filing", resource_id=f.id, actor=actor, after={"confirmation_reference": confirmation_reference})
    return f


# --- API Keys ---


def _hash_api_key(key: str) -> str:
    import hashlib
    return hashlib.sha256(key.encode()).hexdigest()


def create_api_key(session: Session, *, label: str, created_by: str = "system") -> tuple[models.ApiKey, str]:
    """Create an API key. Returns (row, raw_key) — raw_key shown once then discarded."""
    import secrets
    raw_key = f"pk_{secrets.token_urlsafe(32)}"
    row = models.ApiKey(label=label, key_hash=_hash_api_key(raw_key), created_by=created_by)
    session.add(row)
    session.flush()
    record_audit(session, action="api_key.created", resource_type="api_key", resource_id=row.id, actor=created_by, after={"label": label})
    return row, raw_key


def list_api_keys(session: Session, include_revoked: bool = False) -> list[models.ApiKey]:
    stmt = select(models.ApiKey)
    if not include_revoked:
        stmt = stmt.where(models.ApiKey.revoked_at.is_(None))
    return list(session.scalars(stmt.order_by(models.ApiKey.created_at.desc())))


def revoke_api_key(session: Session, key_id: str, actor: str = "system") -> Optional[models.ApiKey]:
    from datetime import datetime, timezone as _tz
    row = session.get(models.ApiKey, key_id)
    if not row:
        return None
    row.revoked_at = datetime.now(_tz.utc)
    session.flush()
    record_audit(session, action="api_key.revoked", resource_type="api_key", resource_id=key_id, actor=actor)
    return row


def get_api_key_by_hash(session: Session, key_hash: str) -> Optional[models.ApiKey]:
    from datetime import datetime, timezone as _tz
    row = session.scalar(select(models.ApiKey).where(models.ApiKey.key_hash == key_hash, models.ApiKey.revoked_at.is_(None)))
    if row:
        row.last_used_at = datetime.now(_tz.utc)
        session.flush()
    return row


# --- Org config ---


import json as _json
from pathlib import Path as _Path


def _org_config_path() -> _Path:
    from config import settings
    return _Path(settings.org_config_path)


def read_org_config() -> dict:
    p = _org_config_path()
    if not p.exists():
        return {"firm_name": "", "firm_type": "", "intermediary_classes": [], "functional_areas": []}
    return _json.loads(p.read_text())


def write_org_config(data: dict) -> None:
    p = _org_config_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(_json.dumps(data, indent=2))
    try:
        from agents.workflow_mapping import load_org_config
        load_org_config.cache_clear()
    except Exception:
        pass


# --- Integrations ---


def list_integrations(session: Session) -> list[models.Integration]:
    return list(session.scalars(select(models.Integration).order_by(models.Integration.type)))


def get_integration(session: Session, type_: str) -> Optional[models.Integration]:
    return session.scalar(select(models.Integration).where(models.Integration.type == type_))


def set_integration(
    session: Session,
    type_: str,
    *,
    config_encrypted: Optional[str],
    configured_as: str = "",
    status: str = "connected",
    actor: str = "compliance_officer",
) -> models.Integration:
    """Upsert a singleton integration row. ``config_encrypted`` is the Fernet blob."""
    from datetime import datetime, timezone as _tz

    row = get_integration(session, type_)
    now = datetime.now(_tz.utc)
    was_connected = row is not None and row.status == "connected"
    if row is None:
        row = models.Integration(type=type_, status=status, config=config_encrypted, configured_as=configured_as)
        session.add(row)
    else:
        row.status = status
        row.config = config_encrypted
        row.configured_as = configured_as
        row.last_error = None
    row.connected_at = row.connected_at if was_connected and row.connected_at else now
    # Every successful test-on-connect refreshes "last tested" — the card surfaces
    # it so the verified-at-a-glance claim stays honest and current.
    row.last_used_at = now if status == "connected" else row.last_used_at
    session.flush()
    record_audit(
        session,
        action="integration.connected" if status == "connected" else "integration.updated",
        resource_type="integration",
        resource_id=type_,
        actor=actor,
        after={"status": status, "type": type_},
    )
    return row


def touch_integration(session: Session, type_: str, actor: str = "system") -> None:
    from datetime import datetime, timezone as _tz
    row = get_integration(session, type_)
    if row:
        row.last_used_at = datetime.now(_tz.utc)
        session.flush()


def disconnect_integration(session: Session, type_: str, actor: str = "compliance_officer") -> Optional[models.Integration]:
    row = get_integration(session, type_)
    if not row:
        return None
    row.status = "not_connected"
    row.config = None
    row.configured_as = ""
    row.last_error = None
    row.connected_at = None
    row.last_used_at = None
    session.flush()
    record_audit(
        session,
        action="integration.disconnected",
        resource_type="integration",
        resource_id=type_,
        actor=actor,
        after={"status": "not_connected", "type": type_},
    )
    return row
