import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import { EMPTY_MAP_FILTERS, countMapFilters, mapFiltersToSearchParams, searchParamsToMapFilters } from "@/types/mappers/venue/mapFiltersMapper";
import { VenueTypeEnum } from "@/types/enums/venue/venueTypeEnum";
import type { MapFilters } from "@/types/models/venue/mapFilters";

const FULL_FILTERS: MapFilters = {
  types: [VenueTypeEnum.BAR, VenueTypeEnum.SHOP],
  family: BeerFamilyEnum.STOUT,
  beerId: 7,
  confirmedOnly: true,
  radiusKm: 5,
};

describe("mapFiltersMapper", () => {
  it("exposes an empty filter set with nothing active", () => {
    expect(EMPTY_MAP_FILTERS).toEqual({ types: [], family: null, beerId: null, confirmedOnly: false, radiusKm: null });
    expect(countMapFilters(EMPTY_MAP_FILTERS)).toBe(0);
  });

  it("reads every filter of the address", () => {

    const filters = searchParamsToMapFilters(new URLSearchParams("type=bar&type=shop&family=stout&beer=7&confirmed=1&radius=5"));
    expect(filters).toEqual(FULL_FILTERS);
  });

  it("gives the empty filters for a bare address", () => {
    expect(searchParamsToMapFilters(new URLSearchParams(""))).toEqual(EMPTY_MAP_FILTERS);
  });

  it("ignores an invalid place type and keeps the valid ones once", () => {

    const filters = searchParamsToMapFilters(new URLSearchParams("type=castle&type=brewery&type=brewery&type="));
    expect(filters.types).toEqual([VenueTypeEnum.BREWERY]);
  });

  it("ignores an unknown family", () => {
    expect(searchParamsToMapFilters(new URLSearchParams("family=wine")).family).toBeNull();
  });

  it.each(["abc", "0", "-3", "7x", "1.5", ""])("ignores the beer value %j", (value) => {
    expect(searchParamsToMapFilters(new URLSearchParams({ beer: value })).beerId).toBeNull();
  });

  it.each(["0", "true", "yes", ""])("keeps confirmed off for the value %j", (value) => {
    expect(searchParamsToMapFilters(new URLSearchParams({ confirmed: value })).confirmedOnly).toBe(false);
  });

  it.each(["1", "2", "5", "10"])("accepts the radius option %s", (value) => {
    expect(searchParamsToMapFilters(new URLSearchParams({ radius: value })).radiusKm).toBe(Number(value));
  });

  it.each(["3", "50", "0", "-1", "abc", ""])("ignores the radius %j outside the options", (value) => {
    expect(searchParamsToMapFilters(new URLSearchParams({ radius: value })).radiusKm).toBeNull();
  });

  it("keeps the valid filters when others are invalid", () => {

    const filters = searchParamsToMapFilters(new URLSearchParams("type=bar&family=wine&beer=abc&confirmed=1&radius=3"));
    expect(filters).toEqual({ types: [VenueTypeEnum.BAR], family: null, beerId: null, confirmedOnly: true, radiusKm: null });
  });

  it("writes every active filter into the address", () => {
    expect(mapFiltersToSearchParams(FULL_FILTERS).toString()).toBe("type=bar&type=shop&family=stout&beer=7&confirmed=1&radius=5");
  });

  it("writes nothing for the empty filters", () => {
    expect(mapFiltersToSearchParams(EMPTY_MAP_FILTERS).toString()).toBe("");
  });

  it("round-trips the filters through the address", () => {
    expect(searchParamsToMapFilters(mapFiltersToSearchParams(FULL_FILTERS))).toEqual(FULL_FILTERS);
  });

  it("counts one per place type and one per other active filter", () => {
    expect(countMapFilters(FULL_FILTERS)).toBe(6);
    expect(countMapFilters({ ...EMPTY_MAP_FILTERS, types: [VenueTypeEnum.SHOP] })).toBe(1);
    expect(countMapFilters({ ...EMPTY_MAP_FILTERS, family: BeerFamilyEnum.STOUT })).toBe(1);
    expect(countMapFilters({ ...EMPTY_MAP_FILTERS, beerId: 7 })).toBe(1);
    expect(countMapFilters({ ...EMPTY_MAP_FILTERS, confirmedOnly: true })).toBe(1);
    expect(countMapFilters({ ...EMPTY_MAP_FILTERS, radiusKm: 2 })).toBe(1);
  });
});
