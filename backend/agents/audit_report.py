"""Audit Report Agent (proposal §6.2.8).

Assembles a dated audit package for a given scope (a single obligation, a circular, or the
firm's full record). For each obligation the package presents the traceable chain:
source regulatory text → extracted obligation → generated rule → assigned task → required
evidence → approval history (from the append-only audit log). The package is exportable as
PDF and XLSX (§6.2.8). This is the artefact a compliance officer presents during a SEBI
inspection.
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from config import settings
from db import crud, models


def _obligations_for_scope(
    session: Session, scope: str, obligation_id: str | None, document_id: str | None
) -> list[models.Obligation]:
    if scope == "obligation" and obligation_id:
        ob = crud.get_obligation(session, obligation_id)
        return [ob] if ob else []
    if scope == "document" and document_id:
        return crud.list_obligations(session, document_id=document_id)
    return list(session.scalars(select(models.Obligation)))  # firm scope


def _approval_history(session: Session, obligation: models.Obligation) -> list[dict]:
    rule_ids = [r.id for r in obligation.rules]
    task_ids = [t.id for t in obligation.tasks]
    resource_ids = {obligation.id, *rule_ids, *task_ids}
    rows = session.scalars(
        select(models.AuditLog)
        .where(models.AuditLog.resource_id.in_(resource_ids))
        .order_by(models.AuditLog.timestamp.asc())
    )
    return [
        {
            "action": r.action,
            "actor": r.actor,
            "timestamp": r.timestamp.isoformat(),
            "after": r.after,
        }
        for r in rows
    ]


def build_audit_package(
    session: Session,
    *,
    scope: str = "obligation",
    obligation_id: str | None = None,
    document_id: str | None = None,
    formats: list[str] | None = None,
    actor: str = "compliance_officer",
) -> dict:
    formats = formats or ["pdf", "xlsx"]
    obligations = _obligations_for_scope(session, scope, obligation_id, document_id)

    items = []
    for ob in obligations:
        doc = crud.get_document(session, ob.document_id)
        rule = ob.rules[0] if ob.rules else None
        items.append(
            {
                "identifier": ob.identifier,
                "circular_reference": doc.reference if doc else "",
                "circular_title": doc.title if doc else "",
                "source_paragraph_ref": ob.source_paragraph_ref,
                "source_text": ob.source_text,
                "description": ob.description,
                "functional_area": ob.functional_area,
                "status": ob.status,
                "confidence": ob.confidence,
                "rule": {
                    "rule_type": rule.rule_type,
                    "evaluation_criterion": rule.evaluation_criterion,
                    "timeline": rule.timeline,
                    "threshold_value": rule.threshold_value,
                    "evidence_type": rule.evidence_type,
                }
                if rule
                else None,
                "tasks": [
                    {
                        "title": t.title,
                        "owner": t.primary_owner,
                        "deadline": str(t.deadline) if t.deadline else None,
                        "status": t.status,
                    }
                    for t in ob.tasks
                ],
                "evidence_requirements": [
                    {"document_type": e.document_type, "required_content": e.required_content}
                    for e in ob.evidence_requirements
                ],
                "approval_history": _approval_history(session, ob),
            }
        )

    package = {
        "scope": scope,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "obligation_count": len(items),
        "summary": _summary(items),
        "items": items,
        "attestation": (
            "PRAXIS system attestation: the records above are reproduced from the compliance "
            "system of record with their original provenance and append-only audit trail."
        ),
        "files": {},
    }

    Path(settings.export_path).mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    base = f"audit_{scope}_{stamp}"
    if "pdf" in formats:
        package["files"]["pdf"] = _render_pdf(package, Path(settings.export_path) / f"{base}.pdf")
    if "xlsx" in formats:
        package["files"]["xlsx"] = _render_xlsx(package, Path(settings.export_path) / f"{base}.xlsx")

    crud.record_audit(
        session,
        action="audit_report.generated",
        resource_type="audit_report",
        resource_id=obligation_id or document_id or scope,
        actor=actor,
        after={"scope": scope, "obligations": len(items)},
    )
    return package


def _summary(items: list[dict]) -> dict:
    by_status: dict[str, int] = {}
    by_area: dict[str, int] = {}
    for it in items:
        by_status[it["status"]] = by_status.get(it["status"], 0) + 1
        by_area[it["functional_area"]] = by_area.get(it["functional_area"], 0) + 1
    return {"by_status": by_status, "by_functional_area": by_area}


def _render_pdf(package: dict, path: Path) -> str:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

    base = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=base["Title"], fontSize=16)
    h2 = ParagraphStyle("h2", parent=base["Heading2"], fontSize=11, spaceBefore=10)
    body = ParagraphStyle("body", parent=base["Normal"], fontSize=9, leading=12)
    small = ParagraphStyle("small", parent=base["Normal"], fontSize=8, textColor="#555555")

    doc = SimpleDocTemplate(str(path), pagesize=A4, topMargin=18 * mm, bottomMargin=18 * mm)
    flow = [
        Paragraph("PRAXIS — Compliance Audit Package", h1),
        Paragraph(f"Scope: {package['scope']} &nbsp; | &nbsp; Generated: {package['generated_at']}Z", small),
        Paragraph(f"Obligations covered: {package['obligation_count']}", small),
        Spacer(1, 8),
    ]
    for it in package["items"]:
        flow.append(Paragraph(f"{it['identifier']} — {it['description']}", h2))
        flow.append(Paragraph(f"<b>Circular:</b> {it['circular_reference']} {it['circular_title']}", body))
        flow.append(
            Paragraph(
                f"<b>Source (para {it['source_paragraph_ref']}):</b> <i>{it['source_text']}</i>", body
            )
        )
        if it["rule"]:
            r = it["rule"]
            flow.append(
                Paragraph(
                    f"<b>Rule:</b> {r['rule_type']} — {r['evaluation_criterion']} "
                    f"(timeline: {r['timeline'] or '—'}; threshold: {r['threshold_value'] or '—'})",
                    body,
                )
            )
        for t in it["tasks"]:
            flow.append(
                Paragraph(
                    f"<b>Task:</b> {t['title']} → {t['owner']} (due {t['deadline']}, {t['status']})", body
                )
            )
        for e in it["evidence_requirements"]:
            flow.append(Paragraph(f"<b>Evidence:</b> {e['document_type']} — {e['required_content']}", body))
        for h in it["approval_history"]:
            flow.append(Paragraph(f"&bull; {h['timestamp']} — {h['action']} by {h['actor']}", small))
        flow.append(Spacer(1, 8))
    flow.append(Paragraph(package["attestation"], small))
    doc.build(flow)
    return str(path)


def _render_xlsx(package: dict, path: Path) -> str:
    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    ws.title = "Audit Package"
    ws.append(
        [
            "Obligation",
            "Circular",
            "Source Para",
            "Source Text",
            "Functional Area",
            "Status",
            "Rule Type",
            "Evaluation Criterion",
            "Timeline",
            "Task Owner",
            "Task Deadline",
            "Evidence Required",
        ]
    )
    for it in package["items"]:
        rule = it["rule"] or {}
        task = it["tasks"][0] if it["tasks"] else {}
        evidence = "; ".join(e["document_type"] for e in it["evidence_requirements"])
        ws.append(
            [
                it["identifier"],
                it["circular_reference"],
                it["source_paragraph_ref"],
                it["source_text"],
                it["functional_area"],
                it["status"],
                rule.get("rule_type", ""),
                rule.get("evaluation_criterion", ""),
                rule.get("timeline", ""),
                task.get("owner", ""),
                task.get("deadline", ""),
                evidence,
            ]
        )
    wb.save(str(path))
    return str(path)
