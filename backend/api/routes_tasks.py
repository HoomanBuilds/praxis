from __future__ import annotations

import io

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

import schemas
from api.deps import AuthedActor, get_actor
from db import crud, models
from db.session import get_db
from integrations import providers
from integrations.crypto import decrypt_config

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

# Only governance artefacts actually get signed — board resolutions and policy
# updates. Any other task type is rejected rather than silently accepted.
SIGNABLE_TEMPLATES = {"board_resolution_filing", "compliance_policy_update"}


@router.patch("/{task_id}")
def update_task_endpoint(
    task_id: str,
    body: schemas.TaskUpdate,
    background_tasks: BackgroundTasks = BackgroundTasks(),
    session: Session = Depends(get_db),
):
    task = crud.update_task(session, task_id, body)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    # Real overdue detection: if the task just crossed its deadline (and isn't done),
    # notify the connected channels once (guarded by overdue_notified_at).
    from datetime import date, datetime, timezone as _tz

    if (
        task.deadline
        and task.deadline < date.today()
        and task.status.lower() not in {"completed", "done", "approved", "closed"}
        and task.overdue_notified_at is None
    ):
        from integrations import notify
        background_tasks.add_task(notify.notify_task_overdue, task)
        task.overdue_notified_at = datetime.now(_tz.utc)
    from api.serializers import task_to_dict
    return task_to_dict(task)


class SignatureRequest(BaseModel):
    signer_email: str
    signer_name: str = ""


def _signature_pdf(task: models.Task, obligation: models.Obligation | None) -> bytes:
    """Render the document that actually goes into the DocuSign envelope.

    A real PDF built from the task's own compliance context — the signer sees what
    they are attesting to, not a placeholder.
    """
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

    base = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=base["Title"], fontSize=16)
    h2 = ParagraphStyle("h2", parent=base["Heading2"], fontSize=11, spaceBefore=10)
    body = ParagraphStyle("body", parent=base["Normal"], fontSize=9, leading=13)
    small = ParagraphStyle("small", parent=base["Normal"], fontSize=8, textColor="#555555")

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=18 * mm, bottomMargin=18 * mm)
    kind = "Board Resolution" if task.workflow_template == "board_resolution_filing" else "Compliance Policy"
    flow = [
        Paragraph(f"PRAXIS — {kind} for Signature", h1),
        Paragraph(f"Task {task.id} &nbsp; | &nbsp; Functional area: {task.functional_area}", small),
        Spacer(1, 8),
        Paragraph(task.title, h2),
        Paragraph(task.description or "—", body),
        Paragraph("Compliance context", h2),
        Paragraph(f"<b>Owner:</b> {task.primary_owner or '—'}", body),
        Paragraph(f"<b>Reviewer:</b> {task.reviewer or '—'}", body),
        Paragraph(f"<b>Deadline:</b> {task.deadline.isoformat() if task.deadline else '—'}", body),
    ]
    if obligation is not None:
        circular = obligation.document.reference if obligation.document else ""
        flow += [
            Paragraph(f"<b>Obligation {obligation.identifier}:</b> {obligation.description}", body),
            Paragraph(
                f"<b>Source:</b> {circular or '—'} "
                f"(para {obligation.source_paragraph_ref or '—'})",
                body,
            ),
        ]
    flow += [
        Spacer(1, 14),
        Paragraph(
            "By signing, the undersigned confirms the above obligation has been "
            "considered and the stated action approved.",
            body,
        ),
    ]
    doc.build(flow)
    return buf.getvalue()


@router.post("/{task_id}/send-for-signature")
def send_for_signature(
    task_id: str,
    body: SignatureRequest,
    session: Session = Depends(get_db),
    actor: AuthedActor = Depends(get_actor),
):
    """Create a real DocuSign (sandbox) envelope for a board-resolution/policy task.

    Requires a genuinely connected DocuSign integration — there is no simulated
    path. The envelope id is stored on the task so the link is bidirectional.
    """
    task = session.get(models.Task, task_id)
    if not task:
        raise HTTPException(404, "Task not found")
    if task.workflow_template not in SIGNABLE_TEMPLATES:
        raise HTTPException(
            400,
            "Only board-resolution and compliance-policy tasks can be sent for signature.",
        )
    if task.docusign_envelope_id:
        return {
            "ok": True,
            "envelope_id": task.docusign_envelope_id,
            "message": "This task already has a DocuSign envelope.",
        }

    row = crud.get_integration(session, "docusign")
    if not row or row.status != "connected":
        raise HTTPException(400, "DocuSign is not connected — connect it in Settings first.")

    signer_email = body.signer_email.strip()
    if not signer_email:
        raise HTTPException(400, "A signer email address is required.")
    signer_name = body.signer_name.strip() or task.primary_owner or signer_email

    obligation = session.get(models.Obligation, task.obligation_id)
    pdf = _signature_pdf(task, obligation)
    try:
        envelope_id = providers.create_docusign_envelope(
            decrypt_config(row.config),
            pdf_bytes=pdf,
            filename=f"{task.workflow_template}_{task.id}.pdf",
            signer_email=signer_email,
            signer_name=signer_name,
            subject=f"[PRAXIS] Signature requested: {task.title}",
        )
    except providers.ProviderError as exc:
        row.status = "error"
        row.last_error = str(exc)[:1024]
        session.flush()
        return {"ok": False, "message": str(exc)}

    task.docusign_envelope_id = envelope_id
    crud.touch_integration(session, "docusign", actor=actor.actor_label)
    crud.record_audit(
        session,
        actor=actor.actor_label,
        action="task.send_for_signature",
        resource_type="task",
        resource_id=task.id,
        after={"docusign_envelope_id": envelope_id, "signer_email": signer_email},
    )
    return {
        "ok": True,
        "envelope_id": envelope_id,
        "message": f"DocuSign envelope sent to {signer_email}.",
    }
