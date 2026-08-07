import { describe, expect, it } from "vitest";
import {
  canSendCopilotQuestion,
  COPILOT_HISTORY_KEY,
  COPILOT_SESSIONS_KEY,
  copilotSessionTitle,
  loadCopilotSessionStore,
  saveCopilotSessionStore,
} from "./copilot";

describe("canSendCopilotQuestion", () => {
  it("accepts a two-character greeting", () => {
    expect(canSendCopilotQuestion("hi", false)).toBe(true);
  });

  it("rejects blank, one-character, and pending requests", () => {
    expect(canSendCopilotQuestion(" ", false)).toBe(false);
    expect(canSendCopilotQuestion("h", false)).toBe(false);
    expect(canSendCopilotQuestion("hello", true)).toBe(false);
  });
});

describe("local Copilot sessions", () => {
  it("migrates the previous flat browser history", () => {
    localStorage.removeItem(COPILOT_SESSIONS_KEY);
    localStorage.setItem(COPILOT_HISTORY_KEY, JSON.stringify([
      { role: "user", text: "Review the pending KYC obligations" },
      { role: "assistant", text: "Review summary" },
    ]));

    const store = loadCopilotSessionStore();

    expect(store.sessions).toHaveLength(1);
    expect(store.sessions[0].title).toBe("Review the pending KYC obligations");
    expect(store.sessions[0].messages).toHaveLength(2);
  });

  it("persists active sessions in the browser", () => {
    localStorage.clear();
    const store = loadCopilotSessionStore();
    store.sessions[0].messages = [{ role: "user", text: "Hello Praxis" }];
    store.sessions[0].title = copilotSessionTitle(store.sessions[0].messages);

    saveCopilotSessionStore(store);

    expect(loadCopilotSessionStore().sessions[0].title).toBe("Hello Praxis");
  });
});
