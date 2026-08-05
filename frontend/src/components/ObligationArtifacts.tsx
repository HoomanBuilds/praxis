import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { titleCase } from "@/lib/utils";
import type { Task } from "@/lib/types";
import { FileCheck2, ClipboardList, FolderArchive, PenLine, Loader2 } from "lucide-react";

// Only board resolutions and policy updates are signable — mirrors SIGNABLE_TEMPLATES
// in the backend, which rejects anything else outright.
const SIGNABLE_TEMPLATES = new Set(["board_resolution_filing", "compliance_policy_update"]);

// Lazily fetch the rules / tasks / evidence generated for one obligation (Phase B output).
export function ObligationArtifacts({ obligationId, enabled }: { obligationId: string; enabled: boolean }) {
  const rules = useQuery({ queryKey: ["rules", obligationId], queryFn: () => api.listRules(obligationId), enabled });
  const tasks = useQuery({ queryKey: ["tasks", obligationId], queryFn: () => api.listTasks(obligationId), enabled });
  const evidence = useQuery({ queryKey: ["evidence", obligationId], queryFn: () => api.listEvidence(obligationId), enabled });
  const integrations = useQuery({ queryKey: ["integrations"], queryFn: api.listIntegrations, enabled });
  const docusignConnected = (integrations.data ?? []).some((i) => i.type === "docusign" && i.status === "connected");
  const [signing, setSigning] = useState<Task | null>(null);

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
            <div className="font-medium line-clamp-2" title={t.title}>{t.title}</div>
            <div className="text-muted-foreground">{t.primary_owner}{t.deadline ? ` · due ${t.deadline}` : ""}</div>
            {t.jira_issue_key && <div className="text-muted-foreground">Jira: {t.jira_issue_key}</div>}
            {t.docusign_envelope_id ? (
              <Badge variant="success" className="mt-1"><PenLine className="h-3 w-3" /> Sent for signature</Badge>
            ) : SIGNABLE_TEMPLATES.has(t.workflow_template) && docusignConnected ? (
              <Button size="sm" variant="outline" className="mt-1 h-6 px-2 text-[11px]" onClick={() => setSigning(t)}>
                <PenLine className="h-3 w-3" /> Send for signature
              </Button>
            ) : null}
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

      {signing && (
        <SignatureDialog
          task={signing}
          obligationId={obligationId}
          onClose={() => setSigning(null)}
        />
      )}
    </div>
  );
}

function SignatureDialog({ task, obligationId, onClose }: { task: Task; obligationId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState(task.owner_email ?? "");
  const [name, setName] = useState(task.primary_owner ?? "");
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const send = useMutation({
    mutationFn: () => api.sendForSignature(task.id, { signer_email: email.trim(), signer_name: name.trim() }),
    onSuccess: (data) => {
      setResult({ ok: data.ok, message: data.message });
      qc.invalidateQueries({ queryKey: ["tasks", obligationId] });
      qc.invalidateQueries({ queryKey: ["integrations"] });
    },
    onError: (err: Error) => setResult({ ok: false, message: err.message }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send for signature</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Creates a real envelope in your connected DocuSign developer sandbox, containing a PDF
            built from this task and its source obligation. The signer receives it by email.
          </p>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border p-3 text-sm">
            <div className="font-medium line-clamp-2" title={task.title}>{task.title}</div>
            <div className="text-xs text-muted-foreground">{titleCase(task.workflow_template.replace(/_/g, " "))}</div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Signer email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="director@example.com" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Signer name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
          </div>
        </div>

        {result && (
          <div className={`text-sm rounded-lg px-3 py-2 ${result.ok ? "text-success bg-success/10" : "text-destructive bg-destructive/10"}`}>
            {result.message}
          </div>
        )}

        <DialogFooter>
          {result?.ok ? (
            <Button onClick={onClose}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button onClick={() => send.mutate()} disabled={send.isPending || email.trim().length === 0}>
                {send.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {send.isPending ? "Sending…" : "Send envelope"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
