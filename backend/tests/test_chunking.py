from rag.chunking import (
    MERGE_BELOW_TOKENS,
    SPLIT_ABOVE_TOKENS,
    chunk_document,
    count_tokens,
)
from schemas import ParsedDocument, ParsedSection


def test_short_sections_are_merged():
    parsed = ParsedDocument(
        sections=[
            ParsedSection(label="1", text="Short clause one about margins."),
            ParsedSection(label="2", text="Short clause two about reporting."),
        ]
    )
    chunks = chunk_document("doc", parsed)
    assert len(chunks) == 1
    assert "1" in chunks[0].section_label and "2" in chunks[0].section_label


def test_long_section_is_split_with_overlap():
    long_text = " ".join(
        [f"Sentence number {i} stating that the broker shall do thing {i}." for i in range(120)]
    )
    assert count_tokens(long_text) > SPLIT_ABOVE_TOKENS
    parsed = ParsedDocument(sections=[ParsedSection(label="3", heading="Big", text=long_text)])
    chunks = chunk_document("doc", parsed)
    assert len(chunks) >= 2
    assert all(c.paragraph_no == "3" for c in chunks)


def test_chunk_metadata_carries_provenance():
    parsed = ParsedDocument(
        sections=[ParsedSection(label="4", heading="Disclosure", text="x " * 60, paragraph_no="4")]
    )
    chunk = chunk_document("docX", parsed)[0]
    meta = chunk.metadata()
    assert meta["document_id"] == "docX"
    assert meta["heading"] == "Disclosure"
    assert meta["paragraph_no"] == "4"
