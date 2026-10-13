import { screen } from "@testing-library/react";
import { MapPage } from "@/pages/map/map";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

describe("MapPage", () => {
  it("renders its title and an empty state", () => {
    renderWithProviders(<MapPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Carte" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Aucun lieu pour l'instant" })).toBeInTheDocument();
  });
});
