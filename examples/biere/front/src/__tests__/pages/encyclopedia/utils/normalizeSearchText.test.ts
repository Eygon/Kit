import { normalizeSearchText } from "@/pages/encyclopedia/utils/normalizeSearchText";

describe("normalizeSearchText", () => {
  it.each([
    ["Chimay", "chimay"],
    ["CHIMAY", "chimay"],
    ["Été", "ete"],
    ["ÉTÉ", "ete"],
    ["été", "ete"],
    ["Brasserie d'Orval", "brasserie d'orval"],
    ["Ørbæk Çà", "ørbæk ca"],
    ["Weißbier", "weissbier"],
    ["STRAßE", "strasse"],
    ["  Brasserie   du   Mont  ", "brasserie du mont"],
    ["a\t\nb", "a b"],
    ["", ""],
    ["   ", ""],
  ])("turns %j into %j", (input, expected) => {
    expect(normalizeSearchText(input)).toBe(expected);
  });

  it("gives the same text for a decomposed and a composed accent", () => {
    expect(normalizeSearchText("e\u0301te\u0301")).toBe(normalizeSearchText("\u00e9t\u00e9"));
    expect(normalizeSearchText("e\u0301te\u0301")).toBe("ete");
  });

  it("is idempotent", () => {
    const once = normalizeSearchText("  Ché  Weiß ");

    expect(normalizeSearchText(once)).toBe(once);
  });
});
