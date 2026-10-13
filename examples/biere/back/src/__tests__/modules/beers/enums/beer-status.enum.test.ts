import { describe, expect, it } from "vitest";
import { BeerStatusEnum } from "@/modules/beers/enums/beer-status.enum";

describe("BeerStatusEnum", () => {
  it("lists drunk, wishlist and untasted", () => {
    expect(Object.values(BeerStatusEnum)).toEqual(["drunk", "wishlist", "untasted"]);
  });

  it("names the members in upper case", () => {
    expect(BeerStatusEnum.DRUNK).toBe("drunk");
    expect(BeerStatusEnum.WISHLIST).toBe("wishlist");
    expect(BeerStatusEnum.UNTASTED).toBe("untasted");
  });
});
