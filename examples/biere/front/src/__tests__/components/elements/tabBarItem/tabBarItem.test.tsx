import MapPin from "@gravity-ui/icons/MapPin";
import { screen } from "@testing-library/react";
import { TabBarItem } from "@/components/elements/tabBarItem/tabBarItem";
import { RoutePathEnum } from "@/types/enums/routing/routePathEnum";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const renderItem = (initialPath: string, activePaths?: readonly RoutePathEnum[], badge: { badgeCount?: number; badgeLabel?: string } = {}) =>
  renderWithProviders(
    <ul>
      <TabBarItem to={RoutePathEnum.MAP} label="Carte" icon={MapPin} activePaths={activePaths} {...badge} />
    </ul>,
    { initialPath },
  );

describe("TabBarItem", () => {
  it("renders a link named by its label with a hidden icon", () => {
    renderItem(RoutePathEnum.ENCYCLOPEDIA);

    const link = screen.getByRole("link", { name: "Carte" });
    expect(link).toHaveAttribute("href", "/carte");
    expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("marks the link as the current page on its route", () => {
    renderItem(RoutePathEnum.MAP);

    const link = screen.getByRole("link", { name: "Carte" });
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link.className).toContain("bg-accent");
  });

  it("leaves the link unmarked on another route", () => {
    renderItem(RoutePathEnum.JOURNAL);

    expect(screen.getByRole("link", { name: "Carte" })).not.toHaveAttribute("aria-current");
  });

  it("is current on a path of its activePaths", () => {
    renderItem("/bieres/12", [RoutePathEnum.BEER_DETAIL]);

    const link = screen.getByRole("link", { name: "Carte" });
    expect(link).toHaveAttribute("aria-current", "page");
    expect(link.className).toContain("bg-accent");
    expect(link.className).toContain("shadow-mousse");
  });

  it("stays unmarked on a path outside its activePaths", () => {
    renderItem("/journal", [RoutePathEnum.BEER_DETAIL]);

    const link = screen.getByRole("link", { name: "Carte" });
    expect(link).not.toHaveAttribute("aria-current");
    expect(link.className).not.toContain("bg-accent");
  });

  it("stays unmarked on a beer path when it has no activePaths", () => {
    renderItem("/bieres/12");

    expect(screen.getByRole("link", { name: "Carte" })).not.toHaveAttribute("aria-current");
  });

  it("does not mark the tab on the bare beers segment", () => {
    renderItem("/bieres", [RoutePathEnum.BEER_DETAIL]);

    expect(screen.getByRole("link", { name: "Carte" })).not.toHaveAttribute("aria-current");
  });

  it.each(["/profils", "/profils/3"])("is current on %s when its activePaths are the people paths", (path) => {
    renderItem(path, [RoutePathEnum.PEOPLE, RoutePathEnum.USER_PROFILE]);

    expect(screen.getByRole("link", { name: "Carte" })).toHaveAttribute("aria-current", "page");
  });

  it("shows a hidden count badge and an sr-only label when badgeCount is above 0", () => {
    renderItem(RoutePathEnum.JOURNAL, undefined, { badgeCount: 3, badgeLabel: "3 votes en attente" });

    const link = screen.getByRole("link", { name: "Carte, 3 votes en attente" });
    expect(link.getAttribute("href")).toBe("/carte");
    expect(link.textContent).toBe("3Carte, 3 votes en attente");
    const badge = screen.getByText("3");
    expect(badge.closest("[aria-hidden='true']")).not.toBeNull();
    expect(link.contains(badge)).toBe(true);
    expect(screen.getByText(", 3 votes en attente")).toHaveClass("sr-only");
  });

  it("draws the count as a small warning badge pinned top right on the icon anchor, inside the tab", () => {
    renderItem(RoutePathEnum.JOURNAL, undefined, { badgeCount: 3, badgeLabel: "3 votes en attente" });

    const link = screen.getByRole("link", { name: "Carte, 3 votes en attente" });
    const badge = screen.getByText("3").closest("[data-slot='badge']") as HTMLElement;
    expect(badge).toHaveClass("badge--sm", "badge--warning", "badge--top-right");
    expect(badge).not.toHaveClass("badge--md", "badge--danger");
    const anchor = badge.closest("[data-slot='badge-anchor']") as HTMLElement;
    expect(anchor).not.toBeNull();
    expect(anchor.querySelector("svg")).not.toBeNull();
    expect(link.contains(anchor)).toBe(true);
  });

  it.each([0, undefined])("shows no badge when badgeCount is %s", (badgeCount) => {
    renderItem(RoutePathEnum.JOURNAL, undefined, { badgeCount, badgeLabel: "0 vote en attente" });

    const link = screen.getByRole("link", { name: "Carte" });
    expect(link).toHaveTextContent(/^Carte$/);
    expect(screen.queryByText("0 vote en attente")).not.toBeInTheDocument();
  });

  it("stays marked on its own route when activePaths are given", () => {
    renderItem(RoutePathEnum.MAP, [RoutePathEnum.BEER_DETAIL]);

    expect(screen.getByRole("link", { name: "Carte" })).toHaveAttribute("aria-current", "page");
  });
});
