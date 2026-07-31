import type {
  ActivityEvent,
  ApiKeyT,
  CommentT,
  CopilotResponse,
  DashboardSummary,
  DocumentT,
  EvidenceRequirement,
  ExplainResult,
  Filing,
  Integration,
  KnowledgeGraph,
  Obligation,
  OrgConfig,
  RiskItem,
  Rule,
  SearchResults,
  Task,
} from "./types";

const BASE = "/api";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  health: () => req<Record<string, unknown>>("/health"),

  dashboard: () => req<DashboardSummary>("/dashboard/summary"),

  listDocuments: () => req<DocumentT[]>("/documents"),
  getDocument: (id: string) => req<DocumentT>(`/documents/${id}`),

  ingest: async (file: File, reference: string, title: string, process: boolean) => {
    const form = new FormData();
    form.append("file", file);
    const qs = new URLSearchParams({
      reference,
      title,
      process: String(process),
    });
    const res = await fetch(`${BASE}/documents/ingest?${qs}`, { method: "POST", body: form });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res.json();
  },

  processDocument: (id: string) => req<any>(`/documents/${id}/process`, { method: "POST" }),
  generate: (id: string, autoApprove = false) =>
    req<any>(`/documents/${id}/generate?auto_approve=${autoApprove}`, { method: "POST" }),

  listObligations: async (params: { document_id?: string; status?: string; functional_area?: string } = {}) => {
    const qs = new URLSearchParams(params as Record<string, string>);
    const res = await req<{ items: Obligation[]; total: number; offset: number; limit: number }>(`/obligations?${qs}`);
    return res.items;
  },
  getObligation: (id: string) => req<Obligation>(`/obligations/${id}`),
  approveObligation: (id: string, reviewer = "compliance_officer", note = "") =>
    req<Obligation>(`/obligations/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ reviewer, note }),
    }),
  rejectObligation: (id: string, reviewer = "compliance_officer", note = "") =>
    req<Obligation>(`/obligations/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reviewer, note }),
    }),
  editObligation: (id: string, patch: Partial<Pick<Obligation, "description" | "functional_area" | "modification_type" | "scores_reference">>) =>
    req<Obligation>(`/obligations/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),

  listRules: (obligationId?: string) =>
    req<Rule[]>(`/rules${obligationId ? `?obligation_id=${obligationId}` : ""}`),
  listTasks: (obligationId?: string) =>
    req<Task[]>(`/tasks${obligationId ? `?obligation_id=${obligationId}` : ""}`),
  listEvidence: (obligationId?: string) =>
    req<EvidenceRequirement[]>(`/evidence${obligationId ? `?obligation_id=${obligationId}` : ""}`),

  uploadEvidence: async (requirementId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/evidence/${requirementId}/upload`, { method: "POST", body: form });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res.json();
  },

  knowledgeGraph: (documentId?: string) =>
    req<KnowledgeGraph>(`/knowledge-graph${documentId ? `?document_id=${documentId}` : ""}`),

  activity: (limit = 60, resourceId?: string) =>
    req<ActivityEvent[]>(`/activity?limit=${limit}${resourceId ? `&resource_id=${resourceId}` : ""}`),
  search: (q: string) => req<SearchResults>(`/search?q=${encodeURIComponent(q)}`),

  explain: (obligationId: string) => req<ExplainResult>(`/obligations/${obligationId}/explain`),
  listComments: (obligationId: string) => req<CommentT[]>(`/obligations/${obligationId}/comments`),
  addComment: (obligationId: string, body: string, author = "compliance_officer") =>
    req<CommentT>(`/obligations/${obligationId}/comments`, {
      method: "POST",
      body: JSON.stringify({ author, body }),
    }),
  copilot: (question: string, ctx: { document_id?: string; obligation_id?: string } = {}) =>
    req<CopilotResponse>(`/copilot`, { method: "POST", body: JSON.stringify({ question, ...ctx }) }),

  auditReport: (scope: string, ids: { obligation_id?: string; document_id?: string }) =>
    req<any>(`/audit/report`, {
      method: "POST",
      body: JSON.stringify({ scope, ...ids, formats: ["pdf", "xlsx"] }),
    }),

  login: (email: string, password: string) =>
    fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then((r) => { if (!r.ok) throw new Error("Login failed"); return r.json(); }),

  getMe: () => req<{ id: string; email: string; name: string; role: string }>("/auth/me"),

  listUsers: () => req<{ id: string; email: string; name: string; role: string; is_active: boolean; created_at: string | null }[]>("/users"),
  createUser: (data: { email: string; name: string; password: string; role: string }) =>
    req<unknown>("/users", { method: "POST", body: JSON.stringify(data) }),

  listNotifications: () => req<{ items: unknown[]; total: number }>("/notifications"),
  markNotificationRead: (id: string) => req<unknown>(`/notifications/${id}/read`, { method: "POST" }),
  markAllNotificationsRead: () => req<unknown>("/notifications/read-all", { method: "POST" }),

  listWatchSources: () => req<unknown[]>("/watch/sources"),
  createWatchSource: (data: { name: string; url: string; source_type: string }) =>
    req<unknown>("/watch/sources", { method: "POST", body: JSON.stringify(data) }),
  listWatchHits: () => req<unknown[]>("/watch/hits"),

  updateTask: (id: string, patch: { primary_owner?: string; owner_email?: string; status?: string }) =>
    req<Task>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),

  riskRegister: (params: { risk_level?: string; functional_area?: string; status?: string } = {}) => {
    const qs = new URLSearchParams(params as Record<string, string>);
    return req<RiskItem[]>(`/risk-register?${qs}`);
  },

  getOrgConfig: () => req<OrgConfig>("/org-config"),
  updateOrgConfig: (patch: { firm_name?: string; firm_type?: string; intermediary_classes?: string[] }) =>
    req<OrgConfig>("/org-config", { method: "PUT", body: JSON.stringify(patch) }),
  getFunctionalAreas: async () => {
    const data = await req<{ functional_areas: Record<string, { label: string; primary_owner: string; owner_email: string; workflow_template: string }> }>("/org-config/functional-areas");
    return data.functional_areas ?? {};
  },
  updateFunctionalAreas: (areas: Record<string, { label: string; primary_owner: string; owner_email: string; workflow_template: string }>) =>
    req<Record<string, unknown>>("/org-config/functional-areas", { method: "PUT", body: JSON.stringify({ functional_areas: areas }) }),

  listFilings: (params: { obligation_id?: string; status?: string } = {}) => {
    const qs = new URLSearchParams(params as Record<string, string>);
    return req<Filing[]>(`/filings?${qs}`);
  },
  createFiling: (data: { obligation_id: string; task_id?: string; filing_type: string; notes?: string }) =>
    req<Filing>("/filings", { method: "POST", body: JSON.stringify(data) }),
  submitFiling: (id: string) => req<Filing>(`/filings/${id}/submit`, { method: "POST" }),

  listApiKeys: () => req<ApiKeyT[]>("/api-keys"),
  createApiKey: (label: string) =>
    req<{ id: string; label: string; key: string }>(`/api-keys`, { method: "POST", body: JSON.stringify({ label }) }),
  revokeApiKey: (id: string) => req<unknown>(`/api-keys/${id}/revoke`, { method: "POST" }),

  retentionStatus: () => req<{ retention_days: number; audit_log_entries: number; oldest_entry: string | null }>("/data/retention-status"),
  exportAudit: () => req<{ files: Record<string, string>; generated_at: string; obligation_count: number }>("/data/export", { method: "POST" }),

  listIntegrations: () => req<Integration[]>("/integrations"),
  connectIntegration: (type: string, fields: Record<string, string>) =>
    req<{ ok: boolean; status: string; message: string; feed_url?: string; oauth?: boolean; authorize_url?: string }>(
      `/integrations/${type}/connect`,
      { method: "POST", body: JSON.stringify({ fields }) },
    ),
  disconnectIntegration: (type: string) =>
    req<{ ok: boolean; status: string; message: string }>(`/integrations/${type}/disconnect`, { method: "POST" }),
};
