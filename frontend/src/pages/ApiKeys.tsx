import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageSkeleton, QueryError } from "@/components/ui/data-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Key, Plus, Copy, AlertTriangle } from "lucide-react";
import { timeAgo } from "@/lib/format";

export default function ApiKeys() {
  const qc = useQueryClient();
  const keysQuery = useQuery({ queryKey: ["api-keys"], queryFn: api.listApiKeys });
  const keys = keysQuery.data;
  const [createOpen, setCreateOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [createdKey, setCreatedKey] = useState<{ label: string; key: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const createMut = useMutation({
    mutationFn: () => api.createApiKey(label),
    onSuccess: (data) => { setCreatedKey({ label: data.label, key: data.key }); setCreateOpen(false); setLabel(""); qc.invalidateQueries({ queryKey: ["api-keys"] }); },
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => api.revokeApiKey(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["api-keys"] }),
  });

  const copyKey = () => {
    if (createdKey) { navigator.clipboard.writeText(createdKey.key); setCopied(true); }
  };

  if (keysQuery.isLoading) {
    return <PageSkeleton label="Loading API keys" cards={0} />;
  }

  if (keysQuery.isError && keys === undefined) {
    return <QueryError title="API keys could not be loaded" onRetry={() => void keysQuery.refetch()} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><Key className="h-5 w-5" /> API Keys</h1>
          <p className="text-sm text-muted-foreground">Manage programmatic access keys for integrations.</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-3.5 w-3.5" /> Create Key</Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="text-left text-muted-foreground border-b">
              <tr>
                <th className="py-3 px-4 font-medium">Label</th>
                <th className="py-3 px-4 font-medium">Created by</th>
                <th className="py-3 px-4 font-medium">Created</th>
                <th className="py-3 px-4 font-medium">Last used</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(keys ?? []).map((k) => (
                <tr key={k.id} className="hover:bg-accent/40">
                  <td className="py-3 px-4 font-medium">{k.label}</td>
                  <td className="py-3 px-4 text-muted-foreground">{k.created_by}</td>
                  <td className="py-3 px-4 text-muted-foreground">{timeAgo(k.created_at)}</td>
                  <td className="py-3 px-4 text-muted-foreground">{k.last_used_at ? timeAgo(k.last_used_at) : "Never"}</td>
                  <td className="py-3 px-4">
                    <Badge variant={k.revoked_at ? "destructive" : "success"}>{k.revoked_at ? "Revoked" : "Active"}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    {!k.revoked_at && (
                      <Button size="sm" variant="ghost" onClick={() => revokeMut.mutate(k.id)}>Revoke</Button>
                    )}
                  </td>
                </tr>
              ))}
              {(!keys || keys.length === 0) && (
                <tr><td colSpan={6} className="py-8 px-4 text-center text-muted-foreground">No API keys created yet.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {(createMut.isError || revokeMut.isError) && (
        <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {createMut.error?.message || revokeMut.error?.message}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create API Key</DialogTitle></DialogHeader>
          <label htmlFor="api-key-label" className="text-sm font-medium">Key label</label>
          <Input id="api-key-label" placeholder="For example, staging-integration" value={label} onChange={(e) => setLabel(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending || !label}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createdKey !== null} onOpenChange={() => setCreatedKey(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Key Created</DialogTitle></DialogHeader>
          <div className="rounded-lg bg-secondary p-3 text-xs font-mono break-all">{createdKey?.key}</div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground mt-2">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>This key will not be shown again. Copy it now.</span>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={copyKey}><Copy className="h-3.5 w-3.5" /> {copied ? "Copied!" : "Copy"}</Button>
            <Button onClick={() => setCreatedKey(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
