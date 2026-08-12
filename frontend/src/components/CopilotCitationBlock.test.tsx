import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { UIModeProvider } from "@/context/UIModeContext";
import { CopilotCitationBlock } from "./CopilotCitationBlock";

describe("CopilotCitationBlock", () => {
  it("does not label an out-of-scope refusal as general guidance", () => {
    const { container } = render(
      <UIModeProvider>
        <CopilotCitationBlock responseType="out_of_scope" grounded={false} citations={[]} />
      </UIModeProvider>,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(/general guidance/i)).not.toBeInTheDocument();
  });
});
