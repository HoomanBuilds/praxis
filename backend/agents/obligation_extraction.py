"""Obligation Extraction Agent (proposal §6.2.3) — hybrid, scale-aware.

Operates on the *candidate* sections handed to it by the pre-processing funnel (TOC,
definitions and annexures already removed; for master circulars, unchanged sections already
skipped). Each candidate section is routed:

  * deterministic regex extraction for mechanically clear mandatory clauses (no model call);
  * the constrained LLM only for sections with qualitative/ambiguous language.

Every obligation — however extracted — carries verbatim source text and a paragraph
reference for provenance (§12.2). After extraction the agent calibrates confidence from
objective signals, de-duplicates near-identical obligations, and links obligations that
modify prior ones. Low-confidence obligations are flagged for human review.
"""
from __future__ import annotations

import re

from config import settings
from llm import LLMResult, StructuredOutputError, structured_complete
from preprocessing import rule_extractor
from rag import embeddings as emb
from rag import vector_store
from schemas import (
    FunctionalArea,
    ModificationType,
    Obligation,
    ObligationExtractionResult,
    ObligationLLM,
    ObligationStatus,
    ParsedSection,
    RegulatoryContext,
)

SYSTEM_PROMPT = (
    "You are a SEBI compliance analyst extracting the compliance obligations created by a "
    "single paragraph of a SEBI circular. Return JSON only.\n\n"
    "GRANULARITY — extract one obligation per distinct, separately-trackable compliance "
    "action. Combine sentences/clauses that together describe ONE action into a single "
    "obligation. Only output multiple obligations when the paragraph imposes genuinely "
    "independent duties (e.g. a duty to ACT and a separate duty to REPORT or to RETAIN "
    "records). Do not split one duty into several just because it spans multiple sentences.\n\n"
    "WHAT COUNTS — extract only mandatory duties on the intermediary (signalled by 'shall', "
    "'must', 'is required to', 'mandatorily', a named deadline, or a required filing). Ignore "
    "definitions, preambles, recitals, enabling-power citations and descriptive statements.\n\n"
    "FIELDS:\n"
    "- description: a clear plain-language restatement of the single duty.\n"
    "- source_quote: copied VERBATIM from the paragraph — the exact sentence(s) creating the "
    "duty. Never paraphrase the quote.\n"
    "- functional_area: the team that implements it. Use this guidance:\n"
    "    operations = settlement, margin collection/pledge, reconciliation, account handling;\n"
    "    technology = systems, cyber security, VAPT, BCP/DR, data, IT infrastructure;\n"
    "    compliance = policies, board approval, regulatory filings/returns, monitoring, certifications;\n"
    "    legal = agreements, board resolutions, contractual/confidentiality terms;\n"
    "    finance = capital, margin/risk computation, penalties, financial reporting;\n"
    "    client_services = client disclosures, communication, grievance handling, onboarding;\n"
    "    human_resources = staff training, dealing-staff competence.\n"
    "- confidence (0-1): 0.9-1.0 only when the duty is explicit ('shall'/'must') with a clear "
    "scope; 0.7-0.89 when mandatory but scope or timeline is partly ambiguous; 0.5-0.69 when "
    "the duty is implied or its scope is unclear; below 0.5 when it is doubtful a binding "
    "obligation exists.\n"
    "- modification_type: new | modifies | supersedes | clarifies.\n"
    "- deadline_hint: any stated timeline/deadline phrase copied verbatim, else null.\n\n"
    "If the paragraph contains no obligation, return an empty list."
)

import hashlib
PROMPT_VERSION = "1.0.0"
PROMPT_HASH = hashlib.sha256(SYSTEM_PROMPT.encode()).hexdigest()[:12]

_DEDUP_SIMILARITY = 0.90
_MANDATORY_VERB_RE = re.compile(
    r"\b(shall|must|is required to|are required to|mandatorily|required to)\b", re.IGNORECASE
)
_AREA_KEYWORDS: list[tuple[FunctionalArea, tuple[str, ...]]] = [
    (FunctionalArea.TECHNOLOGY, ("cyber", "vapt", "penetration", "disaster recovery",
                                 "recovery time objective", "recovery point objective", "data centre")),
    (FunctionalArea.OPERATIONS, ("margin pledge", "re-pledge", "reconcile", "reconciliation",
                                 "settlement", "demat account")),
    (FunctionalArea.CLIENT_SERVICES, ("grievance", "complaint", "scores", "investor")),
]


def _quote_in_text(quote: str, text: str) -> bool:
    return bool(quote) and quote.strip().lower()[:60] in text.lower()


def _refine_area(area: FunctionalArea, source_text: str) -> FunctionalArea:
    lower = source_text.lower()
    for candidate, keywords in _AREA_KEYWORDS:
        if any(k in lower for k in keywords):
            return candidate
    return area


def _calibrate_confidence(model_conf: float, source_text: str, quote_matched: bool, area: FunctionalArea) -> float:
    conf = float(model_conf)
    if not quote_matched:
        conf -= 0.25
    if not _MANDATORY_VERB_RE.search(source_text):
        conf -= 0.20
    if area == FunctionalArea.OTHER:
        conf -= 0.15
    return round(max(0.0, min(0.98, conf)), 3)


def _check_prior_obligation(description: str) -> str | None:
    hits = vector_store.query(vector_store.OBLIGATION_COLLECTION, description, n_results=1)
    if hits and hits[0].score >= 0.85:
        return hits[0].id
    return None


def _dedupe(obligations: list[Obligation]) -> list[Obligation]:
    if len(obligations) < 2:
        return obligations
    vectors = emb.embed_texts([o.description for o in obligations])
    kept: list[Obligation] = []
    kept_vecs: list[list[float]] = []
    for ob, vec in zip(obligations, vectors):
        duplicate_of = None
        for i, kv in enumerate(kept_vecs):
            if sum(a * b for a, b in zip(vec, kv)) >= _DEDUP_SIMILARITY:
                duplicate_of = i
                break
        if duplicate_of is None:
            kept.append(ob)
            kept_vecs.append(vec)
        elif ob.confidence > kept[duplicate_of].confidence:
            kept[duplicate_of] = ob
            kept_vecs[duplicate_of] = vec
    return kept


def _llm_extract_section(section: ParsedSection) -> list[ObligationLLM]:
    """The (preserved) LLM extraction path — used only for ambiguous/qualitative sections."""
    heading = f" ({section.heading})" if section.heading else ""
    user_prompt = (
        f"Paragraph {section.label}{heading} of the circular:\n"
        f'"""\n{section.text}\n"""\n\n'
        "Extract the compliance obligation(s) as JSON."
    )
    try:
        result: LLMResult = structured_complete(
            SYSTEM_PROMPT, user_prompt, ObligationExtractionResult
        )
        return result.parsed.obligations
    except StructuredOutputError:
        return [
            ObligationLLM(
                description="Extraction failed for this paragraph; manual review required.",
                source_quote=section.text[:240],
                functional_area=FunctionalArea.COMPLIANCE,
                confidence=0.0,
            )
        ]


def extract_obligations(
    document_id: str,
    sections: list[ParsedSection],
    context: RegulatoryContext,
) -> tuple[list[Obligation], dict]:
    """Hybrid extraction over pre-filtered candidate sections.

    Returns (obligations, stats) where stats reports how many sections were handled
    deterministically vs by the LLM — the headline scalability metric.
    """
    raw: list[Obligation] = []
    llm_sections = 0
    deterministic_sections = 0

    for section in sections:
        det_obligations, route_llm = rule_extractor.route_section(section)
        if route_llm:
            llm_sections += 1
            items = _llm_extract_section(section)
            method = "llm"
        else:
            items = det_obligations or []
            deterministic_sections += 1
            method = "deterministic"

        for item in items:
            quote_matched = _quote_in_text(item.source_quote, section.text)
            source_text = item.source_quote if quote_matched else section.text[:240]
            area = _refine_area(item.functional_area, section.text)
            raw.append(
                _make_obligation(
                    document_id, section.label,
                    description=item.description, source_text=source_text,
                    functional_area=area, model_conf=item.confidence, quote_matched=quote_matched,
                    modification_type=item.modification_type, deadline_hint=item.deadline_hint,
                    extraction_method=method,
                )
            )

    deduped = _dedupe(raw)
    for index, ob in enumerate(deduped):
        ob.identifier = f"{document_id[:8].upper()}-OB-{index + 1:03d}"

    stats = {
        "candidate_sections": len(sections),
        "deterministic_sections": deterministic_sections,
        "llm_sections": llm_sections,
        "obligations_total": len(deduped),
        "obligations_deterministic": sum(1 for o in deduped if o.extraction_method == "deterministic"),
        "obligations_llm": sum(1 for o in deduped if o.extraction_method == "llm"),
    }
    return deduped, stats


def _make_obligation(
    document_id: str,
    paragraph_ref: str,
    *,
    description: str,
    source_text: str,
    functional_area: FunctionalArea,
    model_conf: float,
    quote_matched: bool,
    extraction_method: str,
    modification_type: ModificationType = ModificationType.NEW,
    deadline_hint: str | None = None,
) -> Obligation:
    confidence = _calibrate_confidence(model_conf, source_text, quote_matched, functional_area)
    needs_review = confidence < settings.obligation_confidence_min
    linked_prior = _check_prior_obligation(description)
    if linked_prior:
        modification_type = ModificationType.MODIFIES
    return Obligation(
        identifier="",
        document_id=document_id,
        description=description,
        source_text=source_text,
        source_paragraph_ref=paragraph_ref,
        functional_area=functional_area,
        modification_type=modification_type,
        confidence=confidence,
        deadline_hint=deadline_hint,
        linked_prior_obligation_id=linked_prior,
        extraction_method=extraction_method,
        status=ObligationStatus.PENDING_REVIEW,
        needs_review=needs_review,
    )
