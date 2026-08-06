import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, titleCase } from "@/lib/utils";
import { useVocab } from "@/hooks/useVocab";
import { PipelineSummary } from "@/components/vocab/PipelineStrip";
import { useActivityLabel, useActorLabel } from "@/components/vocab/ActivityLabel";
import { fromDocumentFunnel } from "@/lib/vocab/pipeline";
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

/** Icon + tone only — the wording lives in the shared audit-action vocabulary. */
const ACTION_META: Record<string, { icon: any; tone: string }> = {
  "document.ingested": { icon: Upload, tone: "text-foreground" },
  "obligation.extracted": { icon: FileSearch, tone: "text-foreground" },
  "obligation.approved": { icon: CheckCircle2, tone: "text-foreground" },
  "obligation.rejected": { icon: XCircle, tone: "text-muted-foreground" },
  "obligation.edited": { icon: Pencil, tone: "text-muted-foreground" },
  "rule.generated": { icon: FileCheck2, tone: "text-foreground" },
  "task.assigned": { icon: ClipboardList, tone: "text-foreground" },
  "audit_report.generated": { icon: FileDown, tone: "text-muted-foreground" },
};

/** `label` comes from the shared audit-action vocabulary; this only appends the detail. */
function describe(ev: ActivityEvent, label: string): string {
  const after: Record<string, unknown> = ev.after || {};
  const detail =
    (after.title as string) || (after.reference as string) || (after.rule_type as string) ||
    (after.owner as string) || (after.identifier as string) || "";
  return detail ? `${label} · ${detail}` : label;
}

/** Ease-out cubic curve for the count-up animation. */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Animates a number toward `target` whenever it changes. Used for the headline KPI so a
 * finished regulation is visibly reflected ("32 -> 33") instead of silently swapping.
 */
function useCountUp(target: number, duration = 700): number {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const v = Math.round(from + (target - from) * easeOutCubic(t));
      setDisplay(v);
      if (t < 1) raf = requestAnimationFrame(step);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}

/* ----------------------------- health tiles ----------------------------- */

function HealthTile({ icon: Icon, label, value, sub, tone, onClick }: {
  icon: any; label: string; value: ReactNode; sub?: string; tone?: string; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "min-w-0 text-left rounded-lg border bg-card p-4 transition-colors",
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
  const { t } = useVocab();
  const f = doc?.funnel;
  if (!f) return <div className="text-sm text-muted-foreground">{t("pipeline.empty")}</div>;
  const dropped = f.total_sections - f.candidates;
  const stages = [
    { icon: ScanLine, name: t("pipeline.stage.parse"),
      metric: `${f.total_sections} ${t("pipeline.sections")} · ${(doc!.parse_quality * 100).toFixed(0)}% ${t("pipeline.quality")}` },
    { icon: Filter, name: t("pipeline.stage.filter"),
      metric: `${f.candidates} ${t("pipeline.candidates")} · ${dropped} ${t("pipeline.dropped")}` },
    { icon: GitBranch, name: t("pipeline.stage.diff"),
      metric: f.document_type === "master_circular"
        ? `${f.diff.unchanged_skipped} ${t("pipeline.unchanged")}`
        : t("pipeline.whole_document") },
    { icon: Cpu, name: t("pipeline.stage.rules"),
      metric: `${f.deterministic_sections} ${t("pipeline.automatic")}` },
    { icon: Bot, name: t("pipeline.stage.ai"),
      metric: `${f.llm_sections} ${t("pipeline.sections_needing")} ${t("pipeline.ai_reviewed")}` },
    { icon: Network, name: t("pipeline.stage.graph"),
      metric: `${kgNodes} ${t("pipeline.relationships")}` },
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
  const { t } = useVocab();
  const activityLabel = useActivityLabel();
  const actorLabel = useActorLabel();
  const { data: summary } = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  const { data: documents } = useQuery({ queryKey: ["documents"], queryFn: api.listDocuments });
  const { data: activity } = useQuery({ queryKey: ["activity"], queryFn: () => api.activity(8), refetchInterval: 8000 });
  const { data: tasks } = useQuery({ queryKey: ["tasks", "all"], queryFn: () => api.listTasks() });
  const { data: kg } = useQuery({ queryKey: ["kg"], queryFn: () => api.knowledgeGraph() });

  const latestProcessed = documents?.find((d) => d.funnel);
  const today = new Date().toISOString().slice(0, 10);
  const overdue = (tasks ?? []).filter((t) => t.deadline && t.deadline < today && t.status !== "completed").length;
  const recentActivity = (activity ?? []).slice(0, 6);
  const approvedCount = useCountUp(summary?.approved ?? 0);

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Command Center</h1>
        <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <HealthTile
          icon={CheckCircle2}
          tone="text-success"
          label="Compliance Coverage"
          value={<span className="tabular-nums">{approvedCount} / {summary?.total_obligations ?? 0}</span>}
          sub={`${summary?.compliance_score ?? 0}% obligations implemented`}
        />
        <HealthTile
          icon={Clock}
          tone="text-warning"
          label="Pending Review"
          value={`${summary?.pending_review ?? 0} obligations`}
          sub="need review before implementation"
          onClick={() => navigate("/documents")}
        />
        <HealthTile icon={ClipboardList} tone={overdue ? "text-destructive" : "text-muted-foreground"} label="Overdue Tasks" value={overdue} sub={`${summary?.total_tasks ?? 0} tasks total`} />
        <HealthTile icon={FileText} label="Documents" value={summary?.total_documents ?? 0} sub={`${summary?.total_rules ?? 0} rules generated`} onClick={() => navigate("/documents")} />
      </div>

      <div className="grid min-w-0 grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Activity feed */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Boxes className="h-4 w-4" /> {t("dashboard.activity")}</CardTitle>
            <div className="flex items-center gap-3">
              <Badge variant="muted" className="gap-1"><span className="h-1.5 w-1.5 rounded-full bg-success pulse-dot" /> live</Badge>
              <Link to="/audit" className="flex min-h-11 items-center gap-1 text-xs text-muted-foreground hover:text-foreground sm:min-h-0">View logs <ArrowRight className="h-3 w-3" /></Link>
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
                          <span className="text-sm truncate" title={ev.action}>{describe(ev, activityLabel(ev.action))}</span>
                          <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(ev.timestamp)}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">{actorLabel(ev.actor)}</div>
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
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Cpu className="h-4 w-4" /> {t("pipeline.title")}</CardTitle></CardHeader>
            <CardContent>
              {latestProcessed && <div className="text-xs text-muted-foreground mb-3 truncate">{latestProcessed.title || latestProcessed.reference}</div>}
              <AgentPipeline doc={latestProcessed} kgNodes={kg?.stats.node_count ?? 0} />
            </CardContent>
          </Card>

          {latestProcessed?.funnel && (
            <Card className="border-primary/30">
              <CardContent className="pt-5">
                <div className="flex items-center gap-2 text-sm font-medium"><Zap className="h-4 w-4 text-primary" /> {t("pipeline.summary_title")}</div>
                <PipelineSummary stats={fromDocumentFunnel(latestProcessed.funnel)} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Documents strip */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent Documents</CardTitle>
          <button onClick={() => navigate("/documents")} className="flex min-h-11 items-center gap-1 text-xs text-muted-foreground hover:text-foreground sm:min-h-0">All <ArrowRight className="h-3 w-3" /></button>
        </CardHeader>
        <CardContent>
          {documents?.length ? (
            <div className="divide-y">
              {documents.slice(0, 5).map((d) => (
                <button key={d.id} onClick={() => navigate(`/documents/${d.id}/review`)} className="w-full flex min-h-11 items-center justify-between gap-3 py-2.5 hover:bg-accent/30 -mx-2 px-2 rounded text-left">
                  <div className="min-w-0">
                    <div className="text-sm truncate">{d.title || d.reference || d.id.slice(0, 8)}</div>
                    <div className="text-[11px] text-muted-foreground">{titleCase(d.document_type)} · {d.page_count} pages</div>
                  </div>
                  {d.funnel && <span className="hidden max-w-[45%] shrink-0 truncate text-[11px] text-muted-foreground sm:block">{d.funnel.obligations_total} obligations · {d.funnel.llm_calls} {t("pipeline.ai_calls").toLowerCase()}</span>}
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
