import { HttpStatus } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import request from "supertest";
import type { Repository } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { UNIDENTIFIED_USER_MESSAGE } from "@/common/exceptions/exception-messages.constants";
import beersSeed from "@/database/seed/data/beers.json";
import venueBeersSeed from "@/database/seed/data/venue-beers.json";
import { createTestApp } from "@/__tests__/support/test-app";
import { USER_ID_HEADER_NAME } from "@/__tests__/support/user-header";
import { BeerFamilyEnum } from "@/modules/beers/enums/beer-family.enum";
import { AvailabilityVote } from "@/modules/venues/entities/availability-vote.entity";
import { VenueBeer } from "@/modules/venues/entities/venue-beer.entity";
import { AVAILABILITY_WINDOW_DAYS, DAY_MS } from "@/modules/venues/venues.constants";

const VENUES_PATH = "/api/v1/venues";
const ALICE_ID = "1";
const BOB_ID = "2";
const SUPERCOIN = "Le Supercoin";
const ORVAL = "Orval";
const CHECKINS_PATH = "/api/v1/checkins";
const FIRST_DRUNK_AT = "2026-10-02T18:00:00.000Z";
const LAST_DRUNK_AT = "2026-10-10T18:00:00.000Z";
const UNKNOWN_VENUE_ID = 999_999;
const FINE_MOUSSE = "La Fine Mousse";
const VENUE_WITHOUT_LINK = "Le Triangle";
const FINE_MOUSSE_BEER_COUNT = 10;

interface VenueBeerBody {
  readonly beerId: number;
  readonly beerName: string;
  readonly breweryName: string;
  readonly styleName: string;
  readonly family: BeerFamilyEnum;
  readonly status: string;
  readonly lastConfirmedAt: string | null;
  readonly recentVoterCount: number;
  readonly nextVoteAt: string | null;
  readonly drunk: boolean;
  readonly checkinCount: number;
  readonly lastCheckinAt: string | null;
}

const FAMILY_ORDER = Object.values(BeerFamilyEnum);

const byFamilyThenName = (left: VenueBeerBody, right: VenueBeerBody): number =>
  FAMILY_ORDER.indexOf(left.family) - FAMILY_ORDER.indexOf(right.family) ||
  left.beerName.localeCompare(right.beerName, "fr");

describe("venue beers API", () => {
  let app: INestApplication;
  let fineMousseId: number;
  let venueWithoutLinkId: number;
  let seedStartedAt: number;
  let seedEndedAt: number;

  const get = (path: string) => request(app.getHttpServer()).get(path).set(USER_ID_HEADER_NAME, ALICE_ID);

  const findVenueId = async (name: string): Promise<number> => {
    const response = await get(VENUES_PATH);
    expect(response.status).toBe(HttpStatus.OK);
    const venue = (response.body as { id: number; name: string }[]).find((item) => item.name === name);
    expect(venue).toBeDefined();
    return (venue as { id: number }).id;
  };

  const beersPath = (venueId: number | string, query = ""): string => `${VENUES_PATH}/${venueId}/beers${query}`;

  beforeAll(async () => {
    seedStartedAt = Date.now();
    app = await createTestApp();
    seedEndedAt = Date.now();
    fineMousseId = await findVenueId(FINE_MOUSSE);
    venueWithoutLinkId = await findVenueId(VENUE_WITHOUT_LINK);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /api/v1/venues/:id/beers", () => {
    it("returns the 10 seeded beers of La Fine Mousse with every field and no revote date", async () => {
      const response = await get(beersPath(fineMousseId));

      expect(response.status).toBe(HttpStatus.OK);
      const bodies = response.body as VenueBeerBody[];
      expect(bodies).toHaveLength(FINE_MOUSSE_BEER_COUNT);
      const seeded = venueBeersSeed.filter((link) => link.venueName === FINE_MOUSSE);
      expect(bodies.map((body) => body.beerName).sort()).toEqual(seeded.map((link) => link.beerName).sort());
      bodies.forEach((body) => {
        const link = seeded.find((entry) => entry.beerName === body.beerName);
        expect(body).toEqual({
          beerId: expect.any(Number),
          beerName: expect.any(String),
          breweryName: expect.stringMatching(/\S/),
          styleName: expect.stringMatching(/\S/),
          family: expect.any(String),
          status: link?.status,
          lastConfirmedAt: (link?.positiveVotes ?? 0) > 0 ? expect.any(String) : null,
          recentVoterCount: expect.any(Number),
          nextVoteAt: null,
          drunk: false,
          checkinCount: 0,
          lastCheckinAt: null,
        });
        expect(FAMILY_ORDER).toContain(body.family);
      });
    });

    it("gives each beer of La Fine Mousse its brewery, its style, its last confirmation and its recent voters", async () => {
      const links = app.get<Repository<VenueBeer>>(getRepositoryToken(VenueBeer));
      const votes = app.get<Repository<AvailabilityVote>>(getRepositoryToken(AvailabilityVote));
      const requestedAt = Date.now();

      const response = await get(beersPath(fineMousseId));

      const bodies = response.body as VenueBeerBody[];
      expect(bodies).toHaveLength(FINE_MOUSSE_BEER_COUNT);
      for (const body of bodies) {
        const beer = beersSeed.find((entry) => entry.name === body.beerName);
        const seeded = venueBeersSeed.find((entry) => entry.venueName === FINE_MOUSSE && entry.beerName === body.beerName);
        const link = await links.findOneByOrFail({ venueId: fineMousseId, beerId: body.beerId });
        const storedVotes = await votes.findBy({ venueBeerId: link.id });
        const recentVotes = storedVotes.filter(
          (vote) => requestedAt - new Date(vote.votedAt).getTime() <= AVAILABILITY_WINDOW_DAYS * DAY_MS,
        );
        expect(body.breweryName).toBe(beer?.breweryName);
        expect(body.styleName).toBe(beer?.styleName);
        expect(body.recentVoterCount).toBe(recentVotes.length);
        if ((seeded?.positiveVotes ?? 0) === 0) {
          expect(body.lastConfirmedAt).toBeNull();
        } else {
          const confirmedAt = new Date(body.lastConfirmedAt as string).getTime();
          const confirmedDaysMs = (seeded?.lastConfirmedDaysAgo as number) * DAY_MS;
          expect(confirmedAt).toBeGreaterThanOrEqual(seedStartedAt - confirmedDaysMs);
          expect(confirmedAt).toBeLessThanOrEqual(seedEndedAt - confirmedDaysMs);
        }
      }
      expect(bodies.some((body) => body.recentVoterCount > 0)).toBe(true);
    });

    it("sorts by family in catalogue order, then by name", async () => {
      const bodies = (await get(beersPath(fineMousseId))).body as VenueBeerBody[];

      expect(bodies).toEqual([...bodies].sort(byFamilyThenName));
      expect(new Set(bodies.map((body) => body.family)).size).toBeGreaterThan(1);
    });

    it("returns only the IPA with the family filter", async () => {
      const all = (await get(beersPath(fineMousseId))).body as VenueBeerBody[];
      const expected = all.filter((body) => body.family === BeerFamilyEnum.IPA);
      expect(expected.length).toBeGreaterThan(0);
      expect(expected.length).toBeLessThan(all.length);

      const response = await get(beersPath(fineMousseId, "?family=ipa"));

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual(expected);
    });

    it("returns an empty list for an existing venue without beer", async () => {
      const response = await get(beersPath(venueWithoutLinkId));

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual([]);
    });
  });

  describe("GET /api/v1/venues/:id/beers drunk state", () => {
    let supercoinId: number;

    const getAs = (userId: string, path: string) => request(app.getHttpServer()).get(path).set(USER_ID_HEADER_NAME, userId);

    const beersAs = async (userId: string): Promise<VenueBeerBody[]> => {
      const response = await getAs(userId, beersPath(supercoinId));
      expect(response.status).toBe(HttpStatus.OK);
      return response.body as VenueBeerBody[];
    };

    const orvalOf = (bodies: VenueBeerBody[]): VenueBeerBody => {
      const found = bodies.find((body) => body.beerName === ORVAL);
      expect(found).toBeDefined();
      return found as VenueBeerBody;
    };

    const drinkOrval = async (userId: string, orvalId: number, drankAt: string): Promise<number> => {
      const response = await request(app.getHttpServer())
        .post(CHECKINS_PATH)
        .set(USER_ID_HEADER_NAME, userId)
        .field("beerId", String(orvalId))
        .field("drankAt", drankAt)
        .field("place", "Le Bistrot")
        .field("format", "bottle");
      expect(response.status).toBe(HttpStatus.CREATED);
      return (response.body as { checkin: { id: number } }).checkin.id;
    };

    const deleteCheckin = async (userId: string, checkinId: number): Promise<void> => {
      const response = await request(app.getHttpServer())
        .delete(`${CHECKINS_PATH}/${checkinId}`)
        .set(USER_ID_HEADER_NAME, userId);
      expect(response.status).toBe(HttpStatus.NO_CONTENT);
    };

    beforeAll(async () => {
      supercoinId = await findVenueId(SUPERCOIN);
    });

    it("marks every beer not drunk for a user who has tasted nothing", async () => {
      const bodies = await beersAs(ALICE_ID);

      expect(bodies.length).toBeGreaterThan(1);
      bodies.forEach((body) => {
        expect([body.drunk, body.checkinCount, body.lastCheckinAt]).toEqual([false, 0, null]);
      });
    });

    it("gives Alice her count and most recent check-in of Orval, a user without check-in the untouched state, and removes the beer state once every check-in is deleted", async () => {
      const orvalId = orvalOf(await beersAs(ALICE_ID)).beerId;
      const latestId = await drinkOrval(ALICE_ID, orvalId, LAST_DRUNK_AT);
      const earliestId = await drinkOrval(ALICE_ID, orvalId, FIRST_DRUNK_AT);

      const alice = await beersAs(ALICE_ID);
      const bob = await beersAs(BOB_ID);

      expect(orvalOf(alice)).toEqual({ ...orvalOf(bob), drunk: true, checkinCount: 2, lastCheckinAt: LAST_DRUNK_AT });
      expect(orvalOf(bob)).toMatchObject({ drunk: false, checkinCount: 0, lastCheckinAt: null });
      expect(alice.filter((body) => body.beerName !== ORVAL).every((body) => !body.drunk && body.checkinCount === 0)).toBe(true);
      expect(bob.every((body) => !body.drunk && body.checkinCount === 0 && body.lastCheckinAt === null)).toBe(true);

      await deleteCheckin(ALICE_ID, latestId);
      expect(orvalOf(await beersAs(ALICE_ID))).toMatchObject({ drunk: true, checkinCount: 1, lastCheckinAt: FIRST_DRUNK_AT });

      await deleteCheckin(ALICE_ID, earliestId);
      expect(orvalOf(await beersAs(ALICE_ID))).toMatchObject({ drunk: false, checkinCount: 0, lastCheckinAt: null });
    });
  });

  describe("GET /api/v1/venues/:id/beers errors", () => {
    it("returns 400 and a message for an unknown family", async () => {
      const response = await get(beersPath(fineMousseId, "?family=unknown"));

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect((response.body as { message: string }).message).not.toBe("");
    });

    it("returns 400 and a message for a parameter the route does not declare", async () => {
      const response = await get(beersPath(fineMousseId, "?radius=5"));

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect((response.body as { message: string }).message).not.toBe("");
    });

    it("returns 400 and a message for a venue id that is not a number", async () => {
      const response = await get(beersPath("abc"));

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect((response.body as { message: string }).message).not.toBe("");
    });

    it("returns 404 for an unknown venue", async () => {
      const response = await get(beersPath(UNKNOWN_VENUE_ID));

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.body).toEqual({ message: `Venue ${UNKNOWN_VENUE_ID} not found.` });
    });

    it("returns 400 rather than 404 for an unknown venue with an unknown family", async () => {
      const response = await get(beersPath(UNKNOWN_VENUE_ID, "?family=unknown"));

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect((response.body as { message: string }).message).not.toBe("");
    });

    it("returns 401 without the user header", async () => {
      const response = await request(app.getHttpServer()).get(beersPath(fineMousseId));

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
    });

    it("returns 401 rather than 404 without the user header for an unknown venue", async () => {
      const response = await request(app.getHttpServer()).get(beersPath(UNKNOWN_VENUE_ID));

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
    });

    it("returns 401 rather than 400 without the user header and with an unknown family", async () => {
      const response = await request(app.getHttpServer()).get(beersPath(fineMousseId, "?family=unknown"));

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
    });
  });
});
