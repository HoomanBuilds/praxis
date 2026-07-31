from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

import schemas
from db import crud
from db.session import get_db

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


@router.patch("/{task_id}")
def update_task_endpoint(task_id: str, body: TaskUpdate, session: Session = Depends(get_db)):
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
        notify.notify_task_overdue(task)
        task.overdue_notified_at = datetime.now(_tz.utc)
    from api.serializers import task_to_dict
    return task_to_dict(task)


class TaskUpdate(BaseModel):
    status: str | None = None
    primary_owner: str | None = None
    owner_email: str | None = None
    deadline: str | None = None
