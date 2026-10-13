import { screen } from "@testing-library/react";
import { EncyclopediaPage } from "@/pages/encyclopedia/encyclopedia";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

describe("EncyclopediaPage", () => {
  it("renders its title and an empty state", () => {
    renderWithProviders(<EncyclopediaPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Encyclopédie" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Aucune bière pour l'instant" })).toBeInTheDocument();
  });
});
