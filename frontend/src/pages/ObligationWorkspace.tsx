import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useCopilot } from "@/context/CopilotContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { AreaBadge, ConfidenceBadge, MethodBadge, StatusBadge } from "@/components/badges";
import { ObligationArtifacts } from "@/components/ObligationArtifacts";
import { titleCase } from "@/lib/utils";
import {
  ArrowLeft, Check, X, Pencil, Bot, ScrollText, MessageSquare, History as HistoryIcon,
  Cpu, Link2, CheckCircle2,
} from "lucide-react";

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(iso.endsWith("Z") ? iso : iso + "Z").getTime();
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function ObligationWorkspace() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { setScope, ask } = useCopilot();

  const { data: ob } = useQuery({ queryKey: ["obligation", id], queryFn: () => api.getObligation(id) });
  const { data: explain } = useQuery({ queryKey: ["explain", id], queryFn: () => api.explain(id) });
  const { data: history } = useQuery({ queryKey: ["activity", id], queryFn: () => api.activity(30, id) });
  const { data: comments } = useQuery({ queryKey: ["comments", id], queryFn: () => api.listComments(id) });

  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState("");
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (ob) { setDesc(ob.description); setScope({ obligationId: id, label: `Obligation ${ob.identifier}` }); }
    return () => setScope({});
  }, [ob, id, setScope]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["obligation", id] });
    qc.invalidateQueries({ queryKey: ["activity", id] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    if (ob) qc.invalidateQueries({ queryKey: ["obligations", ob.document_id] });
  };
  const approve = useMutation({ mutationFn: () => api.approveObligation(id), onSuccess: invalidate });
  const reject = useMutation({ mutationFn: () => api.rejectObligation(id), onSuccess: invalidate });
  const edit = useMutation({
    mutationFn: () => api.editObligation(id, { description: desc }),
    onSuccess: () => { setEditing(false); invalidate(); },
  });
  const addComment = useMutation({
    mutationFn: () => api.addComment(id, comment),
    onSuccess: () => { setComment(""); qc.invalidateQueries({ queryKey: ["comments", id] }); },
  });

  if (!ob) return <div className="text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link to={`/documents/${ob.document_id}/review`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to document
        </Link>
        <Button size="sm" variant="outline" onClick={() => ask("Why was this obligation extracted, and what does it require?")}>
          <Bot className="h-3.5 w-3.5" /> Explain with Copilot
        </Button>
      </div>

      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs text-muted-foreground">{ob.identifier}</span>
          <MethodBadge method={ob.extraction_method} />
          <AreaBadge area={ob.functional_area} />
          <ConfidenceBadge value={ob.confidence} />
          <StatusBadge status={ob.status} />
        </div>
        <h1 className="mt-2 text-lg font-semibold leading-snug">{ob.description}</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="success" disabled={approve.isPending} onClick={() => approve.mutate()}><Check className="h-3.5 w-3.5" /> Approve</Button>
        <Button size="sm" variant="outline" onClick={() => setEditing((e) => !e)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
        <Button size="sm" variant="ghost" disabled={reject.isPending} onClick={() => reject.mutate()}><X className="h-3.5 w-3.5" /> Reject</Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Obligation</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                {editing ? (
                  <div className="space-y-2">
                    <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} />
                    <div className="flex gap-2">
                      <Button size="sm" disabled={edit.isPending} onClick={() => edit.mutate()}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDesc(ob.description); }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <p>{ob.description}</p>
                )}
                {ob.deadline_hint && <div className="text-xs text-muted-foreground">Deadline: {ob.deadline_hint}</div>}
                <div className="text-xs text-muted-foreground">Modification: {titleCase(ob.modification_type)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-1.5"><ScrollText className="h-3.5 w-3.5" /> Source {ob.source_paragraph_ref ? `· ¶${ob.source_paragraph_ref}` : ""}</CardTitle></CardHeader>
              <CardContent>
                <blockquote className="text-sm border-l-2 border-primary/40 pl-3 text-muted-foreground italic">"{ob.source_text}"</blockquote>
              </CardContent>
            </Card>
          </div>

          {/* AI reasoning — real, recomputed explainability */}
          {explain && (
            <Card className="border-primary/25">
              <CardHeader><CardTitle className="text-sm flex items-center gap-1.5"><Cpu className="h-4 w-4 text-primary" /> AI Reasoning</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>{explain.why_method}</p>
                <div className="text-xs text-muted-foreground">Model: {explain.model}</div>
                <div>
                  <div className="text-xs font-medium mb-1.5">Confidence {(explain.confidence * 100).toFixed(0)}% — signals</div>
                  <div className="space-y-1">
                    {explain.confidence_factors.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                        <span><span className="text-foreground">{f.signal}:</span> <span className="text-muted-foreground">{String(f.value)} — {f.effect}</span></span>
                      </div>
                    ))}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-2">{explain.confidence_note}</div>
                </div>
                {explain.related_obligations.length > 0 && (
                  <div>
                    <div className="text-xs font-medium mb-1.5 flex items-center gap-1"><Link2 className="h-3.5 w-3.5" /> Related obligations</div>
                    <div className="space-y-1">
                      {explain.related_obligations.map((r) => (
                        <button key={r.id} onClick={() => navigate(`/obligations/${r.id}`)}
                          className="w-full text-left rounded-md border px-2 py-1.5 hover:border-primary/40 transition-colors">
                          <div className="text-[10px] text-muted-foreground">{r.identifier} · {(r.score * 100).toFixed(0)}% similar</div>
                          <div className="text-xs truncate">{r.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-sm">Rules · Tasks · Evidence</CardTitle></CardHeader>
            <CardContent>
              <ObligationArtifacts obligationId={id} enabled={true} />
            </CardContent>
          </Card>
        </div>

        {/* Right column: history + comments */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-1.5"><HistoryIcon className="h-3.5 w-3.5" /> Audit Trail</CardTitle></CardHeader>
            <CardContent>
              {history?.length ? (
                <div className="space-y-0">
                  {history.map((ev, i) => (
                    <div key={ev.id} className="flex gap-2.5">
                      <div className="flex flex-col items-center">
                        <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                        {i < history.length - 1 && <div className="w-px flex-1 bg-border" />}
                      </div>
                      <div className="pb-3 -mt-0.5">
                        <div className="text-xs">{titleCase(ev.action.replace(/[._]/g, " "))}</div>
                        <div className="text-[10px] text-muted-foreground">{ev.actor.replace(/_/g, " ")} · {timeAgo(ev.timestamp)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className="text-xs text-muted-foreground">No history yet.</div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Comments</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {comments?.length ? comments.map((c) => (
                <div key={c.id} className="text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.author.replace(/_/g, " ")}</span>
                    <span className="text-muted-foreground">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-muted-foreground mt-0.5">{c.body}</p>
                </div>
              )) : <div className="text-xs text-muted-foreground">No comments yet.</div>}
              <div className="flex items-end gap-2 pt-1">
                <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="Add a comment…" className="text-xs min-h-0" />
                <Button size="sm" disabled={!comment.trim() || addComment.isPending} onClick={() => addComment.mutate()}>Post</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
