import { getTabBarItemClasses } from "@/components/elements/tabBarItem/utils/getTabBarItemClasses";

describe("getTabBarItemClasses", () => {
  it("fills the active tab in hop green with an ink border and a hard shadow", () => {
    const classes = getTabBarItemClasses(true);

    expect(classes).toContain("bg-accent");
    expect(classes).toContain("text-accent-foreground");
    expect(classes).toContain("border-border");
    expect(classes).toContain("shadow-mousse");
    expect(classes).not.toContain("border-transparent");
  });

  it("leaves an inactive tab flat, in ink, without a visible border", () => {
    const classes = getTabBarItemClasses(false);

    expect(classes).toContain("text-foreground");
    expect(classes).toContain("border-transparent");
    expect(classes).not.toContain("bg-accent");
    expect(classes).not.toContain("shadow-mousse");
  });

  it("never spends the reserved amber on navigation", () => {
    [true, false].forEach((isActive) => expect(getTabBarItemClasses(isActive)).not.toMatch(/(bg|text|border)-highlight/));
  });

  it("keeps a touch target of at least 44px and a keyboard focus ring", () => {
    [true, false].forEach((isActive) => {
      const classes = getTabBarItemClasses(isActive);
      expect(classes).toContain("min-h-14");
      expect(classes).toContain("min-w-11");
      expect(classes).toContain("focus-visible:focus-ring");
    });
  });
});
