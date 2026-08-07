import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { UIModeProvider } from "@/context/UIModeContext";
import Tasks from "./Tasks";

vi.mock("@/lib/api", () => ({
  api: {
    listTasks: vi.fn(),
    listEvidence: vi.fn(),
  },
}));

function renderTasks() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <UIModeProvider>
        <MemoryRouter>
          <Tasks />
        </MemoryRouter>
      </UIModeProvider>
    </QueryClientProvider>,
  );
}

describe("Tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.listTasks).mockResolvedValue([]);
    vi.mocked(api.listEvidence).mockResolvedValue([]);
  });

  it("shows a stable skeleton while task data loads", () => {
    vi.mocked(api.listTasks).mockReturnValue(new Promise(() => {}));
    vi.mocked(api.listEvidence).mockReturnValue(new Promise(() => {}));

    renderTasks();

    expect(screen.getByRole("status", { name: "Loading tasks" })).toBeInTheDocument();
  });

  it("renders a useful empty state after loading", async () => {
    renderTasks();

    expect(await screen.findByRole("heading", { name: "No tasks yet" })).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading tasks" })).not.toBeInTheDocument();
  });

  it("recovers after a failed task request", async () => {
    vi.mocked(api.listTasks).mockRejectedValueOnce(new Error("offline")).mockResolvedValue([]);

    renderTasks();

    expect(await screen.findByRole("alert")).toHaveTextContent("Tasks could not be loaded");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: "No tasks yet" })).toBeInTheDocument();
  });
});
