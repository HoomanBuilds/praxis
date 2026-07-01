import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/badges";
import { titleCase } from "@/lib/utils";
import type { Task } from "@/lib/types";
import { User, CalendarClock } from "lucide-react";

export default function Tasks() {
  const navigate = useNavigate();
  const { data: tasks } = useQuery({ queryKey: ["tasks", "all"], queryFn: () => api.listTasks() });
  const today = new Date().toISOString().slice(0, 10);

  const byDept = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of tasks ?? []) {
      const k = t.functional_area || "other";
      (m.get(k) ?? m.set(k, []).get(k)!).push(t);
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [tasks]);

  const overdue = (tasks ?? []).filter((t) => t.deadline && t.deadline < today && t.status !== "completed").length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Tasks</h1>
        <p className="text-sm text-muted-foreground">Implementation work generated from approved obligations, grouped by the owning department.</p>
      </div>

      <div className="flex gap-3 text-sm">
        <Badge variant="muted">{tasks?.length ?? 0} tasks</Badge>
        <Badge variant="muted">{byDept.length} departments</Badge>
        {overdue > 0 && <Badge variant="destructive">{overdue} overdue</Badge>}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {byDept.map(([dept, list]) => (
          <Card key={dept}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-sm">{titleCase(dept)}</CardTitle>
              <Badge variant="secondary">{list.length}</Badge>
            </CardHeader>
            <CardContent className="space-y-2">
              {list.map((t) => {
                const isOverdue = t.deadline && t.deadline < today && t.status !== "completed";
                return (
                  <button key={t.id} onClick={() => navigate(`/obligations/${t.obligation_id}`)}
                    className="w-full text-left rounded-lg border p-3 hover:border-primary/40 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-medium">{t.title}</div>
                      <StatusBadge status={t.status} />
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      {t.primary_owner && <span className="flex items-center gap-1"><User className="h-3 w-3" /> {t.primary_owner}</span>}
                      {t.deadline && <span className={`flex items-center gap-1 ${isOverdue ? "text-destructive" : ""}`}><CalendarClock className="h-3 w-3" /> {t.deadline}{isOverdue ? " · overdue" : ""}</span>}
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        ))}
        {byDept.length === 0 && <div className="text-sm text-muted-foreground">No tasks yet. Approve obligations and generate rules & tasks.</div>}
      </div>
    </div>
  );
}
