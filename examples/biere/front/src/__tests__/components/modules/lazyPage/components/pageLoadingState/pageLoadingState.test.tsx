import { screen } from "@testing-library/react";
import { PageLoadingState } from "@/components/modules/lazyPage/components/pageLoadingState/pageLoadingState";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const renderPageLoadingState = () => renderWithProviders(<PageLoadingState />);

describe("PageLoadingState", () => {
  it("announces the loading politely as a busy status with the visible label", () => {
    renderPageLoadingState();

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveTextContent("Chargement de la page…");
  });

  it("shows the title skeleton at the height of the page title", () => {
    const { container } = renderPageLoadingState();

    expect(container.querySelector(".h-9.w-48.max-w-full.rounded-control")).toBeInTheDocument();
  });

  it("shows a single decorative searching mascot", () => {
    const { container } = renderPageLoadingState();

    const mascots = container.querySelectorAll('[data-slot="mascot"]');
    expect(mascots).toHaveLength(1);
    expect(mascots[0]).toHaveAttribute("data-mood", "searching");
    expect(mascots[0]).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("fills the page area as a column starting at the title position", () => {
    renderPageLoadingState();

    const status = screen.getByRole("status");
    expect(status).toHaveClass("flex", "flex-1", "flex-col", "gap-4");
    expect(status.firstElementChild).toHaveClass("h-9");
  });
});
