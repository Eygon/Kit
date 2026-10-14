import { EMPTY_VENUE_QUERY } from "@/types/mappers/venue/venueQueryMapper";
import { venueKeys } from "@/utils/queryKeys/venueQueryKeys";

describe("venueKeys", () => {
  it("roots every venue key under all", async () => {

    expect(venueKeys.all()).toEqual(["venues"]);
    expect(venueKeys.lists()).toEqual(["venues", "list"]);
    expect(venueKeys.list(EMPTY_VENUE_QUERY)).toEqual(["venues", "list", EMPTY_VENUE_QUERY]);
  });

  it("gives equal keys to equal queries and distinct keys to distinct ones", async () => {

    expect(venueKeys.list({ ...EMPTY_VENUE_QUERY })).toEqual(venueKeys.list(EMPTY_VENUE_QUERY));
    expect(venueKeys.list({ ...EMPTY_VENUE_QUERY, beerId: 7 })).not.toEqual(venueKeys.list(EMPTY_VENUE_QUERY));
    expect(venueKeys.list({ ...EMPTY_VENUE_QUERY, confirmedOnly: true })).not.toEqual(venueKeys.list(EMPTY_VENUE_QUERY));
    expect(venueKeys.list({ ...EMPTY_VENUE_QUERY, visited: true })).not.toEqual(venueKeys.list(EMPTY_VENUE_QUERY));
  });
});

describe("venueKeys.beers", () => {
  it("roots the beers of a venue under all, apart from the lists", () => {
    expect(venueKeys.beers(5)).toEqual(["venues", "beers", 5]);
    expect(venueKeys.beers(null)).toEqual(["venues", "beers", null]);
    expect(venueKeys.beers(5).slice(0, 2)).not.toEqual(venueKeys.lists());
  });

  it("gives equal keys to the same venue and distinct keys to distinct venues", () => {
    expect(venueKeys.beers(5)).toEqual(venueKeys.beers(5));
    expect(venueKeys.beers(5)).not.toEqual(venueKeys.beers(6));
    expect(venueKeys.beers(5)).not.toEqual(venueKeys.beers(null));
  });
});

describe("venueKeys.detail", () => {
  it("roots the detail of a venue under all, apart from the lists and the beers", () => {
    expect(venueKeys.detail(5)).toEqual(["venues", "detail", 5]);
    expect(venueKeys.detail(5).slice(0, 2)).not.toEqual(venueKeys.lists());
    expect(venueKeys.detail(5)).not.toEqual(venueKeys.beers(5));
  });

  it("gives equal keys to the same venue and distinct keys to distinct venues", () => {
    expect(venueKeys.detail(5)).toEqual(venueKeys.detail(5));
    expect(venueKeys.detail(5)).not.toEqual(venueKeys.detail(6));
  });
});

describe("venueKeys.search", () => {
  it("sits under the lists so that a list invalidation reaches it, with its own segment", () => {
    const query = { ...EMPTY_VENUE_QUERY, q: "cluny" };

    expect(venueKeys.search(query)).toEqual(["venues", "list", "search", query]);
    expect(venueKeys.search(query).slice(0, 2)).toEqual(venueKeys.lists());
  });

  it("never collides with the map list key of the same query", () => {
    const query = { ...EMPTY_VENUE_QUERY, q: "cluny" };

    expect(venueKeys.search(query)).not.toEqual(venueKeys.list(query));
  });

  it("gives equal keys to equal queries and distinct keys to distinct ones", () => {
    const query = { ...EMPTY_VENUE_QUERY, q: "cluny" };

    expect(venueKeys.search({ ...query })).toEqual(venueKeys.search(query));
    expect(venueKeys.search({ ...query, q: "cluni" })).not.toEqual(venueKeys.search(query));
    expect(venueKeys.search({ ...query, confirmedOnly: true })).not.toEqual(venueKeys.search(query));
  });
});
