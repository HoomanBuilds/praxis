"""Structure-aware chunking for regulatory documents (proposal §7.3).

Regulatory text has a meaningful hierarchy (sections, numbered paragraphs, annexures).
We preserve it: each numbered paragraph / sub-section becomes a primary chunk, short
paragraphs are merged with their successor, and over-long paragraphs are split at
sentence boundaries with overlap. Chunk metadata keeps the document id, section label,
heading and paragraph number so every downstream output can cite its source.

Token counts are approximated by whitespace word count — adequate for chunk sizing and
avoids loading a tokenizer for this stage.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field

from schemas import ParsedDocument, ParsedSection

MERGE_BELOW_TOKENS = 100
SPLIT_ABOVE_TOKENS = 512
OVERLAP_TOKENS = 50

_SENTENCE_RE = re.compile(r"(?<=[.;:])\s+(?=[A-Z(0-9])")


def count_tokens(text: str) -> int:
    return len(text.split())


@dataclass
class Chunk:
    chunk_id: str
    document_id: str
    text: str
    section_label: str = ""
    heading: str = ""
    paragraph_no: str = ""
    page: int = 1

    def metadata(self) -> dict:
        return {
            "document_id": self.document_id,
            "section_label": self.section_label,
            "heading": self.heading or "",
            "paragraph_no": self.paragraph_no or "",
            "page": self.page,
        }

    def context_prefix(self) -> str:
        """Heading prepended to chunk text for embedding context (§7.3)."""
        bits = [b for b in (self.section_label, self.heading) if b]
        return f"[{' — '.join(bits)}] {self.text}" if bits else self.text


def _split_long(text: str) -> list[str]:
    sentences = _SENTENCE_RE.split(text)
    chunks: list[str] = []
    current: list[str] = []
    current_tokens = 0
    for sent in sentences:
        st = count_tokens(sent)
        if current_tokens + st > SPLIT_ABOVE_TOKENS and current:
            chunks.append(" ".join(current))
            # carry an overlap tail into the next chunk
            overlap: list[str] = []
            tok = 0
            for s in reversed(current):
                tok += count_tokens(s)
                overlap.insert(0, s)
                if tok >= OVERLAP_TOKENS:
                    break
            current = overlap[:]
            current_tokens = sum(count_tokens(s) for s in current)
        current.append(sent)
        current_tokens += st
    if current:
        chunks.append(" ".join(current))
    return chunks


def chunk_document(document_id: str, parsed: ParsedDocument) -> list[Chunk]:
    """Turn a parsed document into retrieval chunks honouring the §7.3 rules."""
    sections = parsed.sections or [
        ParsedSection(label="1", text=parsed.full_text)
    ]
    chunks: list[Chunk] = []
    idx = 0
    skip_next_merge = False
    i = 0
    while i < len(sections):
        sec = sections[i]
        text = sec.text.strip()
        if not text:
            i += 1
            continue

        # Merge a short section forward into its successor.
        if (
            not skip_next_merge
            and count_tokens(text) < MERGE_BELOW_TOKENS
            and i + 1 < len(sections)
        ):
            nxt = sections[i + 1]
            merged_text = f"{text}\n{nxt.text.strip()}"
            sec = ParsedSection(
                label=f"{sec.label}+{nxt.label}",
                heading=sec.heading or nxt.heading,
                text=merged_text,
                page=sec.page,
                paragraph_no=sec.paragraph_no or nxt.paragraph_no,
            )
            text = merged_text
            i += 1  # consumed the successor

        pieces = _split_long(text) if count_tokens(text) > SPLIT_ABOVE_TOKENS else [text]
        for piece in pieces:
            chunks.append(
                Chunk(
                    chunk_id=f"{document_id}::c{idx}",
                    document_id=document_id,
                    text=piece,
                    section_label=sec.label,
                    heading=sec.heading or "",
                    paragraph_no=sec.paragraph_no or sec.label,
                    page=sec.page,
                )
            )
            idx += 1
        i += 1
    return chunks
