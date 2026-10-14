import { describe, expect, it } from "vitest";
import beersSeed from "@/database/seed/data/beers.json";
import demoCheckinsSeed from "@/database/seed/data/demo-checkins.json";
import reviewsSeed from "@/database/seed/data/reviews.json";
import venuesSeed from "@/database/seed/data/venues.json";
import { buildDemoCheckinRows, buildDemoFollowRows } from "@/database/seed/social-seed";
import { ALICE_USER_ID, BOB_USER_ID, CAROL_USER_ID, SEED_DEMO_FOLLOWS } from "@/database/seed.constants";
import { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";

const DAY_MS = 86_400_000;
const NOW = new Date("2026-03-15T12:00:00.000Z");
const BEER_IDS = new Map(beersSeed.map((beer, index) => [beer.name.toLowerCase(), index + 1]));
const ROW = {
  userName: "Bob",
  beerName: "Pilsner Urquell",
  place: "La Fine Mousse",
  rating: 4.5,
  format: "draft",
  daysAgo: 3,
};
const rowsOf = (userName: string) => demoCheckinsSeed.filter((row) => row.userName === userName);
const distinctBeersOf = (userName: string): number => new Set(rowsOf(userName).map((row) => row.beerName)).size;
const namesReviewedBy = (userName: string): string[] =>
  reviewsSeed.filter((row) => row.userName === userName).map((row) => row.beerName);
const discoveryDaysOf = (userName: string): number[] => {
  const seen = new Set<string>();
  return rowsOf(userName)
    .toSorted((left, right) => right.daysAgo - left.daysAgo)
    .filter((row) => !seen.has(row.beerName) && seen.add(row.beerName))
    .map((row) => Math.floor(NOW.getTime() / DAY_MS - row.daysAgo));
};

describe("buildDemoCheckinRows", () => {
  it("maps Bob and Carol to their seed user ids and the beer name to its id, case-insensitively", () => {
    const rows = buildDemoCheckinRows(
      [ROW, { ...ROW, userName: "Carol", beerName: "ORVAL", rating: null }],
      new Map([
        ["pilsner urquell", 7],
        ["orval", 4],
      ]),
      NOW,
    );

    expect(rows.map((row) => [row.userId, row.beerId])).toEqual([
      [BOB_USER_ID, 7],
      [CAROL_USER_ID, 4],
    ]);
  });

  it("builds the whole row: date, empty comment, no aroma, no photo, no price", () => {
    const [row] = buildDemoCheckinRows([ROW], new Map([["pilsner urquell", 7]]), NOW);

    expect(row).toEqual({
      userId: BOB_USER_ID,
      beerId: 7,
      drankAt: new Date(NOW.getTime() - 3 * DAY_MS),
      place: "La Fine Mousse",
      rating: 4.5,
      aromas: [],
      format: BeerFormatEnum.DRAFT,
      price: null,
      comment: "",
      photoId: null,
    });
  });

  it("keeps a null rating and a fractional number of days", () => {
    const [row] = buildDemoCheckinRows(
      [{ ...ROW, rating: null, daysAgo: 0.5 }],
      new Map([["pilsner urquell", 7]]),
      NOW,
    );

    expect(row.rating).toBeNull();
    expect(row.drankAt).toEqual(new Date(NOW.getTime() - 0.5 * DAY_MS));
  });

  it("rejects an unknown user", () => {
    expect(() => buildDemoCheckinRows([{ ...ROW, userName: "Zoe" }], BEER_IDS, NOW)).toThrow(
      'Demo tasting of "Pilsner Urquell" has an unknown user "Zoe".',
    );
  });

  it("rejects an unknown beer", () => {
    expect(() => buildDemoCheckinRows([{ ...ROW, beerName: "Nope" }], BEER_IDS, NOW)).toThrow(
      'Demo tasting by "Bob" has an unknown beer "Nope".',
    );
  });

  it("rejects an unknown format", () => {
    expect(() => buildDemoCheckinRows([{ ...ROW, format: "keg" }], BEER_IDS, NOW)).toThrow(
      'Demo tasting of "Pilsner Urquell" has an unknown format "keg".',
    );
  });
});

describe("buildDemoFollowRows", () => {
  it("makes Alice follow Bob and Carol", () => {
    expect(buildDemoFollowRows()).toEqual([
      { followerId: ALICE_USER_ID, followedId: BOB_USER_ID },
      { followerId: ALICE_USER_ID, followedId: CAROL_USER_ID },
    ]);
  });

  it("returns fresh objects each time", () => {
    const rows = buildDemoFollowRows();

    expect(rows).toHaveLength(SEED_DEMO_FOLLOWS.length);
    expect(rows[0]).not.toBe(SEED_DEMO_FOLLOWS[0]);
  });
});

describe("demo-checkins.json", () => {
  it("gives Bob 10 tastings on 8 distinct beers and Carol 11 on 9", () => {
    expect([rowsOf("Bob").length, distinctBeersOf("Bob")]).toEqual([10, 8]);
    expect([rowsOf("Carol").length, distinctBeersOf("Carol")]).toEqual([11, 9]);
    expect(demoCheckinsSeed).toHaveLength(21);
  });

  it("only holds tastings of Bob and Carol", () => {
    expect(demoCheckinsSeed.every((row) => ["Bob", "Carol"].includes(row.userName))).toBe(true);
  });

  it("uses exact beer names of beers.json and venue names of venues.json", () => {
    const beerNames = new Set(beersSeed.map((beer) => beer.name));
    const venueNames = new Set(venuesSeed.map((venue) => venue.name));

    expect(demoCheckinsSeed.filter((row) => !beerNames.has(row.beerName))).toEqual([]);
    expect(demoCheckinsSeed.filter((row) => !venueNames.has(row.place))).toEqual([]);
  });

  it.each(["Bob", "Carol"])("includes at least 4 beers that %s also reviewed", (userName) => {
    const reviewed = new Set(namesReviewedBy(userName));
    const shared = new Set(rowsOf(userName).filter((row) => reviewed.has(row.beerName)).map((row) => row.beerName));

    expect(shared.size).toBeGreaterThanOrEqual(4);
  });

  it("rates from 2.5 to 5 by half points, or leaves the rating empty", () => {
    const ratings = demoCheckinsSeed.map((row) => row.rating).filter((rating) => rating !== null);

    expect(ratings.length).toBeGreaterThan(0);
    expect(demoCheckinsSeed.some((row) => row.rating === null)).toBe(true);
    expect(ratings.every((rating) => rating >= 2.5 && rating <= 5 && (rating * 2) % 1 === 0)).toBe(true);
  });

  it("dates every tasting between 0.1 and 29 days ago", () => {
    expect(demoCheckinsSeed.every((row) => row.daysAgo >= 0.1 && row.daysAgo <= 29)).toBe(true);
  });

  it.each(["Bob", "Carol"])("has a day with 2 discoveries for %s and at least 5 distinct beers", (userName) => {
    const days = discoveryDaysOf(userName);

    expect(days.length).toBeGreaterThanOrEqual(5);
    expect(days.some((day) => days.filter((other) => other === day).length >= 2)).toBe(true);
  });

  it("uses only known formats", () => {
    const formats = Object.values(BeerFormatEnum) as string[];

    expect(demoCheckinsSeed.every((row) => formats.includes(row.format))).toBe(true);
  });

  it("builds without error against the real catalog", () => {
    expect(buildDemoCheckinRows(demoCheckinsSeed, BEER_IDS, NOW)).toHaveLength(demoCheckinsSeed.length);
  });
});
