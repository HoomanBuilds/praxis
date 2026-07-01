# Architecture

## Design principles

Three properties are non-negotiable given the compliance context (proposal §5.1):

1. **Auditability** — every transformation of regulatory content is logged with its input,
   output and the agent/rule responsible. The audit log is append-only.
2. **Determinism in critical paths** — compliance-status computations and the candidate
   filter follow deterministic rules, not probabilistic model output.
3. **Human-in-the-loop at consequential points** — no obligation enters the operational
   register, and no rule/task is generated, without a compliance officer's approval.

A fourth property, added because real SEBI documents are large, is **scale-awareness**: the
expensive language model is reserved for content that genuinely needs reasoning. This is
implemented by the pre-processing funnel ([processing-funnel.md](processing-funnel.md)).

## Subsystems

```
                         ┌──────────────────────────────────────────────┐
                         │              FastAPI application              │
   SEBI PDF  ──ingest──► │  documents · obligations · rules · tasks ·    │
                         │  evidence · dashboard · audit · knowledge-graph│
                         └───────────────┬──────────────────────────────┘
                                         │ publishes document.process
                                         ▼
                                  Redis Streams  ───►  LangGraph worker
                                                            │
                 ┌──────────────────────────────────────────┴───────────────┐
                 │             Pre-processing funnel + agent pipeline         │
                 │  parse → classify → diff → hybrid extract (regex / LLM)    │
                 │                → rules → workflow ∥ evidence → audit        │
                 └───────────────┬───────────────────────────┬───────────────┘
                                 │                           │
                        Relational store              Vector store (ChromaDB)
                  (SQLite / PostgreSQL 16):           regulatory corpus +
                  documents, obligations, rules,      obligation index
                  tasks, evidence, fingerprints,            │
                  append-only audit log              Ollama (llama3.1:8b)
                                 │                    local, on-prem LLM
                                 ▼
                    Compliance knowledge graph (projection)
```

| Subsystem | Module(s) | Responsibility |
|---|---|---|
| Ingestion service | `ingestion/service.py` | Store document immutably, dedup by hash, publish to Redis Stream |
| Worker | `ingestion/worker.py` | Consume the stream, run Phase A, persist |
| Pre-processing funnel | `preprocessing/` | Document-type detection, candidate filter, fingerprint + diff, hybrid routing |
| Agent pipeline | `agents/`, `graph/` | Parser, regulation, obligation, rule, workflow, evidence, audit; LangGraph orchestration |
| RAG | `rag/` | Structure-aware chunking, embeddings, ChromaDB, hybrid search |
| Knowledge graph | `kg/` | Project the relational store into a graph; GraphML export |
| Persistence | `db/` | SQLAlchemy models, sessions, CRUD + audit logging |
| API | `api/` | REST surface + serializers |
| Orchestration glue | `services.py` | Binds funnel + agents + persistence; one path for CLI/worker/API |
| Config / schemas / LLM | `config.py`, `schemas.py`, `llm.py` | Settings, typed I/O, pluggable Ollama client |

## The two-phase, human-in-the-loop pipeline

The pipeline is split so the proposal's hard HITL constraint (§10.5) is structural, not
optional: rules/tasks/evidence are only generated for obligations a human approved.

```
Phase A  (services.process_document)              ← scale-aware funnel
  parse → classify → diff → regulatory context → hybrid obligation extraction
  └─► obligations persisted as status = "pending_review"

        ══ HUMAN GATE: approve / edit / reject  (REST or CLI) ══

Phase B  (services.generate_for_document, LangGraph generation graph)
  rule-generation → (workflow-mapping ∥ evidence-mapping)   ← parallel branches
  └─► rules, tasks, evidence persisted for approved obligations only

Audit Report  (on demand)  → traceable PDF + XLSX evidence package
Knowledge Graph (always)   → live projection of the compliance store
```

A `--auto-approve` flag runs both phases for tests/demos.

## End-to-end data flow

1. **Ingest** — a PDF is hashed (dedup), stored immutably, a `documents` row is created, and
   a `document.process` event is published to Redis (or processed synchronously via the API).
2. **Phase A** (`services.process_document`):
   - **Parse** (`agents/parser.py`) → structured sections, cross-references, parse-quality.
   - **Detect type** (`preprocessing/document_type.py`) → circular vs master circular + family key.
   - **Classify** (`preprocessing/classifier.py`) → drop TOC/definitions/annexures/recitals.
   - **Diff** (`preprocessing/fingerprint.py`, master circulars) → skip unchanged sections.
   - **Regulatory context** (`agents/regulation_extraction.py`) → 1 LLM call (RAG-grounded).
   - **Hybrid extract** (`agents/obligation_extraction.py`) → deterministic regex where clear,
     LLM only for qualitative sections; calibrate confidence; de-duplicate; link priors.
   - Persist obligations (`pending_review`), index them for cross-reference search, store
     section fingerprints, write the funnel stats onto the document.
3. **Human gate** — officer approves / edits / rejects via REST or CLI; every action is audited.
4. **Phase B** (`services.generate_for_document`) — LangGraph generation graph produces rules,
   then workflow tasks and evidence requirements in parallel, for approved obligations only.
5. **Audit / KG** — an audit package can be exported at any time; the knowledge graph is a
   live projection over the relational store.

## Where the LLM is (and is not) used

| Stage | Uses LLM? |
|---|---|
| Parsing, classification, fingerprint/diff | No — deterministic |
| Regulatory context | Yes — 1 call per document |
| Obligation extraction (clear mandatory clauses) | **No** — regex rule engine |
| Obligation extraction (qualitative/ambiguous sections) | Yes — fallback only |
| Rule generation | Yes — 1 call per approved obligation |
| Workflow mapping, evidence mapping | No — deterministic, from `org_config.json` + templates |
| Audit report, knowledge graph | No — deterministic projection |

See [processing-funnel.md](processing-funnel.md) for the measured impact and
[agents.md](agents.md) for each stage.
