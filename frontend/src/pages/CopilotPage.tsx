import { useEffect, useRef, useState } from "react";
import { Bot, History, Loader2, Plus, RotateCcw, SendHorizonal, Square, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopilotCitationBlock } from "@/components/CopilotCitationBlock";
import { CopilotSessionList } from "@/components/CopilotSessionList";
import { useCopilotChat } from "@/hooks/useCopilotChat";
import { canSendCopilotQuestion } from "@/lib/copilot";
import { cn } from "@/lib/utils";

const QUICK = [
  "Summarize the overall compliance posture",
  "What are the most urgent compliance risks and what should I do first?",
  "Show all technology obligations",
  "Find obligations that need review",
  "Which departments carry the most obligations?",
  "What has the platform processed recently?",
];

export default function CopilotPage() {
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
  } = useCopilotChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const lastMessage = messages[messages.length - 1];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, slow]);

  return (
    <div className="flex h-[calc(100vh-11rem)] min-h-[420px] flex-col">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <Bot className="h-5 w-5 text-primary" /> Copilot
          </h1>
          <p className="text-sm text-muted-foreground">
            Ask about obligations, owners, deadlines, evidence, and regulatory sources.
          </p>
          {messages.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Conversation saved in this browser</p>}
        </div>
        <div className="flex items-center gap-2 lg:hidden">
          <Button variant="outline" size="sm" onClick={() => setHistoryOpen((open) => !open)}>
            <History className="h-3.5 w-3.5" /> Chats
          </Button>
          <Button size="sm" disabled={sending} onClick={newSession}>
            <Plus className="h-3.5 w-3.5" /> New
          </Button>
        </div>
      </div>

      {historyOpen && (
        <div className="mb-3 max-h-72 overflow-hidden rounded-xl border bg-card lg:hidden">
          <CopilotSessionList
            sessions={sessions}
            activeSessionId={activeSessionId}
            disabled={sending}
            onNew={() => {
              newSession();
              setHistoryOpen(false);
            }}
            onSelect={(sessionId) => {
              selectSession(sessionId);
              setHistoryOpen(false);
            }}
            onRename={renameSession}
            onDelete={deleteSession}
          />
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border bg-card">
        <aside className="hidden w-64 shrink-0 border-r lg:block">
          <CopilotSessionList
            sessions={sessions}
            activeSessionId={activeSessionId}
            disabled={sending}
            onNew={newSession}
            onSelect={selectSession}
            onRename={renameSession}
            onDelete={deleteSession}
          />
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-3 sm:p-5">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-2xl border border-primary/30 bg-primary/10">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <div className="max-w-md text-sm text-muted-foreground">
                  Ask a direct question about the current workspace. Praxis cites the obligation records used in each answer.
                </div>
                <div className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
                  {QUICK.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => void send(question)}
                      className="min-h-11 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={index} className={cn("flex gap-2 sm:gap-3", message.role === "user" && "flex-row-reverse")}>
                  <div className={cn(
                    "grid h-6 w-6 shrink-0 place-items-center rounded-full border sm:h-7 sm:w-7",
                    message.role === "user" ? "bg-primary/15" : "bg-muted",
                  )}>
                    {message.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  <div className={cn(
                    "max-w-[calc(100%-2rem)] whitespace-pre-wrap rounded-2xl px-3 py-2.5 text-sm sm:max-w-[80%] sm:px-4",
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
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{slow ? "Still analyzing the selected records. Local inference can take up to 30 seconds." : "Searching your compliance records..."}</span>
                <Button variant="ghost" size="sm" onClick={stop} className="ml-auto">
                  <Square className="h-3 w-3" /> Stop
                </Button>
              </div>
            )}

            {!sending && lastMessage?.error && lastQuestion && (
              <div className="flex justify-start pl-10">
                <Button variant="outline" size="sm" onClick={retry}>
                  <RotateCcw className="h-3.5 w-3.5" /> Retry
                </Button>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-end gap-2 border-t p-3">
            <label htmlFor="copilot-question" className="sr-only">Copilot question</label>
            <textarea
              id="copilot-question"
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
              className="max-h-32 flex-1 resize-none rounded-xl border bg-background px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="button"
              aria-label="Send question"
              disabled={!canSendCopilotQuestion(input, sending)}
              onClick={() => void send(input)}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
