import { screen } from "@testing-library/react";
import { NotFoundPage } from "@/pages/notFound/notFound";
import { MascotMoodEnum } from "@/types/enums/mascot/mascotMoodEnum";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const renderNotFound = () => renderWithProviders(<NotFoundPage />);

describe("NotFoundPage", () => {
  it("shows the page title, the empty state message and a decorative mascot", () => {
    const { container } = renderNotFound();

    expect(screen.getByRole("heading", { level: 1, name: "Page introuvable" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Cette page n'existe pas" })).toBeInTheDocument();
    expect(screen.getByText("L'adresse est peut-être mal saisie ou la page a été déplacée.")).toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("shows the confused mascot", () => {
    const { container } = renderNotFound();

    const mascots = container.querySelectorAll('[data-slot="mascot"]');
    expect(mascots).toHaveLength(1);
    expect(mascots[0]).toHaveAttribute("data-mood", MascotMoodEnum.CONFUSED);
  });

  it("links back to the home page with a touch sized target", () => {
    renderNotFound();

    const link = screen.getByRole("link", { name: "Retour à l'accueil" });
    expect(link).toHaveAttribute("href", "/");
    expect(link.className).toContain("min-h-11");
  });
});
