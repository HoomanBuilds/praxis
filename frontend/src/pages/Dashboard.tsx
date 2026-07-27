import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, titleCase } from "@/lib/utils";
import type { ActivityEvent, DocumentT } from "@/lib/types";
import {
  CheckCircle2, Clock, FileText, Upload, FileSearch, Pencil, XCircle, FileCheck2,
  ClipboardList, FileDown, GitBranch, Cpu, Bot, Boxes, ArrowRight, Zap, ScanLine, Filter, Network,
} from "lucide-react";

/* ----------------------------- helpers ----------------------------- */

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso.endsWith("Z") ? iso : iso + "Z").getTime();
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const ACTION_META: Record<string, { icon: any; label: string; tone: string }> = {
  "document.ingested": { icon: Upload, label: "Document ingested", tone: "text-foreground" },
  "obligation.extracted": { icon: FileSearch, label: "Obligation extracted", tone: "text-foreground" },
  "obligation.approved": { icon: CheckCircle2, label: "Obligation approved", tone: "text-foreground" },
  "obligation.rejected": { icon: XCircle, label: "Obligation rejected", tone: "text-muted-foreground" },
  "obligation.edited": { icon: Pencil, label: "Obligation edited", tone: "text-muted-foreground" },
  "rule.generated": { icon: FileCheck2, label: "Rule generated", tone: "text-foreground" },
  "task.assigned": { icon: ClipboardList, label: "Task assigned", tone: "text-foreground" },
  "audit_report.generated": { icon: FileDown, label: "Audit report generated", tone: "text-muted-foreground" },
};

function describe(ev: ActivityEvent): string {
  const after: Record<string, unknown> = ev.after || {};
  const detail =
    (after.title as string) || (after.reference as string) || (after.rule_type as string) ||
    (after.owner as string) || (after.identifier as string) || "";
  const base = ACTION_META[ev.action]?.label || titleCase(ev.action.replace(/[._]/g, " "));
  return detail ? `${base} · ${detail}` : base;
}

/* ----------------------------- health tiles ----------------------------- */

function HealthTile({ icon: Icon, label, value, sub, tone, onClick }: {
  icon: any; label: string; value: ReactNode; sub?: string; tone?: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-left rounded-lg border bg-card p-4 transition-colors",
        onClick ? "hover:border-primary/40 cursor-pointer" : "cursor-default"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={cn("h-4 w-4", tone || "text-muted-foreground")} />
      </div>
      <div className="mt-2 text-2xl font-semibold tabular">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </button>
  );
}

/* ----------------------------- agent pipeline ----------------------------- */

function AgentPipeline({ doc, kgNodes }: { doc: DocumentT | undefined; kgNodes: number }) {
  const f = doc?.funnel;
  if (!f) return <div className="text-sm text-muted-foreground">Process a document to see the agent pipeline.</div>;
  const dropped = f.total_sections - f.candidates;
  const stages = [
    { icon: ScanLine, name: "Document Parser", metric: `${f.total_sections} sections · quality ${(doc!.parse_quality * 100).toFixed(0)}%` },
    { icon: Filter, name: "Candidate Filter", metric: `${f.candidates} candidates · ${dropped} non-regulatory dropped` },
    { icon: GitBranch, name: "Diff Engine", metric: f.document_type === "master_circular" ? `${f.diff.unchanged_skipped} unchanged skipped` : "full document (single circular)" },
    { icon: Cpu, name: "Deterministic Engine", metric: `${f.deterministic_sections} sections · 0 LLM calls` },
    { icon: Bot, name: "LLM Validation", metric: `${f.llm_sections} ambiguous sections · ${f.llm_calls} calls total` },
    { icon: Network, name: "Knowledge Graph", metric: `${kgNodes} nodes updated` },
  ];
  return (
    <div className="space-y-1">
      {stages.map((s, i) => (
        <div key={s.name} className="relative flex items-start gap-3 pl-1">
          <div className="flex flex-col items-center">
            <div className="h-7 w-7 rounded-md border bg-background grid place-items-center">
              <s.icon className="h-3.5 w-3.5 text-primary" />
            </div>
            {i < stages.length - 1 && <div className="w-px flex-1 min-h-[14px] bg-border" />}
          </div>
          <div className="pb-3 -mt-0.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{s.name}</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            </div>
            <div className="text-xs text-muted-foreground">{s.metric}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------- page ----------------------------- */

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: summary } = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  const { data: documents } = useQuery({ queryKey: ["documents"], queryFn: api.listDocuments });
  const { data: activity } = useQuery({ queryKey: ["activity"], queryFn: () => api.activity(8), refetchInterval: 8000 });
  const { data: tasks } = useQuery({ queryKey: ["tasks", "all"], queryFn: () => api.listTasks() });
  const { data: kg } = useQuery({ queryKey: ["kg"], queryFn: () => api.knowledgeGraph() });

  const latestProcessed = documents?.find((d) => d.funnel);
  const today = new Date().toISOString().slice(0, 10);
  const overdue = (tasks ?? []).filter((t) => t.deadline && t.deadline < today && t.status !== "completed").length;
  const recentActivity = (activity ?? []).slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Command Center</h1>
        <p className="text-sm text-muted-foreground">Live view of the compliance pipeline — what happened, what the agents did, and what needs you.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <HealthTile icon={CheckCircle2} tone="text-success" label="Compliance Score" value={`${summary?.compliance_score ?? 0}%`} sub={`${summary?.approved ?? 0} approved obligations`} />
        <HealthTile icon={Clock} tone="text-warning" label="Pending Review" value={summary?.pending_review ?? 0} sub="awaiting the human gate" onClick={() => navigate("/documents")} />
        <HealthTile icon={ClipboardList} tone={overdue ? "text-destructive" : "text-muted-foreground"} label="Overdue Tasks" value={overdue} sub={`${summary?.total_tasks ?? 0} tasks total`} />
        <HealthTile icon={FileText} label="Documents" value={summary?.total_documents ?? 0} sub={`${summary?.total_rules ?? 0} rules generated`} onClick={() => navigate("/documents")} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Activity feed */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Boxes className="h-4 w-4" /> AI Activity Feed</CardTitle>
            <div className="flex items-center gap-3">
              <Badge variant="muted" className="gap-1"><span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot" /> live</Badge>
              <Link to="/audit" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">View logs <ArrowRight className="h-3 w-3" /></Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentActivity.length ? (
              <div className="space-y-0">
                {recentActivity.map((ev, i) => {
                  const meta = ACTION_META[ev.action] || { icon: Boxes, tone: "text-muted-foreground" };
                  return (
                    <div key={ev.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="h-7 w-7 rounded-full border bg-background grid place-items-center">
                          <meta.icon className={cn("h-3.5 w-3.5", meta.tone)} />
                        </div>
                        {i < recentActivity.length - 1 && <div className="w-px flex-1 bg-border" />}
                      </div>
                      <div className="pb-4 min-w-0 flex-1 -mt-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm truncate">{describe(ev)}</span>
                          <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(ev.timestamp)}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">{ev.actor.replace(/_/g, " ")}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No activity yet. Upload and process a circular.</div>
            )}
          </CardContent>
        </Card>

        {/* Right column: agent pipeline + savings */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Cpu className="h-4 w-4" /> Agent Pipeline</CardTitle></CardHeader>
            <CardContent>
              {latestProcessed && <div className="text-xs text-muted-foreground mb-3 truncate">{latestProcessed.title || latestProcessed.reference}</div>}
              <AgentPipeline doc={latestProcessed} kgNodes={kg?.stats.node_count ?? 0} />
            </CardContent>
          </Card>

          {latestProcessed?.funnel && (
            <Card className="border-primary/30">
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 text-sm font-medium"><Zap className="h-4 w-4 text-primary" /> Scale-aware processing</div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div><div className="text-lg font-semibold tabular">{latestProcessed.funnel.candidates}</div><div className="text-[10px] text-muted-foreground">candidates</div></div>
                  <div><div className="text-lg font-semibold tabular">{latestProcessed.funnel.deterministic_sections}</div><div className="text-[10px] text-muted-foreground">regex, no LLM</div></div>
                  <div><div className="text-lg font-semibold tabular text-primary">{latestProcessed.funnel.llm_calls}</div><div className="text-[10px] text-muted-foreground">LLM calls</div></div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Documents strip */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent Documents</CardTitle>
          <button onClick={() => navigate("/documents")} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">All <ArrowRight className="h-3 w-3" /></button>
        </CardHeader>
        <CardContent>
          {documents?.length ? (
            <div className="divide-y">
              {documents.slice(0, 5).map((d) => (
                <button key={d.id} onClick={() => navigate(`/documents/${d.id}/review`)} className="w-full flex items-center justify-between py-2.5 hover:bg-accent/30 -mx-2 px-2 rounded text-left">
                  <div className="min-w-0">
                    <div className="text-sm truncate">{d.title || d.reference || d.id.slice(0, 8)}</div>
                    <div className="text-[11px] text-muted-foreground">{titleCase(d.document_type)} · {d.page_count} pages</div>
                  </div>
                  {d.funnel && <span className="text-[11px] text-muted-foreground shrink-0">{d.funnel.obligations_total} obligations · {d.funnel.llm_calls} LLM</span>}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No documents yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
