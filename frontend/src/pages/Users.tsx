import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageSkeleton, QueryError } from "@/components/ui/data-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users as UsersIcon, Plus, Shield } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { apiFetch } from "@/lib/api";

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
  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: async (): Promise<UserRow[]> => {
      const res = await apiFetch("/api/users");
      if (!res.ok) throw new Error("Users could not be loaded.");
      return res.json();
    },
  });
  const users = usersQuery.data;

  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState({ email: "", name: "", password: "", role: "viewer" });
  const [formError, setFormError] = useState("");

  const inviteMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiFetch("/api/users", {
        method: "POST",
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

  if (usersQuery.isLoading) {
    return <PageSkeleton label="Loading users" cards={0} />;
  }

  if (usersQuery.isError && users === undefined) {
    return <QueryError title="Users could not be loaded" onRetry={() => void usersQuery.refetch()} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><UsersIcon className="h-5 w-5" /> Users & Roles</h1>
          <p className="text-sm text-muted-foreground">Manage team access and role assignments.</p>
        </div>
        <Button size="sm" onClick={() => setInviteOpen(true)}><Plus className="h-3.5 w-3.5" /> Invite User</Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-[620px] w-full text-sm">
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
            {formError && <div role="alert" className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{formError}</div>}
            <div className="space-y-1.5"><label htmlFor="invite-name" className="text-sm font-medium">Full name</label><Input id="invite-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="space-y-1.5"><label htmlFor="invite-email" className="text-sm font-medium">Email</label><Input id="invite-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
            <div className="space-y-1.5"><label htmlFor="invite-password" className="text-sm font-medium">Password</label><Input id="invite-password" type="password" placeholder="Minimum 6 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} /></div>
            <div className="space-y-1.5"><label htmlFor="invite-role" className="text-sm font-medium">Role</label><Select id="invite-role" options={ROLE_OPTIONS} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></div>
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
