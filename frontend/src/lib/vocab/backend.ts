/**
 * Display labels for values that ORIGINATE IN THE BACKEND.
 *
 * ⚠️  The keys below mirror values stored in the database and written to the audit log.
 *     They are NOT ours to tidy up, prettify or rename. Audit-trail integrity depends on
 *     the stored strings staying byte-identical, so every rename happens here, in the
 *     display layer, and never in `backend/`.
 *
 * Namespaces are named after the backend field they map, so it is obvious which schema
 * each one shadows.
 *
 * Unlike the previous `mapBusinessLabel`, a miss here is LOUD: it warns in dev and falls
 * back to title-cased text, so an unmapped value can never leak `snake_case` or
 * `SCREAMING_CASE` to a compliance officer's screen.
 */
import type { UIMode } from "@/context/UIModeContext";
import { titleCase } from "@/lib/utils";
import type { TermPair } from "./terms";

type EnumMap = Record<string, TermPair>;

/** backend/db/crud.py + agents — the complete set of audit `action` values. */
const AUDIT_ACTIONS: EnumMap = {
  "comment.added": { business: "Comment added" },
  "document.ingested": { business: "Regulation imported", engineering: "Document ingested" },
  "obligation.extracted": { business: "SEBI obligations identified", engineering: "Obligations extracted" },
  "obligation.deleted": { business: "Obligation removed" },
  "obligation.approved": { business: "Obligation approved" },
  "obligation.rejected": { business: "Obligation rejected" },
  "obligation.edited": { business: "Obligation updated" },
  "rule.generated": { business: "Compliance rule created", engineering: "Rule generated" },
  "task.assigned": { business: "Task assigned" },
  "task.updated": { business: "Task updated" },
  "task.send_for_signature": { business: "Sent for signature" },
  "user.created": { business: "User added" },
  "user.role_changed": { business: "User role changed" },
  "user.deactivated": { business: "User deactivated" },
  "watch.source_added": { business: "Regulatory source now monitored", engineering: "Watch source added" },
  "filing.created": { business: "Filing record created" },
  "filing.submitted": { business: "Filing submitted" },
  "api_key.created": { business: "API key issued" },
  "api_key.revoked": { business: "API key revoked" },
  "integration.connected": { business: "Integration connected" },
  "integration.updated": { business: "Integration updated" },
  "integration.disconnected": { business: "Integration disconnected" },
  "audit_report.generated": { business: "Audit report generated" },
  "evidence.upload": { business: "Evidence uploaded" },
};

/** backend audit `resource_type` — the table an audit row points at. */
const RESOURCE_TYPES: EnumMap = {
  document: { business: "Circular", engineering: "Document" },
  obligation: { business: "Obligation" },
  rule: { business: "Rule" },
  task: { business: "Task" },
  user: { business: "User" },
  watch_source: { business: "Monitored source", engineering: "Watch source" },
  filing: { business: "Filing" },
  api_key: { business: "API key" },
  integration: { business: "Integration" },
  audit_report: { business: "Audit report" },
  evidence_requirement: { business: "Evidence requirement" },
};

/** backend/db/models.py Document.status (see services.py + sebi_scraper.py for writers). */
const DOCUMENT_STATUS: EnumMap = {
  ingested: { business: "Imported", engineering: "Ingested" },
  parsing: { business: "Reading", engineering: "Parsing" },
  extracting: { business: "Processing", engineering: "Extracting" },
  needs_human_parse: { business: "Needs manual review", engineering: "Needs human parse" },
  awaiting_review: { business: "Awaiting review" },
  generating: { business: "Creating tasks", engineering: "Generating" },
  completed: { business: "Completed" },
  failed: { business: "Failed" },
  extraction_failed: { business: "Needs attention", engineering: "Extraction failed" },
};

/**
 * Obligation.extraction_method. Only `deterministic` and `llm` are ever stored — the
 * old `"regex"` key was a frontend invention the backend never emitted.
 */
const EXTRACTION_METHOD: EnumMap = {
  deterministic: { business: "Automatic", engineering: "Deterministic" },
  llm: { business: "Standard Analysis", engineering: "LLM" },
};

/**
 * Audit-trail `actor` values — who performed an action. Most are people (rendered as
 * title-cased names); the automated pipeline actors are mapped so a compliance officer
 * sees the platform's name, never the internal agent label.
 */
const ACTORS: EnumMap = {
  obligation_extraction_agent: { business: "PRAXIS", engineering: "Obligation extraction agent" },
  workflow_mapping_agent: { business: "PRAXIS", engineering: "Workflow mapping agent" },
  rule_generation_agent: { business: "PRAXIS", engineering: "Rule generation agent" },
  ingestion: { business: "PRAXIS", engineering: "Ingestion" },
  sebi_scraper: { business: "SEBI Feed", engineering: "SEBI scraper" },
  compliance_officer: { business: "Compliance officer" },
  dev_user: { business: "Administrator", engineering: "Dev user" },
  system: { business: "System" },
};

/** backend/kg/graph.py — node `type` values. */
const KG_NODE_TYPES: EnumMap = {
  regulation: { business: "Regulation" },
  obligation: { business: "Obligation" },
  department: { business: "Department" },
  risk: { business: "Risk" },
  rule: { business: "Rule" },
  task: { business: "Task" },
  owner: { business: "Owner" },
  evidence: { business: "Evidence" },
};

/** backend/kg/graph.py — edge `type` values, rendered as readable relationships. */
const KG_EDGE_TYPES: EnumMap = {
  CREATES: { business: "creates", engineering: "CREATES" },
  ASSIGNED_TO: { business: "is assigned to", engineering: "ASSIGNED_TO" },
  HAS_RISK: { business: "carries risk", engineering: "HAS_RISK" },
  MODIFIES: { business: "amends", engineering: "MODIFIES" },
  GOVERNED_BY: { business: "is governed by", engineering: "GOVERNED_BY" },
  IMPLEMENTED_BY: { business: "is implemented by", engineering: "IMPLEMENTED_BY" },
  OWNED_BY: { business: "is owned by", engineering: "OWNED_BY" },
};

/** backend/db/models.py WatchSource.source_type. */
const SOURCE_TYPES: EnumMap = {
  regulatory: { business: "Regulator" },
  news: { business: "News" },
  rss: { business: "Feed", engineering: "RSS" },
};

export const ENUMS = {
  "audit.action": AUDIT_ACTIONS,
  "resource.type": RESOURCE_TYPES,
  "document.status": DOCUMENT_STATUS,
  "extraction.method": EXTRACTION_METHOD,
  "kg.node": KG_NODE_TYPES,
  "kg.edge": KG_EDGE_TYPES,
  "watch.source_type": SOURCE_TYPES,
  "audit.actor": ACTORS,
} as const;

export type EnumNamespace = keyof typeof ENUMS;

export function enumLabel(ns: EnumNamespace, raw: string, mode: UIMode): string {
  const hit = ENUMS[ns][raw];
  if (!hit) {
    // Loud on miss — silent passthrough is what let jargon leak before.
    if (import.meta.env.DEV) {
      console.warn(`[vocab] unmapped ${ns}: "${raw}" — add it to lib/vocab/backend.ts`);
    }
    return titleCase(raw.replace(/[.]/g, " "));
  }
  return mode === "engineering" ? (hit.engineering ?? hit.business) : hit.business;
}

/** Every audit action key, for the enum-coverage guard script. */
export const AUDIT_ACTION_KEYS = Object.keys(AUDIT_ACTIONS);
