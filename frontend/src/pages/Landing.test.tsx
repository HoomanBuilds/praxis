import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import Landing from "./Landing";

function renderLanding() {
  render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>,
  );
}

describe("Landing", () => {
  it("describes the implemented circular review workflow", () => {
    renderLanding();

    expect(screen.getByRole("heading", { level: 1, name: /turn sebi circulars into work your team can execute/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /review each obligation beside the source/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /create assigned work only after approval/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /export the complete decision history/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /nothing becomes a task until an officer approves it/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /ask a question. open the cited paragraph/i })).toBeInTheDocument();
  });

  it("keeps the landing actions focused on the working demo", () => {
    renderLanding();

    const header = screen.getByRole("banner");
    expect(within(header).getByRole("link", { name: /open demo/i })).toHaveAttribute("href", "/login");
    expect(screen.getAllByRole("link", { name: /open demo workspace/i })).toHaveLength(2);
    expect(screen.queryByRole("link", { name: /product tour/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /docs|documentation/i })).not.toBeInTheDocument();
  });

  it("keeps generic AI marketing language out of the page", () => {
    renderLanding();

    const hero = screen.getByRole("heading", { level: 1 }).closest("section");
    expect(hero).not.toHaveTextContent(/obligation review/i);
    expect(within(hero as HTMLElement).getByRole("img", { name: /live praxis command center/i })).toHaveAttribute("src", "/praxis-command-center.png");
    expect(screen.queryByText(/agentic compliance, grounded in source/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/paragraph-level citations/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/human approval gates/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/deployment-controlled data/i)).not.toBeInTheDocument();
  });
});
