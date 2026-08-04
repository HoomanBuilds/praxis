"""Document Parser Agent (proposal §6.2.1).

Converts a raw regulatory document into a structured, hierarchically-labelled
``ParsedDocument`` with preserved section structure, detected cross-references and a
parse-quality score. Vector PDFs go through pdfplumber; if the text layer is poor
(quality below the OCR trigger), the page is rasterised and run through Tesseract.
Documents below ``parse_quality_min`` are flagged for human review before proceeding.
"""
from __future__ import annotations

import re
from pathlib import Path

from config import settings
from schemas import CrossReference, ParsedDocument, ParsedSection

# Numbered paragraph start, e.g. "2. ", at the beginning of a line.
_PARA_RE = re.compile(r"(?m)^\s*(\d{1,2})\.\s+")

# ---- Text-cleanup regexes (applied before section splitting) ----
# Running page headers/footers: "Page 3 of 15" or "- 3 -"
_PAGE_HEADER_RE = re.compile(r"(?im)^[ \t]*(?:page\s+\d+\s+of\s+\d+|[-–]\s*\d+\s*[-–])[ \t]*$")
# Date-only lines typical in SEBI footer stamps: "January 15, 2025"
_DATE_LINE_RE = re.compile(r"(?im)^[ \t]*[A-Z][a-z]+\s+\d{1,2},?\s+\d{4}[ \t]*$")
# Orphaned list-marker lines: a line that is ONLY a marker with no following text.
# Matches lines like "a)", "(i)", "iii.", "•", "–" standing alone.
_ORPHAN_MARKER_RE = re.compile(r"(?im)^[ \t]*(?:[a-z]{1,3}[.)][  \t]*|\(?[ivxlcdm]+\)[  \t]*|[•\-–*][ \t]*)$")

_XREF_PATTERNS: list[tuple[str, str]] = [
    (r"SEBI/[A-Z0-9\-]+(?:/[A-Z0-9\-]+)*/\d{4}/\d+", "circular"),
    (r"SEBI\s*\([^)]+\)\s*Regulations,?\s*\d{4}", "regulation"),
    (r"Regulation\s+\d+[A-Z]?", "regulation"),
    (r"Section\s+\d+\([0-9a-z]+\)", "act"),
    (r"SEBI\s+Act,?\s*1992", "act"),
    (r"(?:Depositories|Securities Contracts \(Regulation\))\s+Act", "act"),
    (r"dated\s+[A-Z][a-z]+\s+\d{1,2},?\s+\d{4}", "dated_reference"),
]


def _extract_with_pdfplumber(path: str) -> tuple[str, int]:
    import pdfplumber

    pages_text: list[str] = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            pages_text.append(page.extract_text() or "")
        page_count = len(pdf.pages)
    return "\n".join(pages_text), page_count


def _ocr_pdf(path: str) -> tuple[str, int]:
    """Rasterise + OCR fallback for scanned PDFs (§7.2). Best-effort; returns ('', 0)
    if the optional rendering/OCR stack is unavailable."""
    try:
        import pypdfium2 as pdfium
        import pytesseract

        pdf = pdfium.PdfDocument(path)
        texts = []
        for i in range(len(pdf)):
            page = pdf[i]
            bitmap = page.render(scale=300 / 72)  # 300 DPI (§7.2)
            pil_image = bitmap.to_pil()
            texts.append(pytesseract.image_to_string(pil_image))
        return "\n".join(texts), len(pdf)
    except Exception:
        return "", 0


def compute_parse_quality(text: str) -> float:
    """Heuristic 0-1 score: proportion of well-formed alphabetic content. A clean text
    layer scores high; gibberish or near-empty extraction scores low (§6.2.1)."""
    stripped = text.strip()
    if len(stripped) < 50:
        return 0.0
    non_space = [c for c in stripped if not c.isspace()]
    if not non_space:
        return 0.0
    alpha_ratio = sum(c.isalpha() or c.isdigit() or c in ".,;:()/-" for c in non_space) / len(non_space)
    words = stripped.split()
    sane_words = sum(1 for w in words if 1 <= len(w) <= 25)
    word_ratio = sane_words / max(1, len(words))
    return round(min(1.0, 0.5 * alpha_ratio + 0.5 * word_ratio), 3)


def detect_cross_references(text: str) -> list[CrossReference]:
    seen: set[str] = set()
    refs: list[CrossReference] = []
    for pattern, kind in _XREF_PATTERNS:
        for match in re.findall(pattern, text):
            raw = re.sub(r"\s+", " ", match).strip()
            key = raw.lower()
            if key not in seen:
                seen.add(key)
                refs.append(CrossReference(raw=raw, kind=kind))
    return refs


def _looks_like_heading(line: str) -> bool:
    words = line.split()
    return bool(line) and len(words) <= 9 and not line.rstrip().endswith(".") and line[0].isupper()


def clean_text(text: str) -> str:
    """Pre-processing cleanup pass applied to raw extracted text (§M).

    Removes:
    * Running page headers / footers ("Page N of M", "- N -").
    * Isolated date-stamp lines common in SEBI footer blocks.
    * Orphaned list-marker lines ("a)", "iii.", "•" with no body text).

    Then collapses runs of blank lines to a single blank line so that
    paragraph detection remains stable.
    """
    text = _PAGE_HEADER_RE.sub("", text)
    text = _DATE_LINE_RE.sub("", text)
    text = _ORPHAN_MARKER_RE.sub("", text)
    # Collapse 3+ blank lines → 2 blank lines (preserve paragraph breaks).
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def split_sections(text: str) -> list[ParsedSection]:
    """Split into numbered paragraphs, separating a short title line from its body.

    Applies ``clean_text`` first so that page-headers and orphaned list-markers
    do not pollute section bodies or confuse the heading detector.
    """
    text = clean_text(text)
    matches = list(_PARA_RE.finditer(text))
    sections: list[ParsedSection] = []
    if not matches:
        return [ParsedSection(label="1", text=text.strip())] if text.strip() else []
    for idx, match in enumerate(matches):
        number = match.group(1)
        start = match.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        block = text[start:end].strip()
        if not block:
            continue
        lines = block.split("\n", 1)
        heading = None
        body = block
        if len(lines) == 2 and _looks_like_heading(lines[0]):
            heading = lines[0].strip()
            body = lines[1].strip()
        sections.append(
            ParsedSection(label=number, heading=heading, text=body, paragraph_no=number)
        )
    return sections


def parse_document(file_path: str) -> ParsedDocument:
    path = str(file_path)
    suffix = Path(path).suffix.lower()

    used_ocr = False
    if suffix == ".pdf":
        text, page_count = _extract_with_pdfplumber(path)
        quality = compute_parse_quality(text)
        if quality < settings.ocr_trigger_quality:
            ocr_text, ocr_pages = _ocr_pdf(path)
            if compute_parse_quality(ocr_text) > quality:
                text, page_count, used_ocr = ocr_text, ocr_pages or page_count, True
                quality = compute_parse_quality(text)
    elif suffix in {".html", ".htm"}:
        from bs4 import BeautifulSoup

        soup = BeautifulSoup(Path(path).read_text(encoding="utf-8", errors="ignore"), "html.parser")
        for tag in soup(["nav", "script", "style", "header", "footer"]):
            tag.decompose()
        text = soup.get_text("\n")
        page_count = 1
        quality = compute_parse_quality(text)
    else:  # plain text / docx-as-text fallback
        text = Path(path).read_text(encoding="utf-8", errors="ignore")
        page_count = 1
        quality = compute_parse_quality(text)

    sections = split_sections(text)
    cross_refs = detect_cross_references(text)

    return ParsedDocument(
        sections=sections,
        cross_references=cross_refs,
        parse_quality=quality,
        used_ocr=used_ocr,
        page_count=page_count,
        full_text=text,
    )
