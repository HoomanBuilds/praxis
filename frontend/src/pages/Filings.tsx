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
import { FileOutput, Plus } from "lucide-react";

const FILING_BADGE: Record<string, "muted" | "warning" | "success" | "destructive"> = {
  not_filed: "muted",
  submitted: "warning",
  acknowledged: "success",
  rejected: "destructive",
};

export default function Filings() {
  const qc = useQueryClient();
  const { data: filings } = useQuery({ queryKey: ["filings"], queryFn: () => api.listFilings() });
  const [statusFilter, setStatusFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ obligation_id: "", filing_type: "", notes: "" });

  const filtered = (filings ?? []).filter((f) => statusFilter === "all" || f.status === statusFilter);

  const createMut = useMutation({
    mutationFn: () => api.createFiling(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["filings"] }); setCreateOpen(false); setForm({ obligation_id: "", filing_type: "", notes: "" }); },
  });

  const submitMut = useMutation({
    mutationFn: ({ id, ref }: { id: string; ref: string }) =>
      api.updateFiling(id, { status: "submitted", submitted_at: new Date().toISOString().slice(0, 10), confirmation_reference: ref }),
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
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-lg border bg-card px-3 text-sm">
            <option value="all">All statuses</option>
            {FILING_STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
          </select>
          <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-3.5 w-3.5" /> New Filing</Button>
        </div>
      </div>

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
              {filtered.map((f) => (
                <tr key={f.id} className="hover:bg-accent/40">
                  <td className="py-3 px-4 font-mono text-xs">{f.obligation_id.slice(0, 8)}</td>
                  <td className="py-3 px-4">{f.filing_type || "—"}</td>
                  <td className="py-3 px-4"><Badge variant={FILING_BADGE[f.status] ?? "muted"}>{titleCase(f.status)}</Badge></td>
                  <td className="py-3 px-4 text-muted-foreground">{f.submitted_at || "—"}</td>
                  <td className="py-3 px-4 text-muted-foreground">{f.confirmation_reference || "—"}</td>
                  <td className="py-3 px-4">
                    {f.status === "not_filed" && (
                      <FilingSubmitAction filingId={f.id} onSubmit={(ref) => submitMut.mutate({ id: f.id, ref })} />
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="py-8 px-4 text-center text-muted-foreground">No filings found.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

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

function FilingSubmitAction({ onSubmit }: { filingId: string; onSubmit: (ref: string) => void }) {
  const [open, setOpen] = useState(false);
  const [ref, setRef] = useState("");
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Mark Submitted</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit Filing</DialogTitle></DialogHeader>
          <Input placeholder="Confirmation reference" value={ref} onChange={(e) => setRef(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => { onSubmit(ref); setOpen(false); setRef(""); }}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
