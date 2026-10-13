import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { Test } from "@nestjs/testing";
import type { TestingModule } from "@nestjs/testing";
import type { Repository } from "typeorm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BeersRepository } from "@/modules/beers/beers.repository";
import { Beer } from "@/modules/beers/entities/beer.entity";
import { BeerStyle } from "@/modules/beers/entities/beer-style.entity";
import { Brewery } from "@/modules/beers/entities/brewery.entity";
import { BeerAromaEnum } from "@/modules/beers/enums/beer-aroma.enum";
import type { BeerFilters } from "@/modules/beers/dtos/beer-filters.dto";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";
import { BeerSortEnum } from "@/modules/beers/enums/beer-sort.enum";
import { normalizeSearchText } from "@/common/text/normalize-search-text";
import { inMemoryDatabase } from "@/__tests__/support/test-database";

const BREWERIES = [
  { id: 1, name: "Brasserie Zeta", country: "BE", city: "Namur" },
  { id: 2, name: "Alpha Brewery", country: "DE", city: "Berlin" },
  { id: 3, name: "Brasserie Etoile", country: "FR", city: "Lille" },
];

const STYLES = [
  { id: 1, name: "Stout irlandais", family: BeerFamilyEnum.STOUT, description: "Noire", ebcMin: 1, ebcMax: 2, ibuMin: 3, ibuMax: 4, abvMin: 5, abvMax: 6 },
  { id: 2, name: "Blonde belge", family: BeerFamilyEnum.BLONDE, description: "Claire", ebcMin: 1, ebcMax: 2, ibuMin: 3, ibuMax: 4, abvMin: 5, abvMax: 6 },
];

const BEERS: readonly [number, string, number, number, number][] = [
  [1, "Pêcheresse Rose", 3, 2, 2.5],
  [2, "alpha Gold", 2, 2, 5],
  [3, "Zeta Strong", 1, 1, 9],
  [4, "Hop 100% Pure", 2, 2, 5],
  [5, "Brew 1000", 1, 2, 5],
  [6, "Beer_One", 1, 1, 5],
  [7, "BeerXOne", 3, 1, 5],
  [8, "twin", 3, 1, 4],
  [9, "Twin", 3, 1, 4],
];

const NO_FILTERS: BeerFilters = {};

const idsOf = (page: { items: readonly { id: number }[] }): number[] => page.items.map((item) => item.id);

describe("BeersRepository", () => {
  let moduleRef: TestingModule;
  let repository: BeersRepository;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [inMemoryDatabase(), TypeOrmModule.forFeature([Beer, BeerStyle, Brewery])],
      providers: [BeersRepository],
    }).compile();
    repository = moduleRef.get(BeersRepository);
    await moduleRef.get<Repository<Brewery>>(getRepositoryToken(Brewery)).insert(BREWERIES);
    await moduleRef.get<Repository<BeerStyle>>(getRepositoryToken(BeerStyle)).insert(STYLES);
    await moduleRef.get<Repository<Beer>>(getRepositoryToken(Beer)).insert(
      BEERS.map(([id, name, breweryId, styleId, abv]) => {
        const brewery = BREWERIES.find((entry) => entry.id === breweryId);
        return {
          id,
          name,
          breweryId,
          styleId,
          abv,
          ibu: null,
          ebc: null,
          description: `Description ${id}`,
          aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.SOUR],
          formats: [BeerFormatEnum.BOTTLE, BeerFormatEnum.CAN],
          country: brewery?.country ?? "BE",
          searchText: normalizeSearchText(`${name} ${brewery?.name ?? ""}`),
        };
      }),
    );
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it("returns every beer when the search is empty", async () => {
    const page = await repository.findPage("", NO_FILTERS, BeerSortEnum.NAME, 1, 50);

    expect(page.total).toBe(BEERS.length);
    expect(page.items).toHaveLength(BEERS.length);
  });

  it("finds a beer whatever the accents and the case of the search", async () => {
    expect(idsOf(await repository.findPage("pecheresse", NO_FILTERS, BeerSortEnum.NAME, 1, 20))).toEqual([1]);
    expect(idsOf(await repository.findPage("PÊCHERESSE", NO_FILTERS, BeerSortEnum.NAME, 1, 20))).toEqual([1]);
  });

  it("finds beers by their brewery name", async () => {
    const page = await repository.findPage("alpha brewery", NO_FILTERS, BeerSortEnum.NAME, 1, 20);

    expect(idsOf(page)).toEqual([2, 4]);
    expect(page.total).toBe(2);
  });

  it("finds beers by the accented brewery search term", async () => {
    expect(idsOf(await repository.findPage("etoile", NO_FILTERS, BeerSortEnum.NAME, 1, 20))).toEqual([7, 1, 8, 9]);
  });

  it("treats the percent sign literally", async () => {
    const page = await repository.findPage("100%", NO_FILTERS, BeerSortEnum.NAME, 1, 20);

    expect(idsOf(page)).toEqual([4]);
    expect(page.total).toBe(1);
  });

  it("treats the underscore literally", async () => {
    expect(idsOf(await repository.findPage("beer_one", NO_FILTERS, BeerSortEnum.NAME, 1, 20))).toEqual([6]);
  });

  it("treats the backslash literally", async () => {
    const page = await repository.findPage("\\", NO_FILTERS, BeerSortEnum.NAME, 1, 20);

    expect(page.items).toEqual([]);
    expect(page.total).toBe(0);
  });

  it("sorts by lowercase name then id", async () => {
    const page = await repository.findPage("", NO_FILTERS, BeerSortEnum.NAME, 1, 50);

    expect(idsOf(page)).toEqual([2, 6, 7, 5, 4, 1, 8, 9, 3]);
  });

  it("sorts by decreasing degree then lowercase name", async () => {
    const page = await repository.findPage("", NO_FILTERS, BeerSortEnum.ABV, 1, 50);

    expect(idsOf(page)).toEqual([3, 2, 6, 7, 5, 4, 8, 9, 1]);
  });

  it("sorts by lowercase brewery name then lowercase beer name", async () => {
    const page = await repository.findPage("", NO_FILTERS, BeerSortEnum.BREWERY, 1, 50);

    expect(idsOf(page)).toEqual([2, 4, 7, 1, 8, 9, 6, 5, 3]);
  });

  it("slices the requested page and keeps the total", async () => {
    const second = await repository.findPage("", NO_FILTERS, BeerSortEnum.NAME, 2, 4);

    expect(idsOf(second)).toEqual([4, 1, 8, 9]);
    expect(second.total).toBe(BEERS.length);
    expect(idsOf(await repository.findPage("", NO_FILTERS, BeerSortEnum.NAME, 3, 4))).toEqual([3]);
  });

  it("returns no item and the total past the last page", async () => {
    const page = await repository.findPage("", NO_FILTERS, BeerSortEnum.NAME, 4, 4);

    expect(page.items).toEqual([]);
    expect(page.total).toBe(BEERS.length);
  });

  it("returns the beers as DTOs with brewery and style", async () => {
    const page = await repository.findPage("pecheresse", NO_FILTERS, BeerSortEnum.NAME, 1, 20);

    expect(page.items).toEqual([
      {
        id: 1,
        name: "Pêcheresse Rose",
        breweryName: "Brasserie Etoile",
        country: "FR",
        styleId: 2,
        styleName: "Blonde belge",
        family: BeerFamilyEnum.BLONDE,
        abv: 2.5,
        aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.SOUR],
        formats: [BeerFormatEnum.BOTTLE, BeerFormatEnum.CAN],
        description: "Description 1",
      },
    ]);
  });

  it("returns one beer as a DTO", async () => {
    expect(await repository.findById(3)).toEqual({
      id: 3,
      name: "Zeta Strong",
      breweryName: "Brasserie Zeta",
      country: "BE",
      styleId: 1,
      styleName: "Stout irlandais",
      family: BeerFamilyEnum.STOUT,
      abv: 9,
      aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.SOUR],
      formats: [BeerFormatEnum.BOTTLE, BeerFormatEnum.CAN],
      description: "Description 3",
    });
  });

  it("returns null for an unknown id", async () => {
    expect(await repository.findById(9999)).toBeNull();
  });

  describe("findByIds", () => {
    it("returns the requested beers with their brewery and style names, ordered by id", async () => {
      const found = await repository.findByIds([3, 1]);

      expect(found.map((beer) => beer.id)).toEqual([1, 3]);
      expect(found[0]).toMatchObject({ name: "Pêcheresse Rose", breweryName: "Brasserie Etoile", styleName: "Blonde belge" });
      expect(found[1]).toMatchObject({ name: "Zeta Strong", breweryName: "Brasserie Zeta", styleName: "Stout irlandais" });
    });

    it("ignores unknown ids and leaves the other beers out", async () => {
      const found = await repository.findByIds([2, 9999]);

      expect(found.map((beer) => beer.id)).toEqual([2]);
    });

    it("returns an empty list for an empty list of ids without querying the database", async () => {
      const find = vi.spyOn(moduleRef.get<Repository<Beer>>(getRepositoryToken(Beer)), "find");

      await expect(repository.findByIds([])).resolves.toEqual([]);
      expect(find).not.toHaveBeenCalled();
    });

    it("returns the requested beers as DTOs ordered by id whatever the order asked", async () => {
      const beers = await repository.findByIds([3, 1]);

      expect(beers.map((beer) => beer.id)).toEqual([1, 3]);
      expect(beers[1]).toEqual({
        id: 3,
        name: "Zeta Strong",
        breweryName: "Brasserie Zeta",
        country: "BE",
        styleId: 1,
        styleName: "Stout irlandais",
        family: BeerFamilyEnum.STOUT,
        abv: 9,
        aromas: [BeerAromaEnum.FRUITY, BeerAromaEnum.SOUR],
        formats: [BeerFormatEnum.BOTTLE, BeerFormatEnum.CAN],
        description: "Description 3",
      });
    });

    it("ignores an unknown id and the beers that were not asked", async () => {
      expect((await repository.findByIds([2, 9999])).map((beer) => beer.id)).toEqual([2]);
    });

    it("returns an empty list for no id", async () => {
      expect(await repository.findByIds([])).toEqual([]);
    });
  });
});

describe("BeersRepository filters and facets", () => {
  const FILTER_STYLES = [
    { id: 3, name: "Dubbel trappiste", family: BeerFamilyEnum.TRAPPIST, description: "Brune", ebcMin: 1, ebcMax: 2, ibuMin: 3, ibuMax: 4, abvMin: 5, abvMax: 6 },
  ];
  const FILTER_BEERS: readonly [number, number, number, number, BeerFormatEnum[]][] = [
    [10, 1, 3, 10, [BeerFormatEnum.BOTTLE]],
    [11, 1, 3, 8, [BeerFormatEnum.BOTTLE, BeerFormatEnum.DRAFT]],
    [12, 2, 1, 0.5, [BeerFormatEnum.CAN]],
    [13, 3, 2, 5, [BeerFormatEnum.BOTTLE, BeerFormatEnum.CAN]],
    [14, 1, 2, 5, [BeerFormatEnum.DRAFT]],
    [15, 3, 1, 4.5, [BeerFormatEnum.CAN]],
    [16, 2, 3, 9, [BeerFormatEnum.BOTTLE]],
  ];
  let moduleRef: TestingModule;
  let repository: BeersRepository;

  const findIds = async (filters: BeerFilters, search = ""): Promise<number[]> =>
    idsOf(await repository.findPage(search, filters, BeerSortEnum.NAME, 1, 50));

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [inMemoryDatabase(), TypeOrmModule.forFeature([Beer, BeerStyle, Brewery])],
      providers: [BeersRepository],
    }).compile();
    repository = moduleRef.get(BeersRepository);
    await moduleRef.get<Repository<Brewery>>(getRepositoryToken(Brewery)).insert(BREWERIES);
    await moduleRef.get<Repository<BeerStyle>>(getRepositoryToken(BeerStyle)).insert([...STYLES, ...FILTER_STYLES]);
    await moduleRef.get<Repository<Beer>>(getRepositoryToken(Beer)).insert(
      FILTER_BEERS.map(([id, breweryId, styleId, abv, formats]) => {
        const brewery = BREWERIES.find((entry) => entry.id === breweryId);
        const name = `Beer ${String.fromCharCode("A".charCodeAt(0) + id - 10)}`;
        return {
          id,
          name,
          breweryId,
          styleId,
          abv,
          ibu: null,
          ebc: null,
          description: `Description ${id}`,
          aromas: [BeerAromaEnum.FRUITY],
          formats,
          country: brewery?.country ?? "BE",
          searchText: normalizeSearchText(`${name} ${brewery?.name ?? ""}`),
        };
      }),
    );
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it("filters by family", async () => {
    const page = await repository.findPage("", { family: BeerFamilyEnum.TRAPPIST }, BeerSortEnum.NAME, 1, 50);

    expect(idsOf(page)).toEqual([10, 11, 16]);
    expect(page.total).toBe(3);
  });

  it("filters by styles with an OR between them", async () => {
    expect(await findIds({ styleIds: [1] })).toEqual([12, 15]);
    expect(await findIds({ styleIds: [1, 2] })).toEqual([12, 13, 14, 15]);
  });

  it("filters by countries with an OR between them", async () => {
    expect(await findIds({ countries: ["DE"] })).toEqual([12, 16]);
    expect(await findIds({ countries: ["BE", "DE"] })).toEqual([10, 11, 12, 14, 16]);
  });

  it("filters by formats with an OR between them", async () => {
    expect(await findIds({ formats: [BeerFormatEnum.DRAFT] })).toEqual([11, 14]);
    expect(await findIds({ formats: [BeerFormatEnum.CAN, BeerFormatEnum.DRAFT] })).toEqual([11, 12, 13, 14, 15]);
  });

  it("includes both degree bounds", async () => {
    expect(await findIds({ abvMin: 8 })).toEqual([10, 11, 16]);
    expect(await findIds({ abvMax: 0.5 })).toEqual([12]);
    expect(await findIds({ abvMin: 4.5, abvMax: 5 })).toEqual([13, 14, 15]);
  });

  it("combines the dimensions with an AND and the search", async () => {
    const page = await repository.findPage(
      "",
      { countries: ["BE"], family: BeerFamilyEnum.TRAPPIST, formats: [BeerFormatEnum.CAN] },
      BeerSortEnum.NAME,
      1,
      50,
    );

    expect(page.items).toEqual([]);
    expect(page.total).toBe(0);
    expect(await findIds({ countries: ["BE"], family: BeerFamilyEnum.TRAPPIST })).toEqual([10, 11]);
    expect(await findIds({ countries: ["BE"] }, "beer b")).toEqual([11]);
  });

  it("counts every dimension without any filter, ordered as the contract says", async () => {
    expect(await repository.findFacets("", NO_FILTERS)).toEqual({
      families: [
        { value: "blonde", count: 2 },
        { value: "stout", count: 2 },
        { value: "trappist", count: 3 },
      ],
      countries: [
        { value: "BE", count: 3 },
        { value: "DE", count: 2 },
        { value: "FR", count: 2 },
      ],
      formats: [
        { value: "bottle", count: 4 },
        { value: "can", count: 3 },
        { value: "draft", count: 2 },
      ],
    });
  });

  it("applies the family filter to countries and formats but not to families, and omits zero counts", async () => {
    const facets = await repository.findFacets("", { family: BeerFamilyEnum.TRAPPIST });

    expect(facets.families).toEqual([
      { value: "blonde", count: 2 },
      { value: "stout", count: 2 },
      { value: "trappist", count: 3 },
    ]);
    expect(facets.countries).toEqual([
      { value: "BE", count: 2 },
      { value: "DE", count: 1 },
    ]);
    expect(facets.formats).toEqual([
      { value: "bottle", count: 3 },
      { value: "draft", count: 1 },
    ]);
  });

  it("ignores the style filter in the families but not in countries and formats", async () => {
    const facets = await repository.findFacets("", { styleIds: [1] });

    expect(facets.families).toEqual([
      { value: "blonde", count: 2 },
      { value: "stout", count: 2 },
      { value: "trappist", count: 3 },
    ]);
    expect(facets.countries).toEqual([
      { value: "DE", count: 1 },
      { value: "FR", count: 1 },
    ]);
    expect(facets.formats).toEqual([{ value: "can", count: 2 }]);
  });

  it("ignores the country and the format filters in their own facet only", async () => {
    const facets = await repository.findFacets("", { countries: ["BE"], formats: [BeerFormatEnum.CAN] });

    expect(facets.families).toEqual([]);
    expect(facets.countries).toEqual([
      { value: "FR", count: 2 },
      { value: "DE", count: 1 },
    ]);
    expect(facets.formats).toEqual([
      { value: "bottle", count: 2 },
      { value: "draft", count: 2 },
    ]);
  });

  it("applies the search and the degree bounds to the three facets", async () => {
    expect(await repository.findFacets("beer g", NO_FILTERS)).toEqual({
      families: [{ value: "trappist", count: 1 }],
      countries: [{ value: "DE", count: 1 }],
      formats: [{ value: "bottle", count: 1 }],
    });
    expect(await repository.findFacets("", { abvMin: 9, abvMax: 10 })).toEqual({
      families: [{ value: "trappist", count: 2 }],
      countries: [
        { value: "BE", count: 1 },
        { value: "DE", count: 1 },
      ],
      formats: [{ value: "bottle", count: 2 }],
    });
  });
  it("keeps only the listed beers when beerIds is given", async () => {
    const page = await repository.findPage("", { beerIds: [16, 10, 13] }, BeerSortEnum.NAME, 1, 50);

    expect(idsOf(page)).toEqual([10, 13, 16]);
    expect(page.total).toBe(3);
  });

  it("finds nothing, in the page and in the three facets, when beerIds is empty", async () => {
    const page = await repository.findPage("", { beerIds: [] }, BeerSortEnum.NAME, 1, 50);

    expect(page.items).toEqual([]);
    expect(page.total).toBe(0);
    expect(await repository.findFacets("", { beerIds: [] })).toEqual({ families: [], countries: [], formats: [] });
  });

  it("drops the excluded beers when excludedBeerIds is given", async () => {
    const page = await repository.findPage("", { excludedBeerIds: [10, 11, 12] }, BeerSortEnum.NAME, 1, 50);

    expect(idsOf(page)).toEqual([13, 14, 15, 16]);
    expect(page.total).toBe(4);
  });

  it("does not filter when excludedBeerIds is empty", async () => {
    expect(await findIds({ excludedBeerIds: [] })).toEqual([10, 11, 12, 13, 14, 15, 16]);
  });

  it("combines beerIds, excludedBeerIds and the other filters with an AND", async () => {
    expect(await findIds({ beerIds: [10, 11, 12], excludedBeerIds: [11] })).toEqual([10, 12]);
    expect(await findIds({ beerIds: [10, 12, 16], family: BeerFamilyEnum.TRAPPIST })).toEqual([10, 16]);
  });

  it("counts the facets among the listed beers only", async () => {
    expect(await repository.findFacets("", { beerIds: [10, 11, 12] })).toEqual({
      families: [
        { value: "stout", count: 1 },
        { value: "trappist", count: 2 },
      ],
      countries: [
        { value: "BE", count: 2 },
        { value: "DE", count: 1 },
      ],
      formats: [
        { value: "bottle", count: 2 },
        { value: "can", count: 1 },
        { value: "draft", count: 1 },
      ],
    });
  });

  it("counts the facets without the excluded beers", async () => {
    expect(await repository.findFacets("", { excludedBeerIds: [10, 11, 12] })).toEqual({
      families: [
        { value: "blonde", count: 2 },
        { value: "stout", count: 1 },
        { value: "trappist", count: 1 },
      ],
      countries: [
        { value: "FR", count: 2 },
        { value: "BE", count: 1 },
        { value: "DE", count: 1 },
      ],
      formats: [
        { value: "bottle", count: 2 },
        { value: "can", count: 2 },
        { value: "draft", count: 1 },
      ],
    });
  });

});

describe("BeersRepository style groups", () => {
  let moduleRef: TestingModule;
  let repository: BeersRepository;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [inMemoryDatabase(), TypeOrmModule.forFeature([Beer, BeerStyle, Brewery])],
      providers: [BeersRepository],
    }).compile();
    repository = moduleRef.get(BeersRepository);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it("returns one group per family in the enum order, empty ones included", async () => {
    const groups = await repository.findStyleGroups();

    expect(groups.map((group) => group.family)).toEqual(Object.values(BeerFamilyEnum));
    expect(groups.every((group) => group.styles.length === 0)).toBe(true);
  });

  it("orders the styles of a family by name, whatever the insertion order", async () => {
    const styles = moduleRef.get<Repository<BeerStyle>>(getRepositoryToken(BeerStyle));
    const base = { ebcMin: 1, ebcMax: 2, ibuMin: 3, ibuMax: 4, abvMin: 5, abvMax: 6 };
    await styles.insert([
      { id: 1, name: "Zeta stout", family: BeerFamilyEnum.STOUT, description: "Z", ...base },
      { id: 2, name: "Alpha stout", family: BeerFamilyEnum.STOUT, description: "A", ...base },
      { id: 3, name: "Mid stout", family: BeerFamilyEnum.STOUT, description: "M", ...base },
      { id: 4, name: "Only blonde", family: BeerFamilyEnum.BLONDE, description: "B", ...base },
    ]);

    const groups = await repository.findStyleGroups();

    expect(groups.find((group) => group.family === BeerFamilyEnum.STOUT)).toEqual({
      family: BeerFamilyEnum.STOUT,
      styles: [
        { id: 2, name: "Alpha stout", description: "A" },
        { id: 3, name: "Mid stout", description: "M" },
        { id: 1, name: "Zeta stout", description: "Z" },
      ],
    });
    expect(groups.find((group) => group.family === BeerFamilyEnum.BLONDE)?.styles).toEqual([
      { id: 4, name: "Only blonde", description: "B" },
    ]);
  });
});
