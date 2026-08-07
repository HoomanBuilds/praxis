// TypeScript mirrors of the backend serializers (backend/api/serializers.py).

export interface Funnel {
  document_type: string;
  total_sections: number;
  classified: Record<string, number>;
  candidates: number;
  diff: { new: number; changed: number; unchanged_skipped: number };
  sections_sent_to_extractor: number;
  candidate_sections: number;
  deterministic_sections: number;
  llm_sections: number;
  obligations_total: number;
  obligations_deterministic: number;
  obligations_llm: number;
  llm_calls: number;
}

export interface DocumentT {
  id: string;
  reference: string;
  title: string;
  status: string;
  parse_quality: number;
  used_ocr: boolean;
  page_count: number;
  document_type: string;
  family_key: string;
  funnel: Funnel | null;
  regulatory_context: Record<string, unknown> | null;
  ingested_at: string | null;
  processed_at: string | null;
  error: string | null;
}

export interface Obligation {
  id: string;
  document_id: string;
  identifier: string;
  description: string;
  source_text: string;
  source_paragraph_ref: string | null;
  functional_area: string;
  modification_type: string;
  confidence: number;
  deadline_hint: string | null;
  linked_prior_obligation_id: string | null;
  extraction_method: "deterministic" | "llm";
  status: "pending_review" | "approved" | "rejected" | "edited";
  needs_review: boolean;
  reviewer: string | null;
  reviewed_at: string | null;
  scores_reference?: string | null;
}

export interface Rule {
  id: string;
  obligation_id: string;
  rule_type: string;
  evaluation_criterion: string;
  timeline: string | null;
  threshold_value: string | null;
  is_qualitative: boolean;
  evidence_type: string;
}

export interface Task {
  id: string;
  obligation_id: string;
  rule_id: string | null;
  title: string;
  description: string;
  functional_area: string;
  primary_owner: string;
  owner_email: string;
  reviewer: string;
  workflow_template: string;
  deadline: string | null;
  status: string;
  depends_on_task_id: string | null;
  jira_issue_key?: string | null;
  docusign_envelope_id?: string | null;
}

export interface IntegrationField {
  name: string;
  label: string;
  placeholder: string;
  type: string;
  required?: boolean;
}

export interface Integration {
  type: string;
  status: "not_connected" | "connected" | "error";
  connected_at: string | null;
  last_used_at: string | null;
  last_error: string | null;
  configured_as: string;
  fields: IntegrationField[];
  feed_configured?: boolean;
  oauth_configured?: boolean;
  keycloak_configured?: boolean;
}

export interface EvidenceRequirement {
  id: string;
  obligation_id: string;
  document_type: string;
  required_content: string;
  collector: string;
  retention_period: string;
  uploaded_at?: string | null;
  upload_target?: string;
  file_name?: string;
  file_path?: string;
  external_url?: string;
}

export interface DashboardSummary {
  compliance_score: number;
  total_obligations: number;
  pending_review: number;
  approved: number;
  obligations_by_status: Record<string, number>;
  obligations_by_functional_area: Record<string, number>;
  total_documents: number;
  total_rules: number;
  total_tasks: number;
  tasks_by_status: Record<string, number>;
  total_evidence_requirements: number;
}

export interface ActivityEvent {
  id: number;
  action: string;
  actor: string;
  resource_type: string;
  resource_id: string;
  after: Record<string, unknown> | null;
  timestamp: string | null;
}

export interface SearchResults {
  query: string;
  documents: { id: string; title: string; reference: string }[];
  obligations: {
    id: string;
    identifier: string;
    description: string;
    document_id: string;
    functional_area: string;
    confidence: number;
    status: string;
  }[];
}

export interface CopilotCitation {
  obligation_id: string;
  obligation_identifier: string;
  circular_reference: string;
  paragraph: string;
  functional_area: string;
  status: string;
  quote: string;
}

export type CopilotResponseType =
  | "analysis"
  | "error"
  | "greeting"
  | "product_help"
  | "obligation_list"
  | "workspace_summary"
  | "priority_summary";

export interface CopilotResponse {
  answer: string | null;
  error?: string;
  sources?: string[];
  citations?: CopilotCitation[];
  grounded?: boolean;
  confidence?: number;
  response_type?: CopilotResponseType;
}

export interface ExplainResult {
  obligation_id: string;
  identifier: string;
  extraction_method: string;
  why_method: string;
  confidence: number;
  confidence_note: string;
  confidence_factors: { signal: string; value: unknown; effect: string }[];
  source_paragraph_ref: string | null;
  source_text: string;
  model: string;
  related_obligations: { id: string; identifier: string; description: string; score: number }[];
}

export interface CommentT {
  id: number;
  author: string;
  body: string;
  created_at: string | null;
}

export interface GraphNode {
  id: string;
  type: string;
  label: string;
  [key: string]: unknown;
}
export interface GraphEdge {
  source: string;
  target: string;
  type: string;
}
export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    node_count: number;
    edge_count: number;
    nodes_by_type: Record<string, number>;
    cross_document_modifies: number;
  };
}

export interface UserT {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string | null;
}

export interface NotificationT {
  id: string;
  title: string;
  body: string;
  category: string;
  resource_type: string;
  resource_id: string;
  is_read: boolean;
  created_at: string | null;
}

export interface WatchSourceT {
  id: string;
  name: string;
  url: string;
  source_type: string;
  is_active: boolean;
  last_checked_at: string | null;
  created_at: string | null;
}

export interface WatchHitT {
  id: string;
  source_id: string;
  title: string;
  url: string;
  summary: string;
  relevance_score: number;
  is_reviewed: boolean;
  created_at: string | null;
}

export interface Filing {
  id: string;
  obligation_id: string;
  task_id: string | null;
  filing_type: string;
  submitted_at: string | null;
  confirmation_reference: string | null;
  status: string;
  notes: string;
  created_at: string | null;
  obligation_summary?: { identifier?: string } | null;
}

export interface ApiKeyT {
  id: string;
  label: string;
  created_by: string;
  created_at: string | null;
  last_used_at: string | null;
  revoked_at: string | null;
}

export interface RiskItem {
  id: string;
  identifier: string;
  description: string;
  functional_area: string;
  confidence: number;
  status: string;
  needs_review: boolean;
  risk_level: string;
  risk_label: string;
}

export interface OrgConfig {
  firm_name: string;
  firm_type: string;
  intermediary_classes: string[];
  functional_areas: Record<string, { label: string; primary_owner: string; owner_email: string; workflow_template: string }>;
  default_reviewer: string;
  default_reviewer_email: string;
  implementation_buffer_days: number;
}
