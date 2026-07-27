import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileCheck, AlertTriangle, CheckCircle } from "lucide-react";

export default function EvidenceCenter() {
  const { data: evidence } = useQuery({ queryKey: ["evidence"], queryFn: () => api.listEvidence() });
  const { data: obligations } = useQuery({ queryKey: ["obligations"], queryFn: () => api.listObligations() });
  useQuery({ queryKey: ["rules"], queryFn: () => api.listRules() });

  const evidenceCount = evidence?.length ?? 0;
  const obligationsWithEvidence = new Set((evidence ?? []).map((e) => e.obligation_id)).size;
  const gapsCount = Math.max(0, (obligations?.length ?? 0) - obligationsWithEvidence);

  const byCollector = new Map<string, typeof evidence>();
  for (const e of evidence ?? []) {
    const k = e.collector || "unassigned";
    if (!byCollector.has(k)) byCollector.set(k, []);
    byCollector.get(k)!.push(e);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2"><FileCheck className="h-5 w-5" /> Evidence Center</h1>
        <p className="text-sm text-muted-foreground">Track evidence requirements, uploads, and compliance gaps.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total Requirements</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold tabular">{evidenceCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Covered Obligations</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold tabular">{obligationsWithEvidence}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Gaps (No Evidence)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-semibold tabular">{gapsCount}</div>
              {gapsCount > 0 && <AlertTriangle className="h-4 w-4 text-destructive" />}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Requirements by Collector</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[...byCollector.entries()].map(([collector, items]) => (
            <div key={collector} className="rounded-lg border p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{collector}</span>
                <Badge variant="secondary">{items?.length ?? 0}</Badge>
              </div>
              <div className="space-y-1">
                {items?.map((e) => (
                  <div key={e.id} className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate">{e.document_type}</span>
                    <Badge variant="muted">{e.retention_period}</Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {byCollector.size === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              No evidence requirements yet. Generate rules from approved obligations.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Obligations Missing Evidence</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(obligations ?? [])
              .filter((o) => !(evidence ?? []).some((e) => e.obligation_id === o.id))
              .slice(0, 20)
              .map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <span className="font-medium">{o.identifier || o.id.slice(0, 8)}</span>
                    <span className="text-muted-foreground ml-2 truncate">{o.description.slice(0, 80)}</span>
                  </div>
                  <Badge variant="destructive">No evidence</Badge>
                </div>
              ))}
            {obligations && evidence && (obligations ?? []).filter((o) => !(evidence ?? []).some((e) => e.obligation_id === o.id)).length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">All obligations have evidence requirements covered.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
