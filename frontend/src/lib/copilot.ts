import type { CopilotCitation, CopilotResponseType } from "@/lib/types";

export const COPILOT_HISTORY_KEY = "praxis-copilot-history";
export const COPILOT_SESSIONS_KEY = "praxis-copilot-sessions";
export const NEW_COPILOT_CHAT_TITLE = "New chat";

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

export interface CopilotSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: CopilotMessage[];
}

export interface CopilotSessionStore {
  activeSessionId: string;
  sessions: CopilotSession[];
}

function sessionId(): string {
  return globalThis.crypto?.randomUUID?.() || `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createCopilotSession(now = Date.now()): CopilotSession {
  return {
    id: sessionId(),
    title: NEW_COPILOT_CHAT_TITLE,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

function isMessage(value: unknown): value is CopilotMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<CopilotMessage>;
  return (message.role === "user" || message.role === "assistant") && typeof message.text === "string";
}

function normalizeSession(value: unknown): CopilotSession | null {
  if (!value || typeof value !== "object") return null;
  const session = value as Partial<CopilotSession>;
  if (typeof session.id !== "string" || !Array.isArray(session.messages)) return null;
  const now = Date.now();
  return {
    id: session.id,
    title: typeof session.title === "string" && session.title.trim()
      ? session.title.trim().slice(0, 60)
      : NEW_COPILOT_CHAT_TITLE,
    createdAt: typeof session.createdAt === "number" ? session.createdAt : now,
    updatedAt: typeof session.updatedAt === "number" ? session.updatedAt : now,
    messages: session.messages.filter(isMessage).slice(-40),
  };
}

export function copilotSessionTitle(messages: CopilotMessage[]): string {
  const firstQuestion = messages.find((message) => message.role === "user")?.text
    .replace(/\s+/g, " ")
    .trim();
  if (!firstQuestion) return NEW_COPILOT_CHAT_TITLE;
  return firstQuestion.length > 48 ? `${firstQuestion.slice(0, 45)}...` : firstQuestion;
}

export function loadCopilotSessionStore(): CopilotSessionStore {
  try {
    const parsed = JSON.parse(localStorage.getItem(COPILOT_SESSIONS_KEY) || "null");
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.sessions)) {
      const sessions = parsed.sessions.map(normalizeSession).filter(Boolean) as CopilotSession[];
      if (sessions.length) {
        const activeSessionId = sessions.some((session) => session.id === parsed.activeSessionId)
          ? parsed.activeSessionId
          : sessions[0].id;
        return { activeSessionId, sessions };
      }
    }

    const legacy = JSON.parse(localStorage.getItem(COPILOT_HISTORY_KEY) || "[]");
    if (Array.isArray(legacy)) {
      const messages = legacy.filter(isMessage).slice(-40);
      if (messages.length) {
        const session = createCopilotSession();
        session.messages = messages;
        session.title = copilotSessionTitle(messages);
        return { activeSessionId: session.id, sessions: [session] };
      }
    }
  } catch {
    // Invalid browser data starts a clean local chat store.
  }

  const session = createCopilotSession();
  return { activeSessionId: session.id, sessions: [session] };
}

export function saveCopilotSessionStore(store: CopilotSessionStore): void {
  try {
    const sessions = [...store.sessions]
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, 20)
      .map((session) => ({ ...session, messages: session.messages.slice(-40) }));
    const activeSessionId = sessions.some((session) => session.id === store.activeSessionId)
      ? store.activeSessionId
      : sessions[0]?.id;
    localStorage.setItem(COPILOT_SESSIONS_KEY, JSON.stringify({ activeSessionId, sessions }));
  } catch {
    // Browser storage may be unavailable or full.
  }
}

export function canSendCopilotQuestion(question: string, sending: boolean): boolean {
  return !sending && question.trim().length >= 2;
}
