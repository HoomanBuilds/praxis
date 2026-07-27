import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users as UsersIcon, Plus, Shield } from "lucide-react";
import { timeAgo } from "@/lib/format";

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string | null;
}

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "compliance_officer", label: "Compliance Officer" },
  { value: "viewer", label: "Viewer" },
];

export default function Users() {
  const qc = useQueryClient();
  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<UserRow[]> => {
      const res = await fetch("/api/users", { headers: { "Content-Type": "application/json" } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "viewer" });
  const [formError, setFormError] = useState("");

  const inviteMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch("/api/users", {
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
      qc.invalidateQueries({ queryKey: ["users"] });
      setInviteOpen(false);
      setForm({ email: "", name: "", password: "", role: "viewer" });
      setFormError("");
    },
    onError: (err: unknown) => setFormError(err instanceof Error ? err.message : "Failed"),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><UsersIcon className="h-5 w-5" /> Users & Roles</h1>
          <p className="text-sm text-muted-foreground">Manage team access and role assignments.</p>
        </div>
        <Button size="sm" onClick={() => setInviteOpen(true)}><Plus className="h-3.5 w-3.5" /> Invite User</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.role === "admin" ? "default" : u.role === "compliance_officer" ? "secondary" : "muted"}>
                      <Shield className="h-3 w-3 mr-1" />
                      {u.role.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={u.is_active ? "success" : "destructive"}>{u.is_active ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{timeAgo(u.created_at)}</td>
                </tr>
              ))}
              {(!users || users.length === 0) && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No users found</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); inviteMutation.mutate(form); }} className="space-y-3">
            {formError && <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{formError}</div>}
            <Input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <Input type="password" placeholder="Password (min 6 chars)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
            <Select options={ROLE_OPTIONS} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={inviteMutation.isPending}>{inviteMutation.isPending ? "Inviting…" : "Invite"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
