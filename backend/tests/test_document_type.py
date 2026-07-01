from preprocessing.document_type import DocumentType, detect_document_type, family_key
from schemas import ParsedDocument, ParsedSection


def _doc(full_text: str = "", page_count: int = 10) -> ParsedDocument:
    return ParsedDocument(
        sections=[ParsedSection(label="1", text="placeholder")],
        cross_references=[],
        page_count=page_count,
        full_text=full_text,
    )


def test_master_circular_detected_by_title():
    assert detect_document_type(_doc(), title="Master Circular for Stock Brokers") == \
        DocumentType.MASTER_CIRCULAR


def test_master_circular_detected_by_page_count():
    assert detect_document_type(_doc(page_count=120)) == DocumentType.MASTER_CIRCULAR


def test_plain_circular_detected():
    d = _doc(full_text="This circular prescribes the margin pledge mechanism.", page_count=12)
    assert detect_document_type(d, title="Margin Pledge Circular") == DocumentType.CIRCULAR


def test_family_key_strips_year_and_version_so_releases_group():
    a = family_key("Master Circular for Investment Advisers 2024", "")
    b = family_key("Master Circular for Investment Advisers 2025 version 2", "")
    assert a == b == "master_circular_for_investment_advisers"
