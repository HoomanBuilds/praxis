import { describe, expect, it } from "vitest";
import { canSendCopilotQuestion } from "./copilot";

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
