import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { TechnicalSheetRow } from "@/pages/beerDetail/components/elements/technicalSheetRow/technicalSheetRow";

const renderRow = (label: string, children: ReactNode) =>
  render(
    <dl>
      <TechnicalSheetRow label={label}>{children}</TechnicalSheetRow>
    </dl>,
  );

describe("TechnicalSheetRow", () => {
  it("renders the label in a muted small term and the content in the description", () => {
    renderRow("Amertume", <span>35 IBU</span>);

    const term = screen.getByText("Amertume");
    expect(term.tagName).toBe("DT");
    expect(term).toHaveClass("text-sm", "text-muted");
    const description = screen.getByText("35 IBU").closest("dd") as HTMLElement;
    expect(description).toBeInTheDocument();
    expect(term.nextElementSibling).toBe(description);
  });

  it("wraps its content so a long unbroken value stays inside a narrow screen", () => {
    renderRow("Arômes", <span>{"x".repeat(120)}</span>);

    const description = screen.getByText("x".repeat(120)).closest("dd") as HTMLElement;
    expect(description).toHaveClass("flex", "min-w-0", "flex-wrap", "items-center", "gap-2", "break-words");
  });

  it("groups its term and description in one shrinkable block", () => {
    renderRow("Corps", "4 / 5 · Rond");

    const term = screen.getByText("Corps");
    expect(term.parentElement).toHaveClass("min-w-0");
    expect(term.parentElement).toContainElement(screen.getByText("4 / 5 · Rond"));
  });

  it("renders several children side by side in the description", () => {
    renderRow(
      "Couleur",
      <>
        <span data-testid="swatch" />
        <span>20 EBC</span>
      </>,
    );

    const description = screen.getByText("20 EBC").closest("dd") as HTMLElement;
    expect(description.children).toHaveLength(2);
    expect(description.firstElementChild).toBe(screen.getByTestId("swatch"));
  });
});
