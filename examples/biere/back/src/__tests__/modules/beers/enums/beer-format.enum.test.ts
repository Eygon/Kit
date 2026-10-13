import { describe, expect, it } from "vitest";
import { BeerFormatEnum, isBeerFormat } from "@/modules/beers/enums/beer-format.enum";

describe("BeerFormatEnum", () => {
  it("lists bottle, can and draft in the reference order", () => {
    expect(Object.values(BeerFormatEnum)).toEqual(["bottle", "can", "draft"]);
  });

  it("recognises the three formats and nothing else", () => {
    expect(["bottle", "can", "draft"].every((value) => isBeerFormat(value))).toBe(true);
    expect(["keg", "Bottle", "", "toString"].some((value) => isBeerFormat(value))).toBe(false);
  });
});
