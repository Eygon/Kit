import { beerPageDtoToModel } from "@/types/mappers/beer/beerPageMapper";

const beerDto = (id: number, family = "ipa") => ({
  id,
  name: `Beer ${id}`,
  breweryName: "Brewery",
  country: "BE",
  styleId: 1,
  styleName: "Style",
  family,
  abv: 5,
  aromas: ["hoppy", "weird"],
  formats: ["can"],
  description: "Description",
});

const pageDto = {
  items: [beerDto(1), beerDto(2, "martian")],
  total: 45,
  page: 2,
  size: 20,
  facets: {
    families: [
      { value: "ipa", count: 12 },
      { value: "martian", count: 3 },
      { value: "stout", count: 1 },
    ],
    countries: [
      { value: "BE", count: 20 },
      { value: "DE", count: 9 },
    ],
    formats: [
      { value: "bottle", count: 30 },
      { value: "keg", count: 4 },
      { value: "draft", count: 2 },
    ],
  },
};

describe("beerPageDtoToModel", () => {
  it("returns the items mapped through the beer mapper, with total, page and size", () => {
    const page = beerPageDtoToModel(pageDto);

    expect(page.total).toBe(45);
    expect(page.page).toBe(2);
    expect(page.size).toBe(20);
    expect(page.items.map((beer: { id: number; family: unknown; aromas: unknown }) => [beer.id, beer.family, beer.aromas])).toEqual([
      [1, "ipa", ["hoppy"]],
      [2, null, ["hoppy"]],
    ]);
  });

  it("maps the facets and drops the unknown family and format values", () => {
    const { facets } = beerPageDtoToModel(pageDto);

    expect(facets.families).toEqual([
      { value: "ipa", count: 12 },
      { value: "stout", count: 1 },
    ]);
    expect(facets.formats).toEqual([
      { value: "bottle", count: 30 },
      { value: "draft", count: 2 },
    ]);
    expect(facets.countries).toEqual([
      { value: "BE", count: 20 },
      { value: "DE", count: 9 },
    ]);
  });

  it("maps an empty page", () => {
    const page = beerPageDtoToModel({
      items: [],
      total: 0,
      page: 1,
      size: 20,
      facets: { families: [], countries: [], formats: [] },
    });

    expect(page).toEqual({
      items: [],
      total: 0,
      page: 1,
      size: 20,
      facets: { families: [], countries: [], formats: [] },
    });
  });
});
