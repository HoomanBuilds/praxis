import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmptyState, ListSkeleton, PageSkeleton, QueryError } from "./data-state";

describe("data states", () => {
  it("announces page and section loading states", () => {
    render(
      <>
        <PageSkeleton label="Loading dashboard" />
        <ListSkeleton label="Loading documents" />
      </>,
    );

    expect(screen.getByRole("status", { name: "Loading dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "Loading documents" })).toBeInTheDocument();
  });

  it("offers a retry action when data fails", () => {
    const retry = vi.fn();
    render(<QueryError title="Tasks could not be loaded" onRetry={retry} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Tasks could not be loaded");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("renders a descriptive empty state", () => {
    render(<EmptyState title="No tasks yet" description="Approve obligations to create tasks." />);

    expect(screen.getByRole("heading", { name: "No tasks yet" })).toBeInTheDocument();
    expect(screen.getByText("Approve obligations to create tasks.")).toBeInTheDocument();
  });
});
