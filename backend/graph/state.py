"""Shared, typed pipeline state (proposal §6.1).

A single state object accumulates the output of each agent stage and is passed to
subsequent nodes by the LangGraph supervisor. Keeping it a typed dataclass makes every
transition explicit and serialisable for logging.
"""
from __future__ import annotations

import operator
from dataclasses import dataclass, field
from typing import Annotated, Optional

from schemas import (
    ComplianceRule,
    EvidenceRequirement,
    Obligation,
    ParsedDocument,
    RegulatoryContext,
    WorkflowTask,
)


@dataclass
class GraphState:
    # Inputs
    document_id: str = ""
    file_path: str = ""
    reference: str = ""
    effective_date: Optional[str] = None

    # Phase A — extraction
    parsed: Optional[ParsedDocument] = None
    context: Optional[RegulatoryContext] = None
    obligations: list[Obligation] = field(default_factory=list)

    # Phase B — generation
    rules: dict[str, ComplianceRule] = field(default_factory=dict)
    tasks: list[WorkflowTask] = field(default_factory=list)
    evidence: list[EvidenceRequirement] = field(default_factory=list)

    # Control / observability. ``flags`` and ``logs`` use additive reducers so the parallel
    # Phase-B branches (workflow + evidence) can both append without a concurrent-write error.
    needs_human_parse: bool = False
    flags: Annotated[list[str], operator.add] = field(default_factory=list)
    logs: Annotated[list[dict], operator.add] = field(default_factory=list)
