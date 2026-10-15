import i18n from "@/i18n/i18n";
import type { BeerCharacteristicEnum } from "@/types/enums/beer/beerCharacteristicEnum";
import type { CharacteristicValue } from "@/types/models/beer/characteristicValue";
import { formatCharacteristicValue } from "@/utils/beer/formatCharacteristicValue";

const NO_BREAK_SPACE = " ";

const format = (characteristic: string, value: CharacteristicValue | null, language: "fr" | "en" = "fr") =>
  formatCharacteristicValue(characteristic as BeerCharacteristicEnum, value, i18n.getFixedT(language), language);

describe("formatCharacteristicValue", () => {
  it("writes the degree with formatAbv in both languages", () => {
    expect(format("abv", 7)).toBe(`7${NO_BREAK_SPACE}%`);
    expect(format("abv", 11.3)).toBe(`11,3${NO_BREAK_SPACE}%`);
    expect(format("abv", 11.3, "en")).toBe(`11.3${NO_BREAK_SPACE}%`);
  });

  it("writes the bitterness and the colour with their unit in both languages", () => {
    expect(format("ibu", 35)).toBe("35 IBU");
    expect(format("ibu", 35, "en")).toBe("35 IBU");
    expect(format("ebc", 20)).toBe("20 EBC");
    expect(format("ebc", 20, "en")).toBe("20 EBC");
    expect(format("ibu", 0)).toBe("0 IBU");
  });

  it.each([
    ["sweetness", 1, "1 / 5 · Très sèche", "1 / 5 · Very dry"],
    ["sweetness", 3, "3 / 5 · Équilibrée", "3 / 5 · Balanced"],
    ["sweetness", 5, "5 / 5 · Très douce", "5 / 5 · Very sweet"],
    ["acidity", 1, "1 / 5 · Nulle", "1 / 5 · None"],
    ["acidity", 4, "4 / 5 · Vive", "4 / 5 · Sharp"],
    ["body", 4, "4 / 5 · Rond", "4 / 5 · Round"],
    ["body", 5, "5 / 5 · Très plein", "5 / 5 · Very full"],
  ])("writes %s %i as a score and its level label", (characteristic, value, fr, en) => {
    expect(format(characteristic, value)).toBe(fr);
    expect(format(characteristic, value, "en")).toBe(en);
  });

  it("joins the aroma labels with a comma in both languages", () => {
    expect(format("aromas", ["fruity", "hoppy"])).toBe("Fruité, Houblonné");
    expect(format("aromas", ["fruity", "hoppy"], "en")).toBe("Fruity, Hoppy");
    expect(format("aromas", ["citrus"])).toBe("Agrumes");
  });

  it("joins the format labels with a comma in both languages", () => {
    expect(format("formats", ["bottle", "draft"])).toBe("Bouteille, Pression");
    expect(format("formats", ["bottle", "draft"], "en")).toBe("Bottle, Draft");
    expect(format("formats", ["can"])).toBe("Canette");
  });

  it("drops a list value that is not an aroma or a format", () => {
    expect(format("aromas", ["fruity", "unknown"])).toBe("Fruité");
    expect(format("formats", ["bottle", "unknown"])).toBe("Bouteille");
  });

  it.each(["abv", "ibu", "ebc", "sweetness", "acidity", "body", "aromas", "formats"])("says Non renseignée for a missing %s", (characteristic) => {
    expect(format(characteristic, null)).toBe("Non renseignée");
    expect(format(characteristic, null, "en")).toBe("Not provided");
  });
});
