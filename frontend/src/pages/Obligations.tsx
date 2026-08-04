import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useVocab } from "@/hooks/useVocab";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaBadge, ConfidenceBadge, MethodBadge, StatusBadge } from "@/components/badges";
import { titleCase } from "@/lib/utils";
import { OBLIGATION_STATUSES } from "@/lib/constants";
import { useAreas } from "@/hooks/useAreas";
import { AlertTriangle, ListChecks } from "lucide-react";

export default function Obligations() {
  const navigate = useNavigate();
  const { t } = useVocab();
  const { data: obligations } = useQuery({ queryKey: ["obligations", "all"], queryFn: () => api.listObligations({}) });
  const areas = useAreas();
  const [area, setArea] = useState("all");
  const [status, setStatus] = useState("all");

  const rows = useMemo(
    () =>
      (obligations ?? []).filter(
        (o) => (area === "all" || o.functional_area === area) && (status === "all" || o.status === status)
      ),
    [obligations, area, status]
  );

  const flagged = rows.filter((o) => o.needs_review).length;

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold">Obligations</h1>
          <p className="text-sm text-muted-foreground">{t("obligations.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <select value={area} onChange={(e) => setArea(e.target.value)} className="h-9 rounded-lg border bg-card px-3">
            {areas.map((a) => <option key={a} value={a}>{a === "all" ? "All departments" : titleCase(a)}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-lg border bg-card px-3">
            {OBLIGATION_STATUSES.map((s) => <option key={s} value={s}>{s === "all" ? "All statuses" : titleCase(s)}</option>)}
          </select>
        </div>
      </div>

      <div className="flex gap-3 text-sm">
        <Badge variant="muted" className="gap-1"><ListChecks className="h-3.5 w-3.5" /> {rows.length} shown</Badge>
        {flagged > 0 && <Badge variant="warning" className="gap-1"><AlertTriangle className="h-3.5 w-3.5" /> {flagged} need review</Badge>}
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b">
              <tr>
                <th className="py-3 px-4 font-medium">ID</th>
                <th className="py-3 px-4 font-medium">Obligation</th>
                <th className="py-3 px-4 font-medium">Department</th>
                <th className="py-3 px-4 font-medium">{t("obligation.method")}</th>
                <th className="py-3 px-4 font-medium">{t("obligation.confidence")}</th>
                <th className="py-3 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((o) => (
                <tr key={o.id} className="hover:bg-accent/40 cursor-pointer" onClick={() => navigate(`/obligations/${o.id}`)}>
                  <td className="py-3 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">{o.identifier}</td>
                  <td className="py-3 px-4 max-w-md"><div className="truncate">{o.description}</div></td>
                  <td className="py-3 px-4"><AreaBadge area={o.functional_area} /></td>
                  <td className="py-3 px-4"><MethodBadge method={o.extraction_method} /></td>
                  <td className="py-3 px-4"><ConfidenceBadge value={o.confidence} /></td>
                  <td className="py-3 px-4"><StatusBadge status={o.status} /></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="py-8 px-4 text-center text-muted-foreground">No obligations match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
