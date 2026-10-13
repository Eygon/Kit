import { HttpStatus } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp } from "@/__tests__/support/test-app";
import { USER_ID_HEADER_NAME } from "@/__tests__/support/user-header";
import { UNIDENTIFIED_USER_MESSAGE } from "@/common/exceptions/exception-messages.constants";
import {
  BEER_ABV_MAX_PERCENT,
  BEER_PAGE_SIZE_DEFAULT,
  BEER_PAGE_SIZE_MAX,
  BEER_SEARCH_MAX_LENGTH,
} from "@/modules/beers/beers.constants";
import type { BeerDto } from "@/modules/beers/dtos/beer.dto";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";
import type { BeerPageDto } from "@/modules/beers/dtos/beer-page.dto";
import type { CreatedCheckinDto } from "@/modules/pokedex/dtos/created-checkin.dto";
import type { CatalogBeerDto } from "@/modules/beers/dtos/catalog-beer.dto";
import { ALICE_USER_ID, BOB_USER_ID } from "@/database/seed.constants";

const BEERS_PATH = "/api/v1/beers";
const SEEDED_BEER_COUNT = 120;
const BEER_FIELDS = [
  "abv",
  "aromas",
  "breweryName",
  "checkinCount",
  "country",
  "description",
  "drunk",
  "family",
  "formats",
  "id",
  "inWishlist",
  "name",
  "styleId",
  "styleName",
];

const STATE_FIELDS: readonly string[] = ["drunk", "checkinCount", "inWishlist"];

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
      drunk: false,
      checkinCount: 0,
      inWishlist: false,
    });
    for (const beer of page.items) {
      expect(Object.keys(beer).sort()).toEqual(BEER_FIELDS);
    }
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
    [{ sort: "unknown" }, "sort must be one of the following values: name, abv, brewery"],
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
      drunk: false,
      checkinCount: 0,
      inWishlist: false,
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
    expect(await getSheet(ALICE_USER_ID, orval.id)).toEqual({ ...orval, drunk: true, checkinCount: 2, inWishlist: false });
    expect(await getSheet(ALICE_USER_ID, duvel.id)).toEqual({ ...duvel, drunk: false, checkinCount: 0, inWishlist: true });
    expect(await getSheet(BOB_USER_ID, orval.id)).toEqual({ ...orval, drunk: false, checkinCount: 0, inWishlist: false });
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

    expect(await getSheet(BOB_USER_ID, chimay.id)).toEqual({ ...chimay, drunk: true, checkinCount: 1, inWishlist: true });
    expect((await getBeers(BOB_USER_ID, { status: "wishlist" })).items.map((item) => item.name)).toEqual(["Chimay Rouge"]);
    expect((await getBeers(BOB_USER_ID, { status: "drunk" })).items.map((item) => item.name)).toEqual(["Chimay Rouge"]);

    const deletion = await request(app.getHttpServer())
      .delete(`/api/v1/checkins/${checkinId}`)
      .set(USER_ID_HEADER_NAME, asUser(BOB_USER_ID));
    expect(deletion.status).toBe(HttpStatus.NO_CONTENT);

    expect(await getSheet(BOB_USER_ID, chimay.id)).toEqual({ ...chimay, drunk: false, checkinCount: 0, inWishlist: true });
    expect((await getBeers(BOB_USER_ID, { status: "drunk" })).total).toBe(0);
    expect((await getBeers(BOB_USER_ID, { status: "untasted" })).total).toBe(SEEDED_BEER_COUNT);
  });
});
