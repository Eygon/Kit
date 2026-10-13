import { HttpStatus } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { UNIDENTIFIED_USER_MESSAGE } from "@/common/exceptions/exception-messages.constants";
import venueBeersSeed from "@/database/seed/data/venue-beers.json";
import venuesSeed from "@/database/seed/data/venues.json";
import { createTestApp } from "@/__tests__/support/test-app";
import { USER_ID_HEADER_NAME } from "@/__tests__/support/user-header";

const BEERS_PATH = "/api/v1/beers";
const ALICE_ID = "1";
const UNKNOWN_BEER_ID = 999_999;
const ORVAL = "Orval";
const BEER_WITHOUT_LINK = "Hoegaarden 0,0";
const ORVAL_VENUE_COUNT = 11;
const FRESHEST_ORVAL_VENUE = "Délices et Caprices";
const SECOND_FRESHEST_ORVAL_VENUE = "À la Mort Subite";
const UNCONFIRMED_ORVAL_VENUE = "Les Berthom Lyon";
const SUPERCOIN = "Le Supercoin";
const POSITION_MESSAGE = "latitude and longitude must be supplied together.";

interface BeerVenueBody {
  readonly venueId: number;
  readonly venueName: string;
  readonly venueType: string;
  readonly city: string;
  readonly address: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly status: string;
  readonly lastConfirmedAt: string | null;
  readonly recentVoterCount: number;
  readonly distanceKm: number | null;
}

const STATUS_RANK: Readonly<Record<string, number>> = { confirmed: 0, maybeGone: 1, unknown: 2, gone: 3 };

const timeOf = (body: BeerVenueBody): number =>
  body.lastConfirmedAt === null ? Number.NEGATIVE_INFINITY : new Date(body.lastConfirmedAt).getTime();

const byStateThenConfirmationThenName = (left: BeerVenueBody, right: BeerVenueBody): number =>
  STATUS_RANK[left.status] - STATUS_RANK[right.status] ||
  timeOf(right) - timeOf(left) ||
  left.venueName.localeCompare(right.venueName, "fr");

const seededVenue = (name: string) => venuesSeed.find((venue) => venue.name === name);

describe("beer venues API", () => {
  let app: INestApplication;
  let orvalId: number;
  let beerWithoutLinkId: number;

  const get = (path: string) => request(app.getHttpServer()).get(path).set(USER_ID_HEADER_NAME, ALICE_ID);

  const findBeerId = async (name: string): Promise<number> => {
    const response = await get(`${BEERS_PATH}?q=${encodeURIComponent(name)}`);
    expect(response.status).toBe(HttpStatus.OK);
    const items = (response.body as { items: { id: number; name: string }[] }).items;
    const beer = items.find((item) => item.name === name);
    expect(beer).toBeDefined();
    return (beer as { id: number }).id;
  };

  const venuesPath = (beerId: number | string, query = ""): string => `${BEERS_PATH}/${beerId}/venues${query}`;

  beforeAll(async () => {
    app = await createTestApp();
    orvalId = await findBeerId(ORVAL);
    beerWithoutLinkId = await findBeerId(BEER_WITHOUT_LINK);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /api/v1/beers/:beerId/venues without position", () => {
    it("returns the 11 seeded venues of Orval with every field and no distance", async () => {
      const response = await get(venuesPath(orvalId));

      expect(response.status).toBe(HttpStatus.OK);
      const bodies = response.body as BeerVenueBody[];
      expect(bodies).toHaveLength(ORVAL_VENUE_COUNT);
      const expectedNames = venueBeersSeed.filter((link) => link.beerName === ORVAL).map((link) => link.venueName);
      expect(bodies.map((body) => body.venueName).sort()).toEqual([...expectedNames].sort());
      const freshest = bodies[0];
      const seeded = seededVenue(FRESHEST_ORVAL_VENUE);
      expect(freshest).toEqual({
        venueId: expect.any(Number),
        venueName: seeded?.name,
        venueType: seeded?.type,
        city: seeded?.city,
        address: seeded?.address,
        latitude: seeded?.latitude,
        longitude: seeded?.longitude,
        status: "confirmed",
        lastConfirmedAt: expect.any(String),
        recentVoterCount: expect.any(Number),
        distanceKm: null,
      });
      bodies.forEach((body) => expect(body.distanceKm).toBeNull());
    });

    it("sorts by state, then by most recent confirmation, then by name", async () => {
      const response = await get(venuesPath(orvalId));

      const bodies = response.body as BeerVenueBody[];
      expect(bodies.map((body) => body.venueName).slice(0, 2)).toEqual([
        FRESHEST_ORVAL_VENUE,
        SECOND_FRESHEST_ORVAL_VENUE,
      ]);
      expect(bodies[bodies.length - 1].venueName).toBe(UNCONFIRMED_ORVAL_VENUE);
      expect(bodies[bodies.length - 1].status).toBe("unknown");
      expect(bodies[bodies.length - 1].lastConfirmedAt).toBeNull();
      expect(bodies).toEqual([...bodies].sort(byStateThenConfirmationThenName));
    });
  });

  describe("GET /api/v1/beers/:beerId/venues with a position", () => {
    it("gives each venue its distance and sorts them by increasing distance", async () => {
      const supercoin = seededVenue(SUPERCOIN);

      const response = await get(venuesPath(orvalId, `?latitude=${supercoin?.latitude}&longitude=${supercoin?.longitude}`));

      expect(response.status).toBe(HttpStatus.OK);
      const bodies = response.body as BeerVenueBody[];
      expect(bodies).toHaveLength(ORVAL_VENUE_COUNT);
      expect(bodies[0].venueName).toBe(SUPERCOIN);
      expect(bodies[0].distanceKm).toBe(0);
      const distances = bodies.map((body) => body.distanceKm as number);
      distances.forEach((distance) => expect(typeof distance).toBe("number"));
      expect(distances).toEqual([...distances].sort((left, right) => left - right));
      expect(distances[distances.length - 1]).toBeGreaterThan(distances[1]);
    });

    it("accepts the position 0,0", async () => {
      const response = await get(venuesPath(orvalId, "?latitude=0&longitude=0"));

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveLength(ORVAL_VENUE_COUNT);
      expect((response.body as BeerVenueBody[]).every((body) => body.distanceKm !== null)).toBe(true);
    });

    it.each([
      ["latitude 90", "?latitude=90&longitude=0"],
      ["latitude -90", "?latitude=-90&longitude=0"],
      ["longitude 180", "?latitude=0&longitude=180"],
      ["longitude -180", "?latitude=0&longitude=-180"],
    ])("accepts the inclusive bound %s", async (_label, query) => {
      const response = await get(venuesPath(orvalId, query));

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toHaveLength(ORVAL_VENUE_COUNT);
      expect((response.body as BeerVenueBody[]).every((body) => body.distanceKm !== null)).toBe(true);
    });
  });

  describe("GET /api/v1/beers/:beerId/venues errors", () => {
    it.each([
      ["a latitude without longitude", "?latitude=48.8"],
      ["a longitude without latitude", "?longitude=2.3"],
      ["a latitude of 0 without longitude", "?latitude=0"],
      ["a longitude of 0 without latitude", "?longitude=0"],
    ])("returns 400 for %s", async (_label, query) => {
      const response = await get(venuesPath(orvalId, query));

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: POSITION_MESSAGE });
    });

    it.each([
      ["a latitude above 90", "?latitude=91&longitude=2", "latitude must not be greater than 90"],
      ["a latitude below -90", "?latitude=-91&longitude=2", "latitude must not be less than -90"],
      ["a longitude above 180", "?latitude=48&longitude=181", "longitude must not be greater than 180"],
      ["a longitude below -180", "?latitude=0&longitude=-181", "longitude must not be less than -180"],
      [
        "a latitude that is not a number",
        "?latitude=abc&longitude=2",
        "latitude must not be greater than 90; latitude must not be less than -90; latitude must be a number conforming to the specified constraints",
      ],
    ])("returns 400 and the validation message for %s", async (_label, query, message) => {
      const response = await get(venuesPath(orvalId, query));

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message });
    });

    it("returns 400 and a message for a parameter the route does not declare", async () => {
      const response = await get(venuesPath(orvalId, "?radius=5"));

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect((response.body as { message: string }).message).not.toBe("");
    });

    it("returns 400 and a message for a beer id that is not a number", async () => {
      const response = await get(venuesPath("abc"));

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect((response.body as { message: string }).message).not.toBe("");
    });

    it("returns 404 for an unknown beer", async () => {
      const response = await get(venuesPath(UNKNOWN_BEER_ID));

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.body).toEqual({ message: `Beer ${UNKNOWN_BEER_ID} not found.` });
    });

    it("returns 400 rather than 404 for an unknown beer with half a position", async () => {
      const response = await get(venuesPath(UNKNOWN_BEER_ID, "?latitude=48.8"));

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: POSITION_MESSAGE });
    });

    it("returns 401 without the user header", async () => {
      const response = await request(app.getHttpServer()).get(venuesPath(orvalId));

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
    });
  });

  describe("GET /api/v1/beers/:beerId/venues for a beer without link", () => {
    it("returns an empty list", async () => {
      const response = await get(venuesPath(beerWithoutLinkId));

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual([]);
    });
  });
});
