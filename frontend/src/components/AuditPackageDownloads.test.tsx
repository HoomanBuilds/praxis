import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { AuditPackageDownloads } from "./AuditPackageDownloads";

vi.mock("@/lib/api", () => ({
  api: { downloadAuditFile: vi.fn() },
}));

describe("AuditPackageDownloads", () => {
  beforeEach(() => vi.clearAllMocks());

  it("downloads each file through the authenticated client", async () => {
    vi.mocked(api.downloadAuditFile).mockResolvedValue();
    render(<AuditPackageDownloads files={["audit.pdf", "audit.xlsx"]} />);

    fireEvent.click(screen.getByRole("button", { name: "Download audit.pdf" }));

    expect(await screen.findByText("PDF downloaded")).toBeInTheDocument();
    expect(api.downloadAuditFile).toHaveBeenCalledWith("audit.pdf");
    expect(screen.getByRole("button", { name: "Download audit.xlsx" })).toHaveClass("min-h-11");
  });

  it("shows an actionable error when a download fails", async () => {
    vi.mocked(api.downloadAuditFile).mockRejectedValue(new Error("Report not found"));
    render(<AuditPackageDownloads files={["missing.pdf"]} />);

    fireEvent.click(screen.getByRole("button", { name: "Download missing.pdf" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Report not found");
  });
});
