import { BEER_STATUS_LABEL_KEYS, BeerStatusEnum, isBeerStatus } from "@/types/enums/beer/beerStatusEnum";

describe("beerStatusEnum", () => {
  it("carries the three contract values", () => {
    expect(Object.values(BeerStatusEnum)).toEqual(["drunk", "wishlist", "untasted"]);
    expect(BeerStatusEnum.DRUNK).toBe("drunk");
    expect(BeerStatusEnum.WISHLIST).toBe("wishlist");
    expect(BeerStatusEnum.UNTASTED).toBe("untasted");
  });

  it("maps every status to its translation key", () => {
    expect(BEER_STATUS_LABEL_KEYS).toEqual({
      drunk: "beer.statuses.drunk",
      wishlist: "beer.statuses.wishlist",
      untasted: "beer.statuses.untasted",
    });
  });

  it("recognises only the three values", () => {
    expect(isBeerStatus("drunk")).toBe(true);
    expect(isBeerStatus("wishlist")).toBe(true);
    expect(isBeerStatus("untasted")).toBe(true);
    expect(isBeerStatus("all")).toBe(false);
    expect(isBeerStatus("DRUNK")).toBe(false);
    expect(isBeerStatus("")).toBe(false);
    expect(isBeerStatus(null)).toBe(false);
    expect(isBeerStatus(undefined)).toBe(false);
    expect(isBeerStatus(1)).toBe(false);
  });
});
