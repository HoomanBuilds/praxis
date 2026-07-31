# 03 · Agent Architecture

PRAXIS is an **agentic system in the strict sense**: a LangGraph state machine whose nodes
reason over regulatory text, call tools (parsers, diffs, the local LLM, the CRUD layer), and
— critically — *hand the authority to act* to a human at the review gate. The design follows
the PS2 framing: the agent does the reading and the drafting; the human does the deciding.

## The two-phase pipeline

```
                     ┌────────────────────────────────────────────┐
                     │              Phase A  (extraction)          │
                     │  ingest ─► parse ─► funnel ─► obligations    │
                     │                                │            │
                     └────────────────────────────────┼────────────┘
                                                      ▼
                                             REVIEW GATE (human)
                                                      │ approve / edit
                                                      ▼
                     ┌────────────────────────────────────────────┐
                     │              Phase B  (generation)          │
                     │  rules ─► tasks ─► evidence collectors      │
                     └────────────────────────────────────────────┘
```

| Phase | Agent behaviour | Tools used | Output |
|---|---|---|---|
| **A — Extract** | Classifies the document, filters sections, diffs against prior releases, decides deterministic-vs-LLM extraction per section, proposes obligations | parser, classifier, fingerprint store, LLM, `db.crud` | `obligations` (status `pending_review`) + funnel telemetry |
| **Review gate** | *Human.* Agent blocks until an officer approves, edits, or rejects each proposed obligation | UI review queue | obligations with status `approved` / `edited` |
| **B — Generate** | Turns each approved obligation into rules, workflow tasks, and evidence requirements | LLM (rule drafting), `org_config.json` (owners), CRUD | `rules`, `tasks`, `evidence_requirements` |

## Agentic properties

| Property | How PRAXIS exhibits it |
|---|---|
| **Perceives** | Parses circular PDFs into structured sections; reads the obligation index for cross-document matching; reads org config for functional areas and owners |
| **Reasons** | Rules determine *when to spend LLM tokens* (funnel), *how confident to be* (calibrated confidence), and *what an obligation modifies* (cross-reference matching) |
| **Acts** | Writes obligations, rules, tasks, and evidence to the CRUD layer; updates statuses; emits audit events |
| **Uses tools** | Parser, section classifier, fingerprint/diff store, LLM (via Ollama), CRUD/audit — all invoked by graph nodes |
| **Hands off to a human** | The review gate is a hard graph boundary: no rules/tasks exist until approval. This is the anti-runaway control |
| **Explains itself** | Every obligation keeps verbatim `source_text` + paragraph ref + `extraction_method`; rules carry evaluation criteria; everything is audit-logged |

## State machine per document

```
ingested ─► extracting ─► awaiting_review ─► generating ─► completed
                     ▲                            │
                     └──────── (edit/reject)      └──► needs_human_parse / failed
```

The `documents.status` field tracks this; `parse_quality`, `used_ocr`, and `page_count` from
the parser are attached so failures are diagnosable rather than silent.

## The review gate in detail

- Every extracted obligation is created with `status=pending_review` and `needs_review=true`
  when `confidence < 0.65`.
- The officer can **approve**, **edit** (PATCH description / functional area / modification
  type), or **reject** — each action writes a `before/after` audit delta with the reviewer's
  identity and timestamp.
- Only `approved` obligations feed Phase B. Editing is itself an audited agent action (the
  system records the change, then regenerates downstream artefacts).
- Batch operations are supported so a 100+ obligation circular can be triaged quickly, but the
  gate itself is never skipped: there is no `auto-approve` flag in the agent core.

## Cross-document reasoning (the "MODIFIES" agent)

When Phase A detects a new circular release, the fingerprint diff isolates changed sections.
The extractor then consults the **obligation index** for close matches. A match produces:

- a `MODIFIES` edge in the knowledge graph, and
- `modification_type` = `modifies` / `supersedes` / `clarifies` on the new obligation, linked
  via `linked_prior_obligation_id`.

This is the agent's *temporal* intelligence — it can show how an obligation evolved across
releases, which no off-the-shelf GRC tool does for SEBI circulars. See
[07 Knowledge Graph](07_KNOWLEDGE_GRAPH.md).

## Why LangGraph

The pipeline needed (a) conditional branches (deterministic vs. LLM path), (b) a pause point
for the human gate, and (c) per-node observability for the audit log. LangGraph models exactly
that: each node is a named, re-runnable step and the graph itself is inspectable. It also
keeps the LLM usage explicit and bounded, so the "agent" is auditable rather than a black box.

## Anti-patterns deliberately avoided

- ❌ **Autonomous self-approval.** The agent never approves its own obligations.
- ❌ **Fire-and-forget LLM over everything.** The funnel exists precisely to prevent that.
- ❌ **Implicit state.** All agent writes go through `db/crud.py`, which is the only place
  that touches the audit log.
