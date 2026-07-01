# The Scale-Aware Processing Funnel

> Enterprise RegTech does **not** run a language model over every page, every time. A
> 414-page master circular has ~870 sections; processing each with an LLM (≈870 calls) is
> neither affordable nor necessary. PRAXIS reserves the model for the small fraction of
> content that actually needs reasoning.

This document describes the funnel that makes the pipeline scale. It is implemented in the
`preprocessing/` package and orchestrated by `services.process_document` (Phase A).

## The funnel

```
            SEBI PDF
               │
               ▼
      ┌──────────────────┐  agents/parser.py
      │  Structure Parser│  → sections, headings, cross-refs, parse-quality   (no AI)
      └────────┬─────────┘
               ▼
      ┌──────────────────┐  preprocessing/document_type.py
      │  Type Detection  │  → circular vs master circular + family key        (no AI)
      └────────┬─────────┘
               ▼
      ┌──────────────────┐  preprocessing/classifier.py
      │  Candidate Filter│  → drop TOC / definitions / annexures / recitals    (no AI)
      └────────┬─────────┘
               ▼
      ┌──────────────────┐  preprocessing/fingerprint.py   (master circulars)
      │   Diff Engine    │  → SHA-256 per section; skip unchanged              (no AI)
      └────────┬─────────┘
               ▼
      ┌──────────────────┐  preprocessing/rule_extractor.py
      │  Hybrid Router   │  ┌── clear "shall/must" clause ──► regex rule engine (no AI)
      │                  │  └── qualitative / ambiguous   ──► LLM              (AI here only)
      └────────┬─────────┘
               ▼
        obligations (pending_review)  →  persisted, indexed, fingerprints stored
```

Every layer before the hybrid router is deterministic. By the time the LLM is reached, the
input has been reduced from hundreds of sections to a handful.

## Layer 1 — Structure Parser (`agents/parser.py`)

Converts the PDF into hierarchically-labelled sections with preserved structure,
cross-references and a parse-quality score. pdfplumber for vector PDFs; Tesseract OCR
fallback when the text layer is poor (< 0.80). No AI. See [agents.md](agents.md#document-parser).

## Layer 2 — Document-type detection (`preprocessing/document_type.py`)

Two document types behave very differently:

| Type | Meaning | Processing |
|---|---|---|
| **Circular** | New regulation (typically 5–25 pages) | Process in full, immediately |
| **Master circular** | A *consolidation* of many prior circulars + amendments + annexures, kept for convenience (e.g. 414 pages) | Process **incrementally** — diff against the previous version |

Detection: the document is a master circular if the title/reference/first pages contain
"master circular", or the page count ≥ 60. A **family key** (`family_key`) is derived from
the title with dates/version markers stripped, so successive releases of the same document
group together for diffing.

## Layer 3 — Candidate Filter (`preprocessing/classifier.py`)

A master circular is mostly *not* regulation. `classify_section` assigns each parsed section
a deterministic kind and only `REGULATORY` sections proceed:

| Kind | Dropped? | Heuristic |
|---|---|---|
| `regulatory` | **proceeds** | contains a mandatory verb (shall/must/required to/mandatorily) |
| `table_of_contents` | dropped | "contents/index" heading, or lines terminating in page numbers / dotted leaders |
| `definition` | dropped | "definitions" heading, or `"Term" means …` pattern |
| `annexure` | dropped | annexure/appendix/proforma/format/schedule heading |
| `recital` | dropped | preamble / enabling-power citation with no mandatory duty, or no mandatory verb at all |
| `amendment_history` | dropped | rescission / supersession / withdrawal list with no live duty |
| `heading` | dropped | below the minimum length (12 words) |

The classifier explains every decision (returns a reason), which matters for auditability.

**Measured drop rates (real SEBI master circulars):**

| Document | Total sections | Regulatory candidates | Dropped (recital / heading / toc / annexure) |
|---|---|---|---|
| Investment Advisers (94 p) | 151 | 57 | 94 (69 / 21 / 3 / 1) |
| Stock Brokers (414 p) | 870 | 296 | 574 (315 / 241 / 7 / 11) |

## Layer 4 — Diff Engine (`preprocessing/fingerprint.py`)

Each section gets a SHA-256 of its normalised text, stored in `section_fingerprints` keyed
by `(family_key, section_label)`. When a new release of the same family is processed,
`diff_sections` compares hashes:

```
old hash == new hash  → unchanged → SKIP (no extraction)
old hash != new hash  → changed   → process
label not seen before → new       → process
```

For a master circular re-issued with a handful of amendments, this skips the vast majority of
candidate sections — driving LLM calls toward **zero** on re-processing. Fingerprints for all
candidate sections are (re)stored after each run so the next diff is correct. The diff engine
is engaged only for master circulars; single circulars are always processed in full.

## Layer 5 — Hybrid Router (`preprocessing/rule_extractor.py`)

Each surviving candidate section is routed as a whole:

- **Deterministic path (no LLM).** If the section contains **no** qualitative language, every
  mandatory sentence is extracted by regex: the verbatim sentence becomes the obligation,
  the functional area is scored by keyword, and any deadline phrase is captured by pattern.
  Confidence starts at 0.9 (pattern-matched, verbatim) and is calibrated downstream.
- **LLM path (reasoning needed).** If the section contains open-ended language — *adequate*,
  *appropriate*, *reasonable*, *as may be specified*, *to the satisfaction of*, *fit and
  proper*, etc. — the whole section is sent to the language model, which extracts all its
  obligations with proper atomicity. (A section with a mandatory verb that no clean sentence
  could be parsed from also falls back to the LLM, for safety.)

This implements the proposal's "accuracy over comprehensiveness" (§7.1): the model is used
only where deterministic rules cannot be trusted.

**Measured routing (candidates → method):**

| Document | Candidates | Deterministic (no LLM) | Routed to LLM |
|---|---|---|---|
| Investment Advisers (94 p) | 57 | 40 | 17 |
| Stock Brokers (414 p) | 296 | 225 | 71 |

## Headline result

LLM calls for obligation extraction (`llm_sections` + 1 regulatory-context call):

| Document | Old (LLM per substantive section) | New (funnel) | Reduction |
|---|---|---|---|
| Investment Advisers (94 p) | ~130 | **18** | ~86% |
| Stock Brokers (414 p) | ~629 | **72** | ~89% |

On a re-issue of the same master circular, the diff engine removes unchanged sections, so the
"new" figure collapses toward the number of sections that actually changed.

## Funnel observability

`services.process_document` records the full funnel on each document (`Document.funnel`,
exposed via the API), so the reduction is visible per run:

```json
{
  "document_type": "master_circular",
  "total_sections": 151,
  "classified": {"recital": 69, "regulatory": 57, "heading": 21, "toc": 3, "annexure": 1},
  "candidates": 57,
  "diff": {"new": 57, "changed": 0, "unchanged_skipped": 0},
  "sections_sent_to_extractor": 57,
  "deterministic_sections": 40,
  "llm_sections": 17,
  "obligations_total": 48,
  "obligations_deterministic": 33,
  "obligations_llm": 15,
  "llm_calls": 18
}
```

(`diff.unchanged_skipped` becomes large on the second processing of the same family.)

## Post-extraction quality controls

Applied in `agents/obligation_extraction.py` after routing, to both deterministic and LLM
obligations:

- **Confidence calibration** — adjusts the raw score from objective signals (verbatim-quote
  match, presence of a mandatory verb, area certainty) and caps it at 0.98, so the value
  reflects real ambiguity and drives the human-review flag (`needs_review` when
  `confidence < 0.65`).
- **Semantic de-duplication** — removes near-identical obligations restated across clauses
  (cosine ≥ 0.90 on mpnet embeddings), keeping the higher-confidence instance.
- **Cross-reference linking** — links an obligation to a closely matching prior obligation in
  the obligation index and marks it `modifies` (the basis of cross-document supersession in
  the [knowledge graph](knowledge-graph.md)).
