import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, type ReactNode } from "react";
import { api } from "@/lib/api";
import { CopilotProvider } from "@/context/CopilotContext";
import { useCopilotChat } from "./useCopilotChat";

vi.mock("@/lib/api", () => ({
  api: { copilot: vi.fn() },
}));

const response = {
  answer: "Grounded answer",
  citations: [],
  grounded: true,
  confidence: 1,
  response_type: "workspace_summary" as const,
};

function wrapper({ children }: { children: ReactNode }) {
  return createElement(CopilotProvider, null, children);
}

describe("useCopilotChat", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(api.copilot).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("sends recent conversation with a follow-up question", async () => {
    vi.mocked(api.copilot).mockResolvedValue(response);
    const { result } = renderHook(() => useCopilotChat(), { wrapper });

    await act(async () => {
      await result.current.send("Summarize the workspace");
    });
    await act(async () => {
      await result.current.send("What should I review first?");
    });

    expect(vi.mocked(api.copilot).mock.calls[1][1]?.history).toEqual([
      { role: "user", content: "Summarize the workspace" },
      { role: "assistant", content: "Grounded answer" },
    ]);
  });

  it("stops a request after 30 seconds and offers a recoverable error", async () => {
    vi.useFakeTimers();
    vi.mocked(api.copilot).mockImplementation((_question, _context, signal) => new Promise((_resolve, reject) => {
      signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
    const { result } = renderHook(() => useCopilotChat(), { wrapper });

    let request: Promise<void> = Promise.resolve();
    act(() => {
      request = result.current.send("Analyze this obligation");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000);
      await request;
    });

    expect(result.current.sending).toBe(false);
    expect(result.current.messages.at(-1)).toMatchObject({
      error: true,
      text: expect.stringContaining("stopped after 30 seconds"),
    });
  });

  it("keeps previous conversations as local chat sessions", async () => {
    vi.mocked(api.copilot).mockResolvedValue(response);
    const { result } = renderHook(() => useCopilotChat(), { wrapper });

    await act(async () => {
      await result.current.send("Summarize the compliance workspace");
    });
    const firstSessionId = result.current.activeSessionId;

    act(() => result.current.newSession());

    expect(result.current.sessions).toHaveLength(2);
    expect(result.current.messages).toEqual([]);
    expect(result.current.sessions.find((session) => session.id === firstSessionId)?.title)
      .toBe("Summarize the compliance workspace");

    act(() => result.current.selectSession(firstSessionId));

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.messages[0].text).toBe("Summarize the compliance workspace");
  });
});
