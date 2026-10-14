import { HttpStatus } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestApp } from "@/__tests__/support/test-app";
import { USER_ID_HEADER_NAME } from "@/__tests__/support/user-header";
import { UNIDENTIFIED_USER_MESSAGE } from "@/common/exceptions/exception-messages.constants";
import { ALICE_USER_ID, BOB_USER_ID, CAROL_USER_ID } from "@/database/seed.constants";
import type { BeerDto } from "@/modules/beers/dtos/beer.dto";
import type { BeerPageDto } from "@/modules/beers/dtos/beer-page.dto";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import type { CreatedCheckinDto } from "@/modules/pokedex/dtos/created-checkin.dto";
import type { StatsDto } from "@/modules/profile/dtos/stats.dto";

const STATS_PATH = "/api/v1/me/stats";
const BEERS_PATH = "/api/v1/beers";
const CHECKINS_PATH = "/api/v1/checkins";
const UNKNOWN_USER_ID = 99;
const FIRST_DATE = "2025-10-01T18:00:00.000Z";
const SECOND_DATE = "2025-10-10T18:00:00.000Z";
const THIRD_DATE = "2025-10-05T18:00:00.000Z";
const NOW = "2025-10-13T12:00:00.000Z";
const MONTHS = [
  "2024-11",
  "2024-12",
  "2025-01",
  "2025-02",
  "2025-03",
  "2025-04",
  "2025-05",
  "2025-06",
  "2025-07",
  "2025-08",
  "2025-09",
  "2025-10",
] as const;

const monthly = (counts: Readonly<Record<string, number>> = {}): { month: string; count: number }[] =>
  MONTHS.map((month) => ({ month, count: counts[month] ?? 0 }));

describe("stats API", () => {
  let app: INestApplication;

  const findBeer = async (name: string): Promise<BeerDto> => {
    const response = await request(app.getHttpServer())
      .get(BEERS_PATH)
      .query({ q: name })
      .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID));
    expect(response.status).toBe(HttpStatus.OK);
    const beer = (response.body as BeerPageDto).items.find((item) => item.name === name);
    if (beer === undefined) {
      throw new Error(`${name} is not seeded`);
    }
    return beer;
  };

  const drink = async (userId: number, beerId: number, drankAt: string, rating?: number): Promise<void> => {
    const call = request(app.getHttpServer())
      .post(CHECKINS_PATH)
      .set(USER_ID_HEADER_NAME, String(userId))
      .field("beerId", String(beerId))
      .field("drankAt", drankAt)
      .field("place", "Le Bistrot")
      .field("format", "bottle");
    const response = await (rating === undefined ? call : call.field("rating", String(rating)));
    expect(response.status).toBe(HttpStatus.CREATED);
  };

  const readStats = (userId: number): request.Test =>
    request(app.getHttpServer()).get(STATS_PATH).set(USER_ID_HEADER_NAME, String(userId));

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(NOW));
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    vi.useRealTimers();
  });

  it("answers 401 without the user header", async () => {
    const response = await request(app.getHttpServer()).get(STATS_PATH);

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });

  it("answers 401 to a well-formed user id that matches no user", async () => {
    const response = await readStats(UNKNOWN_USER_ID);

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });

  it("answers 200 with zero counts, null averages and favorite family and no country to a user without any tasting", async () => {
    const response = await readStats(CAROL_USER_ID);

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual({
      checkinCount: 0,
      discoveredCount: 0,
      averageAbv: null,
      countries: [],
      favoriteFamily: null,
      averageRating: null,
      currentStreak: 0,
      bestStreak: 0,
      monthlyCheckins: monthly(),
    });
  });

  it("answers the statistics of Alice who drank Orval twice, rated 4 and 5, and a German beer once without rating", async () => {
    const orval = await findBeer("Orval");
    const hell = await findBeer("Paulaner Original Münchner Hell");
    await drink(ALICE_USER_ID, orval.id, FIRST_DATE, 4);
    await drink(ALICE_USER_ID, orval.id, SECOND_DATE, 5);
    await drink(ALICE_USER_ID, hell.id, THIRD_DATE);

    const response = await readStats(ALICE_USER_ID);

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body as StatsDto).toEqual({
      checkinCount: 3,
      discoveredCount: 2,
      averageAbv: 5.6,
      countries: [{ country: "BE", count: 1 }, { country: "DE", count: 1 }],
      favoriteFamily: BeerFamilyEnum.TRAPPIST,
      averageRating: 4.5,
      currentStreak: 0,
      bestStreak: 1,
      monthlyCheckins: monthly({ "2025-10": 3 }),
    });
  });

  it("recomputes the statistics once the only check-in of a user is deleted", async () => {
    const orval = await findBeer("Orval");
    const created = await request(app.getHttpServer())
      .post(CHECKINS_PATH)
      .set(USER_ID_HEADER_NAME, String(BOB_USER_ID))
      .field("beerId", String(orval.id))
      .field("drankAt", FIRST_DATE)
      .field("place", "Le Bistrot")
      .field("format", "bottle")
      .field("rating", "3");
    expect(created.status).toBe(HttpStatus.CREATED);
    expect((await readStats(BOB_USER_ID)).body).toMatchObject({ checkinCount: 1, discoveredCount: 1, averageRating: 3 });

    const removed = await request(app.getHttpServer())
      .delete(`${CHECKINS_PATH}/${(created.body as CreatedCheckinDto).checkin.id}`)
      .set(USER_ID_HEADER_NAME, String(BOB_USER_ID));
    expect(removed.status).toBe(HttpStatus.NO_CONTENT);

    expect((await readStats(BOB_USER_ID)).body).toEqual({
      checkinCount: 0,
      discoveredCount: 0,
      averageAbv: null,
      countries: [],
      favoriteFamily: null,
      averageRating: null,
      currentStreak: 0,
      bestStreak: 0,
      monthlyCheckins: monthly(),
    });
  });

  it("leaves the statistics of another user untouched", async () => {
    const response = await readStats(CAROL_USER_ID);

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual({
      checkinCount: 0,
      discoveredCount: 0,
      averageAbv: null,
      countries: [],
      favoriteFamily: null,
      averageRating: null,
      currentStreak: 0,
      bestStreak: 0,
      monthlyCheckins: monthly(),
    });
  });

  it("answers a current streak of 3 and 3 check-ins in the current month to a user who drank on the last 3 days", async () => {
    const orval = await findBeer("Orval");
    await drink(BOB_USER_ID, orval.id, "2025-10-11T10:00:00.000Z");
    await drink(BOB_USER_ID, orval.id, "2025-10-12T10:00:00.000Z");
    await drink(BOB_USER_ID, orval.id, "2025-10-13T10:00:00.000Z");

    const response = await readStats(BOB_USER_ID);

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toMatchObject({
      currentStreak: 3,
      bestStreak: 3,
      monthlyCheckins: monthly({ "2025-10": 3 }),
    });
  });
});
