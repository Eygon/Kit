import { TAB_BAR_ENTRIES } from "@/constants/tabBarConstants";
import fr from "@/i18n/locales/fr.json";
import { RoutePathEnum } from "@/types/enums/routing/routePathEnum";
import { getDeepKeys } from "@/__tests__/utils/getDeepKeys";

describe("TAB_BAR_ENTRIES", () => {
  it("lists the five tabs in display order", () => {
    expect(TAB_BAR_ENTRIES.map((entry) => entry.to)).toEqual([
      RoutePathEnum.HOME,
      RoutePathEnum.ENCYCLOPEDIA,
      RoutePathEnum.MAP,
      RoutePathEnum.JOURNAL,
      RoutePathEnum.PROFILE,
    ]);
  });

  it("points every label to an existing translation key", () => {
    const keys = getDeepKeys(fr);
    TAB_BAR_ENTRIES.forEach((entry) => expect(keys).toContain(entry.labelKey));
  });

  it("puts the Home tab first with its own label key", () => {
    expect(TAB_BAR_ENTRIES[0]).toMatchObject({ to: "/", labelKey: "nav.home" });
  });

  it("gives every tab an icon", () => {
    TAB_BAR_ENTRIES.forEach((entry) => expect(entry.icon).toBeTypeOf("function"));
  });

  it("keeps the Beers tab active on the beer detail path and the Profile tab on the people, profile, collection and wishlist paths", () => {
    expect(TAB_BAR_ENTRIES.map((entry) => entry.activePaths)).toEqual([
      undefined,
      [RoutePathEnum.BEER_DETAIL],
      undefined,
      undefined,
      [RoutePathEnum.PEOPLE, RoutePathEnum.USER_PROFILE, RoutePathEnum.USER_COLLECTION, RoutePathEnum.USER_WISHLIST],
    ]);
  });
});
