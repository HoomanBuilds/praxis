"""Candidate filter (Layer 4) — classify each parsed section so non-regulatory content is
dropped before any AI is invoked.

A master circular is mostly *not* new regulation: tables of contents, definitions,
annexures/formats, indexes, rescission lists and recitals make up the bulk of the pages.
Only sections that actually impose obligations should reach the extractor. This classifier
is fully deterministic (no model) and explains its decision, which matters for auditability.
"""
from __future__ import annotations

import re
from enum import Enum

from schemas import ParsedSection


class SectionKind(str, Enum):
    REGULATORY = "regulatory"          # candidate — may contain obligations → proceed
    TABLE_OF_CONTENTS = "toc"
    DEFINITION = "definition"
    ANNEXURE = "annexure"
    INDEX = "index"
    RECITAL = "recital"                # preamble / enabling-power citation, no live duty
    AMENDMENT_HISTORY = "amendment_history"  # rescission / supersession lists
    HEADING = "heading"                # too short to carry an obligation


_MANDATORY_RE = re.compile(r"\b(shall|must|is required to|are required to|mandatorily|required to)\b", re.I)
_TOC_LEADER_RE = re.compile(r"\.{4,}\s*\d+\s*$")          # dotted leaders ending in a page no.
_TRAILING_PAGE_RE = re.compile(r"\s\d{1,3}\s*$")          # "... heading 10"
_DATE_RE = re.compile(r"\b\d{1,2}\s+[A-Z][a-z]+\s+\d{4}\b|\b[A-Z][a-z]+\s+\d{1,2},\s*\d{4}\b")

_ANNEXURE_HEAD_RE = re.compile(r"\b(annexure|appendix|proforma|format|schedule)\b", re.I)
_DEFINITION_HEAD_RE = re.compile(r"\bdefinitions?\b|\binterpretation\b", re.I)
_TOC_HEAD_RE = re.compile(r"\b(table of contents|contents|index)\b", re.I)
_DEFINITION_BODY_RE = re.compile(r'^[\s"“]*[A-Z][\w\s&/-]{1,40}["”]?\s+(means|shall mean|refers to|includes)\b', re.I)
_RESCIND_RE = re.compile(r"\b(rescind|rescinded|stands? withdrawn|superseded|repealed|hereby withdrawn)\b", re.I)
_RECITAL_RE = re.compile(
    r"in exercise of (the )?powers|is issued under|with a view to|in order to (protect|develop|regulate)"
    r"|the (board|securities and exchange board)",
    re.I,
)

_MIN_WORDS = 12


def classify_section(section: ParsedSection) -> tuple[SectionKind, str]:
    """Return (kind, reason). Only ``REGULATORY`` sections proceed to extraction."""
    text = section.text.strip()
    heading = (section.heading or "").strip()
    words = text.split()
    first_line = text.split("\n", 1)[0]

    if len(words) < _MIN_WORDS:
        return SectionKind.HEADING, "below minimum length"

    if _TOC_HEAD_RE.search(heading):
        return SectionKind.TABLE_OF_CONTENTS, "contents/index heading"
    if _ANNEXURE_HEAD_RE.search(heading) or _ANNEXURE_HEAD_RE.match(text):
        return SectionKind.ANNEXURE, "annexure/format heading"
    if _DEFINITION_HEAD_RE.search(heading):
        return SectionKind.DEFINITION, "definitions heading"

    # Table-of-contents lines: dotted leaders or several short lines each ending in a page no.
    lines = [ln for ln in text.split("\n") if ln.strip()]
    if lines:
        page_terminated = sum(1 for ln in lines if _TOC_LEADER_RE.search(ln) or _TRAILING_PAGE_RE.search(ln))
        if page_terminated / len(lines) >= 0.6 and not _MANDATORY_RE.search(text):
            return SectionKind.TABLE_OF_CONTENTS, "lines terminate in page numbers"

    if _DEFINITION_BODY_RE.search(first_line) and not _MANDATORY_RE.search(text):
        return SectionKind.DEFINITION, "term-definition pattern"

    if _RESCIND_RE.search(text) and not _MANDATORY_RE.search(text):
        return SectionKind.AMENDMENT_HISTORY, "rescission/supersession list"

    # A recital only if it reads like a preamble AND imposes no mandatory duty.
    if _RECITAL_RE.search(text) and not _MANDATORY_RE.search(text):
        return SectionKind.RECITAL, "preamble/enabling-power, no mandatory duty"

    if not _MANDATORY_RE.search(text):
        return SectionKind.RECITAL, "no mandatory verb present"

    return SectionKind.REGULATORY, "contains mandatory obligation language"


def filter_candidates(sections: list[ParsedSection]) -> tuple[list[ParsedSection], dict]:
    """Split sections into regulatory candidates and a per-kind tally of what was dropped."""
    candidates: list[ParsedSection] = []
    tally: dict[str, int] = {}
    for s in sections:
        kind, _ = classify_section(s)
        tally[kind.value] = tally.get(kind.value, 0) + 1
        if kind == SectionKind.REGULATORY:
            candidates.append(s)
    return candidates, tally
