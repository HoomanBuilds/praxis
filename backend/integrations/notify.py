"""Real notification dispatch to connected integrations.

Compliance events (task created, task overdue, obligation flagged for review) are
pushed to every connected channel — SMTP email and Slack webhook — and, when Jira is
connected, a linked issue is created. Everything runs fire-and-forget in a daemon
thread with its own DB session so sending never blocks the request or pipeline.
A send failure marks the integration ``error`` and records ``last_error`` so the
Settings card reflects reality.
"""
from __future__ import annotations

import threading
import time
from datetime import date, datetime, timezone

from sqlalchemy import select

from db import models
from db.session import session_scope
from integrations import providers
from integrations.crypto import decrypt_config

DONE_STATUSES = {"completed", "done", "approved", "closed"}


def _connected(session, types: set[str] | None = None) -> dict[str, dict]:
    rows = list(session.scalars(select(models.Integration)))
    out = {}
    for row in rows:
        if row.status != "connected":
            continue
        if types and row.type not in types:
            continue
        out[row.type] = decrypt_config(row.config)
    return out


def _snapshot_task(task) -> dict:
    """Plain-dict snapshot so dispatch is safe after the caller's session closes."""
    deadline = task.deadline if isinstance(task.deadline, str) else (task.deadline.isoformat() if task.deadline else None)
    return {
        "id": getattr(task, "id", None) or getattr(task, "task_id", None),
        "title": task.title,
        "owner_email": getattr(task, "owner_email", "") or "",
        "primary_owner": getattr(task, "primary_owner", "") or "",
        "deadline": deadline,
        "obligation_id": task.obligation_id,
    }


def _mark_integration_error(session, type_: str, message: str) -> None:
    row = session.scalar(select(models.Integration).where(models.Integration.type == type_))
    if row:
        row.status = "error"
        row.last_error = message[:1024]


def _send_task_event(kind: str, task: dict, action_line: str) -> None:
    def run() -> None:
        try:
            with session_scope() as session:
                connected = _connected(session, {"email", "slack", "jira"})
                deadline = task.get("deadline") or "—"
                if "email" in connected:
                    try:
                        to = task.get("owner_email") or connected["email"].get("from_address") or ""
                        providers.send_task_email(
                            connected["email"],
                            to=to,
                            title=task.get("title") or "",
                            obligation=task.get("obligation_id") or "",
                            deadline=deadline,
                            action=action_line,
                        )
                    except providers.ProviderError as exc:
                        _mark_integration_error(session, "email", str(exc))
                        session.flush()
                if "slack" in connected:
                    try:
                        providers.send_task_slack(
                            connected["slack"],
                            title=task.get("title") or "",
                            obligation=task.get("obligation_id") or "",
                            deadline=deadline,
                            action=action_line,
                            owner=task.get("primary_owner") or "Unassigned",
                        )
                    except providers.ProviderError as exc:
                        _mark_integration_error(session, "slack", str(exc))
                        session.flush()
                if "jira" in connected and task.get("id"):
                    try:
                        key = providers.create_jira_issue(
                            connected["jira"],
                            summary=f"[PRAXIS] {action_line}: {task.get('title', '')}",
                            description=(
                                f"Created by PRAXIS (agentic compliance).\n"
                                f"Obligation: {task.get('obligation_id')}\n"
                                f"Owner: {task.get('primary_owner')}\n"
                                f"Deadline: {deadline}\n\n{action_line}."
                            ),
                        )
                        if key:
                            # The task row may not be committed yet when this thread
                            # starts — brief retry so the bidirectional link lands.
                            for _ in range(10):
                                row = session.get(models.Task, task.get("id"))
                                if row:
                                    row.jira_issue_key = key
                                    session.flush()
                                    break
                                session.commit()
                                time.sleep(0.2)
                    except providers.ProviderError:
                        # Jira is a Tier-2 convenience — a failure is surfaced on the
                        # integration card but must not break the pipeline.
                        _mark_integration_error(session, "jira", "Linked-issue creation failed")
                        session.flush()
        except Exception:  # never let a notifier crash a request/thread
            pass

    threading.Thread(target=run, daemon=True).start()


def notify_task_created(task) -> None:
    snap = _snapshot_task(task)
    _send_task_event("new task", snap, "New task assigned")


def notify_task_overdue(task) -> None:
    snap = _snapshot_task(task)
    _send_task_event("overdue", snap, "Task overdue")


def notify_obligations_flagged(count: int, identifiers: list[str]) -> None:
    """Notify the compliance officer that Phase A flagged obligations for review."""

    def run() -> None:
        try:
            with session_scope() as session:
                connected = _connected(session, {"email", "slack"})
                summary = (
                    f"{count} obligation(s) need human review"
                    + (f": {', '.join(identifiers[:5])}" if identifiers else "")
                )
                if "email" in connected:
                    try:
                        providers._smtp_send(
                            connected["email"],
                            to=(connected["email"].get("from_address") or "").strip(),
                            subject=f"[PRAXIS] {summary}",
                            body=f"Phase A completed. {summary}.\n\nReview them in the PRAXIS review queue.",
                        )
                    except providers.ProviderError as exc:
                        _mark_integration_error(session, "email", str(exc))
                        session.flush()
                if "slack" in connected:
                    try:
                        providers.post_slack_message(
                            connected["slack"],
                            f"*[PRAXIS] Review needed* — {summary}",
                        )
                    except providers.ProviderError as exc:
                        _mark_integration_error(session, "slack", str(exc))
                        session.flush()
        except Exception:
            pass

    threading.Thread(target=run, daemon=True).start()


def check_overdue_and_notify() -> list[str]:
    """Find tasks past their deadline (not done) and notify their owners once.

    Called by the lifespan sweep, on calendar/feed reads and on task updates. Each
    task is notified a single time (guarded by ``overdue_notified_at``).
    """
    notified: list[str] = []
    with session_scope() as session:
        today = date.today()
        rows = list(
            session.scalars(
                select(models.Task).where(
                    models.Task.deadline.isnot(None),
                    models.Task.deadline < today,
                    models.Task.overdue_notified_at.is_(None),
                )
            )
        )
        for row in rows:
            if row.status.lower() in DONE_STATUSES:
                continue
            notify_task_overdue(row)
            row.overdue_notified_at = datetime.now(timezone.utc)
            notified.append(row.id)
        session.flush()
    return notified


def start_overdue_sweep(interval_seconds: int = 6 * 3600) -> None:
    """Background daemon sweep — real overdue detection without a cron dependency."""

    def loop() -> None:
        time.sleep(15)  # let the app finish booting before the first sweep
        while True:
            try:
                check_overdue_and_notify()
            except Exception:
                pass
            time.sleep(interval_seconds)

    threading.Thread(target=loop, daemon=True).start()
