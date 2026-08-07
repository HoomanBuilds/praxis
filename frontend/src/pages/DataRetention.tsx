import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageSkeleton, QueryError } from "@/components/ui/data-state";
import { AuditPackageDownloads } from "@/components/AuditPackageDownloads";
import { Database, Download } from "lucide-react";

export default function DataRetention() {
  const statusQuery = useQuery({ queryKey: ["retention-status"], queryFn: api.retentionStatus });
  const status = statusQuery.data;
  const exportMut = useMutation({ mutationFn: () => api.auditReport("firm", {}) });

  if (statusQuery.isLoading) {
    return <PageSkeleton label="Loading data retention settings" cards={3} />;
  }

  if (statusQuery.isError && status === undefined) {
    return <QueryError title="Data retention settings could not be loaded" onRetry={() => void statusQuery.refetch()} />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2"><Database className="h-5 w-5" /> Data Retention & Export</h1>
        <p className="text-sm text-muted-foreground">Audit trail retention policy and compliance export.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Retention Period</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{status?.retention_days ?? "-"}</div><div className="text-xs text-muted-foreground">days (~{Math.round((status?.retention_days ?? 0) / 365)} years)</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Audit Log Entries</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{status?.audit_log_entries ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">Oldest Entry</CardTitle></CardHeader>
          <CardContent><div className="text-lg font-semibold">{status?.oldest_entry ? new Date(status.oldest_entry).toLocaleDateString() : "No entries"}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Download className="h-4 w-4" /> Export Audit Package</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Generate a dated PDF + XLSX audit package for SEBI inspection readiness. This exports the full firm scope.</p>
          <Button disabled={exportMut.isPending} onClick={() => exportMut.mutate()}>
            {exportMut.isPending ? "Generating…" : "Export audit package"}
          </Button>
          {exportMut.isError && <div role="alert" className="text-sm text-destructive">{exportMut.error.message}</div>}
          <AuditPackageDownloads files={Object.values(exportMut.data?.files ?? {})} label="Export ready" />
        </CardContent>
      </Card>
    </div>
  );
}
