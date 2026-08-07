import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/lib/api";
import { UIModeProvider } from "@/context/UIModeContext";
import Tasks from "./Tasks";

vi.mock("@/lib/api", () => ({
  api: {
    listTasks: vi.fn(),
    listEvidence: vi.fn(),
    updateTask: vi.fn(),
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

  it("lets an assigned member update owner and work status", async () => {
    vi.mocked(api.listTasks).mockResolvedValue([{
      id: "task-1",
      obligation_id: "ob-1",
      rule_id: "rule-1",
      title: "Update the investor disclosure",
      description: "Prepare and publish the revised disclosure.",
      functional_area: "compliance",
      primary_owner: "Compliance Officer",
      owner_email: "",
      reviewer: "",
      workflow_template: "standard",
      deadline: "2026-08-20",
      status: "not_started",
      depends_on_task_id: null,
    }]);
    vi.mocked(api.updateTask).mockResolvedValue({
      id: "task-1",
      obligation_id: "ob-1",
      rule_id: "rule-1",
      title: "Update the investor disclosure",
      description: "Prepare and publish the revised disclosure.",
      functional_area: "compliance",
      primary_owner: "Legal Team",
      owner_email: "",
      reviewer: "",
      workflow_template: "standard",
      deadline: "2026-08-20",
      status: "in_progress",
      depends_on_task_id: null,
    });

    renderTasks();

    const owner = await screen.findByLabelText("Owner");
    fireEvent.change(owner, { target: { value: "Legal Team" } });
    fireEvent.change(screen.getByLabelText("Work status"), { target: { value: "in_progress" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(api.updateTask).toHaveBeenCalledWith("task-1", {
      primary_owner: "Legal Team",
      status: "in_progress",
    }));
  });
});
