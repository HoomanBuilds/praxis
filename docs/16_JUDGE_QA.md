# 16 · Judge Q&A

Concise, evidence-backed answers to the questions a PS2 judge is most likely to ask. Each
answer names where to verify in the codebase and the demo.

---

**Q1. Where is the "agentic" part? An API that extracts obligations is not an agent.**

The agent is a LangGraph state machine (`services/process_document`) with named nodes that
*perceive* (parse, classify, diff), *reason* (decide deterministic-vs-LLM, match the
obligation index for cross-document `MODIFIES`), *act* (write obligations/rules/tasks/evidence
via `db/crud.py`), and *hand off to a human* at the review gate. The gate is a real graph
node — no rules or tasks can be generated without approval, and there is no auto-approve
flag. See [03 Agent Architecture](03_AGENT_ARCHITECTURE.md).

**Q2. How do you prove the extraction is correct, not hallucinated?**

Two layers. (1) Every obligation carries the **verbatim `source_text`** and
`source_paragraph_ref`; a judge can click from obligation to the original PDF paragraph. (2)
Nothing is authoritative until a named officer approves — the human gate is the ground truth,
and the pipeline's low-confidence items (`< 0.65`) are flagged `needs_review` so human
attention is spent where it matters. See [13 Auditability](13_AUDITABILITY.md).

**Q3. Why the funnel? Doesn't the LLM need to see everything?**

Because most of a circular is structure, not obligations. The section classifier drops
boilerplate/annexures/definitions before the model is ever involved; the fingerprint diff skips
unchanged sections on updates. Only the ~10–20% of content that genuinely needs reasoning
reaches the LLM. On the 414-page / 870-section master circular that is ~18 LLM calls, not 870 —
an **85–90% reduction** with full coverage. The savings are recorded per run in `documents.funnel`
and visible in the demo. See [04 AI Pipeline](04_AI_PIPELINE.md).

**Q4. What happens when SEBI amends a circular?**

The fingerprint diff (`preprocessing/fingerprint.py`, keyed `(family_key, section_label)`)
re-processes only changed sections. Unchanged obligations and their rules/tasks/evidence are
untouched; changed ones are re-extracted and matched against the obligation index to create
`MODIFIES` edges. Updates are proportional to the delta, not the document size. See
[05 Document Processing](05_DOCUMENT_PROCESSING.md).

**Q5. Is the data secure? Where does the regulatory text go?**

It goes nowhere. The LLM runs locally via Ollama (default `llama3.1:8b`); no prompt or document
text is sent to any third party. Secrets are env-var driven; report downloads are
path-traversal guarded; SSO is live OIDC. See [12 Security](12_SECURITY.md).

**Q6. Why is the SCORES integration "manual"? Isn't that a miss?**

We deliberately do not fake a live SCORES API. The filing/response status is an honest manual
field that participates in the same audit trail and exports. Claiming a live integration we
cannot authenticate would be a bigger miss. See [17 Limitations & Roadmap](17_LIMITATIONS_AND_ROADMAP.md).

**Q7. Several connectors show "not connected". Are they fake?**

No — they are real implementations (connect form, `test_connection`, summarize) behind
`PRAXIS_SLACK_*`, `PRAXIS_JIRA_*`, `PRAXIS_DRIVE_*`, `PRAXIS_DOCUSIGN_*` env vars. They need
the firm's own accounts (Drive OAuth client, DocuSign sandbox were not available at
submission). The Settings card reports backend-truth status, including live `Last tested:`.
Email, Calendar (ICS), and SSO are demonstrably connected in the demo. See
[11 Integrations](11_INTEGRATIONS.md).

**Q8. How does the compliance score work?**

It is a transparent aggregate: approved/total obligations and task completion by status,
drillable to status and functional area. Risk, by contrast, is the deterministic `_risk_score`
shared between Risk Register and Knowledge Graph. The two numbers are computed, not curated.
See [09 Workflows & HITL](09_WORKFLOWS_AND_HITL.md).

**Q9. Why a relational store + projected graph instead of Neo4j?**

One source of truth: the graph is derived from the store on demand, so it can never drift from
the audit trail, and there are no dual-write consistency problems. The projection boundary is
clean — swapping in a graph DB means re-pointing `kg/graph.py`, no caller changes. See
[07 Knowledge Graph](07_KNOWLEDGE_GRAPH.md).

**Q10. Is this just a hackathon prototype that will not survive a real firm?**

The honest roadmap (multi-tenancy, RBAC, live rule evaluation, real connectors, migrations) is
documented openly. The architecture is intentionally production-shaped where it costs nothing:
a single auditable system of record, centralised audit writes, local-first inference, and
Postgres-portable models. What would change in production is hardening, not redesign. See
[17 Limitations & Roadmap](17_LIMITATIONS_AND_ROADMAP.md).

**Q11. How would you measure extraction quality?**

Against the officer's review decisions: approve/reject/edit in the audit log is the reference
label set. A formal golden-set precision/recall harness is on the roadmap; provenance
spot-checks (source_text → paragraph → PDF) are demonstrable today. See
[04 AI Pipeline](04_AI_PIPELINE.md#evaluation-posture).

**Q12. What did you actually build vs. what is aspirational?**

Built and verifiable: ingestion + funnel + extraction (deterministic + LLM), HITL review,
Phase B rules/tasks/evidence, knowledge graph with `MODIFIES`, append-only audit + export,
dashboard/risk/departments, email/calendar/SSO integrations, 59 backend tests, clean frontend
build. Aspirational: SCORES live API, connected Slack/Jira/Drive/DocuSign, rule *execution*
against live evidence, RBAC, multi-tenancy. The line is drawn by what a judge can click in the
demo.
