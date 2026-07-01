"""Regulation Extraction Agent (proposal §6.2.2).

Determines the regulatory context of a document: which intermediary classes it binds,
whether it creates / amends / rescinds / merely informs, its effective date, and which
prior instruments it engages. Citations detected by the parser are resolved against the
indexed corpus via hybrid retrieval, and a constrained LLM call produces the structured
context record.
"""
from __future__ import annotations

from llm import StructuredOutputError, structured_complete
from rag import vector_store
from rag.hybrid_search import hybrid_search
from schemas import (
    ParsedDocument,
    RegulatoryContext,
    RegulatoryContextLLM,
    ResolvedCitation,
)

SYSTEM_PROMPT = (
    "You are a SEBI regulatory analyst. Given the text of a SEBI circular, identify its "
    "regulatory context precisely and return JSON only. Determine: the classes of "
    "intermediaries it applies to; whether the circular creates NEW obligations, AMENDS "
    "existing ones, RESCINDS them, or is purely INFORMATIONAL; the effective date if "
    "stated (ISO YYYY-MM-DD); and a one-paragraph summary. Base every judgement strictly "
    "on the provided text; do not invent details."
)


def _resolve_citations(parsed: ParsedDocument) -> list[ResolvedCitation]:
    resolved: list[ResolvedCitation] = []
    for ref in parsed.cross_references:
        if ref.kind != "circular":
            resolved.append(ResolvedCitation(raw=ref.raw, found_in_corpus=False))
            continue
        hits = hybrid_search(vector_store.CORPUS_COLLECTION, ref.raw, top_k=1)
        found = bool(hits) and ref.raw.lower() in (hits[0].metadata.get("reference", "").lower())
        resolved.append(
            ResolvedCitation(
                raw=ref.raw,
                resolved_title=hits[0].metadata.get("title") if found else None,
                found_in_corpus=found,
            )
        )
    return resolved


def _similar_instruments(parsed: ParsedDocument) -> list[str]:
    query = parsed.full_text[:1500]
    hits = hybrid_search(vector_store.CORPUS_COLLECTION, query, top_k=4)
    seen: list[str] = []
    for h in hits:
        ref = h.metadata.get("reference", h.metadata.get("source_slug", ""))
        if ref and ref not in seen:
            seen.append(ref)
    return seen


def extract_regulatory_context(parsed: ParsedDocument, reference: str = "") -> RegulatoryContext:
    document_text = parsed.full_text[:6000]
    user_prompt = (
        f"Circular reference: {reference or 'unknown'}\n\n"
        f"Circular text:\n\"\"\"\n{document_text}\n\"\"\"\n\n"
        "Return the regulatory context as JSON."
    )
    try:
        llm_ctx: RegulatoryContextLLM = structured_complete(
            SYSTEM_PROMPT, user_prompt, RegulatoryContextLLM
        )
    except StructuredOutputError:
        # Fall back to a minimal, clearly-flagged context rather than failing the pipeline.
        llm_ctx = RegulatoryContextLLM(summary="Automatic context extraction failed; review required.")

    return RegulatoryContext(
        intermediary_classes=llm_ctx.intermediary_classes,
        obligation_mode=llm_ctx.obligation_mode,
        effective_date=llm_ctx.effective_date,
        summary=llm_ctx.summary,
        citations=_resolve_citations(parsed),
        similar_instruments=_similar_instruments(parsed),
    )
