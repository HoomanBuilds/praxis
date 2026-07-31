import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OBLIGATION_STATUSES, RISK_LEVELS } from "@/lib/constants";
import { useAreas } from "@/hooks/useAreas";
import { titleCase } from "@/lib/utils";
import { Shield } from "lucide-react";

const RISK_BADGE: Record<string, "default" | "muted" | "outline"> = {
  critical: "default",
  high: "default",
  medium: "muted",
  low: "outline",
  minimal: "outline",
};

export default function RiskRegister() {
  const navigate = useNavigate();
  const areas = useAreas();
  const [area, setArea] = useState("all");
  const [status, setStatus] = useState("all");
  const [riskLevel, setRiskLevel] = useState("all");

  const { data } = useQuery({
    queryKey: ["risk-register"],
    queryFn: () => api.riskRegister(),
  });

  const items = useMemo(() => {
    return (data ?? []).filter((r) =>
      (area === "all" || r.functional_area === area) &&
      (status === "all" || r.status === status) &&
      (riskLevel === "all" || r.risk_level === riskLevel)
    );
  }, [data, area, status, riskLevel]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, minimal: 0 };
    for (const r of data ?? []) c[r.risk_level] = (c[r.risk_level] || 0) + 1;
    return c;
  }, [data]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><Shield className="h-5 w-5" /> Risk Register</h1>
          <p className="text-sm text-muted-foreground">Obligations sorted by computed risk level — derived from objective compliance signals.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <select value={area} onChange={(e) => setArea(e.target.value)} className="h-9 rounded-lg border bg-card px-3">
            {areas.map((a) => <option key={a} value={a}>{a === "all" ? "All departments" : titleCase(a)}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-lg border bg-card px-3">
            {OBLIGATION_STATUSES.map((s) => <option key={s} value={s}>{s === "all" ? "All statuses" : titleCase(s)}</option>)}
          </select>
          <select value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)} className="h-9 rounded-lg border bg-card px-3">
            <option value="all">All risk levels</option>
            {RISK_LEVELS.map((r) => <option key={r} value={r}>{titleCase(r)}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {RISK_LEVELS.map((level) => (
          <Card key={level}>
            <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">{titleCase(level)}</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-semibold tabular">{counts[level] || 0}</div></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground border-b">
              <tr>
                <th className="py-3 px-4 font-medium">ID</th>
                <th className="py-3 px-4 font-medium">Obligation</th>
                <th className="py-3 px-4 font-medium">Department</th>
                <th className="py-3 px-4 font-medium">Risk Level</th>
                <th className="py-3 px-4 font-medium">Confidence</th>
                <th className="py-3 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((r) => (
                <tr key={r.id} className="hover:bg-accent/40 cursor-pointer" onClick={() => navigate(`/obligations/${r.id}`)}>
                  <td className="py-3 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">{r.identifier}</td>
                  <td className="py-3 px-4 max-w-md"><div className="truncate">{r.description}</div></td>
                  <td className="py-3 px-4"><Badge variant="outline">{titleCase(r.functional_area)}</Badge></td>
                  <td className="py-3 px-4"><Badge variant={RISK_BADGE[r.risk_level] ?? "muted"}>{titleCase(r.risk_level)}</Badge></td>
                  <td className="py-3 px-4">{(r.confidence * 100).toFixed(0)}%</td>
                  <td className="py-3 px-4"><Badge variant={r.status === "approved" ? "success" : r.status === "rejected" ? "destructive" : r.status === "pending_review" ? "warning" : "muted"}>{titleCase(r.status)}</Badge></td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} className="py-8 px-4 text-center text-muted-foreground">No obligations match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
