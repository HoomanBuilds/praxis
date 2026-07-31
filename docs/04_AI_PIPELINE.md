# 04 · AI Pipeline

The AI pipeline is built around one engineering thesis: **regulatory text is mostly
structure, and the LLM should only be spent on the part that genuinely requires reasoning.**

## The processing funnel

Implemented under `backend/preprocessing/` and orchestrated by `services.process_document`
(Phase A). Four layers:

```
documents ──► 1. document_type ──► 2. classifier ──► 3. fingerprint ──► 4. rule_extractor
                 circular │          sections that      unchanged       deterministic rules
                 master   │          *may* carry        sections        ──► obligations
                 circular │          obligations        skipped,        LLM sections
                 notice   └► (obligation-carrying)      only diffs      ──► obligations
                                                            reprocessed
```

### Layer 1 · Document-type classification
Determines whether the upload is a `circular`, `master_circular`, or other instrument, which
sets parsing strategy and expectation of density (a master circular is the 400+ page case).

### Layer 2 · Section classifier
Scores every section for the *probability it contains obligations*. Only candidate sections
progress. Most boilerplate (annexures, definitions, general instructions) is dropped here.
This is the biggest single source of the LLM-call savings.

### Layer 3 · Fingerprint diff engine (`preprocessing/fingerprint.py`)
Sections are hashed per `(family_key, section_label)`. On re-upload of a revised circular,
only changed sections re-enter the funnel; unchanged obligations are preserved untouched —
both in the store and in the knowledge graph. This is what makes processing updates
incremental instead of destructive (proposal §10.2).

### Layer 4 · Rule extractor
Split by *complexity*, not by guessing:

| Path | Applied to | Cost | Output |
|---|---|---|---|
| **Deterministic** | sections whose obligations follow boilerplate patterns (dates, filing deadlines, thresholds, named forms) | 0 LLM calls | obligations tagged `extraction_method=deterministic` |
| **LLM** | the ~10–20% of content that needs interpretation: nested conditions, cross-referenced duties, "and/or" obligations | ~1 call per section | obligations tagged `extraction_method=llm` |

### What the funnel spends on a real case
On a **414-page / 870-section master circular**: `total_sections=151` candidates (after
classifier), `40` handled deterministically, `17` via LLM (18 LLM calls with retry). Compare
with a naive per-section LLM pass of 870 sections: a **~85–90% reduction in model calls**
with full coverage of the obligation-carrying content.

Funnel statistics are persisted per run in `documents.funnel` (JSON) and returned by the
process API, so the savings are *observable in the demo*, not just claimed.

## Extraction model

Each proposed obligation carries:

- `description` — plain-language duty
- `source_text` — **verbatim** quote from the circular (provenance)
- `source_paragraph_ref` — section label
- `functional_area` — attribution to one of the 7 org areas
- `modification_type` — new / modifies / supersedes / clarifies
- `confidence` — calibrated 0–0.98
- `deadline_hint` — verbatim timeline phrase (later resolved into a task deadline)
- `extraction_method` — deterministic | llm

Low confidence (<0.65) sets `needs_review`, so human attention concentrates where the model
is least sure.

## Prompt / model design

- Local LLM via Ollama, default `llama3.1:8b`, swappable via `PRAXIS_LLM_*` env vars.
- Prompts are structured to return JSON matching the obligation schema; validation failures
  trigger bounded retries rather than silent acceptance.
- The LLM is given the *section text and paragraph reference*, never the whole document — a
  token-budget control that also keeps the extraction faithful to a citable source.

## Confidence calibration

- Confidence is explicitly calibrated (0–0.98) rather than a raw model probability.
- The threshold that triggers the human flag (0.65) is a product decision, not a prompt
  accident; it is visible in the review UI as "needs review".

## Evaluation posture

For a TechSprint prototype the accuracy bar is demonstrated by:
1. **Provenance checks** — every obligation must carry verbatim `source_text`; a judge can
   spot-check that the obligation actually says what the source says.
2. **Funnel telemetry** — parse quality, candidate counts, deterministic/LLM split, and call
   counts are recorded per document.
3. **Human gate as ground truth** — the officer's approve/edit/reject decisions are the
   reference; pipeline improvements are measured against them in the audit log.

A formal evaluation harness (golden set of annotated circulars, precision/recall against it)
is scoped in [17 Limitations & Roadmap](17_LIMITATIONS_AND_ROADMAP.md).

## Related

- [03 Agent Architecture](03_AGENT_ARCHITECTURE.md) — how the funnel is orchestrated as a graph
- [05 Document Processing](05_DOCUMENT_PROCESSING.md) — ingestion and diff details
- [08 Rules & Tasks](08_RULES_AND_TASKS.md) — Phase B generation
