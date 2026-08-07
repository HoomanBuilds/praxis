import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Dialog, DialogContent, DialogTitle } from "./dialog";

describe("Dialog", () => {
  it("exposes modal semantics and its visible title", () => {
    render(
      <Dialog open onOpenChange={() => undefined}>
        <DialogContent>
          <DialogTitle>New Filing</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    expect(screen.getByRole("dialog", { name: "New Filing" })).toHaveAttribute("aria-modal", "true");
  });

  it("closes when Escape is pressed", () => {
    const onOpenChange = vi.fn();
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>New Filing</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
