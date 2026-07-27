"""ORM -> JSON serialisers for the API layer."""
from __future__ import annotations

from db import models


def document_to_dict(d: models.Document) -> dict:
    return {
        "id": d.id,
        "reference": d.reference,
        "title": d.title,
        "status": d.status,
        "parse_quality": d.parse_quality,
        "used_ocr": d.used_ocr,
        "page_count": d.page_count,
        "document_type": d.document_type,
        "family_key": d.family_key,
        "funnel": d.funnel,
        "regulatory_context": d.regulatory_context,
        "ingested_at": d.ingested_at.isoformat() if d.ingested_at else None,
        "processed_at": d.processed_at.isoformat() if d.processed_at else None,
        "error": d.error,
    }


def obligation_to_dict(o: models.Obligation) -> dict:
    return {
        "id": o.id,
        "document_id": o.document_id,
        "identifier": o.identifier,
        "description": o.description,
        "source_text": o.source_text,
        "source_paragraph_ref": o.source_paragraph_ref,
        "functional_area": o.functional_area,
        "modification_type": o.modification_type,
        "confidence": o.confidence,
        "deadline_hint": o.deadline_hint,
        "linked_prior_obligation_id": o.linked_prior_obligation_id,
        "extraction_method": o.extraction_method,
        "status": o.status,
        "needs_review": o.needs_review,
        "reviewer": o.reviewer,
        "reviewed_at": o.reviewed_at.isoformat() if o.reviewed_at else None,
    }


def rule_to_dict(r: models.Rule) -> dict:
    return {
        "id": r.id,
        "obligation_id": r.obligation_id,
        "rule_type": r.rule_type,
        "evaluation_criterion": r.evaluation_criterion,
        "timeline": r.timeline,
        "threshold_value": r.threshold_value,
        "is_qualitative": r.is_qualitative,
        "evidence_type": r.evidence_type,
    }


def task_to_dict(t: models.Task) -> dict:
    return {
        "id": t.id,
        "obligation_id": t.obligation_id,
        "rule_id": t.rule_id,
        "title": t.title,
        "description": t.description,
        "functional_area": t.functional_area,
        "primary_owner": t.primary_owner,
        "owner_email": t.owner_email,
        "reviewer": t.reviewer,
        "workflow_template": t.workflow_template,
        "deadline": str(t.deadline) if t.deadline else None,
        "status": t.status,
        "depends_on_task_id": t.depends_on_task_id,
    }


def evidence_to_dict(e: models.EvidenceRequirement) -> dict:
    return {
        "id": e.id,
        "obligation_id": e.obligation_id,
        "document_type": e.document_type,
        "required_content": e.required_content,
        "collector": e.collector,
        "retention_period": e.retention_period,
    }


def filing_to_dict(f: models.Filing) -> dict:
    return {
        "id": f.id,
        "obligation_id": f.obligation_id,
        "task_id": f.task_id,
        "filing_type": f.filing_type,
        "status": f.status,
        "submitted_at": f.submitted_at.isoformat() if f.submitted_at else None,
        "confirmation_reference": f.confirmation_reference,
        "notes": f.notes,
        "created_at": f.created_at.isoformat() if f.created_at else None,
    }
