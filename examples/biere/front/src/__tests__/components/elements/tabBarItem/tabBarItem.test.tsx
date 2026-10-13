import MapPin from "@gravity-ui/icons/MapPin";
import { screen } from "@testing-library/react";
import { TabBarItem } from "@/components/elements/tabBarItem/tabBarItem";
import { RoutePathEnum } from "@/types/enums/routing/routePathEnum";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";

const renderItem = (initialPath: string) =>
  renderWithProviders(
    <ul>
      <TabBarItem to={RoutePathEnum.MAP} label="Carte" icon={MapPin} />
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
});
