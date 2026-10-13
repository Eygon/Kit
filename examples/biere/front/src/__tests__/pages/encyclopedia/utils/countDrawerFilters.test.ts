import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import { countDrawerFilters } from "@/pages/encyclopedia/utils/countDrawerFilters";
import { BeerFormatEnum } from "@/types/enums/beer/beerFormatEnum";
import { BeerSortEnum } from "@/types/enums/beer/beerSortEnum";
import { BeerStatusEnum } from "@/types/enums/beer/beerStatusEnum";
import { EMPTY_BEER_QUERY } from "@/types/mappers/beer/beerQueryMapper";

describe("countDrawerFilters", () => {
  it("counts nothing for an empty query", () => {

    expect(countDrawerFilters(EMPTY_BEER_QUERY)).toBe(0);
  });

  it("does not count the search", () => {

    expect(countDrawerFilters({ ...EMPTY_BEER_QUERY, search: "orval" })).toBe(0);
  });

  it("counts one for a family", () => {

    expect(countDrawerFilters({ ...EMPTY_BEER_QUERY, family: BeerFamilyEnum.TRAPPIST })).toBe(1);
  });

  it("counts one per style", () => {

    expect(countDrawerFilters({ ...EMPTY_BEER_QUERY, styleIds: [3, 5, 8] })).toBe(3);
  });

  it("counts a degree range once, whichever bound is set", () => {

    expect(countDrawerFilters({ ...EMPTY_BEER_QUERY, abvMin: 4 })).toBe(1);
    expect(countDrawerFilters({ ...EMPTY_BEER_QUERY, abvMax: 9 })).toBe(1);
    expect(countDrawerFilters({ ...EMPTY_BEER_QUERY, abvMin: 4, abvMax: 9 })).toBe(1);
    expect(countDrawerFilters({ ...EMPTY_BEER_QUERY, abvMin: 0 })).toBe(1);
  });

  it("counts one per country and one per format", () => {

    expect(countDrawerFilters({ ...EMPTY_BEER_QUERY, countries: ["BE", "DE"] })).toBe(2);
    expect(countDrawerFilters({ ...EMPTY_BEER_QUERY, formats: [BeerFormatEnum.CAN, BeerFormatEnum.DRAFT, BeerFormatEnum.BOTTLE] })).toBe(3);
  });

  it("counts one when the sort is not the name and none for the name", () => {

    expect(countDrawerFilters({ ...EMPTY_BEER_QUERY, sort: BeerSortEnum.NAME })).toBe(0);
    expect(countDrawerFilters({ ...EMPTY_BEER_QUERY, sort: BeerSortEnum.ABV })).toBe(1);
    expect(countDrawerFilters({ ...EMPTY_BEER_QUERY, sort: BeerSortEnum.BREWERY })).toBe(1);
  });

  it("adds every criterion up", () => {

    expect(
      countDrawerFilters({
        search: "ipa",
        family: BeerFamilyEnum.IPA,
        styleIds: [1, 2],
        countries: ["BE", "DE", "NL"],
        formats: [BeerFormatEnum.CAN],
        abvMin: 4,
        abvMax: 9,
        status: BeerStatusEnum.DRUNK,
        sort: BeerSortEnum.ABV,
      }),
    ).toBe(1 + 2 + 1 + 3 + 1 + 1 + 1);
  });

  it("counts one for each status and none without a status", () => {
    expect(countDrawerFilters({ ...EMPTY_BEER_QUERY, status: null })).toBe(0);
    expect(countDrawerFilters({ ...EMPTY_BEER_QUERY, status: BeerStatusEnum.DRUNK })).toBe(1);
    expect(countDrawerFilters({ ...EMPTY_BEER_QUERY, status: BeerStatusEnum.WISHLIST })).toBe(1);
    expect(countDrawerFilters({ ...EMPTY_BEER_QUERY, status: BeerStatusEnum.UNTASTED })).toBe(1);
  });

  it("adds the status to the other filters", () => {
    expect(
      countDrawerFilters({ ...EMPTY_BEER_QUERY, family: BeerFamilyEnum.IPA, countries: ["BE"], status: BeerStatusEnum.UNTASTED }),
    ).toBe(3);
  });
});
