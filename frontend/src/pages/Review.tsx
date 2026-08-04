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
  return (
    <Card className={ob.needs_review ? "border-warning/50" : ""}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <button className="flex items-start gap-2 text-left" onClick={() => setOpen((o) => !o)}>
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
            <Button size="sm" variant="success" disabled={approve.isPending} onClick={() => approve.mutate()}>
              <Check className="h-3.5 w-3.5" /> Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setOpen(true); setEditing(true); }}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" disabled={reject.isPending} onClick={() => reject.mutate()}>
              <X className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" title="Open review workspace" onClick={() => navigate(`/obligations/${ob.id}`)}>
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
      </CardContent>
    </Card>
  );
}

export default function Review() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const { data: doc } = useQuery({ queryKey: ["document", id], queryFn: () => api.getDocument(id) });
  const { data: obligations } = useQuery({ queryKey: ["obligations", id], queryFn: () => api.listObligations({ document_id: id }) });
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

  return (
    <div className="space-y-5">
      <Link to="/documents" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Documents
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{doc?.title || doc?.reference || "Review"}</h1>
          <p className="text-muted-foreground text-sm">{doc && `${titleCase(doc.document_type)} · ${doc.page_count} pages · `}{approvedCount} approved</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={auditMut.isPending} onClick={() => auditMut.mutate()}>
            {auditMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Audit report
          </Button>
          <Button disabled={approvedCount === 0 || generate.isPending} onClick={() => generate.mutate()}>
            {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />} Generate rules & tasks
          </Button>
        </div>
      </div>

      {f && (
        <Card className="bg-muted/40">
          <CardContent className="py-3">
            <PipelineStrip stats={fromDocumentFunnel(f)} />
          </CardContent>
        </Card>
      )}

      {audit?.files?.length ? (
        <div className="rounded-md border border-success/40 bg-success/5 p-3 text-sm">
          Audit package ready:{" "}
          {audit.files.map((fn) => (
            <a key={fn} className="text-primary underline mr-3" href={`/api/audit/download/${fn}`}>{fn}</a>
          ))}
        </div>
      ) : null}

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
