"""Rules, tasks, evidence, dashboard and audit-report endpoints (§5.2.4, §6.2.8)."""
from __future__ import annotations

from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
import re

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

import schemas
from agents import audit_report
from api.serializers import evidence_to_dict, rule_to_dict, task_to_dict
from config import settings, REPO_ROOT
from db import crud, models
from db.session import get_db
from fastapi.responses import Response
from integrations import providers
from integrations.crypto import decrypt_config
from kg import graph as kg_graph

router = APIRouter(prefix="/api", tags=["compliance"])


@router.get("/rules")
def list_rules(obligation_id: str | None = Query(None), session: Session = Depends(get_db)):
    return [rule_to_dict(r) for r in crud.list_rules(session, obligation_id)]


@router.get("/tasks")
def list_tasks(obligation_id: str | None = Query(None), session: Session = Depends(get_db)):
    return [task_to_dict(t) for t in crud.list_tasks(session, obligation_id)]


@router.get("/evidence")
def list_evidence(obligation_id: str | None = Query(None), session: Session = Depends(get_db)):
    return [evidence_to_dict(e) for e in crud.list_evidence_requirements(session, obligation_id)]


@router.post("/evidence/{requirement_id}/upload")
def upload_evidence(
    requirement_id: str,
    file: UploadFile = File(...),
    session: Session = Depends(get_db),
):
    """Store an evidence file — to Google Drive when connected, else local disk.

    The storage target is returned to the UI so the badge is honest about where the
    evidence physically lives. Drive is tried first when configured; on any failure we
    fall back to local disk and surface the reason in the response.
    """
    req = crud.get_evidence_requirement(session, requirement_id)
    if not req:
        raise HTTPException(404, "Evidence requirement not found")

    raw = file.filename or "evidence.pdf"
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", Path(raw).name)[:255]
    if not safe_name:
        safe_name = "evidence.bin"
    content = file.file.read()
    if not content:
        raise HTTPException(400, "Uploaded file is empty")
    content_type = file.content_type or "application/octet-stream"

    drive_integration = crud.get_integration(session, "drive")
    target = "local"
    external_url = ""
    rel_path = ""
    drive_note = ""

    if drive_integration and drive_integration.status == "connected":
        try:
            cfg = decrypt_config(drive_integration.config)
            result = providers.drive_upload(
                cfg, filename=safe_name, content_type=content_type, content=content
            )
            target = "drive"
            external_url = f"https://drive.google.com/file/d/{result['file_id']}/view"
            crud.touch_integration(session, "drive", actor="evidence_upload")
        except Exception as exc:  # noqa: BLE001 - fall back to local, never fake the target
            target = "local"
            drive_note = f"Drive upload failed ({exc}); stored locally instead."

    if target == "local":
        rel_path = f"evidence/{req.obligation_id}/{safe_name}"
        dest = REPO_ROOT / "data" / rel_path
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(content)

    req.uploaded_at = datetime.now(timezone.utc)
    req.upload_target = target
    req.file_name = safe_name
    req.file_path = rel_path
    req.external_url = external_url

    crud.record_audit(
        session,
        actor="compliance_officer",
        action="evidence.upload",
        resource_type="evidence_requirement",
        resource_id=req.id,
        after={"file_name": safe_name, "target": target},
    )

    return {
        "ok": True,
        "requirement_id": req.id,
        "file_name": safe_name,
        "target": target,
        "external_url": external_url,
        "note": drive_note,
    }


@router.get("/dashboard/summary")
def dashboard_summary(session: Session = Depends(get_db)):
    obligations = list(session.scalars(select(models.Obligation)))
    total = len(obligations)
    by_status = Counter(o.status for o in obligations)
    by_area = Counter(o.functional_area for o in obligations)

    approved_like = {
        schemas.ObligationStatus.APPROVED.value,
        schemas.ObligationStatus.EDITED.value,
    }
    approved = sum(by_status.get(s, 0) for s in approved_like)
    pending = by_status.get(schemas.ObligationStatus.PENDING_REVIEW.value, 0)
    compliance_score = round((approved / total) * 100) if total else 0

    tasks = list(session.scalars(select(models.Task)))
    task_status = Counter(t.status for t in tasks)

    return {
        "compliance_score": compliance_score,
        "total_obligations": total,
        "pending_review": pending,
        "approved": approved,
        "obligations_by_status": dict(by_status),
        "obligations_by_functional_area": dict(by_area),
        "total_documents": session.scalar(select(func.count()).select_from(models.Document)) or 0,
        "total_rules": session.scalar(select(func.count()).select_from(models.Rule)) or 0,
        "total_tasks": len(tasks),
        "tasks_by_status": dict(task_status),
        "total_evidence_requirements": session.scalar(
            select(func.count()).select_from(models.EvidenceRequirement)
        ) or 0,
        "audit_log_entries": session.scalar(select(func.count()).select_from(models.AuditLog)) or 0,
    }


@router.post("/audit/report")
def audit_report_endpoint(req: schemas.AuditReportRequest, session: Session = Depends(get_db)):
    pkg = audit_report.build_audit_package(
        session,
        scope=req.scope,
        obligation_id=req.obligation_id,
        document_id=req.document_id,
        formats=req.formats,
    )
    session.commit()
    # Return downloadable references rather than absolute server paths.
    files = {fmt: Path(p).name for fmt, p in pkg["files"].items()}
    return {
        "scope": pkg["scope"],
        "generated_at": pkg["generated_at"],
        "obligation_count": pkg["obligation_count"],
        "summary": pkg["summary"],
        "items": pkg["items"],
        "files": files,
    }


@router.get("/audit/download/{filename}")
def audit_download(filename: str):
    # Prevent path traversal — only serve from the export directory.
    safe = Path(filename).name
    path = Path(settings.export_path) / safe
    if not path.exists():
        raise HTTPException(404, "Report not found")
    return FileResponse(str(path), filename=safe)


@router.get("/risk-register")
def risk_register(
    risk_level: str | None = Query(None),
    functional_area: str | None = Query(None),
    status: str | None = Query(None),
    session: Session = Depends(get_db),
):
    """Obligations with a computed risk level — incorporating evidence gaps, overdue tasks,
    supersedence, and stale review signals (§Part J)."""
    from datetime import timedelta

    today_str = datetime.now(timezone.utc).date().isoformat()
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

    # Pre-build look-up sets from related tables (one pass each, avoids N+1 queries)
    # obligations with at least one evidence requirement that has no upload
    evidence_rows = session.execute(
        select(models.EvidenceRequirement.obligation_id, models.EvidenceRequirement.uploaded_at)
    ).all()
    ev_by_ob: dict[str, list] = {}
    for ob_id, upl in evidence_rows:
        ev_by_ob.setdefault(ob_id, []).append(upl)

    # tasks per obligation — check for overdue
    task_rows = session.execute(
        select(models.Task.obligation_id, models.Task.deadline, models.Task.status)
    ).all()
    overdue_ob_ids: set[str] = set()
    for ob_id, deadline, tstatus in task_rows:
        if deadline and tstatus != "completed" and str(deadline) < today_str:
            overdue_ob_ids.add(ob_id)

    out = []
    for o in session.scalars(select(models.Obligation).order_by(models.Obligation.identifier)):
        if functional_area and o.functional_area != functional_area:
            continue
        if status and o.status != status:
            continue

        # Compute signals
        ev_list = ev_by_ob.get(o.id, [])
        evidence_missing = bool(ev_list) and all(upl is None for upl in ev_list)
        task_overdue = o.id in overdue_ob_ids
        is_superseded = o.modification_type == "supersedes"
        # Stale review: pending_review and no update for 30 days
        stale_review = (
            o.status == "pending_review"
            and hasattr(o, "updated_at")
            and o.updated_at is not None
            and o.updated_at.isoformat() < thirty_days_ago
        )

        level, label = kg_graph._risk_score(
            o,
            evidence_missing=evidence_missing,
            task_overdue=task_overdue,
            is_superseded=is_superseded,
            stale_review=stale_review,
        )
        if risk_level and level != risk_level:
            continue

        # Build human-readable signals list for tooltip / expandable row
        signals: list[str] = []
        if evidence_missing:
            signals.append("Evidence missing")
        if task_overdue:
            signals.append("Task overdue")
        if is_superseded:
            signals.append("Circular superseded")
        if stale_review:
            signals.append("Pending review >30 days")
        if o.needs_review:
            signals.append("Flagged for review")

        out.append({
            "id": o.id,
            "identifier": o.identifier,
            "description": o.description,
            "functional_area": o.functional_area,
            "confidence": o.confidence,
            "status": o.status,
            "needs_review": o.needs_review,
            "risk_level": level,
            "risk_label": label,
            "risk_signals": signals,
        })
    return out


@router.get("/knowledge-graph")
def knowledge_graph(document_id: str | None = Query(None), session: Session = Depends(get_db)):
    """Compliance knowledge graph (regulation → obligation → department → task → owner /
    evidence, plus cross-document MODIFIES edges). Scope to one document or the whole firm."""
    return kg_graph.build_graph(session, document_id=document_id)


@router.get("/knowledge-graph/export.graphml")
def knowledge_graph_export(document_id: str | None = Query(None), session: Session = Depends(get_db)):
    graph = kg_graph.build_graph(session, document_id=document_id)
    return Response(content=kg_graph.to_graphml(graph), media_type="application/xml")
