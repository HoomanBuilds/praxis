# PRAXIS — Documentation

**An agentic compliance platform for India's securities market**
SEBI Securities Market TechSprint 2026 · Problem Statement 2 (Agentic Compliance)

PRAXIS ingests SEBI circulars and turns regulatory text into **discrete,
provenance-linked compliance obligations → machine-evaluable rules → assigned workflow
tasks → audit-ready evidence**, with human-in-the-loop review gates and a compliance
knowledge graph. The language model runs **locally via Ollama**, so no regulatory content
leaves the client boundary.

The defining engineering property of the system is that it is **scale-aware**: it does not
run a language model over every page of a 400-page master circular. A deterministic
pre-processing funnel (classify → diff → rule-based extraction) reserves the LLM for the
~10–20% of content that genuinely needs reasoning, cutting model calls by **~85–90%**.

---

## Documentation map (submission set)

| # | Document | What it covers |
|---|---|---|
| [00](00_OVERVIEW.md) | Overview | The system in one page, reading order, quick facts |
| [01](01_PROBLEM_STATEMENT_ALIGNMENT.md) | Problem statement alignment | Every PS2 requirement → implementation → where to verify |
| [02](02_SYSTEM_ARCHITECTURE.md) | System architecture | Services, module view, data flow, key decisions |
| [03](03_AGENT_ARCHITECTURE.md) | Agent architecture | The LangGraph 2-phase agent, tools, HITL gate, cross-document reasoning |
| [04](04_AI_PIPELINE.md) | AI pipeline | The funnel, extraction model, confidence, evaluation posture |
| [05](05_DOCUMENT_PROCESSING.md) | Document processing | Ingestion, parsing, diff engine, incremental updates |
| [06](06_DATABASE_SCHEMA.md) | Database schema | System-of-record tables, relationships, consistency rules |
| [07](07_KNOWLEDGE_GRAPH.md) | Knowledge graph | Nodes, edges, `MODIFIES` intelligence, risk scoring, GraphML |
| [08](08_RULES_AND_TASKS.md) | Rules & tasks | Rule types, task generation, deadlines, evidence collectors |
| [09](09_WORKFLOWS_AND_HITL.md) | Workflows & HITL | Review gate, status lifecycle, dashboard, risk register |
| [10](10_FRONTEND_ARCHITECTURE.md) | Frontend architecture | React/TS app, pages, `useAreas()`, honest status rendering |
| [11](11_INTEGRATIONS.md) | Integrations | Email, calendar, SSO (live); Slack, Jira, Drive, DocuSign, SCORES |
| [12](12_SECURITY.md) | Security | Local-first LLM, secrets, SSO, input handling, CORS |
| [13](13_AUDITABILITY.md) | Auditability | Append-only log, provenance, evidence chains, report export |
| [14](14_DEPLOYMENT.md) | Deployment | Local dev, Docker/Postgres/Keycloak, env vars, SMTP sink |
| [15](15_DEMO_GUIDE.md) | Demo guide | Scripted 15-minute Demo Day walkthrough |
| [16](16_JUDGE_QA.md) | Judge Q&A | Anticipated questions with evidence-backed answers |
| [17](17_LIMITATIONS_AND_ROADMAP.md) | Limitations & roadmap | Honest scope boundaries and production path |

**Recommended reading:** [00](00_OVERVIEW.md) → [01](01_PROBLEM_STATEMENT_ALIGNMENT.md) →
[02](02_SYSTEM_ARCHITECTURE.md) → [04](04_AI_PIPELINE.md). For Demo Day prep, follow the
reading order in [00](00_OVERVIEW.md) and the script in [15](15_DEMO_GUIDE.md).

## Reference docs (kept from earlier milestones)

| Document | What it covers |
|---|---|
| [agents.md](agents.md) / [AGENTS.md](AGENTS.md) | Reference for each agent (parser, regulation, obligation, rule, workflow, evidence, audit) |
| [api-reference.md](api-reference.md) | REST endpoints with request/response shapes |
| [setup-and-run.md](setup-and-run.md) | Install, CLI, API, Docker Compose, tests, env-var mapping, integrations |
| [processing-funnel.md](processing-funnel.md) | Deep dive on the scale-aware funnel with measured reductions |
| [data-model.md](data-model.md) | Relational schema detail |
| [knowledge-graph.md](knowledge-graph.md) | Knowledge graph model and endpoints |

---

## At a glance

- **Orchestration:** LangGraph 2-phase pipeline (Phase A extraction → human gate → Phase B generation)
- **LLM:** Ollama (local, on-prem; default `qwen2.5:7b`) with schema-validated structured output
- **Pre-processing funnel:** document-type detection · section classifier · SHA-256 fingerprinting + diff · deterministic rule engine + LLM fallback
- **Store:** SQLAlchemy (SQLite locally / PostgreSQL in Docker), append-only audit log
- **API:** FastAPI · **Knowledge graph:** relational projection with GraphML export
- **Frontend:** React + TypeScript + Vite operator console
- **Identity / integrations:** Keycloak SSO · email · calendar (ICS) · Slack · Jira · Drive · DocuSign

## Measured scalability (real SEBI master circulars)

| Document | Sections | Candidates after filter | LLM calls (old → new) | Reduction |
|---|---|---|---|---|
| Master Circular for Investment Advisers (94 p) | 151 | 57 | ~130 → 18 | ~86% |
| Master Circular for Stock Brokers (414 p) | 870 | 296 | ~629 → 72 | ~89% |

On a **re-issue** of the same master circular, the diff engine skips unchanged sections,
driving new LLM calls toward zero. See [04](04_AI_PIPELINE.md) and [processing-funnel.md](processing-funnel.md).

## Diagrams

Mermaid sources under [`diagrams/`](../diagrams/): `architecture.mmd` (system + data flow),
`pipeline.mmd` (the 2-phase agentic pipeline and funnel).

## Scope note

The corpus circulars under `data/seed/` are **synthetic** (SEBI-style, for demonstration); the
two master circulars used for scalability testing are real SEBI PDFs. Honest limitations of the
prototype (SCORES manual field, unconnected third-party connectors, no RBAC/migrations) are
documented in [17](17_LIMITATIONS_AND_ROADMAP.md).
