import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { titleCase } from "@/lib/utils";
import { dayKey } from "@/lib/format";
import type { DocumentT } from "@/lib/types";

function BarList({ data, tone = "bg-primary" }: { data: Record<string, number>; tone?: string }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  if (!entries.length) return <div className="text-sm text-muted-foreground">No data yet.</div>;
  return (
    <div className="space-y-2.5">
      {entries.map(([k, v]) => (
        <div key={k}>
          <div className="flex justify-between text-sm mb-1"><span>{titleCase(k)}</span><span className="text-muted-foreground tabular">{v}</span></div>
          <div className="h-2 rounded-full bg-muted overflow-hidden"><div className={`h-full ${tone} rounded-full`} style={{ width: `${(v / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function aggFunnel(docs: DocumentT[]) {
  const acc = { candidates: 0, deterministic: 0, llm_calls: 0, naive: 0, sections: 0 };
  for (const d of docs.filter((x) => x.funnel)) {
    const f = d.funnel!;
    acc.sections += f.total_sections;
    acc.candidates += f.candidates;
    acc.deterministic += f.deterministic_sections;
    acc.llm_calls += f.llm_calls;
    acc.naive += f.candidate_sections ?? f.candidates;
  }
  return acc;
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card><CardContent className="pt-5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </CardContent></Card>
  );
}

export default function Analytics() {
  const { data: summary } = useQuery({ queryKey: ["dashboard"], queryFn: api.dashboard });
  const { data: documents } = useQuery({ queryKey: ["documents"], queryFn: api.listDocuments });
  const { data: activity } = useQuery({ queryKey: ["activity", "analytics"], queryFn: () => api.activity(200) });
  const { data: kg } = useQuery({ queryKey: ["kg"], queryFn: () => api.knowledgeGraph() });

  const funnel = documents ? aggFunnel(documents) : null;
  const savedPct = funnel && funnel.naive ? Math.round(((funnel.naive - funnel.llm_calls) / funnel.naive) * 100) : 0;
  const overrides = (activity ?? []).filter((a) => a.action === "obligation.edited" || a.action === "obligation.rejected").length;

  // Real 7-day activity trend from the audit log.
  const trend: Record<string, number> = {};
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = d.toISOString().slice(0, 10);
    trend[k.slice(5)] = 0; days.push(k);
  }
  for (const a of activity ?? []) {
    const k = dayKey(a.timestamp);
    if (days.includes(k)) trend[k.slice(5)] = (trend[k.slice(5)] || 0) + 1;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Executive view of compliance posture and pipeline efficiency — computed live from platform state.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Compliance Score" value={`${summary?.compliance_score ?? 0}%`} sub={`${summary?.approved ?? 0} approved`} />
        <Metric label="LLM Savings" value={`${savedPct}%`} sub={funnel ? `${funnel.llm_calls} calls vs ~${funnel.naive} naive` : "—"} />
        <Metric label="Knowledge Graph" value={`${kg?.stats.node_count ?? 0}`} sub={`${kg?.stats.edge_count ?? 0} relationships`} />
        <Metric label="Human Overrides" value={`${overrides}`} sub="edits + rejections (audit log)" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Department Load (obligations)</CardTitle></CardHeader>
          <CardContent><BarList data={summary?.obligations_by_functional_area ?? {}} tone="bg-foreground" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Obligations by Status</CardTitle></CardHeader>
          <CardContent><BarList data={summary?.obligations_by_status ?? {}} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Tasks by Status</CardTitle></CardHeader>
          <CardContent><BarList data={summary?.tasks_by_status ?? {}} tone="bg-muted-foreground" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Activity — last 7 days</CardTitle></CardHeader>
          <CardContent><BarList data={trend} tone="bg-primary" /></CardContent>
        </Card>
      </div>

      {funnel && (
        <Card className="border-primary/25">
          <CardHeader><CardTitle className="text-sm">Pipeline Efficiency</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              <div><div className="text-xl font-semibold tabular">{funnel.sections}</div><div className="text-[11px] text-muted-foreground">sections parsed</div></div>
              <div><div className="text-xl font-semibold tabular">{funnel.candidates}</div><div className="text-[11px] text-muted-foreground">candidates</div></div>
              <div><div className="text-xl font-semibold tabular">{funnel.deterministic}</div><div className="text-[11px] text-muted-foreground">regex, no LLM</div></div>
              <div><div className="text-xl font-semibold tabular text-primary">{funnel.llm_calls}</div><div className="text-[11px] text-muted-foreground">LLM calls</div></div>
              <div><div className="text-xl font-semibold tabular text-success">{savedPct}%</div><div className="text-[11px] text-muted-foreground">calls saved</div></div>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-[11px] text-muted-foreground">
        Metrics are computed live from real platform state. Not yet instrumented: per-document review time and
        extraction accuracy vs. a gold set (planned — requires timing capture and a labelled corpus).
      </p>
    </div>
  );
}
