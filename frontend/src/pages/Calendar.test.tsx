import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import Calendar from "./Calendar";

vi.mock("@/hooks/useAreas", () => ({
  useAreas: () => ["compliance"],
}));

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
  api: { updateTask: vi.fn() },
}));

function renderCalendar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Calendar />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Calendar", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        events: [],
        unscheduled: [{
          id: "ob-1",
          timing_hint: "within 10 working days",
          type: "obligation",
          title: "Resolve investor grievances",
          status: "pending_review",
          resource_type: "obligation",
          resource_id: "ob-1",
          obligation_id: "ob-1",
          functional_area: "compliance",
        }],
      }),
    } as Response);
  });

  it("keeps relative timing rules out of the date grid", async () => {
    renderCalendar();

    expect(await screen.findByText("1 regulatory timing rules still need calendar dates.")).toBeInTheDocument();
    expect(screen.getByText(/no exact deadlines are scheduled/i)).toBeInTheDocument();
    expect(screen.getByText("within 10 working days")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Resolve investor grievances" })).toHaveAttribute("href", "/obligations/ob-1");
  });

  it("renders exact regulatory dates returned for the active month", async () => {
    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-03`;
    vi.mocked(apiFetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        events: [{
          id: "ob-dated",
          date,
          type: "obligation",
          title: "Complete the regulatory filing",
          status: "pending_review",
          owner: "",
          resource_type: "obligation",
          resource_id: "ob-dated",
          obligation_id: "ob-dated",
          functional_area: "compliance",
        }],
        unscheduled: [],
      }),
    } as Response);

    renderCalendar();

    expect(await screen.findByText("1 regulatory dates")).toBeInTheDocument();
    expect(screen.getByText("Complete the regulatory filing")).toBeInTheDocument();
    expect(screen.queryByText(/no exact deadlines are scheduled/i)).not.toBeInTheDocument();
  });
});
