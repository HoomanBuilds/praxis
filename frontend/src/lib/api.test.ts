import { describe, it, expect, beforeEach, vi } from "vitest";
import { api, ApiError } from "./api";

// Locks in the C1 fix: every request must carry the stored JWT as a Bearer token.
// The original bug was that req() never read localStorage at all, so the API was
// unauthenticated in practice regardless of what the backend enforced.
describe("req() authentication", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("attaches the stored token as an Authorization header", async () => {
    localStorage.setItem("praxis_token", "test-token-123");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [], total: 0, offset: 0, limit: 50 }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await api.listObligations({});

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer test-token-123");
  });

  it("sends no Authorization header when there is no stored token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [], total: 0, offset: 0, limit: 50 }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    await api.listObligations({});

    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBeNull();
  });

  it("dispatches praxis:unauthorized on a 401 response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 401, statusText: "Unauthorized" }));
    vi.stubGlobal("fetch", fetchMock);
    const handler = vi.fn();
    window.addEventListener("praxis:unauthorized", handler);

    await expect(api.listObligations({})).rejects.toThrow();

    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener("praxis:unauthorized", handler);
  });
});

// Locks in the H8 fix: thrown errors must never carry a raw response body/traceback —
// only a sanitized, safe-to-render message.
describe("req() error sanitization", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("passes through a 4xx `detail` string as the error message", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "Unknown integration type: slack" }), { status: 404, statusText: "Not Found" })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(api.listObligations({})).rejects.toMatchObject({
      message: "Unknown integration type: slack",
    });
  });

  it("never surfaces a raw 5xx body (e.g. a traceback) as the error message", async () => {
    const rawTraceback = 'Traceback (most recent call last):\n  File "main.py", line 1\nValueError: secret_key=abc123';
    const fetchMock = vi.fn().mockResolvedValue(new Response(rawTraceback, { status: 500, statusText: "Internal Server Error" }));
    vi.stubGlobal("fetch", fetchMock);

    let caught: unknown;
    try {
      await api.listObligations({});
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ApiError);
    const err = caught as ApiError;
    expect(err.message).not.toContain("secret_key");
    expect(err.message).not.toContain("Traceback");
  });
});

describe("listAllObligations", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("loads remaining pages in parallel and preserves page order", async () => {
    const pending = new Map<number, (response: Response) => void>();
    const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = new URL(String(input), "http://localhost");
      const offset = Number(url.searchParams.get("offset"));
      if (offset === 0) {
        return Promise.resolve(new Response(JSON.stringify({
          items: [{ id: "first" }], total: 401, offset: 0, limit: 200,
        }), { status: 200 }));
      }
      return new Promise<Response>((resolve) => pending.set(offset, resolve));
    });
    vi.stubGlobal("fetch", fetchMock);

    const resultPromise = api.listAllObligations();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    pending.get(400)?.(new Response(JSON.stringify({
      items: [{ id: "third" }], total: 401, offset: 400, limit: 200,
    }), { status: 200 }));
    pending.get(200)?.(new Response(JSON.stringify({
      items: [{ id: "second" }], total: 401, offset: 200, limit: 200,
    }), { status: 200 }));

    const result = await resultPromise;

    expect(result.map((item) => item.id)).toEqual(["first", "second", "third"]);
  });
});
