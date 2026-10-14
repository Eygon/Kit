import { HttpStatus } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { UNIDENTIFIED_USER_MESSAGE } from "@/common/exceptions/exception-messages.constants";
import { createTestApp } from "@/__tests__/support/test-app";
import { USER_ID_HEADER_NAME } from "@/__tests__/support/user-header";
import { VOTE_COOLDOWN_HOURS } from "@/modules/venues/venues.constants";

const VENUES_PATH = "/api/v1/venues";
const BEERS_PATH = "/api/v1/beers";
const ALICE_ID = "1";
const BOB_ID = "2";
const CAROL_ID = "3";
const UNKNOWN_ID = 999_999;
const HOUR_MS = 3_600_000;
const COOLDOWN_MS = VOTE_COOLDOWN_HOURS * HOUR_MS;
const COOLDOWN_MESSAGE = "You already voted for this beer here in the last 24 hours.";
const SENSE_MESSAGE = "sense must be one of the following values: still, gone";
const BEER_WITHOUT_LINK = "Hoegaarden 0,0";

const BERTHOM_LYON = "Les Berthom Lyon";
const FINE_MOUSSE = "La Fine Mousse";
const SUPERCOIN = "Le Supercoin";
const ORVAL = "Orval";
const RODENBACH = "Rodenbach Grand Cru";
const PIETRA = "Pietra";

interface VenueBeerBody {
  readonly beerId: number;
  readonly beerName: string;
  readonly status: string;
  readonly lastConfirmedAt: string | null;
  readonly recentVoterCount: number;
  readonly nextVoteAt: string | null;
  readonly drunk: boolean;
  readonly checkinCount: number;
  readonly lastCheckinAt: string | null;
}

describe("venue votes API", () => {
  let app: INestApplication;
  let baseTime: Date;
  const venueIds = new Map<string, number>();
  const beerIds = new Map<string, number>();

  const at = (offsetMs: number): Date => new Date(baseTime.getTime() + offsetMs);

  const setNow = (offsetMs: number): void => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(at(offsetMs));
  };

  const voteAs = (userId: string, venue: string, beer: string, body: unknown) =>
    request(app.getHttpServer())
      .post(`${VENUES_PATH}/${venueIds.get(venue)}/beers/${beerIds.get(beer)}/votes`)
      .set(USER_ID_HEADER_NAME, userId)
      .send(body as object);

  const beersOf = async (userId: string, venue: string): Promise<VenueBeerBody[]> => {
    const response = await request(app.getHttpServer())
      .get(`${VENUES_PATH}/${venueIds.get(venue)}/beers`)
      .set(USER_ID_HEADER_NAME, userId);
    expect(response.status).toBe(HttpStatus.OK);
    return response.body as VenueBeerBody[];
  };

  const beerOf = async (userId: string, venue: string, beer: string): Promise<VenueBeerBody> => {
    const found = (await beersOf(userId, venue)).find((item) => item.beerId === beerIds.get(beer));
    expect(found).toBeDefined();
    return found as VenueBeerBody;
  };

  beforeAll(async () => {
    app = await createTestApp();
    const venues = await request(app.getHttpServer()).get(VENUES_PATH).set(USER_ID_HEADER_NAME, ALICE_ID);
    expect(venues.status).toBe(HttpStatus.OK);
    (venues.body as { id: number; name: string }[]).forEach((venue) => venueIds.set(venue.name, venue.id));
    for (const name of [ORVAL, RODENBACH, PIETRA, BEER_WITHOUT_LINK]) {
      const beers = await request(app.getHttpServer())
        .get(`${BEERS_PATH}?q=${encodeURIComponent(name)}`)
        .set(USER_ID_HEADER_NAME, ALICE_ID);
      expect(beers.status).toBe(HttpStatus.OK);
      const beer = (beers.body as { items: { id: number; name: string }[] }).items.find((item) => item.name === name);
      expect(beer).toBeDefined();
      beerIds.set(name, (beer as { id: number }).id);
    }
    baseTime = new Date();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /api/v1/venues/:id/beers/:beerId/votes", () => {
    it("confirms an unknown beer once a second user votes still and offers Bob a revote in 24 hours", async () => {
      const before = await beerOf(ALICE_ID, BERTHOM_LYON, ORVAL);
      expect(before).toMatchObject({ status: "unknown", recentVoterCount: 0, lastConfirmedAt: null, nextVoteAt: null });

      setNow(0);
      const alice = await voteAs(ALICE_ID, BERTHOM_LYON, ORVAL, { sense: "still" });
      expect(alice.status).toBe(HttpStatus.CREATED);
      expect(alice.body).toEqual({
        ...before,
        drunk: false,
        checkinCount: 0,
        lastCheckinAt: null,
        status: "unknown",
        lastConfirmedAt: at(0).toISOString(),
        recentVoterCount: 1,
        nextVoteAt: at(COOLDOWN_MS).toISOString(),
      });

      setNow(HOUR_MS);
      const bob = await voteAs(BOB_ID, BERTHOM_LYON, ORVAL, { sense: "still" });
      expect(bob.status).toBe(HttpStatus.CREATED);
      expect(bob.body).toEqual({
        ...before,
        status: "confirmed",
        lastConfirmedAt: at(HOUR_MS).toISOString(),
        recentVoterCount: 2,
        nextVoteAt: at(HOUR_MS + COOLDOWN_MS).toISOString(),
      });
      expect((await beerOf(ALICE_ID, BERTHOM_LYON, ORVAL)).nextVoteAt).toBe(at(COOLDOWN_MS).toISOString());
      expect((await beerOf(BOB_ID, BERTHOM_LYON, ORVAL)).nextVoteAt).toBe(at(HOUR_MS + COOLDOWN_MS).toISOString());
    });

    it("refuses Alice 3 hours after her vote, in either sense, with the delay left and records nothing", async () => {
      setNow(0);
      const first = await voteAs(ALICE_ID, FINE_MOUSSE, RODENBACH, { sense: "still" });
      expect(first.status).toBe(HttpStatus.CREATED);

      setNow(3 * HOUR_MS);
      const snapshot = await beersOf(ALICE_ID, FINE_MOUSSE);
      for (const sense of ["still", "gone"]) {
        const refused = await voteAs(ALICE_ID, FINE_MOUSSE, RODENBACH, { sense });
        expect(refused.status).toBe(HttpStatus.CONFLICT);
        expect(refused.body).toEqual({ message: `${COOLDOWN_MESSAGE} Try again in 21 hours.` });
      }

      expect(await beersOf(ALICE_ID, FINE_MOUSSE)).toEqual(snapshot);
    });

    it("accepts the vote exactly 24 hours after the previous one and refuses it 1 ms before", async () => {
      setNow(COOLDOWN_MS - 1);
      const early = await voteAs(ALICE_ID, FINE_MOUSSE, RODENBACH, { sense: "gone" });
      expect(early.status).toBe(HttpStatus.CONFLICT);
      expect(early.body).toEqual({ message: `${COOLDOWN_MESSAGE} Try again in 1 hour.` });

      setNow(COOLDOWN_MS);
      const onTime = await voteAs(ALICE_ID, FINE_MOUSSE, RODENBACH, { sense: "gone" });
      expect(onTime.status).toBe(HttpStatus.CREATED);
    });

    it("replaces the old vote of a user who changes sense after 25 hours", async () => {
      setNow(0);
      const first = await voteAs(ALICE_ID, SUPERCOIN, PIETRA, { sense: "still" });
      expect(first.status).toBe(HttpStatus.CREATED);
      const afterFirst = await beerOf(ALICE_ID, SUPERCOIN, PIETRA);

      setNow(25 * HOUR_MS);
      const second = await voteAs(ALICE_ID, SUPERCOIN, PIETRA, { sense: "gone" });

      expect(second.status).toBe(HttpStatus.CREATED);
      expect(second.body).toEqual({
        ...afterFirst,
        status: "maybeGone",
        lastConfirmedAt: at(0).toISOString(),
        recentVoterCount: 1,
        nextVoteAt: at(25 * HOUR_MS + COOLDOWN_MS).toISOString(),
      });
    });

    it.each([
      ["a sense outside still and gone", { sense: "maybe" }, SENSE_MESSAGE],
      ["an empty body", {}, SENSE_MESSAGE],
      ["an empty sense", { sense: "" }, SENSE_MESSAGE],
      ["a numeric sense", { sense: 1 }, SENSE_MESSAGE],
      ["an undeclared field", { sense: "still", userId: 2 }, "property userId should not exist"],
    ])("returns 400 for %s and records nothing", async (_label, body, message) => {
      const snapshot = await beersOf(ALICE_ID, FINE_MOUSSE);

      const response = await voteAs(ALICE_ID, FINE_MOUSSE, ORVAL, body);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message });
      expect(await beersOf(ALICE_ID, FINE_MOUSSE)).toEqual(snapshot);
    });

    it("returns 400 for a venue id that is not an integer", async () => {
      const response = await request(app.getHttpServer())
        .post(`${VENUES_PATH}/abc/beers/${beerIds.get(ORVAL)}/votes`)
        .set(USER_ID_HEADER_NAME, ALICE_ID)
        .send({ sense: "still" });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: expect.stringMatching(/\S/) });
    });

    it("returns 404 for an unknown venue", async () => {
      const response = await request(app.getHttpServer())
        .post(`${VENUES_PATH}/${UNKNOWN_ID}/beers/${beerIds.get(ORVAL)}/votes`)
        .set(USER_ID_HEADER_NAME, ALICE_ID)
        .send({ sense: "still" });

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.body).toEqual({ message: `Venue ${UNKNOWN_ID} not found.` });
    });

    it("returns 404 for a beer that is not listed at the venue", async () => {
      const unlinked = await voteAs(ALICE_ID, FINE_MOUSSE, BEER_WITHOUT_LINK, { sense: "still" });
      const missing = await request(app.getHttpServer())
        .post(`${VENUES_PATH}/${venueIds.get(FINE_MOUSSE)}/beers/${UNKNOWN_ID}/votes`)
        .set(USER_ID_HEADER_NAME, ALICE_ID)
        .send({ sense: "still" });

      expect(unlinked.status).toBe(HttpStatus.NOT_FOUND);
      expect(unlinked.body).toEqual({
        message: `Beer ${beerIds.get(BEER_WITHOUT_LINK)} is not listed at venue ${venueIds.get(FINE_MOUSSE)}.`,
      });
      expect(missing.status).toBe(HttpStatus.NOT_FOUND);
      expect(missing.body).toEqual({
        message: `Beer ${UNKNOWN_ID} is not listed at venue ${venueIds.get(FINE_MOUSSE)}.`,
      });
    });

    it("reports the input error before the missing venue", async () => {
      const response = await request(app.getHttpServer())
        .post(`${VENUES_PATH}/${UNKNOWN_ID}/beers/${beerIds.get(ORVAL)}/votes`)
        .set(USER_ID_HEADER_NAME, ALICE_ID)
        .send({ sense: "maybe" });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: SENSE_MESSAGE });
    });

    it("reports the input error before the missing beer link", async () => {
      const response = await voteAs(ALICE_ID, FINE_MOUSSE, BEER_WITHOUT_LINK, { sense: "maybe" });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: SENSE_MESSAGE });
    });

    it("reports the missing venue to a user who is in a cooldown on another venue", async () => {
      setNow(COOLDOWN_MS + HOUR_MS);
      const conflicting = await voteAs(ALICE_ID, FINE_MOUSSE, RODENBACH, { sense: "still" });
      expect(conflicting.status).toBe(HttpStatus.CONFLICT);

      const response = await request(app.getHttpServer())
        .post(`${VENUES_PATH}/${UNKNOWN_ID}/beers/${beerIds.get(RODENBACH)}/votes`)
        .set(USER_ID_HEADER_NAME, ALICE_ID)
        .send({ sense: "still" });

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.body).toEqual({ message: `Venue ${UNKNOWN_ID} not found.` });
    });

    it("reports the missing beer link to a user who is in a cooldown on another beer", async () => {
      setNow(COOLDOWN_MS + HOUR_MS);

      const response = await voteAs(ALICE_ID, FINE_MOUSSE, BEER_WITHOUT_LINK, { sense: "still" });

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.body).toEqual({
        message: `Beer ${beerIds.get(BEER_WITHOUT_LINK)} is not listed at venue ${venueIds.get(FINE_MOUSSE)}.`,
      });
    });

    it("returns 401 without a user header", async () => {
      const response = await request(app.getHttpServer())
        .post(`${VENUES_PATH}/${venueIds.get(FINE_MOUSSE)}/beers/${beerIds.get(RODENBACH)}/votes`)
        .send({ sense: "still" });

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
    });
  });

  describe("POST /api/v1/venues/:id/beers/:beerId/votes drunk state", () => {
    it("returns the beer as drunk with the count and last check-in of the voter, and as not drunk for a voter without check-in", async () => {
      for (const drankAt of ["2026-10-10T18:00:00.000Z", "2026-10-02T18:00:00.000Z"]) {
        const checkin = await request(app.getHttpServer())
          .post("/api/v1/checkins")
          .set(USER_ID_HEADER_NAME, CAROL_ID)
          .field("beerId", String(beerIds.get(ORVAL)))
          .field("drankAt", drankAt)
          .field("place", "Le Bistrot")
          .field("format", "bottle");
        expect(checkin.status).toBe(HttpStatus.CREATED);
      }

      const carol = await voteAs(CAROL_ID, BERTHOM_LYON, ORVAL, { sense: "still" });

      expect(carol.status).toBe(HttpStatus.CREATED);
      expect(carol.body).toMatchObject({ drunk: true, checkinCount: 2, lastCheckinAt: "2026-10-10T18:00:00.000Z" });
      expect(await beerOf(CAROL_ID, BERTHOM_LYON, ORVAL)).toEqual(carol.body);
      expect(await beerOf(BOB_ID, BERTHOM_LYON, ORVAL)).toMatchObject({ drunk: false, checkinCount: 0, lastCheckinAt: null });
    });
  });
});
