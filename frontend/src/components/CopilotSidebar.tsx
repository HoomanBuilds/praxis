import { useEffect, useRef, useState } from "react";
import { Bot, History, Loader2, Plus, RotateCcw, SendHorizonal, Square, User, X } from "lucide-react";
import { CopilotCitationBlock } from "@/components/CopilotCitationBlock";
import { CopilotSessionList } from "@/components/CopilotSessionList";
import { Button } from "@/components/ui/button";
import { useCopilot } from "@/context/CopilotContext";
import { useCopilotChat } from "@/hooks/useCopilotChat";
import { canSendCopilotQuestion } from "@/lib/copilot";
import { cn } from "@/lib/utils";

function suggestions(scope: { obligationId?: string; documentId?: string }): string[] {
  if (scope.obligationId) {
    return ["Why was this identified?", "Explain this obligation in plain English", "What evidence is required and who owns it?"];
  }
  if (scope.documentId) {
    return ["Summarize this circular", "Which departments are affected?", "Show the cybersecurity obligations"];
  }
  return ["What should I review first?", "Show all technology obligations", "Find obligations that need review"];
}

export function CopilotSidebar() {
  const { open, setOpen, scope, pending, clearPending } = useCopilot();
  const {
    messages,
    input,
    setInput,
    sending,
    slow,
    lastQuestion,
    send,
    stop,
    retry,
    sessions,
    activeSessionId,
    newSession,
    selectSession,
    renameSession,
    deleteSession,
  } = useCopilotChat(scope);
  const scrollRef = useRef<HTMLDivElement>(null);
  const handledPendingRef = useRef<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const lastMessage = messages[messages.length - 1];

  useEffect(() => {
    if (!pending) {
      handledPendingRef.current = null;
    } else if (open && handledPendingRef.current !== pending) {
      handledPendingRef.current = pending;
      clearPending();
      void send(pending);
    }
  }, [pending, open, send, clearPending]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, slow]);

  if (!open) return null;

  return (
    <aside className="fixed inset-0 z-50 flex w-full flex-col overflow-hidden bg-card shadow-xl animate-in sm:inset-y-3 sm:left-auto sm:right-3 sm:w-96 sm:rounded-2xl sm:border">
      <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <div className="grid h-6 w-6 place-items-center rounded-md border border-primary/30 bg-primary/15">
          <Bot className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Praxis Copilot</div>
          <div className="text-[11px] text-muted-foreground">Grounded in your compliance records</div>
        </div>
        <button
          type="button"
          aria-label="New chat"
          disabled={sending}
          className="ml-auto grid h-11 w-11 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          onClick={newSession}
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Local chat history"
          className="grid h-11 w-11 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => setHistoryOpen((current) => !current)}
        >
          <History className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Close Copilot"
          className="grid h-11 w-11 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => setOpen(false)}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="shrink-0 border-b px-4 py-2">
        <span className="text-[11px] text-muted-foreground">Context: </span>
        <span className="text-[11px] font-medium">{scope.label || "Whole workspace"}</span>
      </div>

      {historyOpen && (
        <div className="max-h-72 shrink-0 overflow-hidden border-b bg-muted/20">
          <CopilotSessionList
            sessions={sessions}
            activeSessionId={activeSessionId}
            disabled={sending}
            onNew={newSession}
            onSelect={(sessionId) => {
              selectSession(sessionId);
              setHistoryOpen(false);
            }}
            onRename={renameSession}
            onDelete={deleteSession}
          />
        </div>
      )}

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Ask a direct question about obligations, owners, deadlines, evidence, or risk.
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className={cn("flex gap-2.5", message.role === "user" && "flex-row-reverse")}>
              <div className={cn(
                "grid h-6 w-6 shrink-0 place-items-center rounded-full border",
                message.role === "user" ? "bg-primary/15" : "bg-muted",
              )}>
                {message.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3 text-primary" />}
              </div>
              <div className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                message.role === "user"
                  ? "bg-primary/10"
                  : message.error
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted",
              )}>
                {message.text}
                {message.role === "assistant" && !message.error && (
                  <CopilotCitationBlock
                    citations={message.citations}
                    grounded={message.grounded}
                    confidence={message.confidence}
                    responseType={message.responseType}
                  />
                )}
              </div>
            </div>
          ))
        )}

        {sending && (
          <div className="space-y-2 text-sm text-muted-foreground" aria-live="polite">
            <div className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{slow ? "Still analyzing. Local inference stops at 30 seconds." : "Searching records..."}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={stop}>
              <Square className="h-3 w-3" /> Stop
            </Button>
          </div>
        )}

        {!sending && lastMessage?.error && lastQuestion && (
          <Button variant="outline" size="sm" onClick={retry}>
            <RotateCcw className="h-3.5 w-3.5" /> Retry
          </Button>
        )}
      </div>

      {messages.length === 0 && (
        <div className="shrink-0 space-y-1.5 px-4 pb-2">
          {suggestions(scope).map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => void send(suggestion)}
              className="min-h-11 w-full rounded-md border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <div className="shrink-0 border-t p-3">
        <div className="flex items-end gap-2">
          <label htmlFor="copilot-sidebar-question" className="sr-only">Copilot question</label>
          <textarea
            id="copilot-sidebar-question"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(input);
              }
            }}
            rows={1}
            placeholder="Ask Praxis..."
            className="max-h-28 flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="button"
            aria-label="Send question"
            disabled={!canSendCopilotQuestion(input, sending)}
            onClick={() => void send(input)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
