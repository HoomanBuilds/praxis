import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { canSendCopilotQuestion, COPILOT_HISTORY_KEY } from "@/lib/copilot";
import type { CopilotCitation, CopilotResponseType } from "@/lib/types";

export interface CopilotMessage {
  role: "user" | "assistant";
  text: string;
  sources?: string[];
  citations?: CopilotCitation[];
  grounded?: boolean;
  confidence?: number;
  error?: boolean;
  responseType?: CopilotResponseType;
}

interface CopilotScope {
  documentId?: string;
  obligationId?: string;
}

function loadHistory(): CopilotMessage[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(COPILOT_HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useCopilotChat(scope: CopilotScope = {}) {
  const [messages, setMessages] = useState<CopilotMessage[]>(loadHistory);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [slow, setSlow] = useState(false);
  const [lastQuestion, setLastQuestion] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(COPILOT_HISTORY_KEY, JSON.stringify(messages.slice(-40)));
    } catch {
      // Browser storage may be unavailable.
    }
  }, [messages]);

  useEffect(() => () => requestRef.current?.abort(), []);

  const send = useCallback(async (question: string) => {
    const text = question.trim();
    if (!canSendCopilotQuestion(text, sendingRef.current)) return;

    const history = messages
      .filter((message) => !message.error)
      .slice(-6)
      .map((message) => ({ role: message.role, content: message.text }));
    const controller = new AbortController();
    requestRef.current = controller;
    sendingRef.current = true;
    setSending(true);
    setSlow(false);
    setLastQuestion(text);
    setMessages((current) => [...current, { role: "user", text }]);
    setInput("");

    let timedOut = false;
    const slowTimer = window.setTimeout(() => setSlow(true), 6000);
    const timeoutTimer = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 30000);

    try {
      const response = await api.copilot(
        text,
        {
          document_id: scope.documentId,
          obligation_id: scope.obligationId,
          history,
        },
        controller.signal,
      );
      setMessages((current) => [
        ...current,
        response.answer
          ? {
              role: "assistant",
              text: response.answer,
              sources: response.sources,
              citations: response.citations,
              grounded: response.grounded,
              confidence: response.confidence,
              responseType: response.response_type,
            }
          : {
              role: "assistant",
              text: response.error || "Praxis could not produce an answer from the available records.",
              error: true,
            },
      ]);
    } catch (error) {
      const aborted = error instanceof DOMException && error.name === "AbortError";
      const message = timedOut
        ? "Analysis was stopped after 30 seconds. Try a more specific question or select an obligation first."
        : aborted
          ? "Analysis stopped. You can retry when ready."
          : "Praxis could not reach the analysis service. Check the model status and retry.";
      setMessages((current) => [...current, { role: "assistant", text: message, error: true }]);
    } finally {
      window.clearTimeout(slowTimer);
      window.clearTimeout(timeoutTimer);
      if (requestRef.current === controller) requestRef.current = null;
      sendingRef.current = false;
      setSending(false);
      setSlow(false);
    }
  }, [messages, scope.documentId, scope.obligationId]);

  const stop = useCallback(() => requestRef.current?.abort(), []);
  const retry = useCallback(() => {
    if (lastQuestion) void send(lastQuestion);
  }, [lastQuestion, send]);
  const clear = useCallback(() => {
    setMessages([]);
    setLastQuestion("");
  }, []);

  return {
    messages,
    input,
    setInput,
    sending,
    slow,
    lastQuestion,
    send,
    stop,
    retry,
    clear,
  };
}
