import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useVocab } from "@/hooks/useVocab";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SendHorizonal, Loader2, User, Bot, Trash2, AlertTriangle } from "lucide-react";
import type { CopilotCitation } from "@/lib/types";

interface Msg {
  role: "user" | "assistant";
  text: string;
  sources?: string[];
  citations?: CopilotCitation[];
  grounded?: boolean;
  confidence?: number;
  error?: boolean;
}

const QUICK = [
  "Summarize the overall compliance posture",
  "Show all technology obligations",
  "Find obligations that need review",
  "Which departments carry the most obligations?",
  "What has the platform processed recently?",
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
    const text = q.trim();
    if (text.length < 3 || sending) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setSending(true);
    try {
      const res = await api.copilot(q);
      setMessages((m) => [
        ...m,
        res.answer
          ? {
              role: "assistant",
              text: res.answer,
              sources: res.sources,
              citations: res.citations,
              grounded: res.grounded,
              confidence: res.confidence,
            }
          : { role: "assistant", text: res.error || "No answer.", error: true },
      ]);
    } catch (e) {
      setMessages((m) => [...m, { role: "assistant", text: "Couldn't reach the analysis service — try again in a moment.", error: true }]);
    } finally { setSending(false); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-11rem)] min-h-[420px]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2"><Bot className="h-5 w-5 text-primary" /> Copilot</h1>
          <p className="text-sm text-muted-foreground">Ask questions about your compliance data — obligations, rules, tasks and regulations.</p>
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
                {m.role === "assistant" && !m.error && (
                  <CitationBlock citations={m.citations} grounded={m.grounded} confidence={m.confidence} />
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
        <button disabled={sending || input.trim().length < 3} onClick={() => send(input)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

/* Citations are verified server-side against the obligations that were actually in
   context, so an answer with none is genuinely unsourced — say so rather than
   presenting it as sourced. */
function CitationBlock({
  citations,
  grounded,
  confidence,
}: {
  citations?: CopilotCitation[];
  grounded?: boolean;
  confidence?: number;
}) {
  const { t, isBusiness } = useVocab();
  if (!citations?.length) {
    return (
      <div className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground border-t pt-2">
        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
        <span>Not tied to a specific obligation — treat as general guidance.</span>
      </div>
    );
  }
  const basis = isBusiness
    ? `Based on ${citations.length} source${citations.length > 1 ? "s" : ""}`
    : `${grounded ? "Grounded in" : "Partially grounded in"} ${citations.length} source${citations.length > 1 ? "s" : ""}`;
  return (
    <div className="mt-2 border-t pt-2 space-y-1.5">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground">
        <span>{basis}</span>
        {confidence !== undefined && <span className="tabular">· {isBusiness ? t("obligation.confidence").toLowerCase() : "confidence"} {(confidence * 100).toFixed(0)}%</span>}
      </div>
      {citations.map((c) => (
        <div key={c.obligation_identifier} className="text-[11px] rounded border px-2 py-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="font-medium">{c.obligation_identifier}</span>
            {c.circular_reference && <span className="text-muted-foreground">{c.circular_reference}</span>}
            {c.paragraph && <span className="text-muted-foreground">¶{c.paragraph}</span>}
          </div>
          {c.quote && <div className="text-muted-foreground italic mt-0.5">“{c.quote}”</div>}
        </div>
      ))}
    </div>
  );
}
