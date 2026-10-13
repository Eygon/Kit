import { TAB_BAR_ENTRIES } from "@/constants/tabBarConstants";
import fr from "@/i18n/locales/fr.json";
import { RoutePathEnum } from "@/types/enums/routing/routePathEnum";
import { getDeepKeys } from "@/__tests__/utils/getDeepKeys";

describe("TAB_BAR_ENTRIES", () => {
  it("lists the four tabs in display order", () => {
    expect(TAB_BAR_ENTRIES.map((entry) => entry.to)).toEqual([
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

  it("gives every tab an icon", () => {
    TAB_BAR_ENTRIES.forEach((entry) => expect(entry.icon).toBeTypeOf("function"));
  });
});
