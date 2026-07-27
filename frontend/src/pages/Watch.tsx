import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Radar, Plus, ExternalLink, CheckCircle, Trash2 } from "lucide-react";
import { timeAgo } from "@/lib/format";

interface WatchSourceRow {
  id: string;
  name: string;
  url: string;
  source_type: string;
  is_active: boolean;
  last_checked_at: string | null;
  created_at: string | null;
}

interface WatchHitRow {
  id: string;
  source_id: string;
  title: string;
  url: string;
  summary: string;
  relevance_score: number;
  is_reviewed: boolean;
  created_at: string | null;
}

const SOURCE_TYPES = [
  { value: "regulatory", label: "Regulatory" },
  { value: "news", label: "News" },
  { value: "rss", label: "RSS Feed" },
];

export default function Watch() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", source_type: "regulatory" });
  const [formError, setFormError] = useState("");

  const { data: sources } = useQuery({
    queryKey: ["watch-sources"],
    queryFn: async (): Promise<WatchSourceRow[]> => {
      const res = await fetch("/api/watch/sources", { headers: { "Content-Type": "application/json" } });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: hits } = useQuery({
    queryKey: ["watch-hits"],
    queryFn: async (): Promise<WatchHitRow[]> => {
      const res = await fetch("/api/watch/hits", { headers: { "Content-Type": "application/json" } });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const addSourceMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch("/api/watch/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Failed" }));
        throw new Error(err.detail || "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["watch-sources"] });
      setAddOpen(false);
      setForm({ name: "", url: "", source_type: "regulatory" });
      setFormError("");
    },
    onError: (err: unknown) => setFormError(err instanceof Error ? err.message : "Failed"),
  });

  const deleteSourceMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/watch/sources/${id}`, { method: "DELETE" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watch-sources"] }),
  });

  const reviewHitMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`/api/watch/hits/${id}/review`, { method: "POST" });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["watch-hits"] }),
  });

  const unreviewedHits = (hits ?? []).filter((h) => !h.is_reviewed).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><Radar className="h-5 w-5" /> Regulatory Watch</h1>
          <p className="text-sm text-muted-foreground">Monitor regulatory sources for changes and updates.</p>
        </div>
        <div className="flex gap-2">
          {unreviewedHits > 0 && <Badge variant="warning">{unreviewedHits} new</Badge>}
          <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-3.5 w-3.5" /> Add Source</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">Sources ({(sources ?? []).length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(sources ?? []).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{s.url}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="muted">{s.source_type}</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteSourceMutation.mutate(s.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
            {(!sources || sources.length === 0) && <div className="text-sm text-muted-foreground text-center py-4">No sources configured. Add one to start monitoring.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Recent Hits ({(hits ?? []).length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
            {(hits ?? []).map((h) => (
              <div key={h.id} className={`rounded-lg border p-3 ${h.is_reviewed ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-medium">{h.title}</div>
                  {!h.is_reviewed && <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => reviewHitMutation.mutate(h.id)}><CheckCircle className="h-3.5 w-3.5" /></Button>}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{h.summary}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-muted-foreground">{timeAgo(h.created_at)}</span>
                  {h.url && <a href={h.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-muted-foreground flex items-center gap-1 hover:text-foreground"><ExternalLink className="h-2.5 w-2.5" /> Source</a>}
                </div>
              </div>
            ))}
            {(!hits || hits.length === 0) && <div className="text-sm text-muted-foreground text-center py-4">No hits yet. Add a source and run a check.</div>}
          </CardContent>
        </Card>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Watch Source</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); addSourceMutation.mutate(form); }} className="space-y-3">
            {formError && <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{formError}</div>}
            <Input placeholder="Source name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input placeholder="URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required />
            <Select options={SOURCE_TYPES} value={form.source_type} onChange={(e) => setForm({ ...form, source_type: e.target.value })} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={addSourceMutation.isPending}>{addSourceMutation.isPending ? "Adding…" : "Add"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
