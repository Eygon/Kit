import { beerKeys } from "@/utils/queryKeys/beerQueryKeys";
import { EMPTY_BEER_QUERY } from "@/types/mappers/beer/beerQueryMapper";

describe("beerKeys", () => {
  it("roots every beer key under all", () => {
    expect(beerKeys.all()).toEqual(["beers"]);
    expect(beerKeys.catalog(EMPTY_BEER_QUERY).slice(0, 1)).toEqual(beerKeys.all());
  });

  it("puts the whole query in the catalog key", () => {
    expect(beerKeys.catalog(EMPTY_BEER_QUERY)).toEqual(["beers", "catalog", EMPTY_BEER_QUERY]);
  });

  it("gives equal keys to equal queries and distinct keys to distinct ones", () => {
    expect(beerKeys.catalog({ ...EMPTY_BEER_QUERY })).toEqual(beerKeys.catalog(EMPTY_BEER_QUERY));
    expect(beerKeys.catalog({ ...EMPTY_BEER_QUERY, search: "ipa" })).not.toEqual(beerKeys.catalog(EMPTY_BEER_QUERY));
    expect(beerKeys.catalog({ ...EMPTY_BEER_QUERY, styleIds: [3] })).not.toEqual(beerKeys.catalog(EMPTY_BEER_QUERY));
  });
});

describe("beerKeys.preview", () => {
  it("roots the preview key under all and puts the whole query in it", () => {
    expect(beerKeys.preview(EMPTY_BEER_QUERY)).toEqual(["beers", "preview", EMPTY_BEER_QUERY]);
    expect(beerKeys.preview(EMPTY_BEER_QUERY).slice(0, 1)).toEqual(beerKeys.all());
  });

  it("never collides with the catalog key of the same query", () => {
    expect(beerKeys.preview(EMPTY_BEER_QUERY)).not.toEqual(beerKeys.catalog(EMPTY_BEER_QUERY));
  });

  it("gives equal keys to equal queries and distinct keys to distinct ones", () => {
    expect(beerKeys.preview({ ...EMPTY_BEER_QUERY })).toEqual(beerKeys.preview(EMPTY_BEER_QUERY));
    expect(beerKeys.preview({ ...EMPTY_BEER_QUERY, countries: ["BE"] })).not.toEqual(beerKeys.preview(EMPTY_BEER_QUERY));
  });
});

describe("beerKeys.detail", () => {
  it("roots the detail key under all and puts the id in it", () => {
    expect(beerKeys.detail(7)).toEqual(["beers", "detail", 7]);
    expect(beerKeys.detail(7).slice(0, 1)).toEqual(beerKeys.all());
  });

  it("gives distinct keys to distinct ids and never collides with a catalog key", () => {
    expect(beerKeys.detail(7)).toEqual(beerKeys.detail(7));
    expect(beerKeys.detail(7)).not.toEqual(beerKeys.detail(8));
    expect(beerKeys.detail(7)).not.toEqual(beerKeys.catalog(EMPTY_BEER_QUERY));
  });
});
