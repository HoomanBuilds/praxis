import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Cpu, Boxes, Plug, ShieldCheck, Check } from "lucide-react";

const AGENTS = [
  ["Document Parser", "pdfplumber + OCR fallback, structure & cross-references"],
  ["Regulation Extraction", "RAG context, intermediary class, obligation mode"],
  ["Obligation Extraction", "hybrid regex / LLM, provenance, confidence"],
  ["Rule Generation", "5 rule types, qualitative handling"],
  ["Workflow Mapping", "owners, deadlines, dependency chains"],
  ["Evidence Mapping", "evidence templates per rule type"],
  ["Audit Report", "PDF + XLSX evidence packages"],
];

const INTEGRATIONS = [
  ["Email (SMTP)", "Notify owners of new tasks and deadlines"],
  ["Microsoft Teams", "Push obligation approvals and alerts"],
  ["Slack", "Channel notifications for the compliance team"],
  ["LDAP / Active Directory", "Sync users and functional-area owners"],
  ["SSO (OIDC / Keycloak)", "Enterprise authentication + RBAC"],
];

export default function Settings() {
  const { data: health } = useQuery({ queryKey: ["health"], queryFn: api.health });
  const llm = (health?.["llm"] as any) || {};

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Platform configuration, the agent fleet, and integration status.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Cpu className="h-4 w-4" /> AI Models</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Provider" value={llm.provider || "—"} />
            <Row label="Model" value={health?.["model"] as string || llm.model || "—"} />
            <Row label="Host" value={llm.host || "local"} />
            <Row label="Status" value={llm.available ? "Online" : "Offline"} tone={llm.available ? "success" : "destructive"} />
            <Row label="Embedding index" value={`${health?.["corpus_chunks"] ?? 0} chunks`} />
            <div className="text-[11px] text-muted-foreground pt-1">Runs entirely on-premises — no regulatory content leaves the client boundary (§10.4).</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Governance</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Human-in-the-loop gate before rules/tasks are generated</div>
            <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Append-only audit log (immutable)</div>
            <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Provenance from every obligation to source text</div>
            <div className="flex items-center gap-2"><Check className="h-4 w-4 text-success" /> Local model — data residency preserved</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Boxes className="h-4 w-4" /> Agent Fleet</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-2">
            {AGENTS.map(([name, desc]) => (
              <div key={name} className="flex items-start gap-3 rounded-lg border p-3">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-success shrink-0" />
                <div>
                  <div className="text-sm font-medium">{name}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
                <Badge variant="success" className="ml-auto">active</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Plug className="h-4 w-4" /> Integrations</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-2">
            {INTEGRATIONS.map(([name, desc]) => (
              <div key={name} className="flex items-center gap-3 rounded-lg border p-3">
                <div>
                  <div className="text-sm font-medium">{name}</div>
                  <div className="text-xs text-muted-foreground">{desc}</div>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <Badge variant="muted">Roadmap</Badge>
                  <Button size="sm" variant="outline" disabled>Connect</Button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">Integrations are on the post-hackathon roadmap (§14.4). Shown here as not-connected rather than mocked.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "success" | "destructive" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={tone === "success" ? "text-success font-medium" : tone === "destructive" ? "text-destructive font-medium" : ""}>{value}</span>
    </div>
  );
}
