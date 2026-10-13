import { describe, expect, it } from "vitest";
import {
  BEER_FAMILY_BY_SEED_LABEL,
  BeerFamilyEnum,
  isBeerFamily,
} from "@/modules/beers/enums/beer-family.enum";

const CONTRACT_FAMILIES = [
  "lager",
  "pilsner",
  "paleAle",
  "ipa",
  "blonde",
  "amber",
  "brown",
  "stout",
  "porter",
  "witbier",
  "weizen",
  "saison",
  "trappist",
  "abbey",
  "belgianStrong",
  "sourLambic",
  "fruit",
  "nonAlcoholic",
];

describe("BeerFamilyEnum", () => {
  it("lists the 18 contract families in the contract order", () => {

    expect(Object.values(BeerFamilyEnum)).toEqual(CONTRACT_FAMILIES);
  });

  it("translates every seed label into its contract value", () => {

    expect(BEER_FAMILY_BY_SEED_LABEL).toEqual({
      Lager: "lager",
      Pilsner: "pilsner",
      "Pale Ale": "paleAle",
      IPA: "ipa",
      Blonde: "blonde",
      Ambrée: "amber",
      Brune: "brown",
      Stout: "stout",
      Porter: "porter",
      Blanche: "witbier",
      Weizen: "weizen",
      Saison: "saison",
      Trappiste: "trappist",
      Abbaye: "abbey",
      "Belgian Strong": "belgianStrong",
      "Sour / Lambic": "sourLambic",
      Fruitée: "fruit",
      "Sans alcool": "nonAlcoholic",
    });
  });

  it("recognises contract values and rejects seed labels", () => {

    expect(isBeerFamily("paleAle")).toBe(true);
    expect(isBeerFamily("Pale Ale")).toBe(false);
    expect(isBeerFamily("")).toBe(false);
  });
});
