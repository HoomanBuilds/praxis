# 05 · Document Processing

Covers the life of a regulatory instrument from upload to completed processing.

## Lifecycle

```
upload ─► ingested ─► extracting ─► awaiting_review ─► generating ─► completed
   │          │
   │          └─► needs_human_parse   (parser failure / poor parse quality)
   │              failed              (unrecoverable)
   └─► duplicate detected ─► returned, not re-processed
```

## 1 · Ingestion

`POST /api/documents/ingest` (multipart `file`; query `reference`, `title`, `process`).

- Stores the file and computes a **SHA-256 content hash** — the dedup key. Re-uploading the
  same circular returns the existing document (`created: false`) instead of duplicating the
  corpus.
- `process=true` runs Phase A synchronously and returns the funnel telemetry in the response;
  otherwise the document is published to the worker queue.
- The ingest response exposes `document`, `created`, and either `queued` or `processed`.

## 2 · Parsing

- Text extraction from the PDF with `parse_quality` and `page_count` recorded.
- `used_ocr` flag when scanned pages require OCR (parse-quality fallback).
- Poor parse quality routes the document to `needs_human_parse` rather than silently running
  the pipeline on garbage.

## 3 · Processing (Phase A)

Orchestrated by `services.process_document`. Steps:

1. Run the four-layer funnel (see [04 AI Pipeline](04_AI_PIPELINE.md)).
2. Classify sections; skip boilerplate; apply the fingerprint diff.
3. Extract obligations (deterministic + LLM paths) into `pending_review`.
4. Persist per-run funnel stats in `documents.funnel` and set
   `status=awaiting_review`.
5. Write audit events: `document.ingested`, `obligation.extracted` per obligation.

The **process response** is the proof payload judges can inspect:

```json
{
  "document_id": "…",
  "status": "awaiting_review",
  "obligations": 48,
  "flagged_for_review": ["…-OB-007"],
  "parse_quality": 0.997,
  "funnel": {
    "total_sections": 151,
    "candidates": 57,
    "deterministic_sections": 40,
    "llm_sections": 17,
    "llm_calls": 18,
    "…": "…"
  }
}
```

## 4 · Review (the human gate)

The officer reviews the obligation queue. Approve / edit / reject. Only approved obligations
advance. Detail in [09 Workflows & HITL](09_WORKFLOWS_AND_HITL.md).

## 5 · Generation (Phase B)

`POST /api/documents/{id}/generate` runs the approved set through rule/task/evidence
generation. See [08 Rules & Tasks](08_RULES_AND_TASKS.md).

## Incremental updates (the diff engine)

Regulators amend circulars. Naive reprocessing would delete and re-extract everything; the
fingerprint engine (`preprocessing/fingerprint.py`, `section_fingerprints` table) keys on
`(family_key, section_label) → content_hash`:

- **Unchanged sections** → skipped. Their obligations, rules, tasks, and evidence remain
  untouched, and the knowledge graph is unmodified.
- **Changed sections** → re-extracted. The extractor compares against the obligation index;
  near matches get `modification_type=modifies/supersedes/clarifies` and a
  `MODIFIES` edge in the graph.
- **New sections** → treated as new obligations.

The system is therefore **incremental by construction**: reprocessing is proportional to the
delta, not to the document size.

## Downloads & retrieval

| Endpoint | Purpose |
|---|---|
| `GET /api/documents` | list, newest first |
| `GET /api/documents/{id}` | document + `document_type`, `funnel`, `regulatory_context` |
| `GET /api/documents/{id}/file` | download the original PDF |

## Typical sequence (API)

```
POST /api/documents/ingest?process=true      → document_id + funnel
GET  /api/obligations?document_id=…&status=pending_review
POST /api/obligations/{id}/approve          (repeat / PATCH / reject)
POST /api/documents/{id}/generate
GET  /api/audit/report  {scope:"document", document_id:…}
```

Full endpoint reference: [api-reference.md](api-reference.md).
