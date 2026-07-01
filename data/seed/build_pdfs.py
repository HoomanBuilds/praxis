"""Render the synthetic circulars in ``circulars.py`` to PDF files under data/corpus/.

Usage:
    python data/seed/build_pdfs.py            # build all
    python data/seed/build_pdfs.py margin_pledge cyber_security   # build a subset

Produces vector (text-layer) PDFs so the Document Parser Agent's pdfplumber path is
exercised. Run once before indexing the corpus.
"""
from __future__ import annotations

import sys
from pathlib import Path

from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

# Allow running as a standalone script (python data/seed/build_pdfs.py)
sys.path.insert(0, str(Path(__file__).resolve().parent))
from circulars import CIRCULARS  # noqa: E402

CORPUS_DIR = Path(__file__).resolve().parents[1] / "corpus"


def _styles() -> dict:
    base = getSampleStyleSheet()
    return {
        "header": ParagraphStyle(
            "header", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=11, alignment=TA_CENTER, spaceAfter=2,
        ),
        "subheader": ParagraphStyle(
            "subheader", parent=base["Normal"], fontName="Helvetica",
            fontSize=9, alignment=TA_CENTER, spaceAfter=2, textColor="#444444",
        ),
        "ref": ParagraphStyle(
            "ref", parent=base["Normal"], fontName="Helvetica", fontSize=9, spaceAfter=2,
        ),
        "title": ParagraphStyle(
            "title", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=12, alignment=TA_CENTER, spaceBefore=8, spaceAfter=10,
        ),
        "addressed": ParagraphStyle(
            "addressed", parent=base["Normal"], fontName="Helvetica-Oblique",
            fontSize=9.5, spaceAfter=10,
        ),
        "para_heading": ParagraphStyle(
            "para_heading", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=10.5, spaceBefore=8, spaceAfter=3,
        ),
        "body": ParagraphStyle(
            "body", parent=base["Normal"], fontName="Helvetica",
            fontSize=10, leading=14, alignment=TA_JUSTIFY, spaceAfter=4,
        ),
    }


def build_one(circ: dict, styles: dict) -> Path:
    CORPUS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = CORPUS_DIR / f"{circ['slug']}.pdf"
    doc = SimpleDocTemplate(
        str(out_path), pagesize=A4,
        topMargin=20 * mm, bottomMargin=20 * mm, leftMargin=22 * mm, rightMargin=22 * mm,
        title=circ["title"],
    )
    flow = []
    flow.append(Paragraph("SECURITIES AND EXCHANGE BOARD OF INDIA", styles["header"]))
    flow.append(Paragraph("(Synthetic document — for PRAXIS demonstration only)", styles["subheader"]))
    flow.append(Spacer(1, 8))
    flow.append(Paragraph(circ["reference"], styles["ref"]))
    flow.append(Paragraph(circ["date"], styles["ref"]))
    flow.append(Spacer(1, 4))
    flow.append(Paragraph(circ["title"], styles["title"]))
    flow.append(Paragraph(f"To: {circ['addressed_to']}", styles["addressed"]))

    flow.append(Paragraph(circ["preamble"], styles["body"]))

    for number, heading, text in circ["paragraphs"]:
        if heading:
            flow.append(Paragraph(f"{number}. {heading}", styles["para_heading"]))
            flow.append(Paragraph(text, styles["body"]))
        else:
            flow.append(Paragraph(f"{number}. {text}", styles["body"]))

    flow.append(Spacer(1, 12))
    flow.append(Paragraph(
        "Yours faithfully,<br/>Deputy General Manager<br/>"
        "Market Intermediaries Regulation and Supervision Department",
        styles["body"],
    ))
    doc.build(flow)
    return out_path


def main(slugs: list[str] | None = None) -> None:
    styles = _styles()
    selected = CIRCULARS if not slugs else [c for c in CIRCULARS if c["slug"] in slugs]
    if not selected:
        print(f"No circulars matched {slugs}. Available: {[c['slug'] for c in CIRCULARS]}")
        return
    for circ in selected:
        path = build_one(circ, styles)
        print(f"  wrote {path.relative_to(CORPUS_DIR.parents[1])}")
    print(f"Done — {len(selected)} circular(s) rendered to {CORPUS_DIR}")


if __name__ == "__main__":
    main(sys.argv[1:] or None)
