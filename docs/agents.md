# Agent Reference

PRAXIS distributes processing across narrowly-specialised agents (proposal §6). Each has a
defined input/output schema; outputs are validated before entering the next stage. LangGraph
coordinates the stages with a typed shared state (`graph/state.py`, `graph/pipeline.py`).

| Agent | Module | LLM? | Output |
|---|---|---|---|
| Document Parser | `agents/parser.py` | No | `ParsedDocument` (sections, cross-refs, parse-quality) |
| Regulation Extraction | `agents/regulation_extraction.py` | 1 call | `RegulatoryContext` |
| Obligation Extraction (hybrid) | `agents/obligation_extraction.py` | Selective | `list[Obligation]` + funnel stats |
| Rule Generation | `agents/rule_generation.py` | 1 call/obligation | `ComplianceRule` |
| Workflow Mapping | `agents/workflow_mapping.py` | No | `list[WorkflowTask]` |
| Evidence Mapping | `agents/evidence_mapping.py` | No | `list[EvidenceRequirement]` |
| Audit Report | `agents/audit_report.py` | No | Audit package (PDF + XLSX) |

All typed I/O lives in `schemas.py`.

---

## Document Parser (§6.2.1)

**Purpose:** convert a raw regulatory document into structured, hierarchically-labelled text.

- pdfplumber for vector PDFs; if the text layer is poor (parse-quality < `ocr_trigger_quality`
  = 0.80), the page is rasterised at 300 DPI and run through Tesseract.
- Splits numbered paragraphs into `ParsedSection`s, separating a short heading line from the
  body, and carries a hierarchical `label` for provenance.
- Detects cross-references by regex (prior circular numbers, "Regulation N", "Section 11(1)",
  Acts, dated references).
- Computes `parse_quality` (0–1); documents below `parse_quality_min` (0.70) are flagged for
  human parsing rather than proceeding.

**Output:** `ParsedDocument(sections, cross_references, parse_quality, used_ocr, page_count, full_text)`.

## Regulation Extraction (§6.2.2)

**Purpose:** determine the regulatory context of the document.

- Queries the corpus vector store (hybrid search) for similar prior instruments and resolves
  the parser's citations against the indexed corpus.
- One constrained LLM call returns: applicable intermediary classes, obligation mode
  (new / amend / rescind / informational), effective date, and a one-paragraph summary.

**Output:** `RegulatoryContext` (LLM fields + resolved citations + similar instruments).

## Obligation Extraction — hybrid (§6.2.3)

**Purpose:** identify each discrete, trackable compliance obligation, with provenance.

This is the analytically intensive stage and the heart of the [funnel](processing-funnel.md).
It receives **candidate** sections (already filtered and diffed) and routes each:

- **Deterministic** (`preprocessing/rule_extractor.py`) for clear mandatory clauses — no LLM.
- **LLM** (`_llm_extract_section`, preserved) for qualitative/ambiguous sections only.

For every obligation (regardless of path) it records:
- a plain-language `description` and the **verbatim `source_text`** + `source_paragraph_ref`
  (provenance — the officer can verify against the original circular);
- `functional_area`, `modification_type`, calibrated `confidence`, `deadline_hint`;
- `extraction_method` = `deterministic` | `llm`.

Then it **calibrates confidence**, **de-duplicates** near-identical obligations, **links**
prior obligations (cross-reference), and flags low-confidence items for review. Returns
`(list[Obligation], stats)` where `stats` is the funnel breakdown.

## Rule Generation (§6.2.4)

**Purpose:** translate an approved obligation into a machine-evaluable rule.

One LLM call per obligation produces a `ComplianceRule`:
- `rule_type` ∈ deadline | threshold | documentation | periodic_filing | process_adherence;
- `evaluation_criterion`, `timeline`, verbatim `threshold_value` (never invented);
- `is_qualitative` (true → routed to human judgement rather than a fabricated threshold);
- `evidence_type`.

Runs only on human-approved obligations (Phase B).

## Workflow Mapping (§6.2.5)

**Purpose:** map each obligation/rule to the firm's organisation. **Deterministic** —
driven by `data/org_config.json` (functional-area registry), so assignments are reproducible
and explainable.

- Resolves the functional area to a primary owner, reviewer and workflow template.
- Computes a deadline that builds in an implementation buffer before the regulatory effective
  date (clamped to today if the effective date is in the past).
- Generates a **dependent task chain** when an operational/technology obligation also requires
  board-approved documentation (a dependent legal/board-approval task).

**Output:** `list[WorkflowTask]` (presented for approval before tasks are created).

## Evidence Mapping (§6.2.6)

**Purpose:** define the evidence artefacts that demonstrate compliance. **Deterministic** —
a library of evidence templates keyed by rule type (filing acknowledgement, system report,
board-approved policy, periodic-filing receipt, SOP + sample records). Board-approved
obligations additionally require a board-resolution artefact.

**Output:** `list[EvidenceRequirement]` (document type, required content, collector, retention).

## Audit Report (§6.2.8)

**Purpose:** assemble a dated audit package for a scope (one obligation, a circular, or the
firm). **Deterministic.** For each obligation it presents the traceable chain — source
regulatory text → obligation → rule → task → evidence → approval history (from the
append-only audit log) — and exports **PDF + XLSX**.

**Output:** a dated package with full provenance from regulatory text to implementation
evidence, plus a system attestation.

---

## Orchestration

- **Phase A** (extraction) is orchestrated by `services.process_document`, which runs the
  funnel and calls the parser, regulation and (hybrid) obligation agents. The equivalent
  LangGraph extraction graph (`graph/pipeline.py`) is retained for direct/standalone use and
  routes low parse-quality documents to a human-parse flag.
- **Phase B** (generation) is a LangGraph graph: `rule_generation` then
  `workflow_mapping ∥ evidence_mapping` as **parallel branches** that fan back in (native
  parallel node execution, §11.2). Additive reducers on the shared `logs`/`flags` channels
  let the parallel branches write concurrently.
