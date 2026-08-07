import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";
import {
  OnboardingTour,
  onboardingStorageKey,
  openOnboardingTour,
} from "./OnboardingTour";

function renderTour(userId = "user-1") {
  return render(
    <MemoryRouter>
      <OnboardingTour userId={userId} />
      <div data-tour="command-center" />
      <div data-tour="regulation-upload" />
      <div data-tour="obligations" />
      <div data-tour="tasks" />
      <div data-tour="evidence" />
      <div data-tour="compliance-map" />
      <div data-tour="copilot" />
    </MemoryRouter>,
  );
}

describe("OnboardingTour", () => {
  beforeEach(() => localStorage.clear());

  it("opens after first login, advances, and remembers completion", async () => {
    const view = renderTour();

    expect(await screen.findByRole("dialog")).toHaveTextContent("See what needs attention");
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("Upload a regulation");
    fireEvent.click(screen.getByRole("button", { name: "Skip guided tour" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(localStorage.getItem(onboardingStorageKey("user-1"))).toBe("done");

    view.unmount();
    renderTour();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("can be reopened from the authenticated interface", async () => {
    localStorage.setItem(onboardingStorageKey("user-1"), "done");
    renderTour();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    openOnboardingTour();

    expect(await screen.findByRole("dialog")).toHaveTextContent("See what needs attention");
  });
});
