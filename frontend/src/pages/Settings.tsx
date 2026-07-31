import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabList, TabTrigger, TabContent } from "@/components/ui/tabs";
import { Cpu, Boxes, Plug, ShieldCheck, Check, Copy, Loader2, AlertTriangle } from "lucide-react";
import FirmProfile from "@/pages/FirmProfile";
import Departments from "@/pages/Departments";
import Users from "@/pages/Users";
import ApiKeys from "@/pages/ApiKeys";
import DataRetention from "@/pages/DataRetention";
import type { Integration, IntegrationField } from "@/lib/types";

const AGENTS = [
  ["Document Parser", "pdfplumber + OCR fallback, structure & cross-references"],
  ["Regulation Extraction", "RAG context, intermediary class, obligation mode"],
  ["Obligation Extraction", "hybrid regex / LLM, provenance, confidence"],
  ["Rule Generation", "5 rule types, qualitative handling"],
  ["Workflow Mapping", "owners, deadlines, dependency chains"],
  ["Evidence Mapping", "evidence templates per rule type"],
  ["Audit Report", "PDF + XLSX evidence packages"],
];

const INTEGRATION_META: Record<string, { name: string; desc: string; tier: string }> = {
  email: { name: "Email (SMTP)", desc: "Notify owners of new tasks and deadlines.", tier: "Tier 1 · real" },
  slack: { name: "Chat Notifications", desc: "Channel/DM notifications for the compliance team — Slack (webhook).", tier: "Tier 1 · real" },
  calendar: { name: "Calendar Sync", desc: "Live .ics feed of compliance deadlines — subscribe from Outlook or Google Calendar.", tier: "Tier 1 · real" },
  sso: { name: "SSO (OIDC / Keycloak)", desc: "Enterprise authentication + RBAC via a demo Keycloak realm.", tier: "Tier 1 · real" },
  jira: { name: "GRC / Ticketing", desc: "Sync obligations and tasks into your own Jira site.", tier: "Tier 2 · your account" },
  drive: { name: "Document Management", desc: "Store evidence uploads in your Google Drive instead of local disk.", tier: "Tier 2 · your account" },
  docusign: { name: "E-Signature", desc: "Attach signed board resolutions and policy documents via DocuSign sandbox.", tier: "Tier 2 · your account" },
};

const SCORES_DESC = "Track investor grievance redress status against SCORES filings. SEBI has no public SCORES API — the reference is entered manually by your compliance officer.";

function statusBadge(status: string) {
  if (status === "connected") return <Badge variant="success"><Check className="h-3 w-3" /> Verified</Badge>;
  if (status === "error") return <Badge variant="destructive">Error</Badge>;
  return <Badge variant="muted">Not connected</Badge>;
}

function fmtTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Settings() {
  const [tab, setTab] = useState("overview");
  const { data: health } = useQuery({ queryKey: ["health"], queryFn: api.health });
  const llm = (health?.["llm"] as Record<string, unknown>) || {};

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Platform configuration, the agent fleet, and integration status.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabList>
          <TabTrigger value="overview">Overview</TabTrigger>
          <TabTrigger value="firm">Firm Profile</TabTrigger>
          <TabTrigger value="departments">Departments</TabTrigger>
          <TabTrigger value="users">Users</TabTrigger>
          <TabTrigger value="api-keys">API Keys</TabTrigger>
          <TabTrigger value="data">Data & Retention</TabTrigger>
        </TabList>

        <TabContent value="overview">
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Cpu className="h-4 w-4" /> AI Models</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Row label="Provider" value={String(llm.provider || "—")} />
                  <Row label="Model" value={String(health?.["model"] || llm.model || "—")} />
                  <Row label="Host" value={String(llm.host || "local")} />
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

            <IntegrationsPanel />
          </div>
        </TabContent>

        <TabContent value="firm"><FirmProfile /></TabContent>
        <TabContent value="departments"><Departments /></TabContent>
        <TabContent value="users"><Users /></TabContent>
        <TabContent value="api-keys"><ApiKeys /></TabContent>
        <TabContent value="data"><DataRetention /></TabContent>
      </Tabs>
    </div>
  );
}

function IntegrationsPanel() {
  const qc = useQueryClient();
  const { data: integrations } = useQuery({ queryKey: ["integrations"], queryFn: api.listIntegrations });
  const byType = new Map((integrations ?? []).map((i) => [i.type, i]));
  const [connecting, setConnecting] = useState<Integration | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ message: string; feed_url?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const connectMut = useMutation({
    mutationFn: ({ type, fields }: { type: string; fields: Record<string, string> }) => api.connectIntegration(type, fields),
    onSuccess: async (data) => {
      if (data.oauth && data.authorize_url) {
        const w = window.open(data.authorize_url, "praxis-drive", "width=540,height=640");
        window.addEventListener("message", (ev) => {
          if (ev.data && ev.data.type === "praxis:drive-connected") {
            qc.invalidateQueries({ queryKey: ["integrations"] });
            if (ev.data.ok) setResult({ message: "Connected to Google Drive." });
            else setResult({ message: "Drive connection failed — see the card's error state." });
          }
        });
        if (w) {
          setConnecting(null);
          setResult(null);
          return;
        }
      }
      if (data.feed_url) {
        setResult({ message: data.message, feed_url: data.feed_url });
      } else {
        setResult({ message: data.message });
      }
      // Keep the dialog open on success so the result message and the one-time
      // .ics feed URL are visible; the user closes it with Done.
      setFields({});
      qc.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: (err: Error) => {
      setResult({ message: err.message.replace(/^.*?: /, "") });
      qc.invalidateQueries({ queryKey: ["integrations"] });
    },
  });

  const disconnectMut = useMutation({
    mutationFn: (type: string) => api.disconnectIntegration(type),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });

  const openConnect = (integ: Integration) => {
    setFields({});
    setResult(null);
    setCopied(false);
    setConnecting(integ);
  };

  const copyFeed = () => {
    if (result?.feed_url) {
      navigator.clipboard.writeText(`${window.location.origin}${result.feed_url}`);
      setCopied(true);
    }
  };

  const cardTypes = [...Object.keys(INTEGRATION_META), "scores"];

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Plug className="h-4 w-4" /> Integrations</CardTitle></CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-2">
          {cardTypes.map((type) => {
            if (type === "scores") {
              return (
                <div key="scores" className="flex items-center gap-3 rounded-lg border p-3">
                  <div>
                    <div className="text-sm font-medium">SEBI SCORES</div>
                    <div className="text-xs text-muted-foreground">{SCORES_DESC}</div>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <Badge variant="muted">Manual field</Badge>
                  </div>
                </div>
              );
            }
            const integ = byType.get(type);
            const meta = INTEGRATION_META[type];
            const isSSO = type === "sso";
            return (
              <div key={type} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium flex items-center gap-2">
                    {meta.name}
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{meta.tier}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{meta.desc}</div>
                  {(integ?.status === "error" || (integ?.configured_as && integ.status === "connected")) && (
                    <div className="mt-1 text-[11px]">
                      {integ.status === "error" && integ.last_error && (
                        <span className="text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {integ.last_error}</span>
                      )}
                      {integ.status === "connected" && (
                        <span className="text-success">→ {integ.configured_as}</span>
                      )}
                      {integ.status === "connected" && integ.last_used_at && (
                        <div className="text-muted-foreground mt-0.5">Last tested: {fmtTime(integ.last_used_at)}</div>
                      )}
                    </div>
                  )}
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  {statusBadge(integ?.status ?? "not_connected")}
                  {isSSO ? (
                    <Button size="sm" variant="outline" disabled>Sign in on Login</Button>
                  ) : integ?.status === "connected" ? (
                    <Button size="sm" variant="ghost" onClick={() => disconnectMut.mutate(type)}>Disconnect</Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => openConnect(byType.get(type) ?? { type, fields: [], status: "not_connected", connected_at: null, last_used_at: null, last_error: null, configured_as: "" })}>
                      Connect
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          Tier 1 (email, chat, calendar, SSO) are real connections with live test-on-connect. Tier 2 (Jira, Drive, DocuSign)
          need your own external accounts. SEBI SCORES has no public API — tracked manually, never faked. Credentials are
          encrypted at rest and never exposed.
        </p>
      </CardContent>

      {connecting && (
        <ConnectDialog
          integration={connecting}
          fields={fields}
          setFields={setFields}
          result={result}
          copied={copied}
          copyFeed={copyFeed}
          busy={connectMut.isPending}
          onCancel={() => { setConnecting(null); setResult(null); }}
          onSubmit={() => connectMut.mutate({ type: connecting.type, fields })}
        />
      )}
    </Card>
  );
}

function ConnectDialog({
  integration,
  fields,
  setFields,
  result,
  copied,
  copyFeed,
  busy,
  onCancel,
  onSubmit,
}: {
  integration: Integration;
  fields: Record<string, string>;
  setFields: (f: Record<string, string>) => void;
  result: { message: string; feed_url?: string } | null;
  copied: boolean;
  copyFeed: () => void;
  busy: boolean;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const isDrive = integration.type === "drive";
  const isCalendar = integration.type === "calendar";
  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect {INTEGRATION_META[integration.type]?.name ?? integration.type}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {isDrive
              ? "Opens Google's consent screen — sign in and grant access, then the browser popup returns here."
              : isCalendar
                ? "No credentials needed. Connecting enables a private .ics feed URL you can subscribe to in any calendar app."
                : "PRAXIS tests the connection immediately. Credentials are stored encrypted and never returned by the API."}
          </p>
        </DialogHeader>

        {!isDrive && !isCalendar && (
          <div className="space-y-3">
            {integration.fields.map((f: IntegrationField) => (
              <div key={f.name} className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                {f.type === "textarea" ? (
                  <textarea
                    className="w-full min-h-[90px] rounded-md border bg-transparent px-3 py-2 text-sm font-mono"
                    placeholder={f.placeholder}
                    value={fields[f.name] ?? ""}
                    onChange={(e) => setFields({ ...fields, [f.name]: e.target.value })}
                  />
                ) : (
                  <Input
                    type={f.type === "password" ? "password" : f.type === "email" ? "email" : "text"}
                    placeholder={f.placeholder}
                    value={fields[f.name] ?? ""}
                    onChange={(e) => setFields({ ...fields, [f.name]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {result && (
          <div className={`text-sm rounded-lg px-3 py-2 ${result.message.includes("failed") || result.message.toLowerCase().includes("error") || result.message.toLowerCase().includes("unreachable") ? "text-destructive bg-destructive/10" : "text-success bg-success/10"}`}>
            {result.message}
            {result.feed_url && (
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 text-xs break-all bg-background rounded-md px-2 py-1">{`${window.location.origin}${result.feed_url}`}</code>
                <Button size="sm" variant="outline" onClick={copyFeed}><Copy className="h-3 w-3" /> {copied ? "Copied!" : "Copy"}</Button>
              </div>
            )}
            {result.feed_url && (
              <div className="text-[11px] text-muted-foreground mt-2">This URL is shown once — it contains the private feed token.</div>
            )}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={onCancel}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onCancel}>Cancel</Button>
              <Button onClick={onSubmit} disabled={busy || (integration.fields.length > 0 && integration.fields.some((f) => f.required !== false && (fields[f.name] ?? "").trim().length === 0))}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {busy ? "Testing…" : isDrive ? "Open Google consent" : isCalendar ? "Enable feed" : "Connect & test"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
