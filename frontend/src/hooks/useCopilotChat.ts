import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import {
  canSendCopilotQuestion,
  copilotSessionTitle,
  createCopilotSession,
  NEW_COPILOT_CHAT_TITLE,
  type CopilotMessage,
} from "@/lib/copilot";
import { useCopilot } from "@/context/CopilotContext";

interface CopilotScope {
  documentId?: string;
  obligationId?: string;
}

export function useCopilotChat(scope: CopilotScope = {}) {
  const { chatStore, setChatStore } = useCopilot();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [slow, setSlow] = useState(false);
  const [lastQuestion, setLastQuestion] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const sendingRef = useRef(false);
  const activeSession = useMemo(
    () => chatStore.sessions.find((session) => session.id === chatStore.activeSessionId)
      || chatStore.sessions[0],
    [chatStore],
  );
  const messages = activeSession?.messages || [];

  const updateSession = useCallback((
    sessionId: string,
    update: (messages: CopilotMessage[]) => CopilotMessage[],
  ) => {
    setChatStore((current) => {
      const now = Date.now();
      return {
        ...current,
        sessions: current.sessions.map((session) => {
          if (session.id !== sessionId) return session;
          const nextMessages = update(session.messages).slice(-40);
          return {
            ...session,
            messages: nextMessages,
            title: session.title === NEW_COPILOT_CHAT_TITLE
              ? copilotSessionTitle(nextMessages)
              : session.title,
            updatedAt: now,
          };
        }),
      };
    });
  }, [setChatStore]);

  useEffect(() => () => requestRef.current?.abort(), []);

  const send = useCallback(async (question: string) => {
    const text = question.trim();
    if (!canSendCopilotQuestion(text, sendingRef.current)) return;
    if (!activeSession) return;

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
    const sessionId = activeSession.id;
    updateSession(sessionId, (current) => [...current, { role: "user", text }]);
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
      updateSession(sessionId, (current) => [
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
      updateSession(sessionId, (current) => [...current, { role: "assistant", text: message, error: true }]);
    } finally {
      window.clearTimeout(slowTimer);
      window.clearTimeout(timeoutTimer);
      if (requestRef.current === controller) requestRef.current = null;
      sendingRef.current = false;
      setSending(false);
      setSlow(false);
    }
  }, [activeSession, messages, scope.documentId, scope.obligationId, updateSession]);

  const stop = useCallback(() => requestRef.current?.abort(), []);
  const retry = useCallback(() => {
    if (lastQuestion) void send(lastQuestion);
  }, [lastQuestion, send]);
  const clear = useCallback(() => {
    if (activeSession) updateSession(activeSession.id, () => []);
    setLastQuestion("");
  }, [activeSession, updateSession]);

  const newSession = useCallback(() => {
    if (sendingRef.current) return;
    setChatStore((current) => {
      const active = current.sessions.find((session) => session.id === current.activeSessionId);
      if (active && active.messages.length === 0) return current;
      const session = createCopilotSession();
      return {
        activeSessionId: session.id,
        sessions: [session, ...current.sessions].slice(0, 20),
      };
    });
    setLastQuestion("");
    setInput("");
  }, [setChatStore]);

  const selectSession = useCallback((sessionId: string) => {
    if (sendingRef.current) return;
    setChatStore((current) => current.sessions.some((session) => session.id === sessionId)
      ? { ...current, activeSessionId: sessionId }
      : current);
    setLastQuestion("");
    setInput("");
  }, [setChatStore]);

  const renameSession = useCallback((sessionId: string, title: string) => {
    const cleanTitle = title.replace(/\s+/g, " ").trim().slice(0, 60);
    if (!cleanTitle) return;
    setChatStore((current) => ({
      ...current,
      sessions: current.sessions.map((session) => session.id === sessionId
        ? { ...session, title: cleanTitle, updatedAt: Date.now() }
        : session),
    }));
  }, [setChatStore]);

  const deleteSession = useCallback((sessionId: string) => {
    if (sendingRef.current) return;
    setChatStore((current) => {
      const remaining = current.sessions.filter((session) => session.id !== sessionId);
      if (!remaining.length) {
        const session = createCopilotSession();
        return { activeSessionId: session.id, sessions: [session] };
      }
      return {
        activeSessionId: current.activeSessionId === sessionId
          ? remaining[0].id
          : current.activeSessionId,
        sessions: remaining,
      };
    });
    setLastQuestion("");
  }, [setChatStore]);

  const sessions = useMemo(
    () => [...chatStore.sessions].sort((left, right) => right.updatedAt - left.updatedAt),
    [chatStore.sessions],
  );

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
    sessions,
    activeSessionId: activeSession?.id || "",
    newSession,
    selectSession,
    renameSession,
    deleteSession,
  };
}
