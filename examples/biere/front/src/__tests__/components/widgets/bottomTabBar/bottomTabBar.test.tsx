import { screen, within } from "@testing-library/react";
import { BottomTabBar } from "@/components/widgets/bottomTabBar/bottomTabBar";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

describe("BottomTabBar", () => {
  it("renders a labelled navigation with the four translated tabs", () => {
    renderWithProviders(<BottomTabBar />);

    const nav = screen.getByRole("navigation", { name: "Navigation principale" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Encyclopédie", "Carte", "Journal", "Profil"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/", "/carte", "/journal", "/profil"]);
  });

  it("marks only the tab of the current route", () => {
    renderWithProviders(<BottomTabBar />, { initialPath: "/journal" });

    expect(screen.getByRole("link", { name: "Journal" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Encyclopédie" })).not.toHaveAttribute("aria-current");
  });

  it("keeps the Encyclopedia tab current on a beer sheet and no other", () => {
    renderWithProviders(<BottomTabBar />, { initialPath: "/bieres/12" });

    const nav = screen.getByRole("navigation");
    const current = within(nav)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.textContent)).toEqual(["Encyclopédie"]);
  });

  it("stays fixed at the bottom above the safe area", () => {
    renderWithProviders(<BottomTabBar />);

    const nav = screen.getByRole("navigation");
    expect(nav.className).toContain("fixed");
    expect(nav.className).toContain("bottom-0");
    expect(nav.className).toContain("pb-[env(safe-area-inset-bottom)]");
  });

  it("sits on a cream surface under a 2px ink rule, without a blurred shadow", () => {
    renderWithProviders(<BottomTabBar />);

    const nav = screen.getByRole("navigation");
    expect(nav.className).toContain("bg-surface");
    expect(nav.className).toContain("border-t-mousse");
    expect(nav.className).not.toMatch(/shadow-(surface|sm|md|lg|xl)/);
  });
});
