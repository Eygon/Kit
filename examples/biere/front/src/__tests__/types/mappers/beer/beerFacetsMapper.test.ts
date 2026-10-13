import { beerFacetsDtoToModel } from "@/types/mappers/beer/beerFacetsMapper";

describe("beerFacetsDtoToModel", () => {
  it("keeps the known families and formats and every country", () => {
    expect(
      beerFacetsDtoToModel({
        families: [
          { value: "ipa", count: 12 },
          { value: "stout", count: 1 },
        ],
        countries: [
          { value: "BE", count: 20 },
          { value: "DE", count: 9 },
        ],
        formats: [
          { value: "bottle", count: 30 },
          { value: "draft", count: 2 },
        ],
      }),
    ).toEqual({
      families: [
        { value: "ipa", count: 12 },
        { value: "stout", count: 1 },
      ],
      countries: [
        { value: "BE", count: 20 },
        { value: "DE", count: 9 },
      ],
      formats: [
        { value: "bottle", count: 30 },
        { value: "draft", count: 2 },
      ],
    });
  });

  it("drops the unknown family and format values but never a country", () => {
    expect(
      beerFacetsDtoToModel({
        families: [
          { value: "ipa", count: 12 },
          { value: "martian", count: 3 },
        ],
        countries: [{ value: "ZZ", count: 1 }],
        formats: [
          { value: "bottle", count: 30 },
          { value: "keg", count: 4 },
        ],
      }),
    ).toEqual({
      families: [{ value: "ipa", count: 12 }],
      countries: [{ value: "ZZ", count: 1 }],
      formats: [{ value: "bottle", count: 30 }],
    });
  });

  it("maps empty facets", () => {
    expect(beerFacetsDtoToModel({ families: [], countries: [], formats: [] })).toEqual({
      families: [],
      countries: [],
      formats: [],
    });
  });
});
