"""Document-type detection (Type 1 circular vs Type 2 master circular).

A master circular is a consolidation of many prior circulars maintained for convenience —
it should be processed incrementally (diff against the previous version), not re-read end to
end. A single circular is new regulation and is processed in full. Detection drives whether
the diff engine and aggressive candidate filtering are engaged.
"""
from __future__ import annotations

import re
from enum import Enum

from schemas import ParsedDocument


class DocumentType(str, Enum):
    CIRCULAR = "circular"
    MASTER_CIRCULAR = "master_circular"


_MASTER_RE = re.compile(r"master\s+circular", re.I)
_MASTER_PAGE_THRESHOLD = 60


def detect_document_type(parsed: ParsedDocument, title: str = "", reference: str = "") -> DocumentType:
    haystack = f"{title}\n{parsed.full_text[:4000]}"
    if _MASTER_RE.search(haystack) or _MASTER_RE.search(reference):
        return DocumentType.MASTER_CIRCULAR
    if parsed.page_count >= _MASTER_PAGE_THRESHOLD:
        return DocumentType.MASTER_CIRCULAR
    return DocumentType.CIRCULAR


def family_key(title: str, reference: str) -> str:
    """Stable key grouping versions of the same document so the diff engine can compare a new
    release against the previous one. Strips dates/version markers from the title."""
    base = (title or reference or "document").lower()
    base = re.sub(r"\b(19|20)\d{2}\b", "", base)            # drop years
    base = re.sub(r"\bversion\s*\d+\b|\bv\d+\b", "", base)  # drop version markers
    base = re.sub(r"[^a-z0-9]+", "_", base).strip("_")
    return base or "document"
