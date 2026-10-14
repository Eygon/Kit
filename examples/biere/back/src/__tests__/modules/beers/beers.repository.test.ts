import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { Test } from "@nestjs/testing";
import type { TestingModule } from "@nestjs/testing";
import type { Repository } from "typeorm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BeersRepository } from "@/modules/beers/beers.repository";
import { Beer } from "@/modules/beers/entities/beer.entity";
import { BeerStyle } from "@/modules/beers/entities/beer-style.entity";
import { Review } from "@/modules/beers/entities/review.entity";
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
      imports: [inMemoryDatabase(), TypeOrmModule.forFeature([Beer, BeerStyle, Brewery, Review])],
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
        bitternessLevel: null,
        colorLevel: null,
        styleColorRange: { min: 1, max: 1 },
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
      bitternessLevel: null,
      colorLevel: null,
      styleColorRange: { min: 1, max: 1 },
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
        bitternessLevel: null,
        colorLevel: null,
        styleColorRange: { min: 1, max: 1 },
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
      imports: [inMemoryDatabase(), TypeOrmModule.forFeature([Beer, BeerStyle, Brewery, Review])],
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

  describe("rating sort and minimum rating", () => {
    const MOMENT = new Date("2026-03-01T10:00:00.000Z");
    const FIRST_REVIEWER_ID = 100;

    const rate = async (beerId: number, ratings: readonly number[]): Promise<void> => {
      await moduleRef.get<Repository<Review>>(getRepositoryToken(Review)).insert(
        ratings.map((rating, index) => ({
          userId: FIRST_REVIEWER_ID + index,
          beerId,
          rating,
          text: "",
          sweetness: null,
          acidity: null,
          body: null,
          createdAt: MOMENT,
          updatedAt: MOMENT,
        })),
      );
    };

    const sortedIds = async (filters: BeerFilters = NO_FILTERS): Promise<number[]> =>
      idsOf(await repository.findPage("", filters, BeerSortEnum.RATING, 1, 50));

    it("sorts the rated beers first by average, then by review count, then the unrated by name", async () => {
      await rate(16, [4, 5]);
      await rate(15, [4.5]);
      await rate(12, [3]);

      expect(await sortedIds()).toEqual([16, 15, 12, 10, 11, 13, 14]);
    });

    it("keeps only the beers at or above the minimum rating, in the page, the total and the facets", async () => {
      await rate(10, [3.5, 4, 4, 4, 4]);
      await rate(11, [4]);
      await rate(12, [4.5]);

      const page = await repository.findPage("", { minRating: 4 }, BeerSortEnum.NAME, 1, 50);
      const facets = await repository.findFacets("", { minRating: 4 });

      expect(idsOf(page)).toEqual([11, 12]);
      expect(page.total).toBe(2);
      expect(facets.countries).toEqual([
        { value: "BE", count: 1 },
        { value: "DE", count: 1 },
      ]);
      expect(facets.families).toEqual([
        { value: "stout", count: 1 },
        { value: "trappist", count: 1 },
      ]);
      expect(facets.formats).toEqual([
        { value: "bottle", count: 1 },
        { value: "can", count: 1 },
        { value: "draft", count: 1 },
      ]);
    });

    it("applies the minimum rating together with another filter", async () => {
      await rate(10, [4]);
      await rate(11, [4.5]);
      await rate(12, [5]);

      expect(await findIds({ minRating: 4, beerIds: [10, 12, 13] })).toEqual([10, 12]);
      expect(await findIds({ minRating: 4.5, beerIds: [10, 12, 13] })).toEqual([12]);
      expect(await findIds({ minRating: 4, family: BeerFamilyEnum.TRAPPIST })).toEqual([10, 11]);
    });

    it("filters and sorts on the average rounded to one decimal", async () => {
      await rate(10, [...Array.from({ length: 19 }, () => 4), 3.5]);
      await rate(11, [4]);

      expect(await findIds({ minRating: 4 })).toEqual([10, 11]);
      expect((await sortedIds()).slice(0, 2)).toEqual([10, 11]);
    });

    it("sorts alphabetically by rating when no beer has a review", async () => {
      expect(await sortedIds()).toEqual([10, 11, 12, 13, 14, 15, 16]);
    });

    it("answers nothing for a minimum rating no beer reaches", async () => {
      await rate(10, [4]);

      expect(await findIds({ minRating: 5 })).toEqual([]);
    });
  });
});

describe("BeersRepository style groups", () => {
  let moduleRef: TestingModule;
  let repository: BeersRepository;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [inMemoryDatabase(), TypeOrmModule.forFeature([Beer, BeerStyle, Brewery, Review])],
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

describe("BeersRepository reviews", () => {
  let moduleRef: TestingModule;
  let repository: BeersRepository;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [inMemoryDatabase(), TypeOrmModule.forFeature([Beer, BeerStyle, Brewery, Review])],
      providers: [BeersRepository],
    }).compile();
    repository = moduleRef.get(BeersRepository);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  const ALICE = 1;
  const BOB = 2;
  const ORVAL = 4;
  const FIRST_MOMENT = new Date("2026-03-01T10:00:00.000Z");
  const SECOND_MOMENT = new Date("2026-03-05T12:30:00.000Z");
  const row = (overrides: Partial<Omit<Review, "id">> = {}): Omit<Review, "id"> => ({
    userId: ALICE,
    beerId: ORVAL,
    rating: 4.5,
    text: "Superbe amertume",
    sweetness: 2,
    acidity: null,
    body: null,
    createdAt: FIRST_MOMENT,
    updatedAt: FIRST_MOMENT,
    ...overrides,
  });
  const reviews = () => moduleRef.get<Repository<Review>>(getRepositoryToken(Review));

  describe("findReviewsByUsers", () => {
    const CAROL = 3;
    const DAVE = 4;
    const LATER_MOMENT = new Date("2026-03-09T08:00:00.000Z");

    it("answers an empty list for no user, even when reviews exist", async () => {
      await reviews().insert(row());

      expect(await repository.findReviewsByUsers([])).toEqual([]);
    });

    it("finds the reviews of the given users only, the most recently modified first, as records with ISO dates", async () => {
      await reviews().insert([
        row({ userId: DAVE, beerId: 7, text: "Dave", updatedAt: LATER_MOMENT }),
        row({ userId: BOB, text: "Bob", rating: 3, updatedAt: FIRST_MOMENT }),
        row({ userId: CAROL, beerId: 5, text: "Carol", rating: 2, updatedAt: SECOND_MOMENT }),
      ]);

      expect(await repository.findReviewsByUsers([BOB, CAROL])).toEqual([
        {
          id: 3,
          userId: CAROL,
          beerId: 5,
          rating: 2,
          text: "Carol",
          sweetness: 2,
          acidity: null,
          body: null,
          createdAt: FIRST_MOMENT.toISOString(),
          updatedAt: SECOND_MOMENT.toISOString(),
        },
        {
          id: 2,
          userId: BOB,
          beerId: ORVAL,
          rating: 3,
          text: "Bob",
          sweetness: 2,
          acidity: null,
          body: null,
          createdAt: FIRST_MOMENT.toISOString(),
          updatedAt: FIRST_MOMENT.toISOString(),
        },
      ]);
    });

    it("breaks a tie on the modification date by the highest id", async () => {
      await reviews().insert([
        row({ userId: BOB, beerId: 1, text: "first" }),
        row({ userId: BOB, beerId: 2, text: "second" }),
        row({ userId: BOB, beerId: 3, text: "third" }),
      ]);

      const found = await repository.findReviewsByUsers([BOB]);

      expect(found.map((record) => record.text)).toEqual(["third", "second", "first"]);
    });
  });

  it("finds nothing for a pair without review, even when other pairs have one", async () => {
    await reviews().insert([row({ userId: BOB }), row({ beerId: 5 })]);

    expect(await repository.findReview(ALICE, ORVAL)).toBeNull();
  });

  it("finds the review of the pair as a record with ISO dates", async () => {
    await reviews().insert([row({ userId: BOB, rating: 2, text: "Bob" }), row({ beerId: 5, rating: 1, text: "Autre" }), row()]);

    expect(await repository.findReview(ALICE, ORVAL)).toEqual({
      id: 3,
      userId: ALICE,
      beerId: ORVAL,
      rating: 4.5,
      text: "Superbe amertume",
      sweetness: 2,
      acidity: null,
      body: null,
      createdAt: FIRST_MOMENT.toISOString(),
      updatedAt: FIRST_MOMENT.toISOString(),
    });
  });

  it("inserts a new review and returns it", async () => {
    const record = await repository.upsertReview(row());

    expect(record).toEqual({
      id: 1,
      userId: ALICE,
      beerId: ORVAL,
      rating: 4.5,
      text: "Superbe amertume",
      sweetness: 2,
      acidity: null,
      body: null,
      createdAt: FIRST_MOMENT.toISOString(),
      updatedAt: FIRST_MOMENT.toISOString(),
    });
    expect(await reviews().count()).toBe(1);
  });

  it("replaces the review of the pair: same id, creation date kept, new content, a single row", async () => {
    await reviews().insert(row({ userId: BOB, rating: 1, text: "Bob" }));
    const created = await repository.upsertReview(row());

    const replaced = await repository.upsertReview(
      row({ rating: 3, text: "", sweetness: null, acidity: 4, body: 5, createdAt: SECOND_MOMENT, updatedAt: SECOND_MOMENT }),
    );

    expect(replaced).toEqual({
      id: created.id,
      userId: ALICE,
      beerId: ORVAL,
      rating: 3,
      text: "",
      sweetness: null,
      acidity: 4,
      body: 5,
      createdAt: FIRST_MOMENT.toISOString(),
      updatedAt: SECOND_MOMENT.toISOString(),
    });
    expect(await reviews().count({ where: { userId: ALICE, beerId: ORVAL } })).toBe(1);
    expect(await reviews().count()).toBe(2);
    expect((await repository.findReview(BOB, ORVAL))?.text).toBe("Bob");
  });

  it("deletes the review of the pair, answers true and leaves the reviews of other pairs", async () => {
    await reviews().insert([row({ userId: BOB, rating: 2, text: "Bob" }), row({ beerId: 5, rating: 1, text: "Autre" }), row()]);

    expect(await repository.deleteReview(ALICE, ORVAL)).toBe(true);

    expect(await repository.findReview(ALICE, ORVAL)).toBeNull();
    expect((await repository.findReview(BOB, ORVAL))?.text).toBe("Bob");
    expect((await repository.findReview(ALICE, 5))?.text).toBe("Autre");
    expect(await reviews().count()).toBe(2);
  });

  it("answers false and deletes nothing for a pair without review", async () => {
    await reviews().insert([row({ userId: BOB }), row({ beerId: 5 })]);

    expect(await repository.deleteReview(ALICE, ORVAL)).toBe(false);
    expect(await reviews().count()).toBe(2);
  });

  it("keeps one row, the last written, for two simultaneous upserts of the same pair", async () => {
    const first = repository.upsertReview(row({ rating: 2 }));
    const last = repository.upsertReview(row({ rating: 5 }));
    await Promise.all([first, last]);

    expect(await reviews().count()).toBe(1);
    expect((await repository.findReview(ALICE, ORVAL))?.rating).toBe(5);
  });

  describe("findRatingSummaries", () => {
    it("groups the reviews by beer with the average to the tenth, half rounded up, and the count", async () => {
      await reviews().insert([
        row({ userId: ALICE, beerId: ORVAL, rating: 4 }),
        row({ userId: BOB, beerId: ORVAL, rating: 4.5 }),
        row({ userId: ALICE, beerId: 5, rating: 2 }),
        row({ userId: ALICE, beerId: 6, rating: 5 }),
      ]);

      expect(await repository.findRatingSummaries([5, ORVAL])).toEqual([
        { beerId: ORVAL, averageRating: 4.3, reviewCount: 2 },
        { beerId: 5, averageRating: 2, reviewCount: 1 },
      ]);
    });

    it("answers no summary for a beer without review and for an empty list of ids", async () => {
      await reviews().insert(row({ beerId: 6 }));

      expect(await repository.findRatingSummaries([ORVAL])).toEqual([]);
      expect(await repository.findRatingSummaries([])).toEqual([]);
    });
  });

  describe("findReviewStats", () => {
    it("counts the ratings in the bar of the nearest star, half rounded up, completed to five bars", async () => {
      await reviews().insert([
        row({ userId: 1, rating: 1 }),
        row({ userId: 2, rating: 1.5 }),
        row({ userId: 3, rating: 3.5 }),
        row({ userId: 4, rating: 4.5 }),
        row({ userId: 5, rating: 5 }),
        row({ userId: 6, beerId: 5, rating: 2 }),
      ]);

      const stats = await repository.findReviewStats(ORVAL);

      expect(stats.ratingDistribution).toEqual([
        { stars: 1, count: 1 },
        { stars: 2, count: 1 },
        { stars: 3, count: 0 },
        { stars: 4, count: 1 },
        { stars: 5, count: 2 },
      ]);
    });

    it("rounds a rating of 0.5 up to 1 star and a rating of 4.5 up to 5 stars", async () => {
      await reviews().insert([
        row({ userId: 1, rating: 0.5 }),
        row({ userId: 2, rating: 1 }),
        row({ userId: 3, rating: 4 }),
        row({ userId: 4, rating: 4.5 }),
      ]);

      const stats = await repository.findReviewStats(ORVAL);

      expect(stats.ratingDistribution).toEqual([
        { stars: 1, count: 2 },
        { stars: 2, count: 0 },
        { stars: 3, count: 0 },
        { stars: 4, count: 1 },
        { stars: 5, count: 1 },
      ]);
    });

    it("averages each criterion to the tenth over the reviews that filled it, with its count", async () => {
      await reviews().insert([
        row({ userId: 1, sweetness: 2, acidity: 5, body: null }),
        row({ userId: 2, sweetness: 3, acidity: null, body: null }),
        row({ userId: 3, sweetness: 3, acidity: null, body: 1 }),
        row({ userId: 4, beerId: 5, sweetness: 5, acidity: 5, body: 5 }),
      ]);

      const stats = await repository.findReviewStats(ORVAL);

      expect(stats.criteria).toEqual([
        { criterion: "sweetness", average: 2.7, count: 3 },
        { criterion: "acidity", average: 5, count: 1 },
        { criterion: "body", average: 1, count: 1 },
      ]);
    });

    it("answers five empty bars and three empty criteria for a beer without review", async () => {
      await reviews().insert(row({ beerId: 5 }));

      expect(await repository.findReviewStats(ORVAL)).toEqual({
        ratingDistribution: [1, 2, 3, 4, 5].map((stars) => ({ stars, count: 0 })),
        criteria: ["sweetness", "acidity", "body"].map((criterion) => ({ criterion, average: null, count: 0 })),
      });
    });
  });

  describe("findReviewPage", () => {
    const THIRD_MOMENT = new Date("2026-03-09T09:00:00.000Z");
    const FOURTH_MOMENT = new Date("2026-03-12T09:00:00.000Z");
    const CAROL = 3;
    const DAVE = 4;

    const seedPage = async (): Promise<void> => {
      await reviews().insert([
        row({ userId: BOB, text: "Bob", updatedAt: SECOND_MOMENT }),
        row({ userId: CAROL, text: "Carol", updatedAt: SECOND_MOMENT }),
        row({ userId: ALICE, text: "Alice", updatedAt: FOURTH_MOMENT }),
        row({ userId: BOB, beerId: 5, text: "Autre bière", updatedAt: FOURTH_MOMENT }),
        row({ userId: DAVE, text: "Dave", updatedAt: FIRST_MOMENT }),
        row({ userId: 5, text: "Erin", updatedAt: THIRD_MOMENT }),
      ]);
    };

    const textsOf = (slice: { items: readonly { text: string }[] }): string[] => slice.items.map((item) => item.text);

    it("lists the reviews of the beer written by the other users, newest modification first and highest id on a tie", async () => {
      await seedPage();

      const slice = await repository.findReviewPage(ORVAL, ALICE, 1, 10);

      expect(textsOf(slice)).toEqual(["Erin", "Carol", "Bob", "Dave"]);
      expect(slice.total).toBe(4);
      expect(slice.items[1]).toEqual({
        id: 2,
        userId: CAROL,
        beerId: ORVAL,
        rating: 4.5,
        text: "Carol",
        sweetness: 2,
        acidity: null,
        body: null,
        createdAt: FIRST_MOMENT.toISOString(),
        updatedAt: SECOND_MOMENT.toISOString(),
      });
    });

    it("skips the pages before the requested one, takes a page of the given size and keeps the total of all pages", async () => {
      await seedPage();

      const second = await repository.findReviewPage(ORVAL, ALICE, 2, 3);
      const beyond = await repository.findReviewPage(ORVAL, ALICE, 3, 3);

      expect(textsOf(second)).toEqual(["Dave"]);
      expect(second.total).toBe(4);
      expect(beyond).toEqual({ items: [], total: 4 });
    });

    it("answers an empty slice for a beer nobody reviewed or only the excluded user reviewed", async () => {
      await seedPage();

      expect(await repository.findReviewPage(99, ALICE, 1, 10)).toEqual({ items: [], total: 0 });
      expect(await repository.findReviewPage(ORVAL, DAVE, 1, 10)).toMatchObject({ total: 4 });
      await reviews().delete({ beerId: ORVAL, userId: BOB });
      await reviews().delete({ beerId: ORVAL, userId: CAROL });
      await reviews().delete({ beerId: ORVAL, userId: DAVE });
      await reviews().delete({ beerId: ORVAL, userId: 5 });
      expect(await repository.findReviewPage(ORVAL, ALICE, 1, 10)).toEqual({ items: [], total: 0 });
    });
  });
});
