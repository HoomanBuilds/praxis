"""Rules, tasks, evidence, dashboard and audit-report endpoints (§5.2.4, §6.2.8)."""
from __future__ import annotations

from collections import Counter
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

import schemas
from agents import audit_report
from api.serializers import evidence_to_dict, rule_to_dict, task_to_dict
from config import settings
from db import crud, models
from db.session import get_db
from fastapi.responses import Response
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


@router.get("/knowledge-graph")
def knowledge_graph(document_id: str | None = Query(None), session: Session = Depends(get_db)):
    """Compliance knowledge graph (regulation → obligation → department → task → owner /
    evidence, plus cross-document MODIFIES edges). Scope to one document or the whole firm."""
    return kg_graph.build_graph(session, document_id=document_id)


@router.get("/knowledge-graph/export.graphml")
def knowledge_graph_export(document_id: str | None = Query(None), session: Session = Depends(get_db)):
    graph = kg_graph.build_graph(session, document_id=document_id)
    return Response(content=kg_graph.to_graphml(graph), media_type="application/xml")
