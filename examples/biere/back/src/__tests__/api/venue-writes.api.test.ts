import { HttpStatus } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { getRepositoryToken } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { UNIDENTIFIED_USER_MESSAGE } from "@/common/exceptions/exception-messages.constants";
import { createTestApp } from "@/__tests__/support/test-app";
import { USER_ID_HEADER_NAME } from "@/__tests__/support/user-header";
import { Venue } from "@/modules/venues/entities/venue.entity";
import { VENUE_ADDRESS_MAX_LENGTH, VENUE_NAME_MAX_LENGTH } from "@/modules/venues/venues.constants";

const VENUES_PATH = "/api/v1/venues";
const BEERS_PATH = "/api/v1/beers";
const ALICE_ID = "1";
const BOB_ID = "2";
const CAROL_ID = "3";
const UNKNOWN_ID = 999_999;
const SEEDED_VENUE_COUNT = 36;
const BEER_WITHOUT_LINK = "Hoegaarden 0,0";

const NEW_VENUE = {
  name: "Chez Mousse",
  type: "shop",
  address: "12 rue de la Biere, 59000 Lille",
  latitude: 50.63,
  longitude: 3.06,
};

interface VenueBody {
  readonly id: number;
  readonly name: string;
}

describe("venue writes API", () => {
  let app: INestApplication;
  let beerId: number;

  const createVenue = (body: unknown, userId: string | null = ALICE_ID) => {
    const call = request(app.getHttpServer()).post(VENUES_PATH);
    return (userId === null ? call : call.set(USER_ID_HEADER_NAME, userId)).send(body as object);
  };

  const reportBeer = (venueId: number, body: unknown, userId: string | null = ALICE_ID) => {
    const call = request(app.getHttpServer()).post(`${VENUES_PATH}/${venueId}/beers`);
    return (userId === null ? call : call.set(USER_ID_HEADER_NAME, userId)).send(body as object);
  };

  const listVenues = async (): Promise<VenueBody[]> => {
    const response = await request(app.getHttpServer()).get(VENUES_PATH).set(USER_ID_HEADER_NAME, ALICE_ID);
    expect(response.status).toBe(HttpStatus.OK);
    return response.body as VenueBody[];
  };

  const venueIdOf = async (name: string): Promise<number> => {
    const venue = (await listVenues()).find((item) => item.name === name);
    expect(venue).toBeDefined();
    return (venue as VenueBody).id;
  };

  beforeAll(async () => {
    app = await createTestApp();
    const beers = await request(app.getHttpServer())
      .get(`${BEERS_PATH}?q=${encodeURIComponent(BEER_WITHOUT_LINK)}`)
      .set(USER_ID_HEADER_NAME, ALICE_ID);
    expect(beers.status).toBe(HttpStatus.OK);
    const beer = (beers.body as { items: { id: number; name: string }[] }).items.find(
      (item) => item.name === BEER_WITHOUT_LINK,
    );
    expect(beer).toBeDefined();
    beerId = (beer as { id: number }).id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /api/v1/venues", () => {
    it("creates the venue unknown, visible at once in the list and by id", async () => {
      const before = await listVenues();
      expect(before).toHaveLength(SEEDED_VENUE_COUNT);

      const response = await createVenue({ ...NEW_VENUE, name: "  Chez Mousse  ", city: "Lille", description: "Une cave." });

      expect(response.status).toBe(HttpStatus.CREATED);
      expect(response.body).toEqual({
        id: expect.any(Number),
        name: "Chez Mousse",
        type: "shop",
        city: "Lille",
        address: "12 rue de la Biere, 59000 Lille",
        latitude: 50.63,
        longitude: 3.06,
        description: "Une cave.",
        distanceKm: null,
        status: "unknown",
        checkinCount: 0,
        lastCheckinAt: null,
      });
      const after = await listVenues();
      expect(after).toHaveLength(SEEDED_VENUE_COUNT + 1);
      expect(after).toContainEqual(response.body);
      const one = await request(app.getHttpServer())
        .get(`${VENUES_PATH}/${(response.body as VenueBody).id}`)
        .set(USER_ID_HEADER_NAME, ALICE_ID);
      expect(one.status).toBe(HttpStatus.OK);
      expect(one.body).toEqual(response.body);
    });

    it("returns a venue proposed by a user who has check-ins elsewhere with zero and null, found at once by its name", async () => {
      const fineMousseId = await venueIdOf("La Fine Mousse");
      const drink = await request(app.getHttpServer())
        .post("/api/v1/checkins")
        .set(USER_ID_HEADER_NAME, BOB_ID)
        .field("beerId", String(beerId))
        .field("drankAt", "2026-10-09T18:00:00.000Z")
        .field("place", "Le Bistrot")
        .field("venueId", String(fineMousseId))
        .field("format", "bottle");
      expect(drink.status).toBe(HttpStatus.CREATED);

      const created = await createVenue({ ...NEW_VENUE, name: "Chez Mousse Visites" }, BOB_ID);
      const found = await request(app.getHttpServer())
        .get(`${VENUES_PATH}?q=${encodeURIComponent("Chez Mousse Visites")}`)
        .set(USER_ID_HEADER_NAME, BOB_ID);

      expect(created.status).toBe(HttpStatus.CREATED);
      expect(created.body).toMatchObject({ name: "Chez Mousse Visites", checkinCount: 0, lastCheckinAt: null });
      expect(found.status).toBe(HttpStatus.OK);
      expect(found.body).toEqual([created.body]);
    });

    it("stores the folded search keys of the proposed name and city", async () => {
      const response = await createVenue({ ...NEW_VENUE, name: "Café  Ébène", city: "Liège" });

      expect(response.status).toBe(HttpStatus.CREATED);
      const stored = await app
        .get<Repository<Venue>>(getRepositoryToken(Venue))
        .findOneByOrFail({ id: (response.body as VenueBody).id });
      expect(stored).toMatchObject({ searchName: "cafe ebene", searchCity: "liege" });
    });

    it("stores an empty city key and a filled name key for a venue proposed without a city", async () => {
      const response = await createVenue({ ...NEW_VENUE, name: "Sans Ville" });

      expect(response.status).toBe(HttpStatus.CREATED);
      const stored = await app
        .get<Repository<Venue>>(getRepositoryToken(Venue))
        .findOneByOrFail({ id: (response.body as VenueBody).id });
      expect(stored).toMatchObject({ searchName: "sans ville", searchCity: "" });
    });

    it("answers an absent city and description with empty strings", async () => {
      const response = await createVenue({ ...NEW_VENUE, name: "Sans Details" });

      expect(response.status).toBe(HttpStatus.CREATED);
      expect(response.body).toMatchObject({ name: "Sans Details", city: "", description: "", status: "unknown" });
    });

    it.each([
      ["an empty name", { name: "" }],
      ["a name made of spaces", { name: "   " }],
      ["a name one character too long", { name: "a".repeat(VENUE_NAME_MAX_LENGTH + 1) }],
      ["an address one character too long", { address: "a".repeat(VENUE_ADDRESS_MAX_LENGTH + 1) }],
      ["an unknown type", { type: "restaurant" }],
      ["a latitude above 90", { latitude: 90.5 }],
      ["a latitude below -90", { latitude: -90.5 }],
      ["a longitude above 180", { longitude: 180.5 }],
      ["a longitude below -180", { longitude: -180.5 }],
      ["a latitude given as text", { latitude: "50.63" }],
      ["a field the contract does not declare", { id: 5 }],
    ])("rejects %s with a 400 and a message and creates nothing", async (_label, patch) => {
      const response = await createVenue({ ...NEW_VENUE, name: "Jamais Cree", ...patch });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(typeof response.body.message).toBe("string");
      expect(response.body.message.length).toBeGreaterThan(0);
      expect((await listVenues()).map((venue) => venue.name)).not.toContain("Jamais Cree");
    });

    it("rejects a name that only differs by case from La Fine Mousse with a 409 and creates nothing", async () => {
      const before = await listVenues();

      const response = await createVenue({ ...NEW_VENUE, name: "la fine mousse" });

      expect(response.status).toBe(HttpStatus.CONFLICT);
      expect(response.body).toEqual({ message: 'A venue named "la fine mousse" already exists.' });
      expect(await listVenues()).toEqual(before);
    });

    it("compares the trimmed name when looking for a conflict", async () => {
      const response = await createVenue({ ...NEW_VENUE, name: "  LA FINE MOUSSE  " });

      expect(response.status).toBe(HttpStatus.CONFLICT);
      expect(response.body).toEqual({ message: 'A venue named "LA FINE MOUSSE" already exists.' });
    });

    it("refuses a second proposal of a name just created", async () => {
      const first = await createVenue({ ...NEW_VENUE, name: "Doublon Test" });
      expect(first.status).toBe(HttpStatus.CREATED);

      const second = await createVenue({ ...NEW_VENUE, name: "DOUBLON TEST" });

      expect(second.status).toBe(HttpStatus.CONFLICT);
    });

    it("reports an invalid latitude with a 400 before the name conflict", async () => {
      const response = await createVenue({ ...NEW_VENUE, name: "La Fine Mousse", latitude: 91 });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it("reports the missing identity with a 401 before an invalid latitude", async () => {
      const response = await createVenue({ ...NEW_VENUE, latitude: 91 }, null);

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
    });

    it("answers 401 with the canonical message when no user is identified", async () => {
      const response = await createVenue(NEW_VENUE, null);

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
    });
  });

  describe("POST /api/v1/venues/:id/beers", () => {
    it("creates the link unknown with no vote and lists the beer among the venue beers", async () => {
      const venueId = await venueIdOf("Chez Mousse");
      const before = await request(app.getHttpServer())
        .get(`${VENUES_PATH}/${venueId}/beers`)
        .set(USER_ID_HEADER_NAME, ALICE_ID);
      expect(before.body).toEqual([]);

      const response = await reportBeer(venueId, { beerId });

      expect(response.status).toBe(HttpStatus.CREATED);
      expect(response.body).toEqual({
        beerId,
        beerName: BEER_WITHOUT_LINK,
        breweryName: expect.any(String),
        styleName: expect.any(String),
        family: expect.any(String),
        status: "unknown",
        lastConfirmedAt: null,
        recentVoterCount: 0,
        nextVoteAt: null,
        drunk: false,
        checkinCount: 0,
        lastCheckinAt: null,
      });
      const after = await request(app.getHttpServer())
        .get(`${VENUES_PATH}/${venueId}/beers`)
        .set(USER_ID_HEADER_NAME, ALICE_ID);
      expect(after.status).toBe(HttpStatus.OK);
      expect(after.body).toEqual([response.body]);
    });

    it("refuses the same beer a second time with a 409 and keeps a single link", async () => {
      const venueId = await venueIdOf("Chez Mousse");

      const response = await reportBeer(venueId, { beerId });

      expect(response.status).toBe(HttpStatus.CONFLICT);
      expect(response.body).toEqual({ message: `Beer ${beerId} is already listed at venue ${venueId}.` });
      const beers = await request(app.getHttpServer())
        .get(`${VENUES_PATH}/${venueId}/beers`)
        .set(USER_ID_HEADER_NAME, ALICE_ID);
      expect(beers.body).toHaveLength(1);
    });

    it("reports an invalid body with a 400 before the 409 of a beer already listed", async () => {
      const venueId = await venueIdOf("Chez Mousse");

      const response = await reportBeer(venueId, { beerId, status: "confirmed" });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: "property status should not exist" });
      const beers = await request(app.getHttpServer())
        .get(`${VENUES_PATH}/${venueId}/beers`)
        .set(USER_ID_HEADER_NAME, ALICE_ID);
      expect(beers.body).toHaveLength(1);
    });

    it("answers 404 for an unknown venue", async () => {
      const response = await reportBeer(UNKNOWN_ID, { beerId });

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.body).toEqual({ message: `Venue ${UNKNOWN_ID} not found.` });
    });

    it("answers 404 for an unknown beer", async () => {
      const venueId = await venueIdOf("Sans Details");

      const response = await reportBeer(venueId, { beerId: UNKNOWN_ID });

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.body).toEqual({ message: `Beer ${UNKNOWN_ID} not found.` });
    });

    it("reports the unknown venue before the unknown beer", async () => {
      const response = await reportBeer(UNKNOWN_ID, { beerId: UNKNOWN_ID });

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.body).toEqual({ message: `Venue ${UNKNOWN_ID} not found.` });
    });

    it.each([
      ["a zero beer id", { beerId: 0 }],
      ["a negative beer id", { beerId: -1 }],
      ["a fractional beer id", { beerId: 1.5 }],
      ["a beer id given as text", { beerId: "abc" }],
      ["a missing beer id", {}],
      ["a field the contract does not declare", { beerId: 1, status: "confirmed" }],
    ])("rejects %s with a 400 and a message", async (_label, body) => {
      const venueId = await venueIdOf("Sans Details");

      const response = await reportBeer(venueId, body);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body.message.length).toBeGreaterThan(0);
    });

    it("reports an invalid body with a 400 before the unknown venue", async () => {
      const response = await reportBeer(UNKNOWN_ID, { beerId: 0 });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it("answers 400 for a venue id that is not a number", async () => {
      const response = await request(app.getHttpServer())
        .post(`${VENUES_PATH}/abc/beers`)
        .set(USER_ID_HEADER_NAME, ALICE_ID)
        .send({ beerId });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it("reports the missing identity with a 401 before an invalid body", async () => {
      const response = await reportBeer(1, { beerId: 0 }, null);

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
    });

    it("answers 401 with the canonical message when no user is identified", async () => {
      const response = await reportBeer(1, { beerId }, null);

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
    });
  });

  describe("POST /api/v1/venues/:id/beers drunk state", () => {
    it("returns the reported beer as drunk with the count and last check-in of the reporter", async () => {
      const orval = await request(app.getHttpServer())
        .get(`${BEERS_PATH}?q=Orval`)
        .set(USER_ID_HEADER_NAME, ALICE_ID);
      const orvalId = (orval.body as { items: { id: number; name: string }[] }).items.find((item) => item.name === "Orval")
        ?.id as number;
      expect(orvalId).toBeDefined();
      for (const drankAt of ["2026-10-10T18:00:00.000Z", "2026-10-02T18:00:00.000Z"]) {
        const checkin = await request(app.getHttpServer())
          .post("/api/v1/checkins")
          .set(USER_ID_HEADER_NAME, CAROL_ID)
          .field("beerId", String(orvalId))
          .field("drankAt", drankAt)
          .field("place", "Le Bistrot")
          .field("format", "bottle");
        expect(checkin.status).toBe(HttpStatus.CREATED);
      }
      const venueId = await venueIdOf("Chez Mousse");

      const response = await reportBeer(venueId, { beerId: orvalId }, CAROL_ID);

      expect(response.status).toBe(HttpStatus.CREATED);
      expect(response.body).toMatchObject({
        beerId: orvalId,
        status: "unknown",
        drunk: true,
        checkinCount: 2,
        lastCheckinAt: "2026-10-10T18:00:00.000Z",
      });
    });
  });
});
