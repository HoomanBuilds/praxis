"""Typed schemas for PRAXIS.

Two layers live here:

1. **Domain models** — the canonical compliance artefacts that flow through the
   pipeline and are persisted (obligations, rules, tasks, evidence requirements).
2. **LLM output schemas** — the strict structures the language model is constrained
   to emit at each agent stage (suffixed ``LLM`` / ``Result``). Keeping these
   separate lets us validate raw model output before promoting it to a domain object
   with provenance and identifiers attached.

Every transformation preserves provenance: an obligation always carries the verbatim
source text and a source-paragraph reference back to the originating circular (§12.2).
"""
from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------


class FunctionalArea(str, Enum):
    OPERATIONS = "operations"
    TECHNOLOGY = "technology"
    COMPLIANCE = "compliance"
    LEGAL = "legal"
    FINANCE = "finance"
    CLIENT_SERVICES = "client_services"
    HUMAN_RESOURCES = "human_resources"
    OTHER = "other"


class IntermediaryClass(str, Enum):
    STOCKBROKER = "stockbroker"
    DEPOSITORY_PARTICIPANT = "depository_participant"
    INVESTMENT_ADVISER = "investment_adviser"
    PORTFOLIO_MANAGER = "portfolio_manager"
    MUTUAL_FUND = "mutual_fund"
    MERCHANT_BANKER = "merchant_banker"
    ALL = "all_intermediaries"


class ObligationMode(str, Enum):
    """How a document relates to the existing body of obligations (§6.2.2)."""

    NEW = "new"
    AMEND = "amend"
    RESCIND = "rescind"
    INFORMATIONAL = "informational"


class ModificationType(str, Enum):
    """Per-obligation modification relationship (§6.2.3)."""

    NEW = "new"
    MODIFIES = "modifies"
    SUPERSEDES = "supersedes"
    CLARIFIES = "clarifies"


class ObligationStatus(str, Enum):
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    EDITED = "edited"


class RuleType(str, Enum):
    DEADLINE = "deadline"
    THRESHOLD = "threshold"
    DOCUMENTATION = "documentation"
    PERIODIC_FILING = "periodic_filing"
    PROCESS_ADHERENCE = "process_adherence"


class TaskStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    OVERDUE = "overdue"


class DocumentStatus(str, Enum):
    INGESTED = "ingested"
    PARSING = "parsing"
    EXTRACTING = "extracting"
    AWAITING_REVIEW = "awaiting_review"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"
    NEEDS_HUMAN_PARSE = "needs_human_parse"


# ---------------------------------------------------------------------------
# Parser output (§6.2.1)
# ---------------------------------------------------------------------------


class CrossReference(BaseModel):
    """A citation to another regulatory instrument detected in the document."""

    raw: str
    kind: str = Field(description="circular | regulation | act | dated_reference")


class ParsedSection(BaseModel):
    """A hierarchically labelled unit of a regulatory document."""

    label: str = Field(description="Hierarchical label, e.g. '3' or '3.2' or 'Annexure-A'")
    heading: Optional[str] = None
    text: str
    page: int = 1
    paragraph_no: Optional[str] = None


class ParsedDocument(BaseModel):
    sections: list[ParsedSection] = Field(default_factory=list)
    cross_references: list[CrossReference] = Field(default_factory=list)
    parse_quality: float = 1.0
    used_ocr: bool = False
    page_count: int = 0
    full_text: str = ""

    def section_by_label(self, label: str) -> Optional[ParsedSection]:
        for s in self.sections:
            if s.label == label:
                return s
        return None


# ---------------------------------------------------------------------------
# Regulation Extraction (§6.2.2)
# ---------------------------------------------------------------------------


class ResolvedCitation(BaseModel):
    raw: str
    resolved_title: Optional[str] = None
    found_in_corpus: bool = False


class RegulatoryContextLLM(BaseModel):
    """Strict LLM output for the Regulation Extraction Agent."""

    intermediary_classes: list[IntermediaryClass] = Field(default_factory=list)
    obligation_mode: ObligationMode = ObligationMode.NEW
    effective_date: Optional[str] = Field(
        default=None, description="ISO date YYYY-MM-DD if stated, else null"
    )
    summary: str = Field(description="One-paragraph summary of what the circular does")


class RegulatoryContext(RegulatoryContextLLM):
    citations: list[ResolvedCitation] = Field(default_factory=list)
    similar_instruments: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Obligation Extraction (§6.2.3)
# ---------------------------------------------------------------------------


class ObligationLLM(BaseModel):
    """A single obligation as emitted by the extraction model."""

    description: str = Field(
        description="Plain-language statement of the discrete compliance obligation"
    )
    source_quote: str = Field(
        description="Verbatim sentence(s) from the circular that create this obligation"
    )
    functional_area: FunctionalArea = FunctionalArea.COMPLIANCE
    modification_type: ModificationType = ModificationType.NEW
    confidence: float = Field(ge=0.0, le=1.0, description="0-1 confidence in this extraction")
    deadline_hint: Optional[str] = Field(
        default=None, description="Any stated deadline/timeline phrase, verbatim, else null"
    )


class ObligationExtractionResult(BaseModel):
    obligations: list[ObligationLLM] = Field(default_factory=list)


class Obligation(BaseModel):
    """Domain obligation with provenance, identity and review status."""

    identifier: str
    document_id: str
    description: str
    source_text: str
    source_paragraph_ref: Optional[str] = None
    functional_area: FunctionalArea = FunctionalArea.COMPLIANCE
    modification_type: ModificationType = ModificationType.NEW
    confidence: float = 1.0
    deadline_hint: Optional[str] = None
    linked_prior_obligation_id: Optional[str] = None
    extraction_method: str = "llm"  # 'deterministic' (regex) or 'llm'
    status: ObligationStatus = ObligationStatus.PENDING_REVIEW
    needs_review: bool = True
    reviewer: Optional[str] = None
    reviewed_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Rule Generation (§6.2.4)
# ---------------------------------------------------------------------------


class ComplianceRuleLLM(BaseModel):
    rule_type: RuleType
    evaluation_criterion: str = Field(
        description="What concretely constitutes compliance with this obligation"
    )
    timeline: Optional[str] = Field(
        default=None, description="Absolute date or rolling period, verbatim if stated"
    )
    threshold_value: Optional[str] = Field(
        default=None, description="Verbatim numeric/qualitative threshold if the text states one"
    )
    is_qualitative: bool = Field(
        default=False,
        description="True when the obligation resists a precise rule and needs human judgement",
    )
    evidence_type: str = Field(description="Type of artefact that demonstrates compliance")


class ComplianceRule(ComplianceRuleLLM):
    rule_id: str
    obligation_id: str


# ---------------------------------------------------------------------------
# Workflow Mapping (§6.2.5)
# ---------------------------------------------------------------------------


class WorkflowTask(BaseModel):
    task_id: str
    obligation_id: str
    rule_id: Optional[str] = None
    title: str
    description: str = ""
    functional_area: FunctionalArea = FunctionalArea.COMPLIANCE
    primary_owner: str = ""
    owner_email: str = ""
    reviewer: str = ""
    workflow_template: str = ""
    deadline: Optional[date] = None
    status: TaskStatus = TaskStatus.NOT_STARTED
    depends_on_task_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Evidence Mapping (§6.2.6)
# ---------------------------------------------------------------------------


class EvidenceRequirement(BaseModel):
    requirement_id: str
    obligation_id: str
    document_type: str
    required_content: str
    collector: str = ""
    retention_period: str = "5 years"


# ---------------------------------------------------------------------------
# API request/response helpers
# ---------------------------------------------------------------------------


class ObligationEdit(BaseModel):
    description: Optional[str] = None
    functional_area: Optional[FunctionalArea] = None
    modification_type: Optional[ModificationType] = None
    scores_reference: Optional[str] = None


class ReviewAction(BaseModel):
    reviewer: str = "compliance_officer"
    note: Optional[str] = None


class AuditReportRequest(BaseModel):
    scope: str = Field(default="obligation", description="obligation | document | firm")
    obligation_id: Optional[str] = None
    document_id: Optional[str] = None
    formats: list[str] = Field(default_factory=lambda: ["pdf", "xlsx"])


# ---------------------------------------------------------------------------
# Task updates
# ---------------------------------------------------------------------------


class TaskUpdate(BaseModel):
    status: Optional[str] = None
    primary_owner: Optional[str] = None
    owner_email: Optional[str] = None
    deadline: Optional[str] = None


# ---------------------------------------------------------------------------
# Filing
# ---------------------------------------------------------------------------


class FilingCreate(BaseModel):
    obligation_id: str
    task_id: Optional[str] = None
    filing_type: str = ""
    notes: str = ""


class FilingUpdate(BaseModel):
    status: Optional[str] = None
    confirmation_reference: Optional[str] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Org config
# ---------------------------------------------------------------------------


class OrgConfigUpdate(BaseModel):
    firm_name: Optional[str] = None
    firm_type: Optional[str] = None
    intermediary_classes: Optional[list[str]] = None


class FunctionalAreasUpdate(BaseModel):
    functional_areas: list[dict]


# ---------------------------------------------------------------------------
# API keys
# ---------------------------------------------------------------------------


class ApiKeyCreate(BaseModel):
    label: str = ""
