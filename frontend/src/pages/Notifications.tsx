import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, PageSkeleton, QueryError } from "@/components/ui/data-state";
import { Bell, CheckCheck, Circle } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { apiFetch } from "@/lib/api";

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  category: string;
  resource_type: string;
  resource_id: string;
  is_read: boolean;
  created_at: string | null;
}

export default function Notifications() {
  const qc = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: async (): Promise<{ items: NotificationRow[]; total: number }> => {
      const res = await apiFetch("/api/notifications");
      if (!res.ok) throw new Error("Notifications could not be loaded.");
      return res.json();
    },
  });
  const data = notificationsQuery.data;

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/notifications/${id}/read`, { method: "POST" });
      if (!res.ok) throw new Error("The notification could not be updated.");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/notifications/read-all", { method: "POST" });
      if (!res.ok) throw new Error("Notifications could not be updated.");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const items = data?.items ?? [];
  const unread = items.filter((n) => !n.is_read).length;

  if (notificationsQuery.isLoading) {
    return <PageSkeleton label="Loading notifications" cards={0} />;
  }

  if (notificationsQuery.isError && data === undefined) {
    return <QueryError title="Notifications could not be loaded" onRetry={() => void notificationsQuery.refetch()} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><Bell className="h-5 w-5" /> Notifications</h1>
          <p className="text-sm text-muted-foreground">System alerts, task updates, and deadline reminders.</p>
        </div>
        {unread > 0 && (
          <Button size="sm" variant="outline" onClick={() => markAllMutation.mutate()}><CheckCheck className="h-3.5 w-3.5" /> Mark all read</Button>
        )}
      </div>

      {(markReadMutation.isError || markAllMutation.isError) && (
        <div role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {markReadMutation.error?.message || markAllMutation.error?.message}
        </div>
      )}

      <div className="flex gap-2 mb-2">
        <Badge variant="muted">{items.length} total</Badge>
        {unread > 0 && <Badge variant="warning">{unread} unread</Badge>}
      </div>

      <Card>
        <CardContent className="p-0 divide-y">
          {items.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 px-4 py-3 ${!n.is_read ? "bg-secondary/50" : ""}`}
            >
              {!n.is_read && <Circle className="h-2 w-2 mt-1.5 fill-foreground shrink-0" />}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground mt-0.5">{n.body}</div>}
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="muted" className="text-[10px]">{n.category}</Badge>
                  <span className="text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                </div>
              </div>
              {!n.is_read && (
                <Button variant="ghost" size="sm" className="shrink-0" onClick={() => markReadMutation.mutate(n.id)}>
                  Mark read
                </Button>
              )}
            </div>
          ))}
          {items.length === 0 && (
            <div className="p-5"><EmptyState icon={Bell} title="No notifications" description="System alerts, task updates, and deadline reminders will appear here." /></div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
