"""SQLAlchemy ORM models — the compliance system of record (§5.2.3, §10.3).

Designed Postgres-first but type-portable (JSON, String, Date) so the same models
run on SQLite for no-Docker development. The ``audit_log`` table is append-only at the
application layer: code only ever inserts rows.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _uuid() -> str:
    return uuid.uuid4().hex


class Base(DeclarativeBase):
    pass


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    reference: Mapped[str] = mapped_column(String(255), default="")
    title: Mapped[str] = mapped_column(String(512), default="")
    source_url: Mapped[str] = mapped_column(String(1024), default="")
    file_path: Mapped[str] = mapped_column(String(1024), default="")
    content_hash: Mapped[str] = mapped_column(String(64), index=True, default="")
    status: Mapped[str] = mapped_column(String(32), default="ingested", index=True)

    parse_quality: Mapped[float] = mapped_column(Float, default=0.0)
    used_ocr: Mapped[bool] = mapped_column(Boolean, default=False)
    page_count: Mapped[int] = mapped_column(Integer, default=0)

    document_type: Mapped[str] = mapped_column(String(32), default="circular")
    family_key: Mapped[str] = mapped_column(String(255), default="", index=True)

    regulatory_context: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    parsed_document: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # Processing funnel stats (sections in → classified → diffed → deterministic vs LLM).
    funnel: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)

    ingested_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now(timezone.utc))
    processed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    obligations: Mapped[list["Obligation"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )


class Obligation(Base):
    __tablename__ = "obligations"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    document_id: Mapped[str] = mapped_column(ForeignKey("documents.id"), index=True)
    identifier: Mapped[str] = mapped_column(String(64), default="")

    description: Mapped[str] = mapped_column(Text, default="")
    source_text: Mapped[str] = mapped_column(Text, default="")
    source_paragraph_ref: Mapped[str | None] = mapped_column(String(64), nullable=True)

    functional_area: Mapped[str] = mapped_column(String(32), default="compliance", index=True)
    modification_type: Mapped[str] = mapped_column(String(32), default="new")
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    deadline_hint: Mapped[str | None] = mapped_column(String(255), nullable=True)
    linked_prior_obligation_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    # How the obligation was extracted: 'deterministic' (regex rule engine) or 'llm'.
    extraction_method: Mapped[str] = mapped_column(String(16), default="llm")

    status: Mapped[str] = mapped_column(String(32), default="pending_review", index=True)
    needs_review: Mapped[bool] = mapped_column(Boolean, default=True)
    reviewer: Mapped[str | None] = mapped_column(String(128), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now(timezone.utc))

    document: Mapped["Document"] = relationship(back_populates="obligations")
    rules: Mapped[list["Rule"]] = relationship(
        back_populates="obligation", cascade="all, delete-orphan"
    )
    tasks: Mapped[list["Task"]] = relationship(
        back_populates="obligation", cascade="all, delete-orphan"
    )
    evidence_requirements: Mapped[list["EvidenceRequirement"]] = relationship(
        back_populates="obligation", cascade="all, delete-orphan"
    )


class Rule(Base):
    __tablename__ = "rules"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    obligation_id: Mapped[str] = mapped_column(ForeignKey("obligations.id"), index=True)

    rule_type: Mapped[str] = mapped_column(String(32), default="process_adherence")
    evaluation_criterion: Mapped[str] = mapped_column(Text, default="")
    timeline: Mapped[str | None] = mapped_column(String(255), nullable=True)
    threshold_value: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_qualitative: Mapped[bool] = mapped_column(Boolean, default=False)
    evidence_type: Mapped[str] = mapped_column(String(255), default="")
    schema_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now(timezone.utc))

    obligation: Mapped["Obligation"] = relationship(back_populates="rules")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    obligation_id: Mapped[str] = mapped_column(ForeignKey("obligations.id"), index=True)
    rule_id: Mapped[str | None] = mapped_column(String(32), nullable=True)

    title: Mapped[str] = mapped_column(String(512), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    functional_area: Mapped[str] = mapped_column(String(32), default="compliance", index=True)
    primary_owner: Mapped[str] = mapped_column(String(128), default="")
    owner_email: Mapped[str] = mapped_column(String(255), default="")
    reviewer: Mapped[str] = mapped_column(String(128), default="")
    workflow_template: Mapped[str] = mapped_column(String(128), default="")
    deadline: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="not_started", index=True)
    depends_on_task_id: Mapped[str | None] = mapped_column(String(32), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now(timezone.utc))

    obligation: Mapped["Obligation"] = relationship(back_populates="tasks")


class EvidenceRequirement(Base):
    __tablename__ = "evidence_requirements"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=_uuid)
    obligation_id: Mapped[str] = mapped_column(ForeignKey("obligations.id"), index=True)

    document_type: Mapped[str] = mapped_column(String(255), default="")
    required_content: Mapped[str] = mapped_column(Text, default="")
    collector: Mapped[str] = mapped_column(String(128), default="")
    retention_period: Mapped[str] = mapped_column(String(64), default="5 years")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now(timezone.utc))

    obligation: Mapped["Obligation"] = relationship(back_populates="evidence_requirements")


class AuditLog(Base):
    """Append-only audit trail (§10.3). Inserts only — never updated or deleted in app code."""

    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    action: Mapped[str] = mapped_column(String(64), index=True)
    actor: Mapped[str] = mapped_column(String(128), default="system")
    resource_type: Mapped[str] = mapped_column(String(64), default="")
    resource_id: Mapped[str] = mapped_column(String(64), default="", index=True)
    before: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    after: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.now(timezone.utc), index=True)


class ObligationComment(Base):
    """Reviewer comments on an obligation (collaboration in the review workspace)."""

    __tablename__ = "obligation_comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    obligation_id: Mapped[str] = mapped_column(ForeignKey("obligations.id"), index=True)
    author: Mapped[str] = mapped_column(String(128), default="compliance_officer")
    body: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now(timezone.utc))


class SectionFingerprint(Base):
    """Per-section content hash for incremental processing (diff engine).

    Keyed by (family_key, section_label): a new release of the same document family is
    compared against the stored hashes so only new/changed sections reach the extractor.
    """

    __tablename__ = "section_fingerprints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    family_key: Mapped[str] = mapped_column(String(255), index=True)
    section_label: Mapped[str] = mapped_column(String(64))
    content_hash: Mapped[str] = mapped_column(String(64), index=True)
    document_id: Mapped[str] = mapped_column(String(32), default="")
    heading: Mapped[str | None] = mapped_column(String(512), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now(timezone.utc))
