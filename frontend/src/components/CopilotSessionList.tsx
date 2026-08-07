import { useState } from "react";
import { MessageSquare, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CopilotSession } from "@/lib/copilot";
import { cn } from "@/lib/utils";

interface CopilotSessionListProps {
  sessions: CopilotSession[];
  activeSessionId: string;
  disabled?: boolean;
  onNew: () => void;
  onSelect: (sessionId: string) => void;
  onRename: (sessionId: string, title: string) => void;
  onDelete: (sessionId: string) => void;
  className?: string;
}

function sessionDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(timestamp);
}

export function CopilotSessionList({
  sessions,
  activeSessionId,
  disabled,
  onNew,
  onSelect,
  onRename,
  onDelete,
  className,
}: CopilotSessionListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const deleteSession = sessions.find((session) => session.id === deleteId);

  const startRename = (session: CopilotSession) => {
    setEditingId(session.id);
    setDraftTitle(session.title);
  };

  const finishRename = () => {
    if (editingId && draftTitle.trim()) onRename(editingId, draftTitle);
    setEditingId(null);
  };

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="shrink-0 p-3">
        <Button variant="outline" className="w-full justify-start" disabled={disabled} onClick={onNew}>
          <Plus className="h-4 w-4" /> New chat
        </Button>
        <div className="mt-4 px-1">
          <p className="text-xs font-medium">Local chats</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Saved only in this browser</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-3">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={cn(
              "group rounded-lg border border-transparent p-1 transition-colors",
              session.id === activeSessionId
                ? "border-border bg-background shadow-sm"
                : "hover:bg-muted/70",
            )}
          >
            {editingId === session.id ? (
              <input
                autoFocus
                aria-label="Chat title"
                value={draftTitle}
                maxLength={60}
                onChange={(event) => setDraftTitle(event.target.value)}
                onBlur={finishRename}
                onKeyDown={(event) => {
                  if (event.key === "Enter") finishRename();
                  if (event.key === "Escape") setEditingId(null);
                }}
                className="h-9 w-full rounded-md border bg-card px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            ) : (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(session.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium">{session.title}</span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      {session.messages.length} messages - {sessionDate(session.updatedAt)}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Rename ${session.title}`}
                  disabled={disabled}
                  onClick={() => startRename(session)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 disabled:pointer-events-none"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${session.title}`}
                  disabled={disabled}
                  onClick={() => setDeleteId(session.id)}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive focus:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100 disabled:pointer-events-none"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={Boolean(deleteSession)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete local chat</DialogTitle>
            <p className="text-sm text-muted-foreground">
              This removes "{deleteSession?.title}" from this browser. It cannot be restored.
            </p>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteId) onDelete(deleteId);
                setDeleteId(null);
              }}
            >
              Delete chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
