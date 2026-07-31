import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileCheck, AlertTriangle, CheckCircle, Upload, HardDrive, Cloud, Loader2 } from "lucide-react";
import type { EvidenceRequirement } from "@/lib/types";

function TargetBadge({ target }: { target: string | undefined }) {
  if (target === "drive") return <Badge variant="success"><Cloud className="h-3 w-3 mr-1" /> Drive</Badge>;
  if (target === "local") return <Badge variant="secondary"><HardDrive className="h-3 w-3 mr-1" /> Local disk</Badge>;
  return null;
}

function RequirementRow({ item, onUpload }: { item: EvidenceRequirement; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground gap-2 py-1">
      <div className="min-w-0 flex-1 flex items-center gap-2">
        <span className="truncate">{item.document_type}</span>
        {item.file_name && <span className="truncate text-[10px] text-muted-foreground/70">{item.file_name}</span>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <TargetBadge target={item.upload_target} />
        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => ref.current?.click()}>
          <Upload className="h-3 w-3 mr-1" /> Upload
        </Button>
        <input
          ref={ref}
          type="file"
          className="hidden"
          onChange={(e) => { onUpload(e); e.target.value = ""; }}
        />
      </div>
    </div>
  );
}

export default function EvidenceCenter() {
  const qc = useQueryClient();
  const { data: evidence } = useQuery({ queryKey: ["evidence"], queryFn: () => api.listEvidence() });
  const { data: obligations } = useQuery({ queryKey: ["obligations"], queryFn: () => api.listObligations() });
  const { data: integrations } = useQuery({ queryKey: ["integrations"], queryFn: api.listIntegrations });
  useQuery({ queryKey: ["rules"], queryFn: () => api.listRules() });

  const evidenceCount = evidence?.length ?? 0;
  const obligationsWithEvidence = new Set((evidence ?? []).map((e) => e.obligation_id)).size;
  const gapsCount = Math.max(0, (obligations?.length ?? 0) - obligationsWithEvidence);
  const driveConnected = (integrations ?? []).find((i) => i.type === "drive")?.status === "connected";

  const uploadMut = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => api.uploadEvidence(id, file),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["evidence"] }),
  });

  const onUpload = (requirementId: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMut.mutate({ id: requirementId, file });
  };

  const byCollector = new Map<string, EvidenceRequirement[]>();
  for (const e of evidence ?? []) {
    const k = e.collector || "unassigned";
    if (!byCollector.has(k)) byCollector.set(k, []);
    byCollector.get(k)!.push(e);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2"><FileCheck className="h-5 w-5" /> Evidence Center</h1>
        <p className="text-sm text-muted-foreground">Track evidence requirements, uploads, and compliance gaps.</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total Requirements</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold tabular">{evidenceCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Covered Obligations</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold tabular">{obligationsWithEvidence}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Gaps (No Evidence)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-semibold tabular">{gapsCount}</div>
              {gapsCount > 0 && <AlertTriangle className="h-4 w-4 text-destructive" />}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Evidence Storage</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {driveConnected ? <Cloud className="h-4 w-4 text-success" /> : <HardDrive className="h-4 w-4 text-muted-foreground" />}
              <span className="text-sm font-medium">{driveConnected ? "Google Drive" : "Local disk"}</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {driveConnected ? "New uploads go to the PRAXIS Evidence folder." : "Connect Drive (Settings) to store evidence off-disk."}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Requirements by Collector</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[...byCollector.entries()].map(([collector, items]) => (
            <div key={collector} className="rounded-lg border p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{collector}</span>
                <Badge variant="secondary">{items?.length ?? 0}</Badge>
              </div>
              <div className="divide-y divide-border">
                {items?.map((e) => (
                  <RequirementRow key={e.id} item={e} onUpload={onUpload(e.id)} />
                ))}
              </div>
            </div>
          ))}
          {byCollector.size === 0 && (
            <div className="text-sm text-muted-foreground text-center py-4">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              No evidence requirements yet. Generate rules from approved obligations.
            </div>
          )}
          {uploadMut.isPending && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading… {driveConnected ? "stored to Google Drive" : "stored locally"}
            </div>
          )}
          {uploadMut.isError && (
            <div className="text-xs text-destructive">Upload failed: {uploadMut.error.message.replace(/^.*?: /, "")}</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Obligations Missing Evidence</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(obligations ?? [])
              .filter((o) => !(evidence ?? []).some((e) => e.obligation_id === o.id))
              .slice(0, 20)
              .map((o) => (
                <div key={o.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <div>
                    <span className="font-medium">{o.identifier || o.id.slice(0, 8)}</span>
                    <span className="text-muted-foreground ml-2 truncate">{o.description.slice(0, 80)}</span>
                  </div>
                  <Badge variant="destructive">No evidence</Badge>
                </div>
              ))}
            {obligations && evidence && (obligations ?? []).filter((o) => !(evidence ?? []).some((e) => e.obligation_id === o.id)).length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">All obligations have evidence requirements covered.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
