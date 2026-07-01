import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { titleCase } from "@/lib/utils";
import { FileCheck2, ClipboardList, FolderArchive } from "lucide-react";

// Lazily fetch the rules / tasks / evidence generated for one obligation (Phase B output).
export function ObligationArtifacts({ obligationId, enabled }: { obligationId: string; enabled: boolean }) {
  const rules = useQuery({ queryKey: ["rules", obligationId], queryFn: () => api.listRules(obligationId), enabled });
  const tasks = useQuery({ queryKey: ["tasks", obligationId], queryFn: () => api.listTasks(obligationId), enabled });
  const evidence = useQuery({ queryKey: ["evidence", obligationId], queryFn: () => api.listEvidence(obligationId), enabled });

  const hasAny = (rules.data?.length || tasks.data?.length || evidence.data?.length);
  if (!enabled) return null;
  if (!hasAny) return <div className="text-xs text-muted-foreground mt-3">No rules/tasks yet — approve, then generate.</div>;

  return (
    <div className="mt-4 grid md:grid-cols-3 gap-3">
      <div className="rounded-md border p-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2"><FileCheck2 className="h-3.5 w-3.5" /> RULES</div>
        {rules.data?.map((r) => (
          <div key={r.id} className="text-xs mb-2">
            <Badge variant="secondary" className="mb-1">{titleCase(r.rule_type)}{r.is_qualitative ? " · qualitative" : ""}</Badge>
            <div className="text-muted-foreground">{r.evaluation_criterion}</div>
            {r.timeline && <div className="text-muted-foreground">⏱ {r.timeline}</div>}
          </div>
        )) ?? null}
      </div>
      <div className="rounded-md border p-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2"><ClipboardList className="h-3.5 w-3.5" /> TASKS</div>
        {tasks.data?.map((t) => (
          <div key={t.id} className="text-xs mb-2">
            <div className="font-medium">{t.title}</div>
            <div className="text-muted-foreground">{t.primary_owner}{t.deadline ? ` · due ${t.deadline}` : ""}</div>
          </div>
        )) ?? null}
      </div>
      <div className="rounded-md border p-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2"><FolderArchive className="h-3.5 w-3.5" /> EVIDENCE</div>
        {evidence.data?.map((e) => (
          <div key={e.id} className="text-xs mb-2">
            <div className="font-medium">{e.document_type}</div>
            <div className="text-muted-foreground">{e.required_content}</div>
          </div>
        )) ?? null}
      </div>
    </div>
  );
}
