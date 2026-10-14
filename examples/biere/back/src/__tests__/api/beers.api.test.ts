import { HttpStatus } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource, IsNull, Not } from "typeorm";
import type { Repository } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp } from "@/__tests__/support/test-app";
import { USER_ID_HEADER_NAME } from "@/__tests__/support/user-header";
import { UNIDENTIFIED_USER_MESSAGE } from "@/common/exceptions/exception-messages.constants";
import {
  BEER_ABV_MAX_PERCENT,
  BEER_PAGE_SIZE_DEFAULT,
  BEER_PAGE_SIZE_MAX,
  BEER_PROPOSAL_ABV_MAX_PERCENT,
  BEER_PROPOSALS_PER_WINDOW_MAX,
  BEER_SEARCH_MAX_LENGTH,
} from "@/modules/beers/beers.constants";
import type { BeerDto } from "@/modules/beers/dtos/beer.dto";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";
import type { BeerPageDto } from "@/modules/beers/dtos/beer-page.dto";
import type { CreatedCheckinDto } from "@/modules/pokedex/dtos/created-checkin.dto";
import type { CatalogBeerDto } from "@/modules/beers/dtos/catalog-beer.dto";
import { ALICE_USER_ID, BOB_USER_ID, CAROL_USER_ID } from "@/database/seed.constants";
import { Beer } from "@/modules/beers/entities/beer.entity";
import type { BeerDetailDto } from "@/modules/beers/dtos/beer-detail.dto";
import type { BreweryDto } from "@/modules/beers/dtos/brewery.dto";

const BEERS_PATH = "/api/v1/beers";
const SEEDED_BEER_COUNT = 120;
const BEER_FIELDS = [
  "abv",
  "aromas",
  "averageRating",
  "bitternessLevel",
  "breweryName",
  "checkinCount",
  "colorLevel",
  "country",
  "createdBy",
  "createdByName",
  "description",
  "drunk",
  "family",
  "formats",
  "id",
  "inWishlist",
  "name",
  "reviewCount",
  "source",
  "styleColorRange",
  "styleId",
  "styleName",
];

const BITTERNESS_LEVEL_BY_BEER: Readonly<Record<string, number>> = {
  "Sierra Nevada Pale Ale": 3,
  "Pilsner Urquell": 3,
  "Lagunitas IPA": 4,
  "Goose Island IPA": 4,
  "Torpedo Extra IPA": 5,
};

const STATE_FIELDS: readonly string[] = ["drunk", "checkinCount", "inWishlist"];

const NO_REVIEW_STATS = {
  ratingDistribution: [1, 2, 3, 4, 5].map((stars) => ({ stars, count: 0 })),
  criteria: ["sweetness", "acidity", "body"].map((criterion) => ({ criterion, average: null, count: 0 })),
};

const asciiLower = (value: string): string => value.replace(/[A-Z]/g, (letter) => letter.toLowerCase());

describe("beers API", () => {
  let app: INestApplication;

  const getPage = async (query: Record<string, string | number>): Promise<BeerPageDto> => {
    const response = await request(app.getHttpServer()).get(BEERS_PATH).query(query).set(USER_ID_HEADER_NAME, "1");
    expect(response.status).toBe(HttpStatus.OK);
    return response.body as BeerPageDto;
  };

  const queryOf = (entries: readonly (readonly [string, string | number])[]): string =>
    new URLSearchParams(entries.map(([key, value]): [string, string] => [key, String(value)])).toString();

  const getFiltered = async (entries: readonly (readonly [string, string | number])[]): Promise<BeerPageDto> => {
    const response = await request(app.getHttpServer())
      .get(`${BEERS_PATH}?${queryOf(entries)}`)
      .set(USER_ID_HEADER_NAME, "1");
    expect(response.status).toBe(HttpStatus.OK);
    return response.body as BeerPageDto;
  };

  const getBadRequestMessage = async (entries: readonly (readonly [string, string | number])[]): Promise<string> => {
    const response = await request(app.getHttpServer())
      .get(`${BEERS_PATH}?${queryOf(entries)}`)
      .set(USER_ID_HEADER_NAME, "1");
    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    return (response.body as { message: string }).message;
  };

  const countOf = (facet: readonly { value: string; count: number }[], value: string): number | undefined =>
    facet.find((entry) => entry.value === value)?.count;

  const getAllBeers = async (sort: string): Promise<BeerDto[]> => {
    const pages = await Promise.all(
      [1, 2, 3].map((page) => getPage({ sort, page, size: BEER_PAGE_SIZE_MAX })),
    );
    return pages.flatMap((page) => [...page.items]);
  };

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/v1/beers without parameter returns the first 20 beers by name", async () => {
    const page = await getPage({});

    expect(page.items).toHaveLength(BEER_PAGE_SIZE_DEFAULT);
    expect(page.items[0].name).toBe("3 Monts");
    expect(page).toMatchObject({ total: SEEDED_BEER_COUNT, page: 1, size: BEER_PAGE_SIZE_DEFAULT });
    expect(Object.keys(page).sort()).toEqual(["facets", "items", "page", "size", "total"]);
  });

  it("GET /api/v1/beers lists the contract fields of every beer", async () => {
    const page = await getPage({});

    expect(page.items[0]).toEqual({
      id: expect.any(Number),
      name: "3 Monts",
      breweryName: "Brasserie de Saint-Sylvestre",
      country: "FR",
      styleId: expect.any(Number),
      styleName: "Bière de garde",
      family: "amber",
      abv: 8.5,
      aromas: ["malty", "honey", "fruity", "herbal", "spicy"],
      formats: ["bottle"],
      description: "Bière de garde blonde de Flandre française, forte, sèche et légèrement herbacée.",
      bitternessLevel: null,
      colorLevel: null,
      styleColorRange: { min: 1, max: 4 },
      source: "official",
      createdBy: null,
      createdByName: null,
      drunk: false,
      checkinCount: 0,
      inWishlist: false,
      averageRating: null,
      reviewCount: 0,
    });
    for (const beer of page.items) {
      expect(Object.keys(beer).sort()).toEqual(BEER_FIELDS);
    }
  });

  it("GET /api/v1/beers gives the five seeded IBU beers their bitterness level and no other beer", async () => {
    const beers = await getAllBeers("name");

    const levelled = Object.fromEntries(
      beers.filter((beer) => beer.bitternessLevel !== null).map((beer) => [beer.name, beer.bitternessLevel]),
    );
    expect(levelled).toEqual(BITTERNESS_LEVEL_BY_BEER);
  });

  it("GET /api/v1/beers serves the style color range of every beer without EBC", async () => {
    const beers = await getAllBeers("name");

    expect(beers).toHaveLength(SEEDED_BEER_COUNT);
    expect(beers.every((beer) => beer.colorLevel === null && beer.styleColorRange !== null)).toBe(true);
  });

  it("GET /api/v1/beers sorts by name without case over the whole catalogue", async () => {
    const beers = await getAllBeers("name");

    expect(beers).toHaveLength(SEEDED_BEER_COUNT);
    expect(new Set(beers.map((beer) => beer.id)).size).toBe(SEEDED_BEER_COUNT);
    expect(beers.map((beer) => asciiLower(beer.name))).toEqual(beers.map((beer) => asciiLower(beer.name)).sort());
  });

  it("GET /api/v1/beers?q=pecheresse finds only Lindemans Pêcheresse", async () => {
    const page = await getPage({ q: "pecheresse" });

    expect(page.items.map((beer) => beer.name)).toEqual(["Lindemans Pêcheresse"]);
    expect(page.total).toBe(1);
  });

  it("GET /api/v1/beers?q=budejovicky finds Budweiser Budvar Original through its accented brewery", async () => {
    const page = await getPage({ q: "budejovicky" });

    expect(page.items.map((beer) => beer.name)).toEqual(["Budweiser Budvar Original"]);
    expect(page.total).toBe(1);
  });

  it("GET /api/v1/beers?q=CHIMAY finds the three Chimay", async () => {
    const page = await getPage({ q: "CHIMAY" });

    expect([...page.items.map((beer) => beer.name)].sort()).toEqual(["Chimay Bleue", "Chimay Rouge", "Chimay Triple"]);
    expect(page.total).toBe(3);
  });

  it("GET /api/v1/beers?q= ignores the spaces around the search", async () => {
    expect((await getPage({ q: "  CHIMAY  " })).total).toBe(3);
  });

  it("GET /api/v1/beers?q=weiss finds 8 beers, Erdinger Dunkel through its brewery", async () => {
    const page = await getPage({ q: "weiss" });

    expect(page.total).toBe(8);
    expect(page.items.map((beer) => beer.name)).toContain("Erdinger Dunkel");
  });

  it("GET /api/v1/beers?q=100% finds nothing because the wildcard is escaped", async () => {
    const page = await getPage({ q: "100%" });

    expect(page.items).toEqual([]);
    expect(page.total).toBe(0);
  });

  it("GET /api/v1/beers?sort=abv puts Rochefort 10 first, by decreasing degree", async () => {
    const beers = await getAllBeers("abv");

    expect(beers[0]).toMatchObject({ name: "Rochefort 10", abv: 11.3 });
    const degrees = beers.map((beer) => beer.abv);
    expect(degrees).toEqual([...degrees].sort((left, right) => right - left));
  });

  it("GET /api/v1/beers?sort=brewery follows the brewery name then the beer name", async () => {
    const beers = await getAllBeers("brewery");
    const keys = beers.map((beer) => `${asciiLower(beer.breweryName)}\u0000${asciiLower(beer.name)}`);

    expect(beers).toHaveLength(SEEDED_BEER_COUNT);
    expect(keys).toEqual([...keys].sort());
  });

  it("GET /api/v1/beers?page=7 returns no item and the total", async () => {
    const page = await getPage({ page: 7, size: 20 });

    expect(page).toEqual({
      items: [],
      total: SEEDED_BEER_COUNT,
      page: 7,
      size: 20,
      facets: { families: expect.any(Array), countries: expect.any(Array), formats: expect.any(Array) },
    });
  });

  it("GET /api/v1/beers returns the last full page of the catalogue", async () => {
    const page = await getPage({ page: 6, size: 20 });

    expect(page.items).toHaveLength(20);
  });

  it("GET /api/v1/beers accepts the extreme valid values", async () => {
    expect((await getPage({ size: 1 })).items).toHaveLength(1);
    expect((await getPage({ size: BEER_PAGE_SIZE_MAX })).items).toHaveLength(BEER_PAGE_SIZE_MAX);
    expect((await getPage({ q: "a".repeat(BEER_SEARCH_MAX_LENGTH) })).items).toEqual([]);
  });

  it.each([
    [{ size: 0 }, "size must not be less than 1"],
    [{ size: 51 }, "size must not be greater than 50"],
    [{ page: 0 }, "page must not be less than 1"],
    [{ size: 1.5 }, "size must be an integer number"],
    [{ page: 1.5 }, "page must be an integer number"],
    [{ sort: "unknown" }, "sort must be one of the following values: name, abv, brewery, rating"],
    [{ q: "a".repeat(101) }, "q must be shorter than or equal to 100 characters"],
  ])("GET /api/v1/beers with %j returns 400 and a message", async (query, message) => {
    const response = await request(app.getHttpServer()).get(BEERS_PATH).query(query).set(USER_ID_HEADER_NAME, "1");

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body).toEqual({ message });
  });

  it("GET /api/v1/beers returns 401 without the header, even with an invalid query", async () => {
    const response = await request(app.getHttpServer()).get(BEERS_PATH).query({ size: 0 });

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });

  it("GET /api/v1/beers/:id returns the Chimay Rouge sheet", async () => {
    const found = await getPage({ q: "chimay rouge" });
    expect(found.items).toHaveLength(1);

    const response = await request(app.getHttpServer())
      .get(`${BEERS_PATH}/${found.items[0].id}`)
      .set(USER_ID_HEADER_NAME, "1");

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual({
      id: found.items[0].id,
      name: "Chimay Rouge",
      breweryName: "Bières de Chimay",
      country: "BE",
      styleId: expect.any(Number),
      styleName: "Dubbel trappiste",
      family: "trappist",
      abv: 7,
      aromas: ["fruity", "caramel", "spicy", "malty"],
      formats: ["bottle"],
      description: "Trappiste cuivrée, douce et fruitée, la plus ancienne recette de l'abbaye de Scourmont.",
      bitternessLevel: null,
      colorLevel: null,
      styleColorRange: { min: 3, max: 4 },
      source: "official",
      createdBy: null,
      createdByName: null,
      drunk: false,
      checkinCount: 0,
      inWishlist: false,
      averageRating: null,
      reviewCount: 0,
      ...NO_REVIEW_STATS,
    });
  });

  it.each(["9999", "0", "-1"])("GET /api/v1/beers/%s returns 404 with a message", async (id) => {
    const response = await request(app.getHttpServer()).get(`${BEERS_PATH}/${id}`).set(USER_ID_HEADER_NAME, "1");

    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.body).toEqual({ message: `Beer ${id} not found.` });
  });

  it("GET /api/v1/beers/abc returns 400 before looking the beer up", async () => {
    const response = await request(app.getHttpServer()).get(`${BEERS_PATH}/abc`).set(USER_ID_HEADER_NAME, "1");

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body).toEqual({ message: "Validation failed (numeric string is expected)" });
  });

  it("GET /api/v1/beers/:id returns 401 without the header, even for a non-numeric id", async () => {
    const response = await request(app.getHttpServer()).get(`${BEERS_PATH}/abc`);

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });

  it("GET /api/v1/beers?family=trappist returns 11 beers, countries BE 9 and NL 2, families without the family filter", async () => {
    const page = await getFiltered([["family", "trappist"]]);

    expect(page.total).toBe(11);
    expect(page.items.every((beer) => beer.family === "trappist")).toBe(true);
    expect(page.facets.countries).toEqual([
      { value: "BE", count: 9 },
      { value: "NL", count: 2 },
    ]);
    expect(countOf(page.facets.families, "lager")).toBe(19);
    expect(countOf(page.facets.families, "trappist")).toBe(11);
  });

  it("GET /api/v1/beers?country=BE&family=trappist&format=can returns nothing and the formats without the format filter", async () => {
    const page = await getFiltered([
      ["country", "BE"],
      ["family", "trappist"],
      ["format", "can"],
    ]);

    expect(page.items).toEqual([]);
    expect(page.total).toBe(0);
    expect(page.facets.formats).toEqual([
      { value: "bottle", count: 9 },
      { value: "draft", count: 3 },
    ]);
  });

  it("GET /api/v1/beers with two styles returns the beers of one OR the other", async () => {
    const chimay = (await getPage({ q: "chimay rouge" })).items[0];
    const monts = (await getPage({ q: "3 monts" })).items[0];
    const first = await getFiltered([["style", chimay.styleId]]);
    const second = await getFiltered([["style", monts.styleId]]);

    const both = await getFiltered([
      ["style", chimay.styleId],
      ["style", monts.styleId],
      ["size", BEER_PAGE_SIZE_MAX],
    ]);

    expect(first.total).toBeGreaterThan(0);
    expect(second.total).toBeGreaterThan(0);
    expect(both.total).toBe(first.total + second.total);
    expect(new Set(both.items.map((beer) => beer.styleId))).toEqual(new Set([chimay.styleId, monts.styleId]));
  });

  it("GET /api/v1/beers?family=trappist&style=<amber style> returns an empty page, not an error", async () => {
    const monts = (await getPage({ q: "3 monts" })).items[0];

    const page = await getFiltered([
      ["family", "trappist"],
      ["style", monts.styleId],
    ]);

    expect(monts.family).toBe("amber");
    expect(page.items).toEqual([]);
    expect(page.total).toBe(0);
  });

  it("GET /api/v1/beers accumulates the dimensions with an AND", async () => {
    const belgian = await getFiltered([["country", "BE"]]);
    const trappist = await getFiltered([["family", "trappist"]]);
    const both = await getFiltered([
      ["country", "BE"],
      ["family", "trappist"],
    ]);

    expect(both.total).toBe(9);
    expect(both.total).toBeLessThan(belgian.total);
    expect(both.total).toBeLessThan(trappist.total);
    expect(both.items.every((beer) => beer.country === "BE" && beer.family === "trappist")).toBe(true);
  });

  it("GET /api/v1/beers?abvMin=8 returns 26 beers, all at 8 or more", async () => {
    const page = await getFiltered([
      ["abvMin", 8],
      ["size", BEER_PAGE_SIZE_MAX],
    ]);

    expect(page.total).toBe(26);
    expect(page.items.every((beer) => beer.abv >= 8)).toBe(true);
    expect(page.items.some((beer) => beer.abv === 8)).toBe(true);
  });

  it("GET /api/v1/beers?abvMax=0.5 returns 7 beers, all at 0.5 or less", async () => {
    const page = await getFiltered([["abvMax", 0.5]]);

    expect(page.total).toBe(7);
    expect(page.items.every((beer) => beer.abv <= 0.5)).toBe(true);
    expect(page.items.some((beer) => beer.abv === 0.5)).toBe(true);
  });

  it("GET /api/v1/beers accepts the extreme degree bounds", async () => {
    expect((await getFiltered([["abvMin", 0]])).total).toBe(SEEDED_BEER_COUNT);
    expect((await getFiltered([["abvMax", BEER_ABV_MAX_PERCENT]])).total).toBe(SEEDED_BEER_COUNT);
    expect((await getFiltered([["abvMin", BEER_ABV_MAX_PERCENT]])).total).toBe(0);
  });

  it("GET /api/v1/beers?abvMin=9&abvMax=8 returns 400 and a message", async () => {
    const response = await request(app.getHttpServer())
      .get(BEERS_PATH)
      .query({ abvMin: 9, abvMax: 8 })
      .set(USER_ID_HEADER_NAME, "1");

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body).toEqual({ message: "abvMin must not be greater than abvMax." });
  });

  it("GET /api/v1/beers reports the shape error before the degree order when both apply", async () => {
    const message = await getBadRequestMessage([
      ["abvMin", 9],
      ["abvMax", 8],
      ["family", "unknown"],
    ]);

    expect(message).toBe(`family must be one of the following values: ${Object.values(BeerFamilyEnum).join(", ")}`);
  });

  it.each([
    [[["family", "unknown"]], `family must be one of the following values: ${Object.values(BeerFamilyEnum).join(", ")}`],
    [[["format", "keg"]], `each value in format must be one of the following values: ${Object.values(BeerFormatEnum).join(", ")}`],
    [[["format", "can"], ["format", "keg"]], `each value in format must be one of the following values: ${Object.values(BeerFormatEnum).join(", ")}`],
    [[["country", "BEL"]], "each value in country must match /^[A-Z]{2}$/ regular expression"],
    [[["country", "be"]], "each value in country must match /^[A-Z]{2}$/ regular expression"],
    [[["style", "abc"]], "each value in style must not be less than 1; each value in style must be an integer number"],
    [[["style", 0]], "each value in style must not be less than 1"],
    [[["abvMin", -1]], "abvMin must not be less than 0"],
    [[["abvMax", BEER_ABV_MAX_PERCENT + 1]], `abvMax must not be greater than ${BEER_ABV_MAX_PERCENT}`],
    [[["abvMin", "abc"]], `abvMin must not be greater than ${BEER_ABV_MAX_PERCENT}; abvMin must not be less than 0; abvMin must be a number conforming to the specified constraints`],
  ] as const)("GET /api/v1/beers with %j returns 400 and a message", async (entries, message) => {
    expect(await getBadRequestMessage(entries)).toBe(message);
  });

  it("GET /api/v1/beers omits the zero counts and orders the facets as the contract says", async () => {
    const { facets } = await getPage({});
    const families = Object.values(BeerFamilyEnum);
    const formats = Object.values(BeerFormatEnum);

    expect(facets.families.map((entry) => entry.value)).toEqual(families);
    expect(facets.formats.map((entry) => entry.value)).toEqual(formats);
    expect(facets.countries.length).toBeGreaterThan(1);
    expect(facets.countries.map((entry) => entry.count)).toEqual(
      facets.countries.map((entry) => entry.count).sort((left, right) => right - left),
    );
    for (const facet of [facets.families, facets.countries, facets.formats]) {
      expect(facet.every((entry) => Number.isInteger(entry.count) && entry.count >= 1)).toBe(true);
    }
    const sameCount = facets.countries.filter((entry) => entry.count === facets.countries[0].count);
    expect(sameCount.map((entry) => entry.value)).toEqual(sameCount.map((entry) => entry.value).sort());
  });

  it("GET /api/v1/beers returns empty facets when nothing matches the search", async () => {
    const page = await getPage({ q: "zzzzzz" });

    expect(page.facets).toEqual({ families: [], countries: [], formats: [] });
  });

  it("GET /api/v1/beers computes the facets under the search too", async () => {
    const page = await getPage({ q: "chimay" });

    expect(page.facets.countries).toEqual([{ value: "BE", count: 3 }]);
    expect(page.facets.families).toEqual([{ value: "trappist", count: 3 }]);
  });
});

describe("beers API user state", () => {
  let app: INestApplication;
  let orval: BeerDto;
  let duvel: BeerDto;

  const asUser = (userId: number): string => String(userId);

  const getBeers = async (userId: number, query: Record<string, string | number>): Promise<BeerPageDto> => {
    const response = await request(app.getHttpServer()).get(BEERS_PATH).query(query).set(USER_ID_HEADER_NAME, asUser(userId));
    expect(response.status).toBe(HttpStatus.OK);
    return response.body as BeerPageDto;
  };

  const getSheet = async (userId: number, beerId: number): Promise<unknown> => {
    const response = await request(app.getHttpServer()).get(`${BEERS_PATH}/${beerId}`).set(USER_ID_HEADER_NAME, asUser(userId));
    expect(response.status).toBe(HttpStatus.OK);
    return response.body;
  };

  const findBeer = async (name: string): Promise<BeerDto> => {
    const beer = (await getBeers(ALICE_USER_ID, { q: name })).items.find((item) => item.name === name);
    if (beer === undefined) {
      throw new Error(`${name} is not seeded`);
    }
    return withoutState(beer);
  };

  const drink = async (userId: number, beerId: number): Promise<number> => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/checkins")
      .set(USER_ID_HEADER_NAME, asUser(userId))
      .field("beerId", String(beerId))
      .field("drankAt", "2025-10-01T18:00:00.000Z")
      .field("place", "Le Bistrot")
      .field("format", "bottle");
    expect(response.status).toBe(HttpStatus.CREATED);
    return (response.body as CreatedCheckinDto).checkin.id;
  };

  const wish = async (userId: number, beerId: number): Promise<void> => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/me/wishlist")
      .set(USER_ID_HEADER_NAME, asUser(userId))
      .send({ beerId });
    expect(response.status).toBe(HttpStatus.CREATED);
  };

  const withoutState = (beer: CatalogBeerDto): BeerDto => {
    return Object.fromEntries(
      Object.entries(beer).filter(([key]) => !STATE_FIELDS.includes(key)),
    ) as unknown as BeerDto;
  };

  beforeAll(async () => {
    app = await createTestApp();
    orval = await findBeer("Orval");
    duvel = await findBeer("Duvel");
    await drink(ALICE_USER_ID, orval.id);
    await drink(ALICE_USER_ID, orval.id);
    await wish(ALICE_USER_ID, duvel.id);
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/v1/beers/:id gives Alice the state of Orval and Duvel and Bob an empty state", async () => {
    expect(await getSheet(ALICE_USER_ID, orval.id)).toEqual({ ...orval, drunk: true, checkinCount: 2, inWishlist: false, ...NO_REVIEW_STATS });
    expect(await getSheet(ALICE_USER_ID, duvel.id)).toEqual({ ...duvel, drunk: false, checkinCount: 0, inWishlist: true, ...NO_REVIEW_STATS });
    expect(await getSheet(BOB_USER_ID, orval.id)).toEqual({ ...orval, drunk: false, checkinCount: 0, inWishlist: false, ...NO_REVIEW_STATS });
  });

  it("GET /api/v1/beers carries the state of the user on every item of the list", async () => {
    const alice = await getBeers(ALICE_USER_ID, { q: "Orval" });
    const bob = await getBeers(BOB_USER_ID, { q: "Orval" });

    expect(alice.items.find((item) => item.id === orval.id)).toEqual({ ...orval, drunk: true, checkinCount: 2, inWishlist: false });
    expect(bob.items.find((item) => item.id === orval.id)).toEqual({ ...orval, drunk: false, checkinCount: 0, inWishlist: false });
  });

  it("GET /api/v1/beers?status=drunk lists only Orval for Alice and nothing for Bob", async () => {
    const alice = await getBeers(ALICE_USER_ID, { status: "drunk" });
    const bob = await getBeers(BOB_USER_ID, { status: "drunk" });

    expect(alice.total).toBe(1);
    expect(alice.items.map((item) => item.name)).toEqual(["Orval"]);
    expect(bob.total).toBe(0);
    expect(bob.items).toEqual([]);
    expect(bob.facets).toEqual({ families: [], countries: [], formats: [] });
  });

  it("GET /api/v1/beers?status=wishlist lists only Duvel for Alice", async () => {
    const page = await getBeers(ALICE_USER_ID, { status: "wishlist" });

    expect(page.total).toBe(1);
    expect(page.items.map((item) => item.name)).toEqual(["Duvel"]);
  });

  it("GET /api/v1/beers?q=Orval combines the search with the status", async () => {
    const drunk = await getBeers(ALICE_USER_ID, { q: "Orval", status: "drunk" });
    const wishlist = await getBeers(ALICE_USER_ID, { q: "Orval", status: "wishlist" });
    const duvelDrunk = await getBeers(ALICE_USER_ID, { q: "Duvel", status: "drunk" });

    expect(drunk.items.map((item) => item.name)).toEqual(["Orval"]);
    expect(drunk.total).toBe(1);
    expect(wishlist.items).toEqual([]);
    expect(wishlist.total).toBe(0);
    expect(duvelDrunk.items).toEqual([]);
  });

  it("GET /api/v1/beers?status=untasted lists the 119 beers Alice never drank, Duvel included", async () => {
    const page = await getBeers(ALICE_USER_ID, { status: "untasted", size: BEER_PAGE_SIZE_MAX });

    expect(page.total).toBe(SEEDED_BEER_COUNT - 1);
    expect(page.items.some((item) => item.id === orval.id)).toBe(false);
    expect(page.items.some((item) => item.id === duvel.id)).toBe(true);
    expect((await getBeers(BOB_USER_ID, { status: "untasted" })).total).toBe(SEEDED_BEER_COUNT);
  });

  it("GET /api/v1/beers?status=untasted&family=trappist returns 10 beers and a trappist facet of 10", async () => {
    const page = await getBeers(ALICE_USER_ID, { status: "untasted", family: "trappist" });

    expect(page.total).toBe(10);
    expect(page.facets.families.find((entry) => entry.value === "trappist")?.count).toBe(10);
    expect(page.items.every((item) => item.family === "trappist" && item.id !== orval.id)).toBe(true);
  });

  it("GET /api/v1/beers?status=foo returns 400 with a message", async () => {
    const response = await request(app.getHttpServer()).get(BEERS_PATH).query({ status: "foo" }).set(USER_ID_HEADER_NAME, asUser(ALICE_USER_ID));

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body).toEqual({ message: "status must be one of the following values: drunk, wishlist, untasted" });
  });

  it("GET /api/v1/beers without status keeps the page, the sort and the facets of F1 and only adds the state fields", async () => {
    const getAll = async (userId: number): Promise<BeerPageDto> => {
      const pages = await Promise.all([1, 2, 3].map((page) => getBeers(userId, { page, size: BEER_PAGE_SIZE_MAX })));
      return { ...pages[0], items: pages.flatMap((page) => [...page.items]) };
    };
    const alice = await getAll(ALICE_USER_ID);
    const bob = await getAll(BOB_USER_ID);

    expect(Object.keys(alice).sort()).toEqual(["facets", "items", "page", "size", "total"]);
    expect(alice.total).toBe(SEEDED_BEER_COUNT);
    expect(alice.facets).toEqual(bob.facets);
    expect(alice.items.map((item) => withoutState(item))).toEqual(bob.items.map((item) => withoutState(item)));
    expect(alice.items.filter((item) => item.drunk || item.inWishlist).map((item) => item.name)).toEqual(["Duvel", "Orval"]);
    expect(bob.items.some((item) => item.drunk || item.inWishlist || item.checkinCount > 0)).toBe(false);
  });

  it("GET /api/v1/beers?status=wishlist lists nothing for a user without wishlist", async () => {
    const page = await getBeers(BOB_USER_ID, { status: "wishlist" });

    expect(page.total).toBe(0);
    expect(page.items).toEqual([]);
  });

  it("keeps a wished beer in the wishlist once drunk, and makes it untasted again when its only check-in is deleted", async () => {
    const chimay = await findBeer("Chimay Rouge");
    await wish(BOB_USER_ID, chimay.id);
    const checkinId = await drink(BOB_USER_ID, chimay.id);

    expect(await getSheet(BOB_USER_ID, chimay.id)).toEqual({ ...chimay, drunk: true, checkinCount: 1, inWishlist: true, ...NO_REVIEW_STATS });
    expect((await getBeers(BOB_USER_ID, { status: "wishlist" })).items.map((item) => item.name)).toEqual(["Chimay Rouge"]);
    expect((await getBeers(BOB_USER_ID, { status: "drunk" })).items.map((item) => item.name)).toEqual(["Chimay Rouge"]);

    const deletion = await request(app.getHttpServer())
      .delete(`/api/v1/checkins/${checkinId}`)
      .set(USER_ID_HEADER_NAME, asUser(BOB_USER_ID));
    expect(deletion.status).toBe(HttpStatus.NO_CONTENT);

    expect(await getSheet(BOB_USER_ID, chimay.id)).toEqual({ ...chimay, drunk: false, checkinCount: 0, inWishlist: true, ...NO_REVIEW_STATS });
    expect((await getBeers(BOB_USER_ID, { status: "drunk" })).total).toBe(0);
    expect((await getBeers(BOB_USER_ID, { status: "untasted" })).total).toBe(SEEDED_BEER_COUNT);
  });
});

describe("beers API rating statistics", () => {
  let app: INestApplication;
  const FIRST_REVIEWER_ID = 101;

  const insertReview = async (
    userId: number,
    beerId: number,
    rating: number,
    sweetness: number | null = null,
  ): Promise<void> => {
    const now = "2026-03-01T10:00:00.000Z";
    await app
      .get(DataSource)
      .query(
        "INSERT INTO reviews (userId, beerId, rating, text, sweetness, acidity, body, createdAt, updatedAt) VALUES (?, ?, ?, 'Avis', ?, NULL, NULL, ?, ?)",
        [userId, beerId, rating, sweetness, now, now],
      );
  };

  const insertRatings = async (beerId: number, ratings: readonly number[]): Promise<void> => {
    for (const [index, rating] of ratings.entries()) {
      await insertReview(FIRST_REVIEWER_ID + index, beerId, rating);
    }
  };

  const getSheet = async (beerId: number): Promise<CatalogBeerDto & typeof NO_REVIEW_STATS> => {
    const response = await request(app.getHttpServer())
      .get(`${BEERS_PATH}/${beerId}`)
      .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID));
    expect(response.status).toBe(HttpStatus.OK);
    return response.body as CatalogBeerDto & typeof NO_REVIEW_STATS;
  };

  const getListItem = async (name: string): Promise<CatalogBeerDto> => {
    const response = await request(app.getHttpServer())
      .get(BEERS_PATH)
      .query({ q: name })
      .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID));
    expect(response.status).toBe(HttpStatus.OK);
    const [beer] = (response.body as BeerPageDto).items.filter((item) => item.name === name);
    return beer;
  };

  const findBeerId = async (name: string): Promise<number> => (await getListItem(name)).id;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("US5 AC1 gives a beer rated 4 and 4.5 the average 4.3 and 2 reviews in the list and on the sheet", async () => {
    const orvalId = await findBeerId("Orval");
    await insertRatings(orvalId, [4, 4.5]);
    await insertReview(FIRST_REVIEWER_ID, await findBeerId("Duvel"), 1);

    const item = await getListItem("Orval");
    const sheet = await getSheet(orvalId);

    expect([item.averageRating, item.reviewCount]).toEqual([4.3, 2]);
    expect([sheet.averageRating, sheet.reviewCount]).toEqual([4.3, 2]);
  });

  it("US5 AC2 gives a beer without review a null average, 0 reviews, five empty bars and three hidden criteria", async () => {
    const trippelId = await findBeerId("Rochefort 8");

    const item = await getListItem("Rochefort 8");
    const sheet = await getSheet(trippelId);

    expect([item.averageRating, item.reviewCount]).toEqual([null, 0]);
    expect(sheet).toMatchObject({ averageRating: null, reviewCount: 0, ...NO_REVIEW_STATS });
  });

  it("US5 AC3 counts the ratings 1, 1.5, 3.5, 4.5 and 5 in the bar of their nearest star, half rounded up", async () => {
    const chimayId = await findBeerId("Chimay Rouge");
    await insertRatings(chimayId, [1, 1.5, 3.5, 4.5, 5]);

    const sheet = await getSheet(chimayId);

    expect(sheet.ratingDistribution).toEqual([
      { stars: 1, count: 1 },
      { stars: 2, count: 1 },
      { stars: 3, count: 0 },
      { stars: 4, count: 1 },
      { stars: 5, count: 2 },
    ]);
    expect([sheet.averageRating, sheet.reviewCount]).toEqual([3.1, 5]);
  });

  it("US5 AC3 rounds the ratings 0.5 and 4.5 up to the 1 and 5 star bars", async () => {
    const rochefortId = await findBeerId("Rochefort 8");
    await insertRatings(rochefortId, [0.5, 1, 4, 4.5]);

    const sheet = await getSheet(rochefortId);

    expect(sheet.ratingDistribution).toEqual([
      { stars: 1, count: 2 },
      { stars: 2, count: 0 },
      { stars: 3, count: 0 },
      { stars: 4, count: 1 },
      { stars: 5, count: 1 },
    ]);
  });

  it("US5 AC4 hides the average of a criterion filled by 2 reviews and shows it to the tenth with a 3rd", async () => {
    const westmalleId = await findBeerId("Westmalle Tripel");
    await insertReview(FIRST_REVIEWER_ID, westmalleId, 4, 2);
    await insertReview(FIRST_REVIEWER_ID + 1, westmalleId, 4, 3);
    await insertReview(FIRST_REVIEWER_ID + 2, westmalleId, 4);

    const before = await getSheet(westmalleId);
    await insertReview(FIRST_REVIEWER_ID + 3, westmalleId, 4, 3);
    const after = await getSheet(westmalleId);

    expect(before.criteria).toEqual([
      { criterion: "sweetness", average: null, count: 2 },
      { criterion: "acidity", average: null, count: 0 },
      { criterion: "body", average: null, count: 0 },
    ]);
    expect(after.criteria).toEqual([
      { criterion: "sweetness", average: 2.7, count: 3 },
      { criterion: "acidity", average: null, count: 0 },
      { criterion: "body", average: null, count: 0 },
    ]);
  });

  it("US5 AC5 keeps the average null when the only rating is the 5 of a check-in without review", async () => {
    const leffeId = await findBeerId("Leffe Blonde");
    const checkin = await request(app.getHttpServer())
      .post("/api/v1/checkins")
      .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID))
      .field("beerId", String(leffeId))
      .field("drankAt", "2025-10-01T18:00:00.000Z")
      .field("place", "Le Bistrot")
      .field("format", "bottle")
      .field("rating", "5");
    expect(checkin.status).toBe(HttpStatus.CREATED);

    const sheet = await getSheet(leffeId);
    const item = await getListItem("Leffe Blonde");

    expect(sheet).toMatchObject({ drunk: true, checkinCount: 1, averageRating: null, reviewCount: 0, ...NO_REVIEW_STATS });
    expect([item.averageRating, item.reviewCount]).toEqual([null, 0]);
  });
});

describe("beers API rating sort and minimum rating", () => {
  let app: INestApplication;
  const FIRST_REVIEWER_ID = 101;

  const insertRatings = async (beerId: number, ratings: readonly number[]): Promise<void> => {
    const now = "2026-03-01T10:00:00.000Z";
    for (const [index, rating] of ratings.entries()) {
      await app
        .get(DataSource)
        .query(
          "INSERT INTO reviews (userId, beerId, rating, text, sweetness, acidity, body, createdAt, updatedAt) VALUES (?, ?, ?, 'Avis', NULL, NULL, NULL, ?, ?)",
          [FIRST_REVIEWER_ID + index, beerId, rating, now, now],
        );
    }
  };

  const getRaw = (entries: readonly (readonly [string, string | number])[]) =>
    request(app.getHttpServer())
      .get(`${BEERS_PATH}?${new URLSearchParams(entries.map(([key, value]): [string, string] => [key, String(value)])).toString()}`)
      .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID));

  const getList = async (entries: readonly (readonly [string, string | number])[]): Promise<BeerPageDto> => {
    const response = await getRaw(entries);
    expect(response.status).toBe(HttpStatus.OK);
    return response.body as BeerPageDto;
  };

  const findBeerId = async (name: string): Promise<number> => {
    const beer = (await getList([["q", name]])).items.find((item) => item.name === name);
    if (beer === undefined) {
      throw new Error(`${name} is not seeded`);
    }
    return beer.id;
  };

  beforeAll(async () => {
    app = await createTestApp();
    await app.get(DataSource).query("DELETE FROM reviews");
    await insertRatings(await findBeerId("Westmalle Tripel"), [4, 5]);
    await insertRatings(await findBeerId("Orval"), [4.5]);
    await insertRatings(await findBeerId("Duvel"), [3]);
    await insertRatings(await findBeerId("Chimay Rouge"), [3.5, 4, 4, 4, 4]);
  });

  afterAll(async () => {
    await app.close();
  });

  it("US6 AC1 sorts by rating: 4.5 with 2 reviews, 4.5 with 1, 3.9, 3, then the unrated by name", async () => {
    const page = await getList([["sort", "rating"], ["size", 7]]);

    expect(page.items.map((item) => [item.name, item.averageRating, item.reviewCount])).toEqual([
      ["Westmalle Tripel", 4.5, 2],
      ["Orval", 4.5, 1],
      ["Chimay Rouge", 3.9, 5],
      ["Duvel", 3, 1],
      [page.items[4].name, null, 0],
      [page.items[5].name, null, 0],
      [page.items[6].name, null, 0],
    ]);
    const unrated = page.items.slice(4).map((item) => item.name.toLowerCase());
    expect(unrated).toEqual([...unrated].sort());
  });

  it("US6 AC2 keeps the beers at 4 or more, with the total and the facets", async () => {
    const page = await getList([["minRating", 4]]);

    expect(page.items.map((item) => item.name)).toEqual(["Orval", "Westmalle Tripel"]);
    expect(page.total).toBe(2);
    expect(page.facets.countries).toEqual([{ value: "BE", count: 2 }]);
    expect(page.facets.families).toEqual([{ value: "trappist", count: 2 }]);
    expect((await getList([["minRating", 3.5]])).total).toBe(3);
    expect((await getList([["minRating", 5]])).total).toBe(0);
  });

  it.each([0.5, 5.5, 3.3])("US6 AC3 answers 400 and a message for the minimum rating %s", async (value) => {
    const response = await getRaw([["minRating", value]]);

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect((response.body as { message: string }).message).toContain("minRating");
  });

  it("US6 AC3 answers 400 and a message for a non numeric minimum rating", async () => {
    const response = await getRaw([["minRating", "abc"]]);

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect((response.body as { message: string }).message).toContain("minRating");
  });

  it("US6 AC4 applies the drunk filter and the minimum rating together", async () => {
    const westmalleId = await findBeerId("Westmalle Tripel");
    const checkin = await request(app.getHttpServer())
      .post("/api/v1/checkins")
      .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID))
      .field("beerId", String(westmalleId))
      .field("drankAt", "2025-10-01T18:00:00.000Z")
      .field("place", "Le Bistrot")
      .field("format", "bottle");
    expect(checkin.status).toBe(HttpStatus.CREATED);

    const page = await getList([["status", "drunk"], ["minRating", 4]]);
    const drunkOnly = await getList([["status", "drunk"]]);
    const ratedOnly = await getList([["minRating", 4]]);

    expect(page.items.map((item) => item.name)).toEqual(["Westmalle Tripel"]);
    expect(page.total).toBe(1);
    expect(drunkOnly.total).toBe(1);
    expect(ratedOnly.total).toBe(2);
  });
});

describe("community beers API", () => {
  const OLD_BEER_AGE_MS = 48 * 60 * 60 * 1000;
  const NEW_BEER = { name: "Brune du Mont", breweryName: "Brasserie du Mont", country: "FR", abv: 6.5 };

  let app: INestApplication;
  let beers: Repository<Beer>;
  let style: CatalogBeerDto;
  let nameCounter = 0;

  const as = (userId: number, test: request.Test): request.Test => test.set(USER_ID_HEADER_NAME, String(userId));

  const propose = (userId: number, body: Record<string, unknown>): request.Test =>
    as(userId, request(app.getHttpServer()).post(BEERS_PATH)).send({ styleId: style.styleId, ...NEW_BEER, ...body });

  const uniqueBody = (): Record<string, unknown> => {
    nameCounter += 1;
    return { name: `Proposal ${nameCounter}` };
  };

  const create = async (userId: number, body: Record<string, unknown>): Promise<BeerDetailDto> => {
    const response = await propose(userId, body);
    expect(response.status).toBe(HttpStatus.CREATED);
    return response.body as BeerDetailDto;
  };

  const countBeers = async (): Promise<number> => {
    const rows = await app.get(DataSource).query<{ total: number }[]>("SELECT COUNT(*) AS total FROM beers");
    return rows[0].total;
  };

  const getBeersPage = async (userId: number, query: Record<string, string | number>): Promise<BeerPageDto> => {
    const response = await as(userId, request(app.getHttpServer()).get(BEERS_PATH).query(query));
    expect(response.status).toBe(HttpStatus.OK);
    return response.body as BeerPageDto;
  };

  const getBreweries = async (): Promise<BreweryDto[]> => {
    const response = await as(ALICE_USER_ID, request(app.getHttpServer()).get("/api/v1/breweries"));
    expect(response.status).toBe(HttpStatus.OK);
    return response.body as BreweryDto[];
  };

  const ageCommunityBeers = async (): Promise<void> => {
    await beers.update({ createdBy: Not(IsNull()) }, { createdAt: new Date(Date.now() - OLD_BEER_AGE_MS) });
  };

  beforeAll(async () => {
    app = await createTestApp();
    beers = app.get(getRepositoryToken(Beer), { strict: false });
    style = (await getBeersPage(ALICE_USER_ID, { q: "Orval" })).items.filter((beer) => beer.name === "Orval")[0];
  });

  beforeEach(async () => {
    await ageCommunityBeers();
  });

  afterAll(async () => {
    await app.close();
  });

  it("answers 401 without the user header", async () => {
    const response = await request(app.getHttpServer()).post(BEERS_PATH).send({ styleId: style.styleId, ...NEW_BEER });

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });

  it("answers 401 before 400 without the user header", async () => {
    const before = await countBeers();

    const response = await request(app.getHttpServer())
      .post(BEERS_PATH)
      .send({ styleId: style.styleId, ...NEW_BEER, abv: BEER_PROPOSAL_ABV_MAX_PERCENT + 1 });

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
    expect(await countBeers()).toBe(before);
  });

  it("AC1 creates the beer of Alice with 201 and answers the sheet of a community beer", async () => {
    const response = await propose(ALICE_USER_ID, {});

    expect(response.status).toBe(HttpStatus.CREATED);
    expect(response.body).toEqual({
      id: expect.any(Number),
      name: "Brune du Mont",
      breweryName: "Brasserie du Mont",
      country: "FR",
      styleId: style.styleId,
      styleName: style.styleName,
      family: style.family,
      abv: 6.5,
      aromas: [],
      formats: [],
      description: "",
      bitternessLevel: null,
      colorLevel: null,
      styleColorRange: style.styleColorRange,
      source: "community",
      createdBy: ALICE_USER_ID,
      createdByName: "Alice",
      drunk: false,
      checkinCount: 0,
      inWishlist: false,
      averageRating: null,
      reviewCount: 0,
      ...NO_REVIEW_STATS,
    });
  });

  it("AC1 keeps the description sent and records the creation date", async () => {
    const before = Date.now();

    const created = await create(ALICE_USER_ID, { ...uniqueBody(), description: "Une brune \r\n douce." });

    const stored = await beers.findOneByOrFail({ id: created.id });
    expect(created.description).toBe("Une brune \n douce.");
    expect(stored.createdBy).toBe(ALICE_USER_ID);
    expect(stored.createdAt?.getTime()).toBeGreaterThanOrEqual(before - 1000);
  });

  it("AC2 lists, finds, filters and counts the created beer, and opens its sheet", async () => {
    const familyBefore = (await getBeersPage(ALICE_USER_ID, {})).facets.families.find((facet) => facet.value === style.family)?.count ?? 0;
    const created = await create(ALICE_USER_ID, { name: "Zimbabwe Special", country: "ZW" });

    const searched = await getBeersPage(BOB_USER_ID, { q: "zimbabwe special" });
    const byCountry = await getBeersPage(BOB_USER_ID, { country: "ZW" });
    const byFamily = await getBeersPage(BOB_USER_ID, { family: style.family, size: BEER_PAGE_SIZE_MAX, q: "zimbabwe" });
    const all = await getBeersPage(BOB_USER_ID, {});
    const sheet = await as(BOB_USER_ID, request(app.getHttpServer()).get(`${BEERS_PATH}/${created.id}`));

    expect(searched.items.map((beer) => beer.id)).toEqual([created.id]);
    expect(searched.items[0]).toMatchObject({ source: "community", createdBy: ALICE_USER_ID, createdByName: "Alice" });
    expect(byCountry.items.map((beer) => beer.id)).toEqual([created.id]);
    expect(byCountry.facets.countries).toContainEqual({ value: "ZW", count: 1 });
    expect(byFamily.items.map((beer) => beer.id)).toEqual([created.id]);
    expect(all.facets.countries.find((facet) => facet.value === "ZW")).toEqual({ value: "ZW", count: 1 });
    expect(all.facets.families.find((facet) => facet.value === style.family)?.count).toBe(familyBefore + 1);
    expect(sheet.status).toBe(HttpStatus.OK);
    expect(sheet.body).toMatchObject({ id: created.id, source: "community", createdBy: ALICE_USER_ID, createdByName: "Alice" });
  });

  it("AC3 lets Bob check in, review, wish and collect a beer proposed by Alice", async () => {
    const created = await create(ALICE_USER_ID, uniqueBody());

    const checkin = await as(BOB_USER_ID, request(app.getHttpServer()).post("/api/v1/checkins"))
      .field("beerId", String(created.id))
      .field("drankAt", "2025-10-01T18:00:00.000Z")
      .field("place", "Le Bistrot")
      .field("format", "bottle");
    const review = await as(BOB_USER_ID, request(app.getHttpServer()).put(`${BEERS_PATH}/${created.id}/reviews/me`)).send({
      rating: 4,
      text: "Tres bonne",
    });
    const wish = await as(BOB_USER_ID, request(app.getHttpServer()).post("/api/v1/me/wishlist")).send({ beerId: created.id });
    const collection = await as(BOB_USER_ID, request(app.getHttpServer()).post("/api/v1/me/collections")).send({ name: "Proposees" });
    const added = await as(
      BOB_USER_ID,
      request(app.getHttpServer()).post(`/api/v1/me/collections/${(collection.body as { id: number }).id}/beers`),
    ).send({ beerId: created.id });
    const sheet = await as(BOB_USER_ID, request(app.getHttpServer()).get(`${BEERS_PATH}/${created.id}`));

    expect(checkin.status).toBe(HttpStatus.CREATED);
    expect(review.status).toBe(HttpStatus.OK);
    expect(wish.status).toBe(HttpStatus.CREATED);
    expect(collection.status).toBe(HttpStatus.CREATED);
    expect(added.status).toBe(HttpStatus.CREATED);
    expect(sheet.body).toMatchObject({ drunk: true, checkinCount: 1, inWishlist: true, averageRating: 4, reviewCount: 1 });
  });

  it("AC4 answers 409 for the name and brewery of an official beer written with other case, accents and spaces", async () => {
    const before = await countBeers();

    const response = await propose(ALICE_USER_ID, { name: "jenlain  ambree", breweryName: "BRASSERIE DUYCK" });

    expect(response.status).toBe(HttpStatus.CONFLICT);
    expect(response.body).toEqual({ message: expect.stringContaining("jenlain ambree") });
    expect(await countBeers()).toBe(before);
  });

  it("answers 409 for a second proposal of the same community beer by another user", async () => {
    const name = "Proposal Doublon";
    const body = { name, breweryName: "Brasserie Doublon" };
    await create(ALICE_USER_ID, body);

    const response = await propose(BOB_USER_ID, { ...body, name: name.toUpperCase() });

    expect(response.status).toBe(HttpStatus.CONFLICT);
    expect(response.body).toEqual({ message: expect.any(String) });
  });

  it.each([
    ["a name of one letter", { name: "a" }],
    ["a name of 81 characters after the cleaning", { name: `  ${"a".repeat(81)}  ` }],
    ["a name of spaces only", { name: "  \n  " }],
    ["a brewery name of one letter", { breweryName: "b" }],
    ["a degree of 20.1", { abv: 20.1 }],
    ["a degree of 6.55", { abv: 6.55 }],
    ["a degree of -1", { abv: -1 }],
    ["a description of 501 characters", { description: "d".repeat(501) }],
    ["a country outside the ISO list", { country: "XX" }],
    ["a missing style", { styleId: undefined }],
    ["an unknown field", { createdBy: 2 }],
  ])("AC5 answers 400 with a message for %s and creates nothing", async (_label, overrides) => {
    const before = await countBeers();

    const response = await propose(ALICE_USER_ID, { ...uniqueBody(), ...overrides });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body).toEqual({ message: expect.any(String) });
    expect((response.body as { message: string }).message).not.toBe("");
    expect(await countBeers()).toBe(before);
  });

  it("accepts the bounds: names of 2 and 80 characters, degrees 0 and 20", async () => {
    const short = await create(ALICE_USER_ID, { name: "ab", abv: 0 });
    const long = await create(ALICE_USER_ID, { name: "l".repeat(80), abv: 20 });

    expect([short.name, short.abv]).toEqual(["ab", 0]);
    expect([long.name.length, long.abv]).toEqual([80, 20]);
  });

  it("AC6 answers 404 with a message for a style that does not exist and creates nothing", async () => {
    const before = await countBeers();

    const response = await propose(ALICE_USER_ID, { ...uniqueBody(), styleId: 99_999 });

    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.body).toEqual({ message: "Beer style 99999 not found." });
    expect(await countBeers()).toBe(before);
  });

  it("answers 400 before 409 when the degree is invalid and the beer already exists", async () => {
    const before = await countBeers();

    const response = await propose(ALICE_USER_ID, {
      name: "Jenlain Ambrée",
      breweryName: "Brasserie Duyck",
      abv: BEER_PROPOSAL_ABV_MAX_PERCENT + 1,
    });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(await countBeers()).toBe(before);
  });

  it("answers 400 before 404 when the degree is invalid and the style unknown", async () => {
    const response = await propose(ALICE_USER_ID, { ...uniqueBody(), styleId: 99_999, abv: 21 });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
  });

  describe("limit", () => {
    const fillLimit = async (userId: number): Promise<void> => {
      for (let index = 0; index < BEER_PROPOSALS_PER_WINDOW_MAX; index += 1) {
        await create(userId, uniqueBody());
      }
    };

    it("AC7 answers 429 on the 11th creation within 24 hours and creates nothing, while Bob can still create", async () => {
      await fillLimit(CAROL_USER_ID);
      const before = await countBeers();

      const response = await propose(CAROL_USER_ID, uniqueBody());
      const countAfterRefusal = await countBeers();
      const bob = await propose(BOB_USER_ID, uniqueBody());

      expect(response.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(response.body).toEqual({ message: expect.any(String) });
      expect((response.body as { message: string }).message).not.toBe("");
      expect(countAfterRefusal).toBe(before);
      expect(bob.status).toBe(HttpStatus.CREATED);
    });

    it("keeps counting the 10 beers created the evening before, and frees the user once they are older than 24 hours", async () => {
      await fillLimit(CAROL_USER_ID);
      await beers.update({ createdBy: CAROL_USER_ID }, { createdAt: new Date(Date.now() - 23 * 60 * 60 * 1000) });
      const stillBlocked = await propose(CAROL_USER_ID, uniqueBody());
      await beers.update({ createdBy: CAROL_USER_ID }, { createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) });
      const freed = await propose(CAROL_USER_ID, uniqueBody());

      expect(stillBlocked.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(freed.status).toBe(HttpStatus.CREATED);
    });

    it("answers 400 before 429 when the quota is full and the degree is invalid", async () => {
      await fillLimit(CAROL_USER_ID);
      const before = await countBeers();

      const response = await propose(CAROL_USER_ID, { ...uniqueBody(), abv: BEER_PROPOSAL_ABV_MAX_PERCENT + 1 });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(await countBeers()).toBe(before);
    });

    it("answers 404 before 429 and 429 before 409", async () => {
      await fillLimit(CAROL_USER_ID);
      const missing = await propose(CAROL_USER_ID, { ...uniqueBody(), styleId: 99_999 });
      const duplicate = await propose(CAROL_USER_ID, { name: "Jenlain Ambrée", breweryName: "Brasserie Duyck" });

      expect(missing.status).toBe(HttpStatus.NOT_FOUND);
      expect(duplicate.status).toBe(HttpStatus.TOO_MANY_REQUESTS);
    });
  });

  it("AC8 stores a name written on several lines with multiple spaces as one clean line", async () => {
    const response = await propose(ALICE_USER_ID, { name: "  Brune \r\n\n  du   Cap  " });

    expect(response.status).toBe(HttpStatus.CREATED);
    expect((response.body as BeerDetailDto).name).toBe("Brune du Cap");
    expect((await beers.findOneByOrFail({ id: (response.body as BeerDetailDto).id })).name).toBe("Brune du Cap");
  });

  it("AC9 attaches a second beer to the existing brewery written with another case, with no duplicate brewery", async () => {
    await create(ALICE_USER_ID, { ...uniqueBody(), breweryName: "Brasserie Reutilisee", country: "NL" });
    const breweriesBefore = await getBreweries();

    const second = await create(BOB_USER_ID, { ...uniqueBody(), breweryName: "  brasserie   REUTILISEE ", country: "BE" });

    const breweriesAfter = await getBreweries();
    expect(breweriesAfter).toEqual(breweriesBefore);
    expect(breweriesAfter.filter((brewery) => brewery.name === "Brasserie Reutilisee")).toHaveLength(1);
    expect(second.breweryName).toBe("Brasserie Reutilisee");
  });

  it("AC10 lists the brewery created by a proposal with the country of the beer", async () => {
    const before = await getBreweries();

    await create(ALICE_USER_ID, { ...uniqueBody(), breweryName: "Brasserie Nouvelle", country: "NZ" });

    const after = await getBreweries();
    expect(after).toHaveLength(before.length + 1);
    expect(after).toContainEqual({ id: expect.any(Number), name: "Brasserie Nouvelle", country: "NZ" });
  });

  it("AC11 accepts the name of an official beer at another brewery", async () => {
    const response = await propose(ALICE_USER_ID, { name: "Jenlain Ambrée", breweryName: "Brasserie du Mont" });

    expect(response.status).toBe(HttpStatus.CREATED);
    expect(response.body).toMatchObject({ name: "Jenlain Ambrée", breweryName: "Brasserie du Mont", source: "community" });
  });

  it("finds a beer at 18 percent by its name and excludes it from an at most 12 percent filter", async () => {
    await create(ALICE_USER_ID, { name: "Quadruple Forte", abv: 18 });

    const found = await getBeersPage(ALICE_USER_ID, { q: "quadruple forte" });
    const filtered = await getBeersPage(ALICE_USER_ID, { q: "quadruple forte", abvMax: 12 });

    expect(found.items.map((beer) => beer.abv)).toEqual([18]);
    expect(filtered.items).toEqual([]);
  });

  it("stores and returns HTML as plain text", async () => {
    const created = await create(ALICE_USER_ID, { name: "<b>Bold</b> <script>x</script>", description: "<img src=x onerror=alert(1)>" });

    expect(created.name).toBe("<b>Bold</b> <script>x</script>");
    expect(created.description).toBe("<img src=x onerror=alert(1)>");
  });
});
