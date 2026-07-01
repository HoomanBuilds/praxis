"""Section fingerprinting (Layer 2) + incremental diff (Layer 3).

Every section gets a SHA-256 of its normalised text. When a new release of a document
family arrives, its section hashes are compared against the stored fingerprints: identical
hashes are skipped entirely, so only new/changed sections reach the (expensive) extractor.
For master circulars this is the single largest cost reduction — a re-issue typically
changes a handful of sections out of hundreds.
"""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session

from db import models
from schemas import ParsedSection

_WS_RE = re.compile(r"\s+")


def section_hash(section: ParsedSection) -> str:
    normalised = _WS_RE.sub(" ", section.text).strip().lower()
    return hashlib.sha256(normalised.encode("utf-8")).hexdigest()


@dataclass
class DiffResult:
    new: list[ParsedSection] = field(default_factory=list)
    changed: list[ParsedSection] = field(default_factory=list)
    unchanged: list[ParsedSection] = field(default_factory=list)

    @property
    def to_process(self) -> list[ParsedSection]:
        return self.new + self.changed

    def stats(self) -> dict:
        return {
            "new": len(self.new),
            "changed": len(self.changed),
            "unchanged_skipped": len(self.unchanged),
        }


def diff_sections(session: Session, family_key: str, sections: list[ParsedSection]) -> DiffResult:
    """Compare sections against stored fingerprints for the family. Does NOT write."""
    rows = session.scalars(
        select(models.SectionFingerprint).where(models.SectionFingerprint.family_key == family_key)
    )
    prior: dict[str, str] = {r.section_label: r.content_hash for r in rows}

    result = DiffResult()
    for s in sections:
        h = section_hash(s)
        old = prior.get(s.label)
        if old is None:
            result.new.append(s)
        elif old != h:
            result.changed.append(s)
        else:
            result.unchanged.append(s)
    return result


def store_fingerprints(
    session: Session, family_key: str, document_id: str, sections: list[ParsedSection]
) -> None:
    """Upsert the fingerprint for each section of the latest release."""
    existing = {
        r.section_label: r
        for r in session.scalars(
            select(models.SectionFingerprint).where(models.SectionFingerprint.family_key == family_key)
        )
    }
    for s in sections:
        h = section_hash(s)
        row = existing.get(s.label)
        if row is None:
            session.add(
                models.SectionFingerprint(
                    family_key=family_key,
                    section_label=s.label,
                    content_hash=h,
                    document_id=document_id,
                    heading=(s.heading or "")[:512],
                )
            )
        elif row.content_hash != h:
            row.content_hash = h
            row.document_id = document_id
            row.heading = (s.heading or "")[:512]
    session.flush()
