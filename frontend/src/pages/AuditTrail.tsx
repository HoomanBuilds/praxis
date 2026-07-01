import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { titleCase } from "@/lib/utils";
import { timeAgo } from "@/lib/format";
import { Search, ShieldCheck } from "lucide-react";

const ACTION_TONE: Record<string, "success" | "warning" | "destructive" | "muted" | "default"> = {
  "obligation.approved": "success", "obligation.rejected": "destructive", "obligation.edited": "warning",
  "document.ingested": "default", "rule.generated": "default", "task.assigned": "default",
  "audit_report.generated": "muted", "comment.added": "muted",
};

export default function AuditTrail() {
  const { data: events } = useQuery({ queryKey: ["activity", "audit"], queryFn: () => api.activity(200), refetchInterval: 10000 });
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (events ?? []).filter((e) =>
      !needle ||
      e.action.toLowerCase().includes(needle) ||
      e.actor.toLowerCase().includes(needle) ||
      (e.resource_id || "").toLowerCase().includes(needle) ||
      (e.resource_type || "").toLowerCase().includes(needle)
    );
  }, [events, q]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Audit Trail</h1>
        <p className="text-sm text-muted-foreground">Append-only record of every action in the platform (§10.3) — immutable and fully searchable.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search action, actor, resource…" className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b">
              <tr>
                <th className="py-3 px-4 font-medium">Action</th>
                <th className="py-3 px-4 font-medium">Actor</th>
                <th className="py-3 px-4 font-medium">Resource</th>
                <th className="py-3 px-4 font-medium text-right">When</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((e) => (
                <tr key={e.id} className="hover:bg-accent/30">
                  <td className="py-2.5 px-4"><Badge variant={ACTION_TONE[e.action] ?? "muted"}>{titleCase(e.action.replace(/[._]/g, " "))}</Badge></td>
                  <td className="py-2.5 px-4 text-muted-foreground">{e.actor.replace(/_/g, " ")}</td>
                  <td className="py-2.5 px-4 text-xs font-mono text-muted-foreground">{e.resource_type}{e.resource_id ? ` · ${e.resource_id.slice(0, 8)}` : ""}</td>
                  <td className="py-2.5 px-4 text-right text-xs text-muted-foreground whitespace-nowrap">{timeAgo(e.timestamp)}</td>
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
