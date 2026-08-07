import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import DataRetention from "./DataRetention";

vi.mock("@/lib/api", () => ({
  api: {
    retentionStatus: vi.fn(),
    auditReport: vi.fn(),
    downloadAuditFile: vi.fn(),
  },
}));

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <DataRetention />
    </QueryClientProvider>,
  );
}

describe("DataRetention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.retentionStatus).mockResolvedValue({
      retention_days: 2555,
      audit_log_entries: 42,
      oldest_entry: "2026-01-10T00:00:00Z",
    });
  });

  it("generates the advertised PDF and XLSX package", async () => {
    vi.mocked(api.auditReport).mockResolvedValue({
      files: { pdf: "audit.pdf", xlsx: "audit.xlsx" },
    });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Export audit package" }));

    await waitFor(() => expect(api.auditReport).toHaveBeenCalledWith("firm", {}));
    expect(await screen.findByRole("button", { name: "Download audit.pdf" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download audit.xlsx" })).toBeInTheDocument();
  });
});
