/**
 * Static UI copy, in two registers.
 *
 * PRAXIS is used by compliance officers, risk officers, auditors and executives. The
 * default ("business") register never names an implementation detail — no LLM, parser,
 * embedding, funnel or knowledge graph. The "engineering" register is what a technical
 * audience sees when Advanced Diagnostics is on.
 *
 * `engineering` is OPTIONAL: most copy has no meaningful technical variant, and a term
 * that omits it simply reads the same in both modes. Only write one when the technical
 * phrasing genuinely says something different.
 *
 * Keys are stable tokens, never the English text — renaming copy must not mean renaming
 * a key. `TermKey` is a closed union, so a typo is a compile error rather than a silent
 * passthrough (which is exactly how the previous `mapBusinessLabel` leaked jargon).
 */
import type { UIMode } from "@/context/UIModeContext";

export interface TermPair {
  business: string;
  engineering?: string;
}

export const TERMS = {
  // --- Processing / pipeline -------------------------------------------------
  "pipeline.title": { business: "How this circular was processed", engineering: "Agent Pipeline" },
  "pipeline.empty": {
    business: "Import a circular to see how PRAXIS processed it.",
    engineering: "Process a document to see the agent pipeline.",
  },
  "pipeline.stage.parse": { business: "Circular Processing", engineering: "Document Parser" },
  "pipeline.stage.filter": { business: "Regulatory Section Detection", engineering: "Candidate Filter" },
  "pipeline.stage.diff": { business: "Regulatory Change Detection", engineering: "Diff Engine" },
  "pipeline.stage.rules": { business: "Rule Extraction", engineering: "Deterministic Engine" },
  "pipeline.stage.ai": { business: "Analytical Review", engineering: "LLM Validation" },
  "pipeline.stage.graph": { business: "Compliance Relationships Updated", engineering: "Knowledge Graph" },

  "pipeline.sections": { business: "sections read", engineering: "sections parsed" },
  "pipeline.quality": { business: "text quality", engineering: "parse quality" },
  "pipeline.candidates": { business: "regulatory sections found", engineering: "candidates" },
  "pipeline.dropped": { business: "not applicable", engineering: "non-regulatory dropped" },
  "pipeline.unchanged": { business: "unchanged clauses skipped", engineering: "unchanged skipped" },
  "pipeline.whole_document": { business: "whole circular reviewed", engineering: "full document (single circular)" },
  "pipeline.automatic": { business: "processed automatically", engineering: "rule engine, no AI call" },
  "pipeline.ai_reviewed": { business: "needed closer review", engineering: "ambiguous sections" },
  "pipeline.ai_calls": { business: "analysis passes", engineering: "LLM calls" },
  "pipeline.sections_needing": { business: "sections", engineering: "sections," },
  "pipeline.relationships": { business: "compliance links mapped", engineering: "graph nodes updated" },
  "pipeline.automation_rate": { business: "Automation rate" },
  "pipeline.summary_title": { business: "Processing summary", engineering: "Scale-aware processing" },
  "pipeline.candidate_sections": { business: "regulatory sections", engineering: "candidates" },
  "pipeline.efficiency": { business: "Processing Efficiency", engineering: "Pipeline Efficiency" },
  "pipeline.savings": { business: "Automation Rate", engineering: "LLM Savings" },
  "pipeline.savings_sub": { business: "processed automatically", engineering: "calls vs naive" },
  "pipeline.calls_saved": { business: "analysis passes avoided", engineering: "calls saved" },

  // --- Obligations -----------------------------------------------------------
  "obligation.method": { business: "Source", engineering: "Method" },
  "obligation.confidence": { business: "Assurance", engineering: "Confidence" },
  "obligation.method.rule": { business: "Automatic", engineering: "Deterministic" },
  "obligation.method.ai": { business: "Standard Analysis", engineering: "LLM" },
  "obligation.method.rule.tip": {
    business: "Identified by PRAXIS's built-in SEBI rulebook.",
    engineering: "Extracted by the deterministic rule engine — no LLM call.",
  },
  "obligation.method.ai.tip": {
    business: "Identified through PRAXIS's analytical review because the wording was open to interpretation.",
    engineering: "Extracted by the language model (qualitative/ambiguous section).",
  },
  "obligation.confidence.tip": {
    business: "How certain PRAXIS is that this obligation was captured correctly.",
    engineering: "Extraction confidence score.",
  },
  "obligation.confidence.high": { business: "High" },
  "obligation.confidence.medium": { business: "Medium" },
  "obligation.confidence.low": { business: "Needs review" },
  "obligations.subtitle": {
    business: "Every compliance obligation identified across all regulations — the working list for your compliance team.",
    engineering: "Every extracted compliance obligation across all regulations — the work surface for compliance teams.",
  },
  "obligation.flagged": {
    business: "Flagged for review — PRAXIS was not confident enough to accept this automatically.",
    engineering: "Flagged for review — low confidence or fragment detected.",
  },
  "obligation.reasoning": { business: "Why PRAXIS flagged this", engineering: "AI Reasoning" },
  "obligation.signals": { business: "What supported this", engineering: "Confidence signals" },
  "obligation.related": { business: "Related obligations" },
  "obligation.similar": { business: "related", engineering: "similar" },
  "obligation.explain": { business: "Explain this obligation", engineering: "Explain with Copilot" },
  "obligation.explain_q": {
    business: "Why was this obligation identified, and what does it require?",
    engineering: "Why was this obligation extracted, and what does it require?",
  },

  // --- Documents / regulations ----------------------------------------------
  "documents.subtitle": {
    business: "Bring SEBI circulars into PRAXIS. Each one becomes a compliance workspace.",
    engineering: "Ingest SEBI circulars and run the scale-aware extraction pipeline. Each becomes a compliance workspace.",
  },
  "documents.uploaded": { business: "Uploaded — start processing below.", engineering: "Uploaded — run extraction below." },
  "documents.process": { business: "Process circular", engineering: "Run extraction" },
  "documents.reprocess": { business: "Try again", engineering: "Retry extraction" },
  "documents.process_failed": {
    business: "Couldn't process this circular. The analysis service may be unavailable — check Settings.",
    engineering: "Extraction failed — is the LLM (Ollama) running?",
  },
  "documents.col_obligations": { business: "Obligations" },
  "documents.col_ai": { business: "Analysis", engineering: "LLM calls" },
  "documents.auto_ingested": { business: "brought in automatically", engineering: "ingested automatically" },

  // --- Review ---------------------------------------------------------------
  "review.summary": { business: "Processing summary", engineering: "Funnel" },
  "review.empty": {
    business: "No obligations yet. Process a circular on the Regulations page first.",
    engineering: "No obligations. Run extraction on the Documents page first.",
  },

  // --- Command Center -------------------------------------------------------
  "dashboard.subtitle": {
    business: "Live view of your compliance position — what changed, what PRAXIS did, and what needs you.",
    engineering: "Live view of the compliance pipeline — what happened, what the agents did, and what needs you.",
  },
  "dashboard.activity": { business: "Activity", engineering: "AI Activity Feed" },

  // --- Analytics ------------------------------------------------------------
  "analytics.subtitle": {
    business: "Executive view of compliance posture and how much PRAXIS is handling for you.",
    engineering: "Executive view of compliance posture and pipeline efficiency — computed live from platform state.",
  },
  "analytics.relationships": { business: "Compliance Links", engineering: "Knowledge Graph" },
  "analytics.review_activity": { business: "reviews and corrections", engineering: "edits + rejections (audit log)" },
  "analytics.not_instrumented": {
    business: "Not yet measured: average review time per circular, and accuracy against a verified benchmark.",
    engineering: "Not yet instrumented: per-document review time and extraction accuracy vs. a gold set (planned — requires timing capture and a labelled corpus).",
  },

  // --- Tasks ----------------------------------------------------------------
  "tasks.subtitle": {
    business: "Work created from approved obligations, grouped by the department that owns it.",
    engineering: "Implementation work generated from approved obligations, grouped by the owning department.",
  },
  "tasks.empty": {
    business: "No tasks yet. Approve obligations to create the work they require.",
    engineering: "No tasks yet. Approve obligations and generate rules & tasks.",
  },

  // --- Settings -------------------------------------------------------------
  "settings.subtitle": {
    business: "Platform configuration, what PRAXIS automates, and connected systems.",
    engineering: "Platform configuration, the agent fleet, and integration status.",
  },
  "settings.capabilities": { business: "What PRAXIS Automates", engineering: "Agent Fleet" },
  "settings.ai_engine": { business: "Compliance Engine", engineering: "AI Models" },
  "settings.ai_status": { business: "Status" },
  "settings.ai_ready": { business: "Ready" },
  "settings.ai_unavailable": { business: "Unavailable" },
  "settings.online": { business: "Analysis engine online", engineering: "Local LLM online" },
  "settings.offline": { business: "Analysis engine offline", engineering: "LLM offline" },
  "settings.residency": {
    business: "Runs entirely on your own infrastructure — no regulatory content leaves your network.",
    engineering: "Runs entirely on-premises — no regulatory content leaves the client boundary (§10.4).",
  },
  "settings.gov.review": {
    business: "Nothing is actioned until a person approves it",
    engineering: "Human-in-the-loop gate before rules/tasks are generated",
  },
  "settings.gov.audit": {
    business: "Every action is permanently recorded and cannot be altered",
    engineering: "Append-only audit log (immutable)",
  },
  "settings.gov.trace": {
    business: "Every obligation traces back to its exact source text",
    engineering: "Provenance from every obligation to source text",
  },
  "settings.gov.residency": {
    business: "Runs on your infrastructure — data residency preserved",
    engineering: "Local model — data residency preserved",
  },
  "settings.advanced": { business: "Show Advanced Diagnostics" },
  "settings.advanced_help": {
    business: "Reveals the technical detail behind each step — model, processing counts and source data.",
    engineering: "Business mode hides implementation jargon by default.",
  },

  // --- Audit trail ----------------------------------------------------------
  "audit.subtitle": {
    business: "A permanent, unalterable record of every action taken in PRAXIS — fully searchable.",
    engineering: "Append-only record of every action in the platform (§10.3) — immutable and fully searchable.",
  },
  "audit.search": { business: "Search action, person, or record…", engineering: "Search action, actor, resource…" },
  "audit.col_actor": { business: "Who", engineering: "Actor" },
  "audit.col_resource": { business: "Record", engineering: "Resource" },

  // --- Navigation -----------------------------------------------------------
  "nav.knowledge_graph": { business: "Compliance Map", engineering: "Knowledge Graph" },
  "nav.watch": { business: "Regulatory Watch", engineering: "Watch" },
  "kg.title": { business: "Compliance Map", engineering: "Compliance Knowledge Graph" },
  "kg.subtitle.simple": {
    business: "How every regulation connects to the obligations, departments, tasks and evidence that satisfy it. Select anything to inspect it.",
    engineering: "The compliance path: regulation → obligation → department → task → evidence → rule. Click any node to inspect.",
  },
  "kg.subtitle.full": {
    business: "How every regulation connects to the people and evidence that satisfy it. Select anything to inspect it.",
    engineering: "Regulation → obligation → department → task → owner / evidence, with cross-document supersession. Click any node to inspect.",
  },
  "kg.count_items": { business: "Items", engineering: "Nodes" },
  "kg.count_links": { business: "Connections", engineering: "Relationships" },
  "kg.count_types": { business: "Item types", engineering: "Node types" },
  "kg.empty": {
    business: "Nothing to map yet. Process a circular and approve its obligations first.",
    engineering: "Graph is empty. Process a document and generate rules/tasks first.",
  },
  "kg.inspector_empty": {
    business: "Select an item to see where it came from and what it connects to.",
    engineering: "Select a node to see its origin, properties and relationships.",
  },
} as const satisfies Record<string, TermPair>;

export type TermKey = keyof typeof TERMS;

export function term(key: TermKey, mode: UIMode): string {
  // Widened to TermPair: `as const` narrows each entry to its own literal shape, so the
  // optional `engineering` field is not visible on entries that omit it.
  const pair: TermPair = TERMS[key];
  return mode === "engineering" ? (pair.engineering ?? pair.business) : pair.business;
}
