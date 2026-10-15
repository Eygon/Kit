import { describe, expect, it } from "vitest";
import beersSeed from "@/database/seed/data/beers.json";
import reviewsSeed from "@/database/seed/data/reviews.json";
import { buildReviewRows } from "@/database/seed/review-seed";
import { BOB_USER_ID, CAROL_USER_ID } from "@/database/seed.constants";
import {
  REVIEW_RATING_MAX, REVIEW_RATING_MIN, REVIEW_RATING_STEP,
} from "@/modules/beers/beers.constants";

const DAY_MS = 86_400_000;
const NOW = new Date("2026-03-15T12:00:00.000Z");
const BEER_IDS = new Map([
  ["pilsner urquell", 7],
  ["orval", 4],
]);
const ROW = {
  userName: "Bob",
  beerName: "Pilsner Urquell",
  rating: 4.5,
  text: "Une pils de référence.",
  sweetness: 2,
  acidity: 1,
  body: 3,
  daysAgo: 3,
};
const IBU_BEER_NAMES = beersSeed.filter((beer) => beer.ibu !== null).map((beer) => beer.name);
const namesRatedBy = (userName: string): string[] =>
  reviewsSeed.filter((row) => row.userName === userName).map((row) => row.beerName);

describe("buildReviewRows", () => {
  it("maps Bob and Carol to their seed user ids and the beer name to its id, case-insensitively", () => {
    const rows = buildReviewRows(
      [ROW, { ...ROW, userName: "Carol", beerName: "ORVAL", rating: 3, text: "", sweetness: null, acidity: null, body: null }],
      BEER_IDS,
      NOW,
    );

    expect(rows.map((row: { userId: number; beerId: number }) => [row.userId, row.beerId])).toEqual([
      [BOB_USER_ID, 7],
      [CAROL_USER_ID, 4],
    ]);
  });

  it("keeps the rating, text and criteria of the row", () => {
    const [row] = buildReviewRows([ROW], BEER_IDS, NOW);

    expect(row).toMatchObject({ rating: 4.5, text: "Une pils de référence.", sweetness: 2, acidity: 1, body: 3 });
  });

  it("dates createdAt and updatedAt daysAgo days before now", () => {
    const [row, older] = buildReviewRows([ROW, { ...ROW, daysAgo: 60 }], BEER_IDS, NOW);

    expect(row.createdAt).toEqual(new Date(NOW.getTime() - 3 * DAY_MS));
    expect(row.updatedAt).toEqual(row.createdAt);
    expect(older.createdAt).toEqual(new Date(NOW.getTime() - 60 * DAY_MS));
  });

  it("fails naming the beer when the beer name is unknown", () => {
    expect(() => buildReviewRows([{ ...ROW, beerName: "Bière inconnue" }], BEER_IDS, NOW)).toThrow(
      new Error('Review by "Bob" has an unknown beer "Bière inconnue".'),
    );
  });

  it("fails naming the user when the author is neither Bob nor Carol", () => {
    expect(() => buildReviewRows([{ ...ROW, userName: "Dave" }], BEER_IDS, NOW)).toThrow(
      new Error('Review of "Pilsner Urquell" has an unknown user "Dave".'),
    );
  });

  it("does not resolve inherited object keys as authors", () => {
    expect(() => buildReviewRows([{ ...ROW, userName: "constructor" }], BEER_IDS, NOW)).toThrow(/unknown user/);
  });
});

describe("reviews.json", () => {
  it("holds about 20 reviews by Bob and Carol only, one per user and beer pair", () => {
    expect(reviewsSeed.length).toBeGreaterThanOrEqual(18);
    expect(reviewsSeed.length).toBeLessThanOrEqual(24);
    expect(new Set(reviewsSeed.map((row) => row.userName))).toEqual(new Set(["Bob", "Carol"]));
    expect(new Set(reviewsSeed.map((row) => `${row.userName}|${row.beerName}`)).size).toBe(reviewsSeed.length);
  });

  it("rates at least 6 beers by both Bob and Carol, including the 5 beers with an IBU", () => {
    const rateByBoth = namesRatedBy("Bob").filter((name) => namesRatedBy("Carol").includes(name));

    expect(IBU_BEER_NAMES).toHaveLength(5);
    expect(rateByBoth.length).toBeGreaterThanOrEqual(6);
    expect(IBU_BEER_NAMES.every((name) => rateByBoth.includes(name))).toBe(true);
  });

  it("uses exact beer names, ratings in half steps, French texts of 200 characters at most and 1 to 60 days", () => {
    const beerNames = new Set(beersSeed.map((beer) => beer.name));

    for (const row of reviewsSeed) {
      expect(beerNames.has(row.beerName)).toBe(true);
      expect(row.rating).toBeGreaterThanOrEqual(REVIEW_RATING_MIN);
      expect(row.rating).toBeLessThanOrEqual(REVIEW_RATING_MAX);
      expect((row.rating / REVIEW_RATING_STEP) % 1).toBe(0);
      expect(row.text.length).toBeGreaterThan(0);
      expect(row.text.length).toBeLessThanOrEqual(200);
      expect(row.daysAgo).toBeGreaterThanOrEqual(1);
      expect(row.daysAgo).toBeLessThanOrEqual(60);
    }
  });

  it("builds a row for every review of the real file", () => {
    const ids = new Map(beersSeed.map((beer, index) => [beer.name.toLowerCase(), index + 1]));

    const rows = buildReviewRows(reviewsSeed, ids, NOW);

    expect(rows).toHaveLength(reviewsSeed.length);
  });
});
