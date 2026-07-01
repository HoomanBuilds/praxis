import os

from agents.parser import (
    compute_parse_quality,
    detect_cross_references,
    parse_document,
    split_sections,
)
from config import settings


def _corpus(slug: str) -> str:
    return os.path.join(settings.corpus_path, f"{slug}.pdf")


def test_parse_corpus_pdf_has_structure_and_provenance():
    parsed = parse_document(_corpus("margin_pledge"))
    assert parsed.parse_quality > 0.9
    assert not parsed.used_ocr
    assert len(parsed.sections) >= 4
    # every section carries a hierarchical label for provenance
    assert all(s.label for s in parsed.sections)


def test_cross_reference_detection():
    parsed = parse_document(_corpus("margin_pledge"))
    kinds = {r.kind for r in parsed.cross_references}
    raws = " ".join(r.raw for r in parsed.cross_references)
    assert "circular" in kinds
    assert "SEBI/" in raws  # picked up a prior circular citation


def test_quality_score_bounds():
    assert compute_parse_quality("") == 0.0
    assert compute_parse_quality("x") == 0.0  # below min length
    assert compute_parse_quality("The stock broker shall maintain records for five years.") > 0.8


def test_split_sections_separates_heading_from_body():
    text = (
        "2. Governance\nEvery broker shall formulate a policy approved by its board.\n"
        "3. Reporting\nThe broker must report incidents within six hours of detection."
    )
    sections = split_sections(text)
    assert sections[0].label == "2"
    assert sections[0].heading == "Governance"
    assert "policy" in sections[0].text
    assert sections[1].heading == "Reporting"
