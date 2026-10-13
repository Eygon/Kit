import { screen } from "@testing-library/react";
import { JournalPage } from "@/pages/journal/journal";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

describe("JournalPage", () => {
  it("renders its title and an empty state", () => {
    renderWithProviders(<JournalPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Journal" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Aucune dégustation pour l'instant" })).toBeInTheDocument();
  });
});
