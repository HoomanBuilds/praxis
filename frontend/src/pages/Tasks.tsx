import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useVocab } from "@/hooks/useVocab";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageSkeleton, QueryError } from "@/components/ui/data-state";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/badges";
import { titleCase } from "@/lib/utils";
import type { Task } from "@/lib/types";
import { User, CalendarClock, CheckSquare, Circle } from "lucide-react";

// Derive priority label from obligation risk score (0-1 float -> label)
function priorityFromRisk(riskScore: number | undefined | null): "critical" | "high" | "medium" | "low" {
  if (riskScore == null) return "low";
  if (riskScore >= 0.85) return "critical";
  if (riskScore >= 0.65) return "high";
  if (riskScore >= 0.4) return "medium";
  return "low";
}

const PRIORITY_BADGE: Record<string, "default" | "muted" | "outline" | "destructive" | "warning"> = {
  critical: "destructive",
  high: "warning",
  medium: "muted",
  low: "outline",
};

function PriorityBadge({ score }: { score: number | undefined | null }) {
  const p = priorityFromRisk(score);
  return <Badge variant={PRIORITY_BADGE[p]}>{titleCase(p)}</Badge>;
}

function ProgressBar({ total, done }: { total: number; done: number }) {
  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
        <span>Progress</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function Tasks() {
  const navigate = useNavigate();
  const { t } = useVocab();
  const tasksQuery = useQuery({ queryKey: ["tasks", "all"], queryFn: () => api.listTasks() });
  const evidenceQuery = useQuery({ queryKey: ["evidence"], queryFn: () => api.listEvidence() });
  const tasks = tasksQuery.data;
  const evidence = evidenceQuery.data;
  const today = new Date().toISOString().slice(0, 10);

  // Build evidence count map per obligation_id
  const evidenceByObligation = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of evidence ?? []) {
      m.set(e.obligation_id, (m.get(e.obligation_id) ?? 0) + 1);
    }
    return m;
  }, [evidence]);

  const byDept = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of tasks ?? []) {
      const k = t.functional_area || "other";
      (m.get(k) ?? m.set(k, []).get(k)!).push(t);
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [tasks]);

  const totalTasks = tasks?.length ?? 0;
  const completedTasks = (tasks ?? []).filter((t) => t.status === "completed").length;
  const overdue = (tasks ?? []).filter((t) => t.deadline && t.deadline < today && t.status !== "completed").length;

  if (tasksQuery.isLoading || evidenceQuery.isLoading) {
    return <PageSkeleton label="Loading tasks" cards={2} />;
  }

  if ((tasksQuery.isError && tasks === undefined) || (evidenceQuery.isError && evidence === undefined)) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-semibold">Tasks</h1>
          <p className="text-sm text-muted-foreground">{t("tasks.subtitle")}</p>
        </div>
        <QueryError title="Tasks could not be loaded" onRetry={() => { void tasksQuery.refetch(); void evidenceQuery.refetch(); }} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Tasks</h1>
        <p className="text-sm text-muted-foreground">{t("tasks.subtitle")}</p>
      </div>

      <div className="flex gap-3 text-sm">
        <Badge variant="muted">{totalTasks} tasks</Badge>
        <Badge variant="muted">{byDept.length} departments</Badge>
        {completedTasks > 0 && <Badge variant="success">{completedTasks} completed</Badge>}
        {overdue > 0 && <Badge variant="destructive">{overdue} overdue</Badge>}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {byDept.map(([dept, list]) => {
          const deptCompleted = list.filter((t) => t.status === "completed").length;
          return (
            <Card key={dept}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-sm">{titleCase(dept)}</CardTitle>
                <Badge variant="secondary">{list.length}</Badge>
              </CardHeader>
              <CardContent className="space-y-2">
                <ProgressBar total={list.length} done={deptCompleted} />
                {list.map((t) => {
                  const isOverdue = t.deadline && t.deadline < today && t.status !== "completed";
                  const evidenceCount = evidenceByObligation.get(t.obligation_id ?? "") ?? 0;
                  return (
                    <button key={t.id} onClick={() => navigate(`/obligations/${t.obligation_id}`)}
                      className="w-full text-left rounded-lg border p-3 hover:border-primary/40 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-medium leading-snug line-clamp-2" title={t.title}>{t.title}</div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <PriorityBadge score={(t as any).risk_score} />
                          <StatusBadge status={t.status} />
                        </div>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        {t.primary_owner && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {t.primary_owner}
                          </span>
                        )}
                        {t.deadline && (
                          <span className={`flex items-center gap-1 ${isOverdue ? "text-destructive" : ""}`}>
                            <CalendarClock className="h-3 w-3" /> {t.deadline}{isOverdue ? " · overdue" : ""}
                          </span>
                        )}
                        <span className={`flex items-center gap-1 ${evidenceCount > 0 ? "text-success" : "text-muted-foreground"}`}>
                          {evidenceCount > 0
                            ? <><CheckSquare className="h-3 w-3" /> {evidenceCount} evidence</>
                            : <><Circle className="h-3 w-3" /> No evidence</>
                          }
                        </span>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
        {byDept.length === 0 && (
          <Card className="md:col-span-2">
            <CardContent className="pt-5">
              <EmptyState icon={CheckSquare} title="No tasks yet" description={t("tasks.empty")} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
