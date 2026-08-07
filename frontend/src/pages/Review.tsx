import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useVocab } from "@/hooks/useVocab";
import { PipelineStrip } from "@/components/vocab/PipelineStrip";
import { fromDocumentFunnel } from "@/lib/vocab/pipeline";
import { useCopilot } from "@/context/CopilotContext";
import type { Obligation } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AreaBadge, ConfidenceBadge, MethodBadge, StatusBadge } from "@/components/badges";
import { ObligationArtifacts } from "@/components/ObligationArtifacts";
import { AuditPackageDownloads } from "@/components/AuditPackageDownloads";
import { titleCase } from "@/lib/utils";
import { useAreas } from "@/hooks/useAreas";
import {
  ArrowLeft, Check, X, Pencil, ChevronDown, ChevronRight, Zap, FileDown, Loader2, AlertTriangle, Maximize2,
} from "lucide-react";

function ObligationRow({ ob, generated }: { ob: Obligation; generated: boolean }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const areas = useAreas().filter((a) => a !== "all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(ob.description);
  const [area, setArea] = useState(ob.functional_area);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["obligations", ob.document_id] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const approve = useMutation({ mutationFn: () => api.approveObligation(ob.id), onSuccess: invalidate });
  const reject = useMutation({ mutationFn: () => api.rejectObligation(ob.id), onSuccess: invalidate });
  const edit = useMutation({
    mutationFn: () => api.editObligation(ob.id, { description: desc, functional_area: area }),
    onSuccess: () => { setEditing(false); invalidate(); },
  });

  const decided = ob.status !== "pending_review";
  const updating = approve.isPending || reject.isPending || edit.isPending;
  const actionError = approve.error || reject.error || edit.error;
  return (
    <Card className={ob.needs_review ? "border-warning/50" : ""}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <button
            className="flex items-start gap-2 text-left"
            aria-expanded={open}
            aria-label={`${open ? "Collapse" : "Expand"} ${ob.identifier}`}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <ChevronDown className="h-4 w-4 mt-1 shrink-0" /> : <ChevronRight className="h-4 w-4 mt-1 shrink-0" />}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-muted-foreground">{ob.identifier}</span>
                <MethodBadge method={ob.extraction_method} />
                <AreaBadge area={ob.functional_area} />
                <ConfidenceBadge value={ob.confidence} />
                <StatusBadge status={ob.status} />
                {ob.needs_review && <Badge variant="warning"><AlertTriangle className="h-3 w-3 mr-1" />review</Badge>}
              </div>
              <div className="mt-1.5 text-sm">{ob.description}</div>
            </div>
          </button>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button size="sm" variant="success" disabled={updating} onClick={() => approve.mutate()}>
              <Check className="h-3.5 w-3.5" /> Approve
            </Button>
            <Button size="sm" variant="outline" aria-label={`Edit ${ob.identifier}`} disabled={updating} onClick={() => { setOpen(true); setEditing(true); }}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" aria-label={`Reject ${ob.identifier}`} disabled={updating} onClick={() => reject.mutate()}>
              <X className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" aria-label={`Open ${ob.identifier} review workspace`} title="Open review workspace" onClick={() => navigate(`/obligations/${ob.id}`)}>
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {open && (
          <div className="mt-4 pl-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1">OBLIGATION</div>
                {editing ? (
                  <div className="space-y-2">
                    <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} />
                    <select className="h-9 w-full rounded-md border border-input bg-card px-3 text-sm" value={area} onChange={(e) => setArea(e.target.value)}>
                      {areas.map((a) => <option key={a} value={a}>{titleCase(a)}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <Button size="sm" disabled={edit.isPending} onClick={() => edit.mutate()}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDesc(ob.description); setArea(ob.functional_area); }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm">
                    {ob.description}
                    {ob.deadline_hint && <div className="mt-2 text-xs text-muted-foreground">Deadline: {ob.deadline_hint}</div>}
                    <div className="mt-1 text-xs text-muted-foreground">Modification: {titleCase(ob.modification_type)}{ob.linked_prior_obligation_id ? " · links a prior obligation" : ""}</div>
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1">
                  SOURCE {ob.source_paragraph_ref ? `· ¶${ob.source_paragraph_ref}` : ""}
                </div>
                <blockquote className="text-sm border-l-2 border-primary/40 pl-3 text-muted-foreground italic">
                  "{ob.source_text}"
                </blockquote>
              </div>
            </div>
            {decided && <ObligationArtifacts obligationId={ob.id} enabled={open && generated} />}
          </div>
        )}
        {actionError && (
          <div role="alert" className="mt-3 text-sm text-destructive">
            {actionError instanceof Error ? actionError.message : "The obligation could not be updated. Please try again."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Review() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const documentQuery = useQuery({ queryKey: ["document", id], queryFn: () => api.getDocument(id) });
  const obligationsQuery = useQuery({ queryKey: ["obligations", id], queryFn: () => api.listObligations({ document_id: id, limit: 200 }) });
  const doc = documentQuery.data;
  const obligationsPage = obligationsQuery.data;
  const obligations = obligationsPage?.items;
  const [audit, setAudit] = useState<{ files?: string[] } | null>(null);
  const { setScope } = useCopilot();
  const { t } = useVocab();

  useEffect(() => {
    setScope({ documentId: id, label: doc?.title ? `Document · ${doc.title}` : "Document" });
    return () => setScope({});
  }, [id, doc?.title, setScope]);

  const approvedCount = obligations?.filter((o) => o.status === "approved" || o.status === "edited").length ?? 0;

  const generate = useMutation({
    mutationFn: () => api.generate(id, false),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["obligations", id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      obligations?.forEach((o) => {
        qc.invalidateQueries({ queryKey: ["rules", o.id] });
        qc.invalidateQueries({ queryKey: ["tasks", o.id] });
        qc.invalidateQueries({ queryKey: ["evidence", o.id] });
      });
    },
  });

  const auditMut = useMutation({
    mutationFn: () => api.auditReport("document", { document_id: id }),
    onSuccess: (res: any) => setAudit({ files: Object.values(res?.files ?? {}) as string[] }),
  });

  const generated = (doc?.status === "completed") || generate.isSuccess;
  const f = doc?.funnel;

  if (documentQuery.isLoading || obligationsQuery.isLoading) {
    return (
      <div className="space-y-5" role="status" aria-label="Loading document review">
        <div className="h-5 w-24 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          <div className="h-8 w-full max-w-lg animate-pulse rounded bg-muted" />
          <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        </div>
        {[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl border bg-muted/40" />)}
      </div>
    );
  }

  if (documentQuery.isError || obligationsQuery.isError) {
    return (
      <div className="space-y-5">
        <Link to="/documents" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Documents
        </Link>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col items-start gap-3 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div role="alert">
              <div className="font-medium text-destructive">Document review could not be loaded.</div>
              <div className="text-sm text-muted-foreground">Check the connection and try again.</div>
            </div>
            <Button variant="outline" onClick={() => void Promise.all([documentQuery.refetch(), obligationsQuery.refetch()])}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link to="/documents" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Documents
      </Link>

      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div>
          <h1 className="text-2xl font-bold">{doc?.title || doc?.reference || "Review"}</h1>
          <p className="text-muted-foreground text-sm">{doc && `${titleCase(doc.document_type)} · ${doc.page_count} pages · `}{approvedCount} approved</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" disabled={auditMut.isPending} onClick={() => auditMut.mutate()}>
              {auditMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Audit report
            </Button>
            <Button title={approvedCount === 0 ? "Approve an obligation first" : undefined} disabled={approvedCount === 0 || generate.isPending} onClick={() => generate.mutate()}>
              {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />} Generate rules & tasks
            </Button>
          </div>
          {approvedCount === 0 && Boolean(obligations?.length) && (
            <p className="max-w-sm text-xs text-muted-foreground">Approve at least one obligation before generating rules, tasks, and evidence requirements.</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-muted/40 p-4 text-sm">
        <div className="font-medium">What approval does</div>
        <div className="mt-1 text-muted-foreground">
          Approve confirms that an extracted requirement applies and accurately reflects the cited source. It does not assign work yet. After approving, use Generate rules & tasks to create owners, deadlines, and evidence requirements.
        </div>
      </div>

      {generate.isError && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {generate.error instanceof Error ? generate.error.message : "Rules and tasks could not be generated. Please try again."}
        </div>
      )}

      {auditMut.isError && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {auditMut.error instanceof Error ? auditMut.error.message : "The audit report could not be generated. Please try again."}
        </div>
      )}

      {generate.isSuccess && (
        <div role="status" className="rounded-lg border border-success/40 bg-success/5 p-3 text-sm text-success">
          Rules, tasks, and evidence requirements generated.
        </div>
      )}

      {f && (
        <Card className="bg-muted/40">
          <CardContent className="py-3">
            <PipelineStrip stats={fromDocumentFunnel(f)} />
          </CardContent>
        </Card>
      )}

      <AuditPackageDownloads files={audit?.files ?? []} label="Audit package ready" />

      <div className="space-y-3">
        {obligations?.length ? (
          obligations.map((ob) => <ObligationRow key={ob.id} ob={ob} generated={generated} />)
        ) : (
          <div className="text-sm text-muted-foreground">{t("review.empty")}</div>
        )}
      </div>
    </div>
  );
}
