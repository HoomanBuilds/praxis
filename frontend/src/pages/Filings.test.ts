import { describe, it, expect } from "vitest";
import { FILING_BADGE, effectiveStatus } from "./Filings";

// Locks in the H2 fix: the backend used to write status="filed", which matched no key in
// FILING_STATUSES/FILING_BADGE and fell through to a default grey badge, and which
// effectiveStatus() never recognized either — so "Delayed" detection silently never fired
// for a real filing. The backend now writes "submitted" for exactly this state.
describe("H2 — filing status vocabulary", () => {
  it("has a real badge variant for every backend-writable filing status", () => {
    for (const status of ["not_filed", "submitted", "acknowledged", "rejected"]) {
      expect(FILING_BADGE[status]).toBeDefined();
    }
  });

  it("does not have a stale 'filed' entry the backend no longer writes", () => {
    expect(FILING_BADGE.filed).toBeUndefined();
  });

  it("flags a submitted-late filing as delayed", () => {
    const filing = { status: "submitted", deadline: "2026-01-01", submitted_at: "2026-01-05T00:00:00Z" };
    expect(effectiveStatus(filing)).toBe("delayed");
  });

  it("does not flag a submitted-on-time filing as delayed", () => {
    const filing = { status: "submitted", deadline: "2026-01-10", submitted_at: "2026-01-05T00:00:00Z" };
    expect(effectiveStatus(filing)).toBe("submitted");
  });

  it("passes through non-submitted statuses unchanged", () => {
    expect(effectiveStatus({ status: "not_filed", deadline: null, submitted_at: null })).toBe("not_filed");
  });
});
