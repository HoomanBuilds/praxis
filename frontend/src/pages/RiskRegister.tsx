import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pager } from "@/components/ui/pager";
import { OBLIGATION_STATUSES, RISK_LEVELS } from "@/lib/constants";
import { useAreas } from "@/hooks/useAreas";
import { useVocab } from "@/hooks/useVocab";
import { titleCase } from "@/lib/utils";
import { Shield, AlertCircle } from "lucide-react";


const RISK_BADGE: Record<string, "default" | "muted" | "outline"> = {
  critical: "default",
  high: "default",
  medium: "muted",
  low: "outline",
  minimal: "outline",
};

const PAGE_SIZE = 100;

export default function RiskRegister() {
  const navigate = useNavigate();
  const areas = useAreas();
  const { t } = useVocab();
  const [area, setArea] = useState("all");
  const [status, setStatus] = useState("all");
  const [riskLevel, setRiskLevel] = useState("all");
  const [offset, setOffset] = useState(0);

  useEffect(() => setOffset(0), [area, status, riskLevel]);

  const { data: page } = useQuery({
    queryKey: ["risk-register", area, status, riskLevel, offset],
    queryFn: () =>
      api.riskRegister({
        functional_area: area === "all" ? undefined : area,
        status: status === "all" ? undefined : status,
        risk_level: riskLevel === "all" ? undefined : riskLevel,
        offset,
        limit: PAGE_SIZE,
      }),
  });

  const items = page?.items ?? [];
  const total = page?.total ?? 0;
  // Firm-wide distribution — computed server-side across every obligation, independent
  // of the filters/pagination above, so these totals never understate real exposure.
  const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0, minimal: 0, ...(page?.counts ?? {}) };

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
                <th className="py-3 px-4 font-medium">{t("obligation.confidence")}</th>
                <th className="py-3 px-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((r) => (
                <tr key={r.id} className="hover:bg-accent/40 cursor-pointer" onClick={() => navigate(`/obligations/${r.id}`)}>
                  <td className="py-3 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">{r.identifier}</td>
                  <td className="py-3 px-4 max-w-sm">
                    <div className="truncate">{r.description}</div>
                    {(r as any).risk_signals?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(r as any).risk_signals.map((sig: string) => (
                          <span key={sig} className="inline-flex items-center gap-0.5 text-[10px] bg-muted text-muted-foreground rounded px-1.5 py-0.5">
                            <AlertCircle className="h-2.5 w-2.5" />{sig}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4"><Badge variant="outline">{titleCase(r.functional_area)}</Badge></td>
                  <td className="py-3 px-4" title={(r as any).risk_label}>
                    <Badge variant={RISK_BADGE[r.risk_level] ?? "muted"}>{titleCase(r.risk_level)}</Badge>
                  </td>
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

      <Pager offset={offset} limit={PAGE_SIZE} total={total} onOffsetChange={setOffset} />
    </div>
  );
}
