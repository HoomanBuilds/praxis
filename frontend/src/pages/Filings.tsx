import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FILING_STATUSES } from "@/lib/constants";
import { titleCase } from "@/lib/utils";
import { FileOutput, Plus, Clock, CheckCircle2, XCircle, Send, LayoutList, AlignLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { timeAgo } from "@/lib/format";

export const FILING_BADGE: Record<string, "muted" | "warning" | "success" | "destructive"> = {
  not_filed: "muted",
  submitted: "warning",
  acknowledged: "success",
  rejected: "destructive",
};

// Derive "Delayed" status if the filing was submitted after the deadline
export function effectiveStatus(filing: any): string {
  if (filing.status === "submitted" && filing.deadline && filing.submitted_at) {
    const sub = new Date(filing.submitted_at).toISOString().slice(0, 10);
    if (sub > filing.deadline) return "delayed";
  }
  return filing.status;
}

const STATUS_ICON: Record<string, any> = {
  not_filed: Clock,
  submitted: Send,
  acknowledged: CheckCircle2,
  rejected: XCircle,
  delayed: Clock,
};

export default function Filings() {
  const qc = useQueryClient();
  const { data: filings } = useQuery({ queryKey: ["filings"], queryFn: () => api.listFilings() });
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [view, setView] = useState<"table" | "timeline">("table");
  const [form, setForm] = useState({ obligation_id: "", filing_type: "", notes: "" });

  const filtered = (filings ?? []).filter((f) => statusFilter === "all" || f.status === statusFilter);
  // Sort by submitted_at or created_at for timeline
  const timeline = [...filtered].sort((a, b) => {
    const aDate = a.submitted_at || (a as any).created_at || "";
    const bDate = b.submitted_at || (b as any).created_at || "";
    return bDate.localeCompare(aDate);
  });

  const createMut = useMutation({
    mutationFn: () => api.createFiling(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["filings"] }); setCreateOpen(false); setForm({ obligation_id: "", filing_type: "", notes: "" }); },
  });

  const submitMut = useMutation({
    mutationFn: (id: string) => api.submitFiling(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["filings"] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><FileOutput className="h-5 w-5" /> Filing Tracker</h1>
          <p className="text-sm text-muted-foreground">Track regulatory submissions and filing confirmations.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden text-sm">
            <button
              className={`px-3 py-1.5 flex items-center gap-1.5 ${view === "table" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
              onClick={() => setView("table")}
            >
              <LayoutList className="h-3.5 w-3.5" /> Table
            </button>
            <button
              className={`px-3 py-1.5 flex items-center gap-1.5 border-l ${view === "timeline" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
              onClick={() => setView("timeline")}
            >
              <AlignLeft className="h-3.5 w-3.5" /> Timeline
            </button>
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-lg border bg-card px-3 text-sm">
            <option value="all">All statuses</option>
            {FILING_STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
          </select>
          <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-3.5 w-3.5" /> New Filing</Button>
        </div>
      </div>

      {view === "table" ? (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground border-b">
                <tr>
                  <th className="py-3 px-4 font-medium">Obligation</th>
                  <th className="py-3 px-4 font-medium">Filing Type</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium">Submitted</th>
                  <th className="py-3 px-4 font-medium">Confirmation</th>
                  <th className="py-3 px-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((f) => {
                  const eff = effectiveStatus(f);
                  return (
                    <tr key={f.id} className="hover:bg-accent/40">
                      <td className="py-3 px-4 font-mono text-xs">
                        <Link to={`/obligations/${f.obligation_id}`} className="hover:text-primary hover:underline">
                          {f.obligation_summary?.identifier ?? f.obligation_id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="py-3 px-4">{f.filing_type || "—"}</td>
                      <td className="py-3 px-4">
                        <Badge variant={eff === "delayed" ? "destructive" : (FILING_BADGE[f.status] ?? "muted")}>
                          {eff === "delayed" ? "Delayed" : titleCase(f.status)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{f.submitted_at || "—"}</td>
                      <td className="py-3 px-4 text-muted-foreground">{f.confirmation_reference || "—"}</td>
                      <td className="py-3 px-4">
                        {f.status === "not_filed" && (
                          <Button size="sm" variant="outline" onClick={() => submitMut.mutate(f.id)}>
                            {submitMut.isPending ? "Submitting…" : "Mark Submitted"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="py-8 px-4 text-center text-muted-foreground">No filings found.</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        /* Timeline view */
        <div className="space-y-0">
          {timeline.length === 0 && (
            <div className="text-sm text-muted-foreground py-8 text-center">No filings found.</div>
          )}
          {timeline.map((f, i) => {
            const eff = effectiveStatus(f);
            const StatusIcon = STATUS_ICON[eff] || Clock;
            const dateStr = f.submitted_at || (f as any).created_at;
            return (
              <div key={f.id} className="relative flex gap-4">
                {/* Connector line */}
                <div className="flex flex-col items-center">
                  <div className={`h-8 w-8 rounded-full border-2 grid place-items-center shrink-0 ${
                    eff === "acknowledged" ? "border-success bg-success/10 text-success" :
                    eff === "rejected" || eff === "delayed" ? "border-destructive bg-destructive/10 text-destructive" :
                    eff === "submitted" ? "border-warning bg-warning/10 text-warning" :
                    "border-muted-foreground/40 bg-background text-muted-foreground"
                  }`}>
                    <StatusIcon className="h-3.5 w-3.5" />
                  </div>
                  {i < timeline.length - 1 && <div className="w-px flex-1 min-h-[24px] bg-border" />}
                </div>
                {/* Content */}
                <div className="pb-5 flex-1 min-w-0 -mt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      to={`/obligations/${f.obligation_id}`}
                      className="font-mono text-xs text-muted-foreground hover:text-primary hover:underline"
                    >
                      {f.obligation_summary?.identifier ?? f.obligation_id.slice(0, 8)}
                    </Link>
                    <span className="text-sm font-medium">{f.filing_type || "Filing"}</span>
                    <Badge variant={eff === "delayed" ? "destructive" : (FILING_BADGE[f.status] ?? "muted")}>
                      {eff === "delayed" ? "Delayed" : titleCase(f.status)}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-3">
                    {dateStr && <span>{timeAgo(dateStr)}</span>}
                    {f.confirmation_reference && <span>Ref: {f.confirmation_reference}</span>}
                    {f.status === "not_filed" && (
                      <Button size="sm" variant="ghost" className="h-5 px-2 text-[11px]" onClick={() => submitMut.mutate(f.id)}>
                        Mark Submitted
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Filing</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Obligation ID" value={form.obligation_id} onChange={(e) => setForm({ ...form, obligation_id: e.target.value })} />
            <Input placeholder="Filing type (e.g. quarterly_return)" value={form.filing_type} onChange={(e) => setForm({ ...form, filing_type: e.target.value })} />
            <Input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending || !form.obligation_id}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
