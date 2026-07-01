import type {
  ActivityEvent,
  CommentT,
  CopilotResponse,
  DashboardSummary,
  DocumentT,
  EvidenceRequirement,
  ExplainResult,
  KnowledgeGraph,
  Obligation,
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

  listObligations: (params: { document_id?: string; status?: string; functional_area?: string } = {}) => {
    const qs = new URLSearchParams(params as Record<string, string>);
    return req<Obligation[]>(`/obligations?${qs}`);
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
  editObligation: (id: string, patch: Partial<Pick<Obligation, "description" | "functional_area" | "modification_type">>) =>
    req<Obligation>(`/obligations/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),

  listRules: (obligationId?: string) =>
    req<Rule[]>(`/rules${obligationId ? `?obligation_id=${obligationId}` : ""}`),
  listTasks: (obligationId?: string) =>
    req<Task[]>(`/tasks${obligationId ? `?obligation_id=${obligationId}` : ""}`),
  listEvidence: (obligationId?: string) =>
    req<EvidenceRequirement[]>(`/evidence${obligationId ? `?obligation_id=${obligationId}` : ""}`),

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
};
