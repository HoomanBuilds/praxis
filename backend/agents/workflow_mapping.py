"""Workflow Mapping Agent (proposal §6.2.5).

Maps each approved obligation (and its rule) to the client's organisational structure:
a primary owner team, a reviewer, an appropriate workflow template and a task object with
a deadline that builds in an implementation buffer before the regulatory effective date.
Where implementation requires a documented policy or board approval in addition to an
operational/technology change, a dependent task is generated to capture the chain. The
mapping is deterministic (driven by ``org_config.json``) so assignments are reproducible
and explainable; the plan is presented to the compliance officer for approval before tasks
are created (§6.2.5).
"""
from __future__ import annotations

import json
import uuid
from datetime import date, datetime, timedelta
from functools import lru_cache
from pathlib import Path
from typing import Optional

from config import settings
from schemas import (
    ComplianceRule,
    FunctionalArea,
    Obligation,
    RuleType,
    TaskStatus,
    WorkflowTask,
)


@lru_cache(maxsize=1)
def load_org_config() -> dict:
    path = Path(settings.org_config_path)
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return {
        "functional_areas": {},
        "default_reviewer": "Chief Compliance Officer",
        "default_reviewer_email": "cco@firm.example",
        "implementation_buffer_days": 7,
    }


def _area_config(org: dict, area: str) -> dict:
    areas = org.get("functional_areas", {})
    if area in areas:
        return areas[area]
    return areas.get(
        "compliance",
        {
            "label": area,
            "primary_owner": "Chief Compliance Officer",
            "owner_email": "cco@firm.example",
            "workflow_template": "compliance_policy_update",
        },
    )


def _compute_deadline(effective_date: Optional[str], buffer_days: int) -> Optional[date]:
    today = date.today()
    if effective_date:
        try:
            eff = datetime.strptime(effective_date[:10], "%Y-%m-%d").date()
            deadline = eff - timedelta(days=buffer_days)
            return max(deadline, today)
        except ValueError:
            pass
    return today + timedelta(days=21)


def _needs_documentation_dependency(rule: Optional[ComplianceRule], obligation: Obligation) -> bool:
    if rule is None:
        return False
    text = f"{obligation.source_text} {obligation.description}".lower()
    mentions_board = "board" in text or "board-approved" in text or "board approved" in text
    operational_area = obligation.functional_area in {
        FunctionalArea.TECHNOLOGY,
        FunctionalArea.OPERATIONS,
        FunctionalArea.FINANCE,
    }
    return mentions_board and operational_area and rule.rule_type != RuleType.DOCUMENTATION


def map_workflows(
    obligations: list[Obligation],
    rules: dict[str, ComplianceRule],
    effective_date: Optional[str] = None,
) -> list[WorkflowTask]:
    org = load_org_config()
    buffer_days = int(org.get("implementation_buffer_days", 7))
    reviewer = org.get("default_reviewer", "Chief Compliance Officer")
    deadline = _compute_deadline(effective_date, buffer_days)

    tasks: list[WorkflowTask] = []
    for ob in obligations:
        rule = rules.get(ob.identifier)
        cfg = _area_config(org, ob.functional_area.value)
        primary_task = WorkflowTask(
            task_id=uuid.uuid4().hex,
            obligation_id=ob.identifier,
            rule_id=rule.rule_id if rule else None,
            title=f"Implement: {ob.description[:90]}",
            description=(
                f"Obligation {ob.identifier} (source para {ob.source_paragraph_ref}). "
                f"Evaluation: {rule.evaluation_criterion if rule else ob.description}"
            ),
            functional_area=ob.functional_area,
            primary_owner=cfg.get("primary_owner", ""),
            owner_email=cfg.get("owner_email", ""),
            reviewer=reviewer,
            workflow_template=cfg.get("workflow_template", ""),
            deadline=deadline,
            status=TaskStatus.NOT_STARTED,
        )
        tasks.append(primary_task)

        if _needs_documentation_dependency(rule, ob):
            legal_cfg = _area_config(org, FunctionalArea.LEGAL.value)
            tasks.append(
                WorkflowTask(
                    task_id=uuid.uuid4().hex,
                    obligation_id=ob.identifier,
                    rule_id=rule.rule_id if rule else None,
                    title=f"Board approval & policy documentation for {ob.identifier}",
                    description=(
                        "Prepare board-approved policy/resolution documenting the implementation "
                        f"of obligation {ob.identifier}."
                    ),
                    functional_area=FunctionalArea.LEGAL,
                    primary_owner=legal_cfg.get("primary_owner", ""),
                    owner_email=legal_cfg.get("owner_email", ""),
                    reviewer=reviewer,
                    workflow_template=legal_cfg.get("workflow_template", "board_resolution_filing"),
                    deadline=deadline,
                    status=TaskStatus.NOT_STARTED,
                    depends_on_task_id=primary_task.task_id,
                )
            )
    return tasks
