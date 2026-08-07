import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useVocab } from "@/hooks/useVocab";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, PageSkeleton, QueryError } from "@/components/ui/data-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/badges";
import { titleCase } from "@/lib/utils";
import type { Task } from "@/lib/types";
import { TASK_STATUSES } from "@/lib/constants";
import { ArrowRight, User, CalendarClock, CheckSquare, Circle, Loader2, Save } from "lucide-react";

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

function TaskWorkControls({
  task,
  pending,
  onUpdate,
  onOpenSource,
}: {
  task: Task;
  pending: boolean;
  onUpdate: (patch: { primary_owner?: string; status?: string }) => void;
  onOpenSource: () => void;
}) {
  const [owner, setOwner] = useState(task.primary_owner || "");
  const [status, setStatus] = useState(task.status);
  useEffect(() => setOwner(task.primary_owner || ""), [task.primary_owner]);
  useEffect(() => setStatus(task.status), [task.status]);
  const changed = owner.trim() !== (task.primary_owner || "") || status !== task.status;

  return (
    <div className="mt-3 grid gap-3 border-t pt-3 sm:grid-cols-[minmax(0,1fr)_11rem_auto] sm:items-end">
      <div>
        <label htmlFor={`task-owner-${task.id}`} className="text-xs font-medium">Owner</label>
        <Input
          id={`task-owner-${task.id}`}
          className="mt-1 h-9 text-sm"
          value={owner}
          placeholder="Assign an owner"
          disabled={pending}
          onChange={(event) => setOwner(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor={`task-status-${task.id}`} className="text-xs font-medium">Work status</label>
        <select
          id={`task-status-${task.id}`}
          className="mt-1 h-9 w-full rounded-md border bg-card px-2 text-sm"
          value={status}
          disabled={pending}
          onChange={(event) => setStatus(event.target.value)}
        >
          {TASK_STATUSES.filter((item) => item !== "overdue").map((item) => (
            <option key={item} value={item}>{titleCase(item)}</option>
          ))}
          {task.status === "overdue" && <option value="overdue" disabled>Overdue</option>}
        </select>
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={!changed || pending}
        onClick={() => onUpdate({ primary_owner: owner.trim(), status })}
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        Save
      </Button>
      <button type="button" onClick={onOpenSource} className="inline-flex min-h-11 items-center gap-1 text-left text-xs font-medium hover:underline sm:col-span-3 sm:min-h-0">
        Open source obligation <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function Tasks() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
  const updateTask = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { primary_owner?: string; status?: string } }) => api.updateTask(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["calendar"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["kg"] });
    },
  });

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

      <div className="flex flex-col gap-3 rounded-xl border bg-muted/40 p-4 text-sm sm:flex-row sm:items-center sm:justify-between" data-tour="tasks">
        <div>
          <div className="font-medium">Where assigned work happens</div>
          <div className="mt-1 text-muted-foreground">Approve an obligation first, then select Generate rules & tasks from its regulation review. The resulting owner and work status are managed here.</div>
        </div>
        <Link to="/documents" className="inline-flex min-h-11 shrink-0 items-center gap-1 font-medium hover:underline sm:min-h-0">
          Open Regulations <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {updateTask.isError && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {updateTask.error instanceof Error ? updateTask.error.message : "The task could not be updated."}
        </div>
      )}

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
                    <div key={t.id} className="rounded-lg border p-3 transition-colors hover:border-primary/40">
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
                      <TaskWorkControls
                        task={t}
                        pending={updateTask.isPending && updateTask.variables?.id === t.id}
                        onUpdate={(patch) => updateTask.mutate({ id: t.id, patch })}
                        onOpenSource={() => navigate(`/obligations/${t.obligation_id}`)}
                      />
                    </div>
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
