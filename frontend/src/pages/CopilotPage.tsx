import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SendHorizonal, Loader2, User, Bot, Trash2 } from "lucide-react";

interface Msg { role: "user" | "assistant"; text: string; sources?: string[]; error?: boolean }

const QUICK = [
  "Summarize the overall compliance posture",
  "Show all technology obligations",
  "Find obligations that need review",
  "Which departments carry the most obligations?",
  "What has the pipeline done recently?",
  "Generate a board-level compliance summary",
];

const STORE = "praxis-copilot-history";

export default function CopilotPage() {
  const [messages, setMessages] = useState<Msg[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORE) || "[]"); } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { try { localStorage.setItem(STORE, JSON.stringify(messages.slice(-40))); } catch { /* ignore */ } }, [messages]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, sending]);

  const send = async (q: string) => {
    if (!q.trim() || sending) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setSending(true);
    try {
      const res = await api.copilot(q);
      setMessages((m) => [...m, res.answer ? { role: "assistant", text: res.answer, sources: res.sources } : { role: "assistant", text: res.error || "No answer.", error: true }]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: String(e), error: true }]);
    } finally { setSending(false); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-11rem)] min-h-[420px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><Bot className="h-5 w-5 text-primary" /> AI Copilot</h1>
          <p className="text-sm text-muted-foreground">Grounded in your real obligations, rules, tasks and regulatory data — runs on the local model.</p>
        </div>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setMessages([])}><Trash2 className="h-3.5 w-3.5" /> Clear</Button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-2xl border bg-card p-5 space-y-5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 border border-primary/30"><Bot className="h-6 w-6 text-primary" /></div>
            <div className="text-sm text-muted-foreground max-w-md">Ask about obligations, circulars, owners, deadlines or risk. Answers cite the obligations they draw from and never invent data.</div>
            <div className="grid sm:grid-cols-2 gap-2 w-full max-w-xl">
              {QUICK.map((q) => (
                <button key={q} onClick={() => send(q)} className="text-left text-sm rounded-lg border px-3 py-2.5 hover:border-primary/40 transition-colors">{q}</button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className={cn("flex gap-3", m.role === "user" ? "flex-row-reverse" : "")}>
              <div className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full border", m.role === "user" ? "bg-primary/15" : "bg-muted")}>
                {m.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5 text-primary" />}
              </div>
              <div className={cn("rounded-2xl px-4 py-2.5 text-sm max-w-[75%] whitespace-pre-wrap", m.role === "user" ? "bg-primary/10" : m.error ? "bg-destructive/10 text-destructive" : "bg-muted")}>
                {m.text}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.sources.map((s) => <span key={s} className="text-[10px] rounded border px-1.5 py-0.5 text-muted-foreground">{s}</span>)}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {sending && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> thinking over your data…</div>}
      </div>

      <div className="mt-3 flex items-end gap-2">
        <textarea value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
          rows={1} placeholder="Ask Praxis…"
          className="flex-1 resize-none rounded-xl border bg-card px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring max-h-32" />
        <button disabled={sending || !input.trim()} onClick={() => send(input)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
