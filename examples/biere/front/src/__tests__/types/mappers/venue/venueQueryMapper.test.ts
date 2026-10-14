import type { VenueQuery } from "@/types/models/venue/venueQuery";
import { EMPTY_VENUE_QUERY, venueQueryToSearchParams } from "@/types/mappers/venue/venueQueryMapper";
import { BeerFamilyEnum } from "@/types/enums/beer/beerFamilyEnum";
import { VenueTypeEnum } from "@/types/enums/venue/venueTypeEnum";

describe("EMPTY_VENUE_QUERY", () => {
  it("carries no filter at all", async () => {

    expect(EMPTY_VENUE_QUERY).toEqual({
      bounds: null,
      types: [],
      family: null,
      beerId: null,
      confirmedOnly: false,
      undiscovered: false,
      visited: false,
      position: null,
      radiusKm: null,
      q: "",
    });
  });
});

describe("venueQueryToSearchParams", () => {
  it("sends nothing for an empty query", async () => {

    expect(venueQueryToSearchParams(EMPTY_VENUE_QUERY).toString()).toBe("");
  });

  it("sends every contract field of a full query, repeating the types", async () => {
    const query: VenueQuery = {
      ...EMPTY_VENUE_QUERY,
      bounds: { north: 48.9, south: 48.8, east: 2.4, west: 2.2 },
      types: [VenueTypeEnum.BAR, VenueTypeEnum.SHOP],
      family: BeerFamilyEnum.IPA,
      beerId: 7,
      confirmedOnly: true,
      undiscovered: true,
      visited: true,
      position: { latitude: 48.85, longitude: 2.35 },
      radiusKm: 5,
      q: "acad",
    };

    expect(venueQueryToSearchParams(query).toString()).toBe(
      "north=48.9&south=48.8&east=2.4&west=2.2&type=bar&type=shop&beer=7&family=ipa&confirmedOnly=true&undiscovered=true&visited=true&latitude=48.85&longitude=2.35&radiusKm=5&q=acad",
    );
  });

  it("keeps zero coordinates, which are values and not empties", async () => {

    const params = venueQueryToSearchParams({
      ...EMPTY_VENUE_QUERY,
      bounds: { north: 0, south: -10, east: 0, west: -5 },
      position: { latitude: 0, longitude: 0 },
    });

    expect(params.toString()).toBe("north=0&south=-10&east=0&west=-5&latitude=0&longitude=0");
  });

  it("omits confirmedOnly when it is false and every other empty value", async () => {

    const params = venueQueryToSearchParams({ ...EMPTY_VENUE_QUERY, types: [VenueTypeEnum.BREWERY], confirmedOnly: false });

    expect(params.toString()).toBe("type=brewery");
    expect(params.has("confirmedOnly")).toBe(false);
  });

  it("US9 sends undiscovered=true only when it is on", async () => {
    expect(venueQueryToSearchParams({ ...EMPTY_VENUE_QUERY, undiscovered: true }).toString()).toBe("undiscovered=true");
    expect(venueQueryToSearchParams({ ...EMPTY_VENUE_QUERY, undiscovered: false }).has("undiscovered")).toBe(false);
  });

  it("US9 sends visited=true only when it is on", async () => {
    expect(venueQueryToSearchParams({ ...EMPTY_VENUE_QUERY, visited: true }).toString()).toBe("visited=true");
    expect(venueQueryToSearchParams({ ...EMPTY_VENUE_QUERY, visited: false }).has("visited")).toBe(false);
  });

  it("sends the trimmed search text as q", async () => {
    const params = venueQueryToSearchParams({ ...EMPTY_VENUE_QUERY, q: "  acad  " });

    expect(params.toString()).toBe("q=acad");
  });

  it.each(["", "   "])("omits q when the text is blank (%j)", async (q) => {
    const params = venueQueryToSearchParams({ ...EMPTY_VENUE_QUERY, q });

    expect(params.has("q")).toBe(false);
    expect(params.toString()).toBe("");
  });
});
