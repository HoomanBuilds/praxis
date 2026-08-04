import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2, Bot, FileText, Building2, Copy, Check } from "lucide-react";

const AI_REPORTS = [
  { key: "executive", label: "Executive Summary", icon: FileText,
    prompt: "Write a concise executive summary of the current compliance posture: how many obligations exist, their status split, the departments most affected, and any items needing attention. Use only the provided data." },
  { key: "board", label: "Board Summary", icon: Building2,
    prompt: "Write a board-level compliance summary suitable for a board meeting: overall posture, key regulatory obligations, ownership by department, and outstanding risks or pending reviews. Use only the provided data." },
  { key: "department", label: "Department Risk Summary", icon: Bot,
    prompt: "Summarize compliance obligations and workload by department, highlighting which departments carry the most obligations and any that have items pending review. Use only the provided data." },
];

export default function Reports() {
  const { data: documents } = useQuery({ queryKey: ["documents"], queryFn: api.listDocuments });
  const [scope, setScope] = useState("firm");
  const [files, setFiles] = useState<string[]>([]);
  const [aiText, setAiText] = useState<{ label: string; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const audit = useMutation({
    mutationFn: () => api.auditReport(scope === "firm" ? "firm" : "document", scope === "firm" ? {} : { document_id: scope }),
    onSuccess: (res: any) => setFiles(Object.values(res?.files ?? {})),
  });

  const aiReport = useMutation({
    mutationFn: (prompt: string) => api.copilot(prompt),
    onSuccess: (res, prompt) => {
      const label = AI_REPORTS.find((r) => r.prompt === prompt)?.label || "Report";
      setAiText({ label, text: res.answer || res.error || "No content." });
    },
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">Examination-ready audit packages and AI-generated summaries — all built from real platform data.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileDown className="h-4 w-4" /> Audit Package (PDF + XLSX)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <select value={scope} onChange={(e) => setScope(e.target.value)} className="h-9 rounded-lg border bg-card px-3 text-sm">
              <option value="firm">Entire firm</option>
              {documents?.map((d) => <option key={d.id} value={d.id}>{d.title || d.reference || d.id.slice(0, 8)}</option>)}
            </select>
            <Button size="sm" disabled={audit.isPending} onClick={() => { setFiles([]); audit.mutate(); }}>
              {audit.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />} Generate
            </Button>
          </div>
          {files.length > 0 && (
            <div className="rounded-lg border border-success/40 bg-success/5 p-3 text-sm">
              Package ready:{" "}
              {files.map((fn) => <a key={fn} href={`/api/audit/download/${fn}`} className="text-primary underline mr-3">{fn}</a>)}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Bot className="h-4 w-4 text-primary" /> AI-Generated Summaries</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {AI_REPORTS.map((r) => (
              <Button key={r.key} size="sm" variant="outline" disabled={aiReport.isPending} onClick={() => { setAiText(null); aiReport.mutate(r.prompt); }}>
                <r.icon className="h-3.5 w-3.5" /> {r.label}
              </Button>
            ))}
          </div>
          {aiReport.isPending && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> generating from your data…</div>}
          {aiText && (
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">{aiText.label}</div>
                <button className="text-muted-foreground hover:text-foreground" onClick={() => { navigator.clipboard.writeText(aiText.text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{aiText.text}</p>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">Summaries are built from your real obligation, rule and task records.</p>
        </CardContent>
      </Card>
    </div>
  );
}
