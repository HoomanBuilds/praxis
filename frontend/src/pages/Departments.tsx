import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Building2, Plus, Pencil } from "lucide-react";
import { titleCase } from "@/lib/utils";

interface DeptEntry { label: string; primary_owner: string; owner_email: string; workflow_template: string; }

export default function Departments() {
  const qc = useQueryClient();
  const { data: areas } = useQuery({ queryKey: ["functional-areas"], queryFn: api.getFunctionalAreas });

  const [editKey, setEditKey] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ key: "", label: "", primary_owner: "", owner_email: "", workflow_template: "" });

  const save = useMutation({
    mutationFn: (data: Record<string, DeptEntry>) => api.updateFunctionalAreas(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["functional-areas"] }); setEditKey(null); setAddOpen(false); },
  });

  const handleSave = (key: string, entry: DeptEntry) => {
    const updated = { ...(areas || {}), [key]: entry };
    save.mutate(updated);
  };

  const handleAdd = () => {
    if (!form.key) return;
    handleSave(form.key, { label: form.label, primary_owner: form.primary_owner, owner_email: form.owner_email, workflow_template: form.workflow_template });
  };

  const handleRemove = (key: string) => {
    const updated = { ...(areas || {}) };
    delete updated[key];
    save.mutate(updated);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><Building2 className="h-5 w-5" /> Departments</h1>
          <p className="text-sm text-muted-foreground">Functional areas drive obligation routing and task ownership.</p>
        </div>
        <Button size="sm" onClick={() => { setForm({ key: "", label: "", primary_owner: "", owner_email: "", workflow_template: "" }); setAddOpen(true); }}>
          <Plus className="h-3.5 w-3.5" /> Add Department
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {Object.entries(areas ?? {}).map(([key, entry]) => (
          <Card key={key}>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm">{entry.label || titleCase(key)}</CardTitle>
              <div className="flex items-center gap-1">
                <Badge variant="muted">{key}</Badge>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setForm({ key, ...entry }); setEditKey(key); }}>
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div><span className="text-muted-foreground">Owner:</span> {entry.primary_owner}</div>
              <div><span className="text-muted-foreground">Email:</span> {entry.owner_email}</div>
              <div><span className="text-muted-foreground">Template:</span> {entry.workflow_template}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Department</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Key (e.g. risk_management)" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} />
            <Input placeholder="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            <Input placeholder="Primary owner" value={form.primary_owner} onChange={(e) => setForm({ ...form, primary_owner: e.target.value })} />
            <Input placeholder="Owner email" value={form.owner_email} onChange={(e) => setForm({ ...form, owner_email: e.target.value })} />
            <Input placeholder="Workflow template" value={form.workflow_template} onChange={(e) => setForm({ ...form, workflow_template: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={save.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editKey !== null} onOpenChange={() => setEditKey(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Department</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            <Input placeholder="Primary owner" value={form.primary_owner} onChange={(e) => setForm({ ...form, primary_owner: e.target.value })} />
            <Input placeholder="Owner email" value={form.owner_email} onChange={(e) => setForm({ ...form, owner_email: e.target.value })} />
            <Input placeholder="Workflow template" value={form.workflow_template} onChange={(e) => setForm({ ...form, workflow_template: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={() => editKey && handleRemove(editKey)} className="mr-auto">Remove</Button>
            <Button variant="outline" onClick={() => setEditKey(null)}>Cancel</Button>
            <Button onClick={() => editKey && handleSave(editKey, { label: form.label, primary_owner: form.primary_owner, owner_email: form.owner_email, workflow_template: form.workflow_template })} disabled={save.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
