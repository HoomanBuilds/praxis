import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useCopilot } from "@/context/CopilotContext";
import { cn } from "@/lib/utils";
import { X, SendHorizonal, Loader2, User, Bot } from "lucide-react";
import { canSendCopilotQuestion, COPILOT_HISTORY_KEY } from "@/lib/copilot";

interface Msg {
  role: "user" | "assistant";
  text: string;
  sources?: string[];
  error?: boolean;
}

function suggestions(scope: { obligationId?: string; documentId?: string }): string[] {
  if (scope.obligationId)
    return ["Why was this identified?", "Explain this obligation in plain English", "What evidence is required and who owns it?"];
  if (scope.documentId)
    return ["Summarize this circular", "Which departments are affected?", "Show the cybersecurity obligations"];
  return ["Show all technology obligations", "Find obligations that need review", "What has the platform processed recently?"];
}

export function CopilotSidebar() {
  const { open, setOpen, scope, pending, clearPending } = useCopilot();
  const [messages, setMessages] = useState<Msg[]>(() => {
    try { return JSON.parse(localStorage.getItem(COPILOT_HISTORY_KEY) || "[]"); } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = async (question: string) => {
    if (!canSendCopilotQuestion(question, sending)) return;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setSending(true);
    try {
      const res = await api.copilot(question, {
        document_id: scope.documentId,
        obligation_id: scope.obligationId,
      });
      setMessages((m) => [
        ...m,
        res.answer
          ? { role: "assistant", text: res.answer, sources: res.sources }
          : { role: "assistant", text: res.error || "No answer.", error: true },
      ]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: "Couldn't reach the analysis service — try again in a moment.", error: true }]);
    } finally {
      setSending(false);
    }
  };

  // Auto-run a prompt requested from elsewhere ("Ask Copilot" buttons).
  useEffect(() => {
    if (pending && open) {
      send(pending);
      clearPending();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    try { localStorage.setItem(COPILOT_HISTORY_KEY, JSON.stringify(messages.slice(-40))); } catch { /* ignore */ }
  }, [messages]);

  if (!open) return null;

  const contextLabel = scope.label || "Whole workspace";

  return (
    <aside className="fixed inset-0 z-50 flex w-full flex-col bg-card shadow-xl overflow-hidden animate-in sm:inset-y-3 sm:left-auto sm:right-3 sm:w-96 sm:rounded-2xl sm:border">
      <div className="flex items-center gap-2 border-b px-4 h-14 shrink-0">
        <div className="grid h-6 w-6 place-items-center rounded-md bg-primary/15 border border-primary/30">
          <Bot className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">Praxis Copilot</div>
          <div className="text-[10px] text-muted-foreground">answers from your compliance records</div>
        </div>
        <button aria-label="Close Copilot" className="ml-auto grid h-11 w-11 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4 py-2 border-b shrink-0">
        <span className="text-[11px] text-muted-foreground">Context: </span>
        <span className="text-[11px] font-medium">{contextLabel}</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Ask about obligations, circulars, owners, deadlines or risk. Answers are built from
            your real compliance records and never invent data.
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={cn("flex gap-2.5", m.role === "user" ? "flex-row-reverse" : "")}>
              <div className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full border",
                m.role === "user" ? "bg-primary/15" : "bg-muted")}>
                {m.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3 text-primary" />}
              </div>
              <div className={cn("rounded-lg px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap",
                m.role === "user" ? "bg-primary/10" : m.error ? "bg-destructive/10 text-destructive" : "bg-muted")}>
                {m.text}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.sources.map((s) => (
                      <span key={s} className="text-[10px] rounded border px-1.5 py-0.5 text-muted-foreground">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {sending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> thinking over your data…
          </div>
        )}
      </div>

      {messages.length === 0 && (
        <div className="px-4 pb-2 space-y-1.5 shrink-0">
          {suggestions(scope).map((s) => (
            <button key={s} onClick={() => send(s)}
              className="w-full text-left text-xs rounded-md border px-3 py-2 hover:border-primary/40 transition-colors text-muted-foreground hover:text-foreground">
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="border-t p-3 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            rows={1}
            placeholder="Ask Praxis…"
            aria-label="Copilot question"
            className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring max-h-28"
          />
          <button aria-label="Send question" disabled={!canSendCopilotQuestion(input, sending)} onClick={() => send(input)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground disabled:opacity-40">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
