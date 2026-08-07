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

// `.message` on this is always safe to render - it never contains a raw response body,
// stack trace, or other server-internal text. The full raw body is still logged to the
// console (and attached as `.debugDetail`) for diagnosing from devtools, just never put
// in the DOM.
export class ApiError extends Error {
  status: number;
  debugDetail: string;
  constructor(status: number, message: string, debugDetail: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.debugDetail = debugDetail;
  }
}

function friendlyMessage(status: number, detail?: string): string {
  if (status >= 500) return "Something went wrong on our end. Please try again in a moment.";
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (status === 403) return "You don't have permission to do that.";
  // 4xx `detail` text is authored server-side for exactly this purpose - safe to show.
  return detail || "That request couldn't be completed.";
}

async function throwApiError(res: Response, path: string): Promise<never> {
  const rawBody = await res.text();
  let detail: string | undefined;
  try {
    const parsed = JSON.parse(rawBody);
    if (typeof parsed.detail === "string") detail = parsed.detail;
    else if (Array.isArray(parsed.detail)) {
      // FastAPI/Pydantic validation errors: an array of {msg, loc, ...} - safe field-level text.
      detail = parsed.detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join("; ") || undefined;
    }
  } catch {
    // Not JSON (e.g. an HTML error page, or a raw traceback) - never surface it as `detail`.
  }
  console.error(`API error ${res.status} ${res.statusText} on ${path}`, rawBody);
  throw new ApiError(res.status, friendlyMessage(res.status, detail), rawBody);
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = localStorage.getItem("praxis_token");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent("praxis:unauthorized"));
  }
  return res;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(`${BASE}${path}`, init);
  if (!res.ok) return throwApiError(res, path);
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
    const res = await apiFetch(`${BASE}/documents/ingest?${qs}`, { method: "POST", body: form });
    if (!res.ok) return throwApiError(res, "/documents/ingest");
    return res.json();
  },

  processDocument: (id: string) => req<any>(`/documents/${id}/process`, { method: "POST" }),
  generate: (id: string, autoApprove = false) =>
    req<any>(`/documents/${id}/generate?auto_approve=${autoApprove}`, { method: "POST" }),

  // Returns the full paginated envelope - callers that want a single page (e.g. the
  // Obligations list view) use offset/limit directly; callers that need the complete
  // set (e.g. evidence-gap counting) should use listAllObligations below instead of
  // guessing a large limit, since the backend caps a single page at 200.
  listObligations: (
    params: { document_id?: string; status?: string; functional_area?: string; offset?: number; limit?: number } = {}
  ) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
    );
    return req<{ items: Obligation[]; total: number; offset: number; limit: number }>(`/obligations?${qs}`);
  },
  // Pages through the full result set - for views that need every matching obligation
  // (not just one page) to compute correct totals/coverage.
  listAllObligations: async (params: { document_id?: string; status?: string; functional_area?: string } = {}) => {
    const pageSize = 200;
    const first = await api.listObligations({ ...params, offset: 0, limit: pageSize });
    const offsets = Array.from(
      { length: Math.max(0, Math.ceil(first.total / pageSize) - 1) },
      (_, index) => (index + 1) * pageSize,
    );
    const remaining = await Promise.all(
      offsets.map((offset) => api.listObligations({ ...params, offset, limit: pageSize })),
    );
    return [first, ...remaining].flatMap((page) => page.items);
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
    const res = await apiFetch(`${BASE}/evidence/${requirementId}/upload`, { method: "POST", body: form });
    if (!res.ok) return throwApiError(res, `/evidence/${requirementId}/upload`);
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
  copilot: (
    question: string,
    ctx: {
      document_id?: string;
      obligation_id?: string;
      history?: { role: "user" | "assistant"; content: string }[];
    } = {},
    signal?: AbortSignal,
  ) => req<CopilotResponse>(`/copilot`, {
    method: "POST",
    body: JSON.stringify({ question, ...ctx }),
    signal,
  }),

  auditReport: (scope: string, ids: { obligation_id?: string; document_id?: string }) =>
    req<any>(`/audit/report`, {
      method: "POST",
      body: JSON.stringify({ scope, ...ids, formats: ["pdf", "xlsx"] }),
    }),

  downloadAuditFile: async (filename: string) => {
    const path = `${BASE}/audit/download/${encodeURIComponent(filename)}`;
    const res = await apiFetch(path);
    if (!res.ok) return throwApiError(res, path);
    const url = URL.createObjectURL(await res.blob());
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

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

  sendForSignature: (id: string, signer: { signer_email: string; signer_name?: string }) =>
    req<{ ok: boolean; envelope_id?: string; message: string }>(`/tasks/${id}/send-for-signature`, {
      method: "POST",
      body: JSON.stringify(signer),
    }),

  riskRegister: (
    params: { risk_level?: string; functional_area?: string; status?: string; offset?: number; limit?: number } = {}
  ) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)]))
    );
    return req<{ items: RiskItem[]; total: number; offset: number; limit: number; counts: Record<string, number> }>(
      `/risk-register?${qs}`
    );
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
