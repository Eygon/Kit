import { screen, within } from "@testing-library/react";
import { BottomTabBar } from "@/components/widgets/bottomTabBar/bottomTabBar";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

describe("BottomTabBar", () => {
  it("renders a labelled navigation with the five translated tabs", () => {
    renderWithProviders(<BottomTabBar />);

    const nav = screen.getByRole("navigation", { name: "Navigation principale" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Accueil", "Bières", "Carte", "Journal", "Profil"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/", "/bieres", "/carte", "/journal", "/profil"]);
  });

  it("marks only the tab of the current route", () => {
    renderWithProviders(<BottomTabBar />, { initialPath: "/journal" });

    expect(screen.getByRole("link", { name: "Journal" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Bières" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Accueil" })).not.toHaveAttribute("aria-current");
  });

  it("marks only the Home tab on the root path", () => {
    renderWithProviders(<BottomTabBar />, { initialPath: "/" });

    const nav = screen.getByRole("navigation");
    const current = within(nav)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.textContent)).toEqual(["Accueil"]);
  });

  it("marks only the Beers tab on the encyclopedia path", () => {
    renderWithProviders(<BottomTabBar />, { initialPath: "/bieres" });

    const nav = screen.getByRole("navigation");
    const current = within(nav)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.textContent)).toEqual(["Bières"]);
  });

  it.each(["/profils", "/profils/3"])("keeps the Profile tab current on %s and no other", (path) => {
    renderWithProviders(<BottomTabBar />, { initialPath: path });

    const nav = screen.getByRole("navigation");
    const current = within(nav)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.textContent)).toEqual(["Profil"]);
  });

  it("keeps the Beers tab current on a beer sheet and no other", () => {
    renderWithProviders(<BottomTabBar />, { initialPath: "/bieres/12" });

    const nav = screen.getByRole("navigation");
    const current = within(nav)
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page");
    expect(current.map((link) => link.textContent)).toEqual(["Bières"]);
  });

  it("gives each of the five tabs at least 44 px of height and a shrinkable width", () => {
    renderWithProviders(<BottomTabBar />);

    const items = within(screen.getByRole("navigation")).getAllByRole("listitem");
    expect(items).toHaveLength(5);
    items.forEach((item) => expect(item.className).toContain("min-w-0"));
    within(screen.getByRole("navigation"))
      .getAllByRole("link")
      .forEach((link) => {
        expect(link.className).toContain("min-h-14");
        expect(link.querySelector("span")?.className).toContain("truncate");
      });
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
