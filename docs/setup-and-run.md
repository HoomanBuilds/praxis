# Setup & Run

## Prerequisites

- **Python 3.11**
- **Ollama** running locally with the model pulled:
  ```bash
  ollama pull llama3.1:8b
  ```
- (Docker path only) **Docker + Docker Compose**
- First corpus index downloads the `all-mpnet-base-v2` embedding model once (internet needed once).

The backend runs via `PYTHONPATH=backend` (no install step). A `Makefile` wraps the common
commands.

## Install

```bash
make install          # creates .venv and installs requirements.txt
# or manually:
python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
```

## Build the demo corpus

The synthetic SEBI-style corpus (`data/seed/`) is rendered to PDFs and indexed:

```bash
make seed             # render data/corpus/*.pdf
make index            # parse → chunk → embed → ChromaDB
```

## CLI (no Docker)

```bash
export PYTHONPATH=backend
python -m cli health                                   # LLM + corpus status
python -m cli ingest data/corpus/margin_pledge.pdf     # → <document_id>
python -m cli process <document_id>                    # Phase A (funnel + extraction)
python -m cli obligations <document_id>                # inspect provenance + confidence
python -m cli approve <obligation_id>                  # human-in-the-loop gate
python -m cli generate <document_id> --auto-approve    # Phase B (rules/workflow/evidence)
python -m cli audit --document <document_id>           # PDF + XLSX → data/exports/
```

One-shot end-to-end:

```bash
make run DOC=data/corpus/cyber_security.pdf            # ingest → process → generate → audit
```

## API (no Docker)

```bash
make api                                               # uvicorn on :8080
# Swagger UI: http://localhost:8080/docs
```

See [api-reference.md](api-reference.md) for endpoints.

## Full stack (Docker Compose)

Brings up **Postgres 16 · Redis Streams · ChromaDB · FastAPI API · LangGraph worker**.
Ollama runs on the host and is reached via `host.docker.internal`.

```bash
make seed                                              # corpus PDFs must exist before build
docker compose up --build
```

The API container indexes the corpus on startup; ingesting a document publishes a
`document.process` event that the worker consumes to run Phase A.

```bash
make worker                                            # run the worker standalone (no Docker)
```

## Tests

```bash
make test                                              # PYTHONPATH=backend pytest backend/tests -q
```

Tests cover parsing, structure-aware chunking, hybrid retrieval, the candidate
classifier / fingerprint-diff / hybrid router, the deterministic workflow & evidence agents,
persistence + audit logging, the knowledge-graph projection, and the API. They do **not**
require Ollama (LLM-dependent agents are exercised manually / in end-to-end runs).

## Configuration

All settings are environment variables with the `PRAXIS_` prefix and local-dev defaults
(`config.py`). Copy `.env.example` to `.env` to override. Key ones:

| Variable | Default | Purpose |
|---|---|---|
| `PRAXIS_LLM_MODEL` | `llama3.1:8b` | Ollama model |
| `PRAXIS_OLLAMA_HOST` | `http://localhost:11434` | Ollama endpoint |
| `PRAXIS_EMBEDDING_MODEL` | `all-mpnet-base-v2` | sentence-transformers model |
| `PRAXIS_DATABASE_URL` | local SQLite | Postgres URL in Docker |
| `PRAXIS_CHROMA_HOST` | empty (embedded) | set to use the ChromaDB container |
| `PRAXIS_REDIS_URL` | `redis://localhost:6379/0` | Redis Streams |
| `PRAXIS_PARSE_QUALITY_MIN` | `0.70` | below → human-parse flag |
| `PRAXIS_OBLIGATION_CONFIDENCE_MIN` | `0.65` | below → human-review flag |

## Repository layout

```
backend/
  config.py schemas.py llm.py services.py cli.py
  agents/        parser, regulation_extraction, obligation_extraction (hybrid),
                 rule_generation, workflow_mapping, evidence_mapping, audit_report
  preprocessing/ document_type, classifier, fingerprint, rule_extractor   ← the funnel
  graph/         state.py pipeline.py                                       ← LangGraph
  rag/           chunking, embeddings, vector_store, hybrid_search, corpus_index
  kg/            graph.py                                                    ← knowledge graph
  ingestion/     service.py worker.py                                       ← Redis Streams
  db/            models.py session.py crud.py
  api/           main.py routes_*.py serializers.py
  tests/
data/
  seed/          circulars.py build_pdfs.py        # synthetic corpus generator
  corpus/        *.pdf (generated)
  org_config.json                                  # functional-area registry
docs/                                              # this documentation
docker-compose.yml  Dockerfile  Makefile  requirements.txt
```
