import { screen } from "@testing-library/react";
import { EmptyStatePanel } from "@/components/elements/emptyStatePanel/emptyStatePanel";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

describe("EmptyStatePanel", () => {
  it("renders the title and the description next to a decorative mascot", () => {
    const { container } = renderWithProviders(<EmptyStatePanel title="Rien ici" description="Bientôt des bières." />);

    expect(screen.getByRole("heading", { level: 2, name: "Rien ici" })).toBeInTheDocument();
    expect(screen.getByText("Bientôt des bières.")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(container.querySelector('[data-slot="mascot"]')).toHaveAttribute("aria-hidden", "true");
  });

  it("shows a searching mascot unless told otherwise", () => {
    const { container, rerender } = renderWithProviders(<EmptyStatePanel title="Rien" description="Bientôt." />);

    expect(container.querySelector('[data-slot="mascot"]')).toHaveAttribute("data-mood", MascotMoodEnum.SEARCHING);

    rerender(<EmptyStatePanel title="Rien" description="Bientôt." mood={MascotMoodEnum.LOADED} />);

    expect(container.querySelector('[data-slot="mascot"]')).toHaveAttribute("data-mood", MascotMoodEnum.LOADED);
  });

  it("renders inside the HeroUI empty state slot with the display font title", () => {
    const { container } = renderWithProviders(<EmptyStatePanel title="Rien ici" description="Bientôt." />);

    expect(container.querySelector('[data-slot="empty-state"]')).not.toBeNull();
    expect(screen.getByRole("heading", { level: 2 }).className).toContain("font-display");
  });
});
