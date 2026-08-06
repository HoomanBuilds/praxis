import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api, apiFetch } from "@/lib/api";
import { useVocab } from "@/hooks/useVocab";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/badges";
import { titleCase } from "@/lib/utils";
import { Upload, Play, Loader2, ArrowRight, Radar, CheckCircle2, AlertCircle } from "lucide-react";
import { timeAgo } from "@/lib/format";

const ACTIVE_DOCUMENT_STATUSES = new Set(["queued", "parsing", "extracting", "generating"]);

export default function Documents() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { t } = useVocab();
  const {
    data: documents,
    isLoading,
    isError: documentsFailed,
    refetch: refetchDocuments,
  } = useQuery({
    queryKey: ["documents"],
    queryFn: api.listDocuments,
    refetchInterval: (query) => {
      const rows = query.state.data;
      return rows?.some((document) => ACTIVE_DOCUMENT_STATUSES.has(document.status)) ? 2500 : false;
    },
  });

  const [file, setFile] = useState<File | null>(null);
  const [reference, setReference] = useState("");
  const [title, setTitle] = useState("");
  const [uploadNotice, setUploadNotice] = useState("");

  const uploadMut = useMutation({
    mutationFn: () => api.ingest(file!, reference, title, false),
    onSuccess: (result) => {
      setFile(null); setReference(""); setTitle("");
      setUploadNotice(result.created ? "Uploaded and queued for processing." : result.message || "This document is already in the workspace.");
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const processMut = useMutation({
    mutationFn: (id: string) => api.processDocument(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Import Regulations</h1>
        <p className="text-sm text-muted-foreground">{t("documents.subtitle")}</p>
      </div>

      {/* Automatic Monitoring card */}
      <SebiMonitorCard />

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-sm font-medium"><Upload className="h-4 w-4" /> Manual Upload</CardTitle></CardHeader>

        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <label className="text-xs text-muted-foreground">PDF file</label>
              <Input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Reference (optional)</label>
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="SEBI/HO/.../CIR/2026/1" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Title (optional)</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Cyber Security Circular" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button disabled={!file || uploadMut.isPending} onClick={() => { setUploadNotice(""); uploadMut.mutate(); }}>
              {uploadMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload
            </Button>
            {uploadMut.isError && <span className="text-sm text-destructive">Upload failed.</span>}
            {uploadNotice && <span className="text-sm text-success">{uploadNotice}</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All Documents</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading documents...</div>
          ) : documentsFailed ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <span>Documents could not be loaded.</span>
              <Button size="sm" variant="outline" onClick={() => void refetchDocuments()}>Retry</Button>
            </div>
          ) : documents?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 font-medium">Document</th>
                    <th className="py-2 font-medium">Type</th>
                    <th className="py-2 font-medium">Status</th>
                    <th className="py-2 font-medium">Obligations</th>
                    <th className="py-2 font-medium">{t("documents.col_ai")}</th>
                    <th className="py-2 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {documents.map((d) => {
                    const isProcessing = ACTIVE_DOCUMENT_STATUSES.has(d.status);
                    const canProcess = d.status === "ingested" || d.status === "failed" || d.status === "extraction_failed";
                    return (
                    <tr key={d.id}>
                      <td className="py-2.5">
                        <div className="font-medium">{d.title || d.reference || d.id.slice(0, 8)}</div>
                        <div className="text-xs text-muted-foreground">{d.page_count} pages · quality {(d.parse_quality * 100).toFixed(0)}%</div>
                      </td>
                      <td className="py-2.5">{titleCase(d.document_type)}</td>
                      <td className="py-2.5">
                        <StatusBadge status={d.status} />
                        {d.error && <div className="mt-1 max-w-56 text-xs text-destructive" title={d.error}>{d.error}</div>}
                      </td>
                      <td className="py-2.5">{d.funnel?.obligations_total ?? "-"}</td>
                      <td className="py-2.5">{d.funnel ? `${d.funnel.llm_calls}` : "-"}</td>
                      <td className="py-2.5 text-right">
                        {isProcessing ? (
                          <Button size="sm" variant="ghost" disabled>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing
                          </Button>
                        ) : canProcess ? (
                          <Button size="sm" variant="outline" disabled={processMut.isPending} onClick={() => processMut.mutate(d.id)}>
                            {processMut.isPending && processMut.variables === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                            {t(d.status === "ingested" ? "documents.process" : "documents.reprocess")}
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/documents/${d.id}/review`)}>
                            Review <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No documents yet.</div>
          )}
          {processMut.isError && <div className="text-sm text-destructive mt-2">{t("documents.process_failed")}</div>}
        </CardContent>
      </Card>
    </div>
  );
}

/* ---- Automatic Monitoring card ---- */

interface SebiStatus {
  last_checked_at: string | null;
  last_error: string | null;
  new_hits_since_reset: number;
  total_ingested: number;
  // Served by the backend from the scraper's own config, so the UI cannot list a
  // source the monitor isn't actually polling.
  sources?: { name: string; url: string }[];
}

function SebiMonitorCard() {
  const qc = useQueryClient();
  const { t } = useVocab();
  const { data: status } = useQuery<SebiStatus>({
    queryKey: ["sebi-status"],
    queryFn: async () => {
      const res = await apiFetch("/api/watch/sebi-status");
      if (!res.ok) return { last_checked_at: null, last_error: "unavailable", new_hits_since_reset: 0, total_ingested: 0 };
      return res.json();
    },
    refetchInterval: 60_000,
  });

  // A manual check runs the same throttled scrape as the scheduled poll, so it can
  // take a while - the request is intentionally not given a short timeout.
  const [checkResult, setCheckResult] = useState<string | null>(null);
  const checkNow = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/watch/check", { method: "POST" });
      return res.json();
    },
    onSuccess: (data) => {
      setCheckResult(data.message ?? "Check complete.");
      qc.invalidateQueries({ queryKey: ["sebi-status"] });
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (err: Error) => setCheckResult(`Check failed: ${err.message}`),
  });

  const checked = status?.last_checked_at;
  const hasError = !!status?.last_error && status.last_error !== "unavailable";

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Radar className="h-4 w-4 text-primary" />
          Automatic Monitoring
          <Badge variant="outline" className="text-[10px] py-0 h-4">Beta</Badge>
        </CardTitle>
        {checked && !hasError && (
          <span className="flex items-center gap-1 text-[11px] text-success">
            <CheckCircle2 className="h-3 w-3" /> Checked {timeAgo(checked)}
          </span>
        )}
        {hasError && (
          <span className="flex items-center gap-1 text-[11px] text-destructive">
            <AlertCircle className="h-3 w-3" /> {status!.last_error}
          </span>
        )}
        {!checked && !hasError && (
          <span className="text-[11px] text-muted-foreground">Starting up…</span>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5">
          {(status?.sources ?? []).map((s) => (
            <div key={s.url} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground shrink-0">{s.name}</span>
              <span className="text-[11px] font-mono text-muted-foreground/70 truncate" title={s.url}>
                {s.url.replace(/^https?:\/\//, "")}
              </span>
            </div>
          ))}
          {!status?.sources?.length && (
            <div className="text-xs text-muted-foreground">No sources configured.</div>
          )}
        </div>
        {status && status.total_ingested > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {status.total_ingested} new circular{status.total_ingested !== 1 ? "s" : ""} {t("documents.auto_ingested")}.
          </p>
        )}
        <div className="mt-3 flex items-center gap-2 border-t pt-3">
          <Button size="sm" variant="outline" disabled={checkNow.isPending} onClick={() => { setCheckResult(null); checkNow.mutate(); }}>
            {checkNow.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Radar className="h-3.5 w-3.5" />}
            {checkNow.isPending ? "Checking…" : "Check now"}
          </Button>
          {checkResult && <span className="text-[11px] text-muted-foreground">{checkResult}</span>}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          This scrapes SEBI's public circulars pages - SEBI publishes no feed or API. The
          scraper honours sebi.gov.in/robots.txt, spaces its requests, and polls every 6 hours.
          Only the two pages listed above are monitored.
        </p>
      </CardContent>
    </Card>
  );
}
