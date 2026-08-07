import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton, QueryError } from "@/components/ui/data-state";
import { timeAgo } from "@/lib/format";
import { useVocab } from "@/hooks/useVocab";
import { useActivityLabel, useActorLabel } from "@/components/vocab/ActivityLabel";
import { Search, ShieldCheck } from "lucide-react";

const ACTION_TONE: Record<string, "success" | "warning" | "destructive" | "muted" | "default"> = {
  "obligation.approved": "success", "obligation.rejected": "destructive", "obligation.edited": "warning",
  "document.ingested": "default", "rule.generated": "default", "task.assigned": "default",
  "audit_report.generated": "muted", "comment.added": "muted",
};

export default function AuditTrail() {
  const eventsQuery = useQuery({ queryKey: ["activity", "audit"], queryFn: () => api.activity(200), refetchInterval: 10000 });
  const events = eventsQuery.data;
  const [q, setQ] = useState("");
  const { t, e } = useVocab();
  const activityLabel = useActivityLabel();
  const actorLabel = useActorLabel();

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (events ?? []).filter((ev) =>
      !needle ||
      // Raw stored values - the audit log is evidence, so the exact codes stay findable.
      ev.action.toLowerCase().includes(needle) ||
      ev.actor.toLowerCase().includes(needle) ||
      (ev.resource_id || "").toLowerCase().includes(needle) ||
      (ev.resource_type || "").toLowerCase().includes(needle) ||
      // …and the labels actually on screen, so searching what you can see works.
      activityLabel(ev.action).toLowerCase().includes(needle) ||
      e("resource.type", ev.resource_type || "").toLowerCase().includes(needle)
    );
  }, [events, q, activityLabel, e]);

  if (eventsQuery.isLoading) {
    return <PageSkeleton label="Loading audit trail" cards={0} />;
  }

  if (eventsQuery.isError && events === undefined) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold"><ShieldCheck className="h-5 w-5" /> Audit Trail</h1>
          <p className="text-sm text-muted-foreground">{t("audit.subtitle")}</p>
        </div>
        <QueryError title="Audit trail could not be loaded" onRetry={() => void eventsQuery.refetch()} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Audit Trail</h1>
        <p className="text-sm text-muted-foreground">{t("audit.subtitle")}</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input aria-label={t("audit.search")} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("audit.search")} className="pl-9" />
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-[680px] w-full text-sm">
            <thead className="text-left text-muted-foreground border-b">
              <tr>
                <th className="py-3 px-4 font-medium">Action</th>
                <th className="py-3 px-4 font-medium">{t("audit.col_actor")}</th>
                <th className="py-3 px-4 font-medium">{t("audit.col_resource")}</th>
                <th className="py-3 px-4 font-medium text-right">When</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((ev) => (
                <tr key={ev.id} className="hover:bg-accent/30">
                  <td className="py-2.5 px-4"><Badge variant={ACTION_TONE[ev.action] ?? "muted"} title={ev.action}>{activityLabel(ev.action)}</Badge></td>
                  <td className="py-2.5 px-4 text-muted-foreground">{actorLabel(ev.actor)}</td>
                  <td className="py-2.5 px-4 text-xs text-muted-foreground" title={ev.resource_id || ""}>{e("resource.type", ev.resource_type || "")}{ev.resource_id ? <span className="font-mono"> · {ev.resource_id.slice(0, 8)}</span> : null}</td>
                  <td className="py-2.5 px-4 text-right text-xs text-muted-foreground whitespace-nowrap">{timeAgo(ev.timestamp)}</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={4} className="py-8 px-4 text-center text-muted-foreground">No matching audit entries.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
