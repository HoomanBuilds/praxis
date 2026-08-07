import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CopilotProvider } from "@/context/CopilotContext";
import { UIModeProvider } from "@/context/UIModeContext";
import { api } from "@/lib/api";
import type { DocumentT, Obligation } from "@/lib/types";
import Review from "./Review";

vi.mock("@/lib/api", () => ({
  api: {
    getDocument: vi.fn(),
    listObligations: vi.fn(),
    getFunctionalAreas: vi.fn(),
    approveObligation: vi.fn(),
    rejectObligation: vi.fn(),
    editObligation: vi.fn(),
    generate: vi.fn(),
    auditReport: vi.fn(),
  },
}));

const document: DocumentT = {
  id: "doc-1",
  reference: "SEBI/2026/1",
  title: "Cyber Resilience Circular",
  status: "awaiting_review",
  parse_quality: 0.98,
  used_ocr: false,
  page_count: 12,
  document_type: "circular",
  family_key: "cyber",
  funnel: null,
  regulatory_context: null,
  ingested_at: "2026-08-01T00:00:00Z",
  processed_at: "2026-08-01T00:01:00Z",
  error: null,
};

const obligation: Obligation = {
  id: "ob-1",
  document_id: "doc-1",
  identifier: "SEBI-OB-001",
  description: "Maintain a cyber incident response plan.",
  source_text: "The intermediary shall maintain a cyber incident response plan.",
  source_paragraph_ref: "4.1",
  functional_area: "technology",
  modification_type: "new",
  confidence: 0.96,
  deadline_hint: null,
  linked_prior_obligation_id: null,
  extraction_method: "deterministic",
  status: "pending_review",
  needs_review: false,
  reviewer: null,
  reviewed_at: null,
};

function renderReview() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/documents/doc-1/review"]}>
        <CopilotProvider>
          <UIModeProvider>
            <Routes>
              <Route path="/documents/:id/review" element={<Review />} />
            </Routes>
          </UIModeProvider>
        </CopilotProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Document review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getDocument).mockResolvedValue(document);
    vi.mocked(api.listObligations).mockResolvedValue({ items: [obligation], total: 1, offset: 0, limit: 200 });
    vi.mocked(api.getFunctionalAreas).mockResolvedValue({ technology: { label: "Technology", primary_owner: "", owner_email: "", workflow_template: "" } });
  });

  it("shows a stable review skeleton while data loads", () => {
    vi.mocked(api.getDocument).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.listObligations).mockReturnValue(new Promise(() => {}));

    renderReview();

    expect(screen.getByRole("status", { name: "Loading document review" })).toBeInTheDocument();
  });

  it("explains why generation is unavailable before approval", async () => {
    renderReview();

    expect(await screen.findByRole("heading", { name: document.title })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate rules/i })).toBeDisabled();
    expect(screen.getByText(/approve at least one obligation/i)).toBeInTheDocument();
    expect(screen.getByText(/does not assign work yet/i)).toBeInTheDocument();
  });

  it("offers recovery when the review cannot be loaded", async () => {
    vi.mocked(api.getDocument).mockRejectedValueOnce(new Error("offline"));
    vi.mocked(api.listObligations).mockRejectedValueOnce(new Error("offline"));

    renderReview();

    expect(await screen.findByRole("alert")).toHaveTextContent("Document review could not be loaded");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: document.title })).toBeInTheDocument();
  });

  it("shows generation failures next to the action", async () => {
    vi.mocked(api.listObligations).mockResolvedValue({ items: [{ ...obligation, status: "approved" }], total: 1, offset: 0, limit: 200 });
    vi.mocked(api.generate).mockRejectedValue(new Error("Generation service is unavailable."));

    renderReview();

    const generateButton = await screen.findByRole("button", { name: /generate rules/i });
    expect(generateButton).toBeEnabled();
    fireEvent.click(generateButton);
    expect(await screen.findByRole("alert")).toHaveTextContent("Generation service is unavailable.");
  });
});
