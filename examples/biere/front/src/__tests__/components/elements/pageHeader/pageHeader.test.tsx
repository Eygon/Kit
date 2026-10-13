import { render, screen } from "@testing-library/react";
import { PageHeader } from "@/components/elements/pageHeader/pageHeader";

describe("PageHeader", () => {
  it("renders the title as the page heading", () => {
    render(<PageHeader title="Carte" />);

    expect(screen.getByRole("heading", { level: 1, name: "Carte" })).toBeInTheDocument();
  });

  it("renders the subtitle when given", () => {
    render(<PageHeader title="Carte" subtitle="Autour de vous" />);

    expect(screen.getByText("Autour de vous")).toBeInTheDocument();
  });

  it("renders no subtitle paragraph otherwise", () => {
    const { container } = render(<PageHeader title="Carte" />);

    expect(container.querySelector("p")).toBeNull();
  });
});
