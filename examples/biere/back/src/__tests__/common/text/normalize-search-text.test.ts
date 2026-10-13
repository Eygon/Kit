import { describe, expect, it } from "vitest";
import { normalizeSearchText } from "@/common/text/normalize-search-text";

describe("normalizeSearchText", () => {
  it("strips accents and lowercases", () => {
    expect(normalizeSearchText("Plzeňský")).toBe("plzensky");
    expect(normalizeSearchText("Lindemans Pêcheresse")).toBe("lindemans pecheresse");
  });

  it("turns ß into ss", () => {
    expect(normalizeSearchText("Weißbräu")).toBe("weissbrau");
    expect(normalizeSearchText("STRAẞE")).toBe("strasse");
  });

  it("collapses runs of whitespace and trims both ends", () => {
    expect(normalizeSearchText("  Erdinger \t\n  Dunkel  ")).toBe("erdinger dunkel");
  });

  it("returns an empty string for blank input", () => {
    expect(normalizeSearchText("")).toBe("");
    expect(normalizeSearchText("   ")).toBe("");
  });
});
