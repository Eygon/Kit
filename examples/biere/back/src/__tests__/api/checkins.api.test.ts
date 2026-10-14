import { HttpStatus } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestApp } from "@/__tests__/support/test-app";
import { USER_ID_HEADER_NAME } from "@/__tests__/support/user-header";
import { UPLOAD_MAX_SIZE_BYTES } from "@/common/uploads/upload.constants";
import { UNIDENTIFIED_USER_MESSAGE } from "@/common/exceptions/exception-messages.constants";
import { ALICE_USER_ID, BOB_USER_ID } from "@/database/seed.constants";
import type { BeerPageDto } from "@/modules/beers/dtos/beer-page.dto";
import { BeerAromaEnum } from "@/modules/beers/enums/beer-aroma.enum";
import type { CheckinDto } from "@/modules/pokedex/dtos/checkin.dto";
import type { CreatedCheckinDto } from "@/modules/pokedex/dtos/created-checkin.dto";

const CHECKINS_PATH = "/api/v1/checkins";
const BEERS_PATH = "/api/v1/beers";
const VENUES_PATH = "/api/v1/venues";
const MINUTE_MS = 60_000;
const UNKNOWN_BEER_ID = 999_999;
const UNKNOWN_CHECKIN_ID = 999_999;
const UNKNOWN_VENUE_ID = 999_999;
const PAST_DATE = "2026-03-14T17:00:00.000Z";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PNG_BUFFER = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("pixels")]);
const WEBP_BUFFER = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0x24, 0x00, 0x00, 0x00]), Buffer.from("WEBP"), Buffer.from("VP8 ")]);
const TEXT_BUFFER = Buffer.from("this is only text renamed photo.jpg");

const VALID_FORM = {
  drankAt: PAST_DATE,
  place: "Le Bistrot",
  format: "bottle",
  rating: "4.5",
  aromas: "fruity,hoppy",
  price: "6.5",
  comment: "Superbe soirée",
};

const minutesFromNow = (minutes: number): string => new Date(Date.now() + minutes * MINUTE_MS).toISOString();

describe("checkins API", () => {
  let app: INestApplication;
  let orvalId: number;
  let chimayId: number;

  const findBeerId = async (name: string): Promise<number> => {
    const response = await request(app.getHttpServer())
      .get(BEERS_PATH)
      .query({ q: name })
      .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID));
    expect(response.status).toBe(HttpStatus.OK);
    const page = response.body as BeerPageDto;
    const beer = page.items.find((item) => item.name === name);
    if (beer === undefined) {
      throw new Error(`${name} is not seeded`);
    }
    return beer.id;
  };

  const post = (userId: number, fields: Record<string, string | undefined>): request.Test => {
    const test = request(app.getHttpServer()).post(CHECKINS_PATH).set(USER_ID_HEADER_NAME, String(userId));
    Object.entries(fields).forEach(([name, value]) => {
      if (value !== undefined) {
        test.field(name, value);
      }
    });
    return test;
  };

  const count = async (table: "checkins" | "photos"): Promise<number> => {
    const rows = await app.get(DataSource).query<{ total: number }[]>(`SELECT COUNT(*) AS total FROM ${table}`);
    return rows[0].total;
  };

  const get = (userId: number, id: number | string): request.Test =>
    request(app.getHttpServer()).get(`${CHECKINS_PATH}/${id}`).set(USER_ID_HEADER_NAME, String(userId));

  beforeAll(async () => {
    app = await createTestApp();
    orvalId = await findBeerId("Orval");
    chimayId = await findBeerId("Chimay Rouge");
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /checkins", () => {
    let firstCheckin: CheckinDto;

    it("creates the first check-in of a beer with its name, a null photo and a first discovery", async () => {
      const response = await post(ALICE_USER_ID, { ...VALID_FORM, beerId: String(orvalId) });

      expect(response.status).toBe(HttpStatus.CREATED);
      const body = response.body as CreatedCheckinDto;
      expect(body).toEqual({
        checkin: {
          id: body.checkin.id,
          beerId: orvalId,
          beerName: "Orval",
          drankAt: PAST_DATE,
          place: "Le Bistrot",
          venueId: null,
          rating: 4.5,
          aromas: ["fruity", "hoppy"],
          format: "bottle",
          price: 6.5,
          comment: "Superbe soirée",
          photoId: null,
        },
        isFirstDiscovery: true,
      });
      expect(body.checkin.id).toBeGreaterThan(0);
      firstCheckin = body.checkin;
    });

    it("reports no first discovery for a second check-in of the same beer by the same user", async () => {
      const response = await post(ALICE_USER_ID, { ...VALID_FORM, beerId: String(orvalId) });

      expect(response.status).toBe(HttpStatus.CREATED);
      const body = response.body as CreatedCheckinDto;
      expect(body.isFirstDiscovery).toBe(false);
      expect(body.checkin.id).not.toBe(firstCheckin.id);
    });

    it("still reports a first discovery to another user for the same beer", async () => {
      const response = await post(BOB_USER_ID, { ...VALID_FORM, beerId: String(orvalId) });

      expect(response.status).toBe(HttpStatus.CREATED);
      expect((response.body as CreatedCheckinDto).isFirstDiscovery).toBe(true);
    });

    it("defaults the optional fields and trims the place", async () => {
      const response = await post(ALICE_USER_ID, {
        beerId: String(chimayId),
        drankAt: "2026-03-14T20:30:00+02:00",
        place: "  Chez moi  ",
        format: "can",
      });

      expect(response.status).toBe(HttpStatus.CREATED);
      expect((response.body as CreatedCheckinDto).checkin).toEqual({
        id: expect.any(Number),
        beerId: chimayId,
        beerName: "Chimay Rouge",
        drankAt: "2026-03-14T18:30:00.000Z",
        place: "Chez moi",
        venueId: null,
        rating: null,
        aromas: [],
        format: "can",
        price: null,
        comment: "",
        photoId: null,
      });
    });

    it("normalizes the line break of a 499 character comment so it fits in 500", async () => {
      const response = await post(ALICE_USER_ID, {
        ...VALID_FORM,
        beerId: String(chimayId),
        comment: `${"a".repeat(499)}\r\n`,
      });

      expect(response.status).toBe(HttpStatus.CREATED);
      expect((response.body as CreatedCheckinDto).checkin.comment).toBe(`${"a".repeat(499)}\n`);
    });

    it("rejects a 500 character comment followed by a CRLF because it counts 501 once normalized", async () => {
      const response = await post(ALICE_USER_ID, {
        ...VALID_FORM,
        beerId: String(chimayId),
        comment: `${"a".repeat(500)}\r\n`,
      });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: "comment must be shorter than or equal to 500 characters" });
    });

    it("stores a comment sent with CRLF and lone CR line breaks with LF only", async () => {
      const response = await post(ALICE_USER_ID, {
        ...VALID_FORM,
        beerId: String(chimayId),
        comment: "x\r\ny\rz",
      });

      expect(response.status).toBe(HttpStatus.CREATED);
      const created = response.body as CreatedCheckinDto;
      expect(created.checkin.comment).toBe("x\ny\nz");
      const stored = await get(ALICE_USER_ID, created.checkin.id);
      expect((stored.body as CheckinDto).comment).toBe("x\ny\nz");
    });

    it("keeps trimming the place around a trailing line break as before", async () => {
      const response = await post(ALICE_USER_ID, {
        ...VALID_FORM,
        beerId: String(chimayId),
        place: "Chez moi\r\n",
      });

      expect(response.status).toBe(HttpStatus.CREATED);
      expect((response.body as CreatedCheckinDto).checkin.place).toBe("Chez moi");
    });

    it("creates a check-in with a photo id and stores the png when a valid png is sent", async () => {
      const photosBefore = await count("photos");

      const response = await post(ALICE_USER_ID, { ...VALID_FORM, beerId: String(chimayId) }).attach(
        "file",
        PNG_BUFFER,
        { filename: "photo.png", contentType: "image/png" },
      );

      expect(response.status).toBe(HttpStatus.CREATED);
      const photoId = (response.body as CreatedCheckinDto).checkin.photoId;
      expect(photoId).toMatch(UUID_PATTERN);
      expect(await count("photos")).toBe(photosBefore + 1);
      const stored = await app
        .get(DataSource)
        .query<{ contentType: string }[]>("SELECT contentType FROM photos WHERE id = ?", [photoId]);
      expect(stored).toEqual([{ contentType: "image/png" }]);
    });

    it("answers 400 and creates nothing for a text file renamed photo.jpg and declared image/jpeg", async () => {
      const checkinsBefore = await count("checkins");
      const photosBefore = await count("photos");

      const response = await post(ALICE_USER_ID, { ...VALID_FORM, beerId: String(chimayId) }).attach(
        "file",
        TEXT_BUFFER,
        { filename: "photo.jpg", contentType: "image/jpeg" },
      );

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: "The photo must be a JPEG, PNG or WebP image." });
      expect(await count("checkins")).toBe(checkinsBefore);
      expect(await count("photos")).toBe(photosBefore);
    });

    it("answers 413 File too large and creates nothing for a file one byte over the limit", async () => {
      const checkinsBefore = await count("checkins");
      const photosBefore = await count("photos");
      const tooLarge = Buffer.concat([PNG_BUFFER, Buffer.alloc(UPLOAD_MAX_SIZE_BYTES + 1 - PNG_BUFFER.length)]);

      const response = await post(ALICE_USER_ID, { ...VALID_FORM, beerId: String(chimayId) }).attach(
        "file",
        tooLarge,
        { filename: "photo.png", contentType: "image/png" },
      );

      expect(response.status).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
      expect(response.body).toEqual({ message: "File too large" });
      expect(await count("checkins")).toBe(checkinsBefore);
      expect(await count("photos")).toBe(photosBefore);
    });

    it("answers 413 before the validation of the fields when the file is too large and the form is malformed", async () => {
      const tooLarge = Buffer.concat([PNG_BUFFER, Buffer.alloc(UPLOAD_MAX_SIZE_BYTES + 1 - PNG_BUFFER.length)]);

      const response = await post(ALICE_USER_ID, { ...VALID_FORM, beerId: String(chimayId), place: "" }).attach(
        "file",
        tooLarge,
        { filename: "photo.png", contentType: "image/png" },
      );

      expect(response.status).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
      expect(response.body).toEqual({ message: "File too large" });
    });

    it("accepts a file of exactly the size limit", async () => {
      const atLimit = Buffer.concat([PNG_BUFFER, Buffer.alloc(UPLOAD_MAX_SIZE_BYTES - PNG_BUFFER.length)]);

      const response = await post(ALICE_USER_ID, { ...VALID_FORM, beerId: String(chimayId) }).attach(
        "file",
        atLimit,
        { filename: "photo.png", contentType: "image/png" },
      );

      expect(response.status).toBe(HttpStatus.CREATED);
    });

    it("answers 404 and keeps no photo for a valid image and an unknown beer", async () => {
      const checkinsBefore = await count("checkins");
      const photosBefore = await count("photos");

      const response = await post(ALICE_USER_ID, { ...VALID_FORM, beerId: String(UNKNOWN_BEER_ID) }).attach(
        "file",
        PNG_BUFFER,
        { filename: "photo.png", contentType: "image/png" },
      );

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.body).toEqual({ message: `Beer ${UNKNOWN_BEER_ID} not found.` });
      expect(await count("checkins")).toBe(checkinsBefore);
      expect(await count("photos")).toBe(photosBefore);
    });

    it("stores image/webp for a valid webp whatever type the client declares", async () => {
      const response = await post(ALICE_USER_ID, { ...VALID_FORM, beerId: String(chimayId) }).attach(
        "file",
        WEBP_BUFFER,
        { filename: "photo.png", contentType: "image/png" },
      );

      expect(response.status).toBe(HttpStatus.CREATED);
      const photoId = (response.body as CreatedCheckinDto).checkin.photoId;
      expect(photoId).toMatch(UUID_PATTERN);
      const stored = await app
        .get(DataSource)
        .query<{ contentType: string }[]>("SELECT contentType FROM photos WHERE id = ?", [photoId]);
      expect(stored).toEqual([{ contentType: "image/webp" }]);
    });

    it("answers the 400 of a malformed form before the 400 of a bad photo", async () => {
      const response = await post(ALICE_USER_ID, { ...VALID_FORM, beerId: String(chimayId), place: "" }).attach(
        "file",
        TEXT_BUFFER,
        { filename: "photo.jpg", contentType: "image/jpeg" },
      );

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: "place should not be empty" });
    });

    it("answers 400 for a bad photo before the 404 of an unknown beer", async () => {
      const response = await post(ALICE_USER_ID, { ...VALID_FORM, beerId: String(UNKNOWN_BEER_ID) }).attach(
        "file",
        TEXT_BUFFER,
        { filename: "photo.jpg", contentType: "image/jpeg" },
      );

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: "The photo must be a JPEG, PNG or WebP image." });
    });

    it("accepts a date 4 minutes ahead of the server clock", async () => {
      const response = await post(ALICE_USER_ID, {
        ...VALID_FORM,
        beerId: String(chimayId),
        drankAt: minutesFromNow(4),
      });

      expect(response.status).toBe(HttpStatus.CREATED);
    });

    it("rejects a date 6 minutes ahead of the server clock with a 400", async () => {
      const response = await post(ALICE_USER_ID, {
        ...VALID_FORM,
        beerId: String(chimayId),
        drankAt: minutesFromNow(6),
      });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: "drankAt must not be in the future." });
    });

    it.each([
      ["an empty place", { place: "" }, "place should not be empty"],
      ["a place of 81 characters", { place: "p".repeat(81) }, "place must be shorter than or equal to 80 characters"],
      ["a rating of 0", { rating: "0" }, "rating must not be less than 0.5"],
      ["a rating of 5.5", { rating: "5.5" }, "rating must not be greater than 5"],
      ["a rating of 4.2", { rating: "4.2" }, "rating must be divisible by 0.5"],
      [
        "six aromas",
        { aromas: "fruity,citrus,hoppy,floral,spicy,caramel" },
        "aromas must contain no more than 5 elements",
      ],
      [
        "an unknown aroma",
        { aromas: "fruity,mystery" },
        `each value in aromas must be one of the following values: ${Object.values(BeerAromaEnum).join(", ")}`,
      ],
      ["a duplicated aroma", { aromas: "fruity,fruity" }, "All aromas's elements must be unique"],
      ["an unknown format", { format: "keg" }, "format must be one of the following values: bottle, can, draft"],
      ["a negative price", { price: "-1" }, "price must not be less than 0"],
      ["a price of 1000.01", { price: "1000.01" }, "price must not be greater than 1000"],
      ["a comment of 501 characters", { comment: "c".repeat(501) }, "comment must be shorter than or equal to 500 characters"],
      ["an unknown field", { ownerId: "2" }, "property ownerId should not exist"],
      ["a malformed date", { drankAt: "yesterday" }, "drankAt must be a valid ISO 8601 date string"],
    ])("rejects %s with a 400", async (_label, override, expectedMessage) => {
      const response = await post(ALICE_USER_ID, { ...VALID_FORM, beerId: String(chimayId), ...override });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: expectedMessage });
    });

    it("answers 400 before 404 when the beer is unknown and the date is in the future", async () => {
      const response = await post(ALICE_USER_ID, {
        ...VALID_FORM,
        beerId: String(UNKNOWN_BEER_ID),
        drankAt: minutesFromNow(60),
      });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: "drankAt must not be in the future." });
    });

    it("answers 400 before 404 when the beer is unknown and the form is malformed", async () => {
      const response = await post(ALICE_USER_ID, { ...VALID_FORM, beerId: String(UNKNOWN_BEER_ID), place: "" });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: "place should not be empty" });
    });

    it("answers 404 for an unknown beer with a valid form and writes nothing", async () => {
      const response = await post(ALICE_USER_ID, { ...VALID_FORM, beerId: String(UNKNOWN_BEER_ID) });

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.body).toEqual({ message: `Beer ${UNKNOWN_BEER_ID} not found.` });
    });

    it("answers 401 without identity before anything else", async () => {
      const response = await request(app.getHttpServer())
        .post(CHECKINS_PATH)
        .field("beerId", String(UNKNOWN_BEER_ID))
        .field("place", "");

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
    });
  });

  describe("GET /checkins/:id", () => {
    let aliceCheckin: CheckinDto;

    beforeAll(async () => {
      const response = await post(ALICE_USER_ID, { ...VALID_FORM, beerId: String(orvalId) });
      expect(response.status).toBe(HttpStatus.CREATED);
      aliceCheckin = (response.body as CreatedCheckinDto).checkin;
    });

    it("gives Alice back the same check-in she created", async () => {
      const response = await get(ALICE_USER_ID, aliceCheckin.id);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual(aliceCheckin);
    });

    it("answers 403 to Bob for Alice's check-in", async () => {
      const response = await get(BOB_USER_ID, aliceCheckin.id);

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
      expect(response.body).toEqual({ message: "You can only access your own check-ins." });
    });

    it("answers 404 for an unknown id", async () => {
      const response = await get(ALICE_USER_ID, UNKNOWN_CHECKIN_ID);

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.body).toEqual({ message: `Check-in ${UNKNOWN_CHECKIN_ID} not found.` });
    });

    it("answers 400 for a non-numeric id", async () => {
      const response = await get(ALICE_USER_ID, "abc");

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: "Validation failed (numeric string is expected)" });
    });

    it("answers 401 without identity", async () => {
      const response = await request(app.getHttpServer()).get(`${CHECKINS_PATH}/${aliceCheckin.id}`);

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
    });
  });

  describe("venue link", () => {
    let fineMousseId: number;

    const findVenueId = async (name: string): Promise<number> => {
      const response = await request(app.getHttpServer())
        .get(VENUES_PATH)
        .query({ q: name })
        .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID));
      expect(response.status).toBe(HttpStatus.OK);
      const venue = (response.body as { id: number; name: string }[]).find((item) => item.name === name);
      if (venue === undefined) {
        throw new Error(`${name} is not seeded`);
      }
      return venue.id;
    };

    const listByBeer = (beerId: number): request.Test =>
      request(app.getHttpServer())
        .get(CHECKINS_PATH)
        .query({ beerId: String(beerId) })
        .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID));

    beforeAll(async () => {
      fineMousseId = await findVenueId("La Fine Mousse");
    });

    it("creates a check-in linked to a seeded venue and returns it in the creation, the detail and the list", async () => {
      const response = await post(ALICE_USER_ID, {
        ...VALID_FORM,
        beerId: String(orvalId),
        place: "La Fine Mousse",
        venueId: String(fineMousseId),
      });

      expect(response.status).toBe(HttpStatus.CREATED);
      const created = (response.body as CreatedCheckinDto).checkin;
      expect(created).toEqual({
        id: expect.any(Number),
        beerId: orvalId,
        beerName: "Orval",
        drankAt: PAST_DATE,
        place: "La Fine Mousse",
        venueId: fineMousseId,
        rating: 4.5,
        aromas: ["fruity", "hoppy"],
        format: "bottle",
        price: 6.5,
        comment: "Superbe soirée",
        photoId: null,
      });
      const detail = await get(ALICE_USER_ID, created.id);
      expect(detail.status).toBe(HttpStatus.OK);
      expect(detail.body).toEqual(created);
      const listed = await listByBeer(orvalId);
      const items = (listed.body as { items: CheckinDto[] }).items;
      expect(items.find((item) => item.id === created.id)).toEqual(created);
    });

    it("creates a free place check-in without venue and returns a null venueId everywhere", async () => {
      const response = await post(ALICE_USER_ID, { ...VALID_FORM, beerId: String(chimayId), place: "Chez moi" });

      expect(response.status).toBe(HttpStatus.CREATED);
      const created = (response.body as CreatedCheckinDto).checkin;
      expect(created).toEqual({
        id: expect.any(Number),
        beerId: chimayId,
        beerName: "Chimay Rouge",
        drankAt: PAST_DATE,
        place: "Chez moi",
        venueId: null,
        rating: 4.5,
        aromas: ["fruity", "hoppy"],
        format: "bottle",
        price: 6.5,
        comment: "Superbe soirée",
        photoId: null,
      });
      expect((await get(ALICE_USER_ID, created.id)).body).toEqual(created);
      const items = ((await listByBeer(chimayId)).body as { items: CheckinDto[] }).items;
      expect(items.find((item) => item.id === created.id)).toEqual(created);
    });

    it("answers 404 and writes no check-in nor photo for an unknown venue and a known beer", async () => {
      const checkinsBefore = await count("checkins");
      const photosBefore = await count("photos");

      const response = await post(ALICE_USER_ID, {
        ...VALID_FORM,
        beerId: String(orvalId),
        venueId: String(UNKNOWN_VENUE_ID),
      }).attach("file", PNG_BUFFER, { filename: "photo.png", contentType: "image/png" });

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.body).toEqual({ message: `Venue ${UNKNOWN_VENUE_ID} not found.` });
      expect(await count("checkins")).toBe(checkinsBefore);
      expect(await count("photos")).toBe(photosBefore);
    });

    it("answers 404 and writes nothing for an unknown venue without photo", async () => {
      const checkinsBefore = await count("checkins");

      const response = await post(ALICE_USER_ID, {
        ...VALID_FORM,
        beerId: String(orvalId),
        venueId: String(UNKNOWN_VENUE_ID),
      });

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.body).toEqual({ message: `Venue ${UNKNOWN_VENUE_ID} not found.` });
      expect(await count("checkins")).toBe(checkinsBefore);
    });

    it("answers the 404 of the beer when the beer and the venue are both unknown", async () => {
      const response = await post(ALICE_USER_ID, {
        ...VALID_FORM,
        beerId: String(UNKNOWN_BEER_ID),
        venueId: String(UNKNOWN_VENUE_ID),
      });

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.body).toEqual({ message: `Beer ${UNKNOWN_BEER_ID} not found.` });
    });

    it("answers 400 before 404 when the date is in the future and the venue is unknown", async () => {
      const response = await post(ALICE_USER_ID, {
        ...VALID_FORM,
        beerId: String(orvalId),
        venueId: String(UNKNOWN_VENUE_ID),
        drankAt: minutesFromNow(60),
      });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: "drankAt must not be in the future." });
    });

    it("answers 400 before 404 when the photo is invalid and the venue is unknown", async () => {
      const checkinsBefore = await count("checkins");

      const response = await post(ALICE_USER_ID, {
        ...VALID_FORM,
        beerId: String(orvalId),
        venueId: String(UNKNOWN_VENUE_ID),
      }).attach("file", TEXT_BUFFER, { filename: "photo.jpg", contentType: "image/jpeg" });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: "The photo must be a JPEG, PNG or WebP image." });
      expect(await count("checkins")).toBe(checkinsBefore);
    });

    it("creates a check-in with a photo for a known venue", async () => {
      const response = await post(ALICE_USER_ID, {
        ...VALID_FORM,
        beerId: String(orvalId),
        venueId: String(fineMousseId),
      }).attach("file", PNG_BUFFER, { filename: "photo.png", contentType: "image/png" });

      expect(response.status).toBe(HttpStatus.CREATED);
      const created = (response.body as CreatedCheckinDto).checkin;
      expect(created.venueId).toBe(fineMousseId);
      expect(created.photoId).toMatch(UUID_PATTERN);
    });

    it("answers 401 without identity before the venue control", async () => {
      const response = await request(app.getHttpServer())
        .post(CHECKINS_PATH)
        .field("beerId", String(orvalId))
        .field("venueId", String(UNKNOWN_VENUE_ID));

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
    });

    it.each([
      ["abc", "venueId must not be less than 1; venueId must be an integer number"],
      ["0", "venueId must not be less than 1"],
      ["-3", "venueId must not be less than 1"],
    ])("answers 400 for a venueId of %s and writes nothing", async (venueId, expectedMessage) => {
      const before = await count("checkins");

      const response = await post(ALICE_USER_ID, { ...VALID_FORM, beerId: String(orvalId), venueId });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: expectedMessage });
      expect(await count("checkins")).toBe(before);
    });
  });
});

describe("checkins history API", () => {
  const ALICE_ORVAL_COUNT = 3;
  const ALICE_TOTAL = 25;
  const PAGE_SIZE = 20;
  const DAY_MS = 24 * 60 * MINUTE_MS;
  const FIRST_DAY_MS = Date.parse("2026-01-01T12:00:00.000Z");

  let app: INestApplication;
  let orvalId: number;
  let chimayId: number;
  let aliceCheckins: CheckinDto[];
  let bobCheckin: CheckinDto;

  const findBeerId = async (name: string): Promise<number> => {
    const response = await request(app.getHttpServer())
      .get(BEERS_PATH)
      .query({ q: name })
      .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID));
    expect(response.status).toBe(HttpStatus.OK);
    const beer = (response.body as BeerPageDto).items.find((item) => item.name === name);
    if (beer === undefined) {
      throw new Error(`${name} is not seeded`);
    }
    return beer.id;
  };

  const create = async (userId: number, beerId: number, drankAt: string, photo?: Buffer): Promise<CheckinDto> => {
    const test = request(app.getHttpServer())
      .post(CHECKINS_PATH)
      .set(USER_ID_HEADER_NAME, String(userId))
      .field("beerId", String(beerId))
      .field("drankAt", drankAt)
      .field("place", "Le Bistrot")
      .field("format", "bottle");
    if (photo !== undefined) {
      test.attach("file", photo, { filename: "photo.png", contentType: "image/png" });
    }
    const response = await test;
    expect(response.status).toBe(HttpStatus.CREATED);
    return (response.body as CreatedCheckinDto).checkin;
  };

  const list = (userId: number, query: Record<string, string> = {}): request.Test =>
    request(app.getHttpServer()).get(CHECKINS_PATH).query(query).set(USER_ID_HEADER_NAME, String(userId));

  const remove = (userId: number, id: number | string): request.Test =>
    request(app.getHttpServer()).delete(`${CHECKINS_PATH}/${id}`).set(USER_ID_HEADER_NAME, String(userId));

  const dayAt = (day: number): string => new Date(FIRST_DAY_MS + day * DAY_MS).toISOString();

  const newestFirst = (items: readonly CheckinDto[]): CheckinDto[] =>
    [...items].sort((left, right) => Date.parse(right.drankAt) - Date.parse(left.drankAt) || right.id - left.id);

  beforeAll(async () => {
    app = await createTestApp();
    orvalId = await findBeerId("Orval");
    chimayId = await findBeerId("Chimay Rouge");
    aliceCheckins = [];
    for (let index = 0; index < ALICE_TOTAL; index += 1) {
      const beerId = index < ALICE_ORVAL_COUNT ? orvalId : chimayId;
      const day = index >= ALICE_TOTAL - 2 ? ALICE_TOTAL - 2 : ALICE_TOTAL - 3 - index;
      aliceCheckins.push(await create(ALICE_USER_ID, beerId, dayAt(day)));
    }
    bobCheckin = await create(BOB_USER_ID, orvalId, dayAt(ALICE_TOTAL + 10));
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /checkins", () => {
    it("lists page 1 with 20 of Alice's 25 check-ins, newest first, ties by larger id, each with its beer name", async () => {
      const response = await list(ALICE_USER_ID);

      expect(response.status).toBe(HttpStatus.OK);
      const page = response.body as { items: CheckinDto[]; total: number; page: number; size: number };
      expect(page.total).toBe(ALICE_TOTAL);
      expect(page.page).toBe(1);
      expect(page.size).toBe(PAGE_SIZE);
      expect(page.items).toEqual(newestFirst(aliceCheckins).slice(0, PAGE_SIZE));
      expect(page.items.map((item) => item.beerName)).not.toContain("");
      expect(page.items.some((item) => item.id === bobCheckin.id)).toBe(false);
    });

    it("breaks a date tie with the larger id", async () => {
      const tied = aliceCheckins.slice(-2);

      const response = await list(ALICE_USER_ID);

      const ids = (response.body as { items: CheckinDto[] }).items.map((item) => item.id);
      expect(tied[0].drankAt).toBe(tied[1].drankAt);
      expect(ids.slice(0, 2)).toEqual([tied[1].id, tied[0].id]);
    });

    it("lists the 5 remaining check-ins on page 2 and none on page 3", async () => {
      const second = await list(ALICE_USER_ID, { page: "2" });
      const third = await list(ALICE_USER_ID, { page: "3" });

      const secondPage = second.body as { items: CheckinDto[]; total: number; page: number };
      expect(second.status).toBe(HttpStatus.OK);
      expect(secondPage.items).toEqual(newestFirst(aliceCheckins).slice(PAGE_SIZE));
      expect(secondPage.items).toHaveLength(ALICE_TOTAL - PAGE_SIZE);
      expect(secondPage.page).toBe(2);
      expect(third.status).toBe(HttpStatus.OK);
      expect(third.body).toEqual({ items: [], total: ALICE_TOTAL, page: 3, size: PAGE_SIZE });
    });

    it("lists only Bob's check-in to Bob", async () => {
      const response = await list(BOB_USER_ID);

      expect(response.body).toEqual({ items: [bobCheckin], total: 1, page: 1, size: PAGE_SIZE });
    });

    it("filters on a beer and counts only that beer", async () => {
      const response = await list(ALICE_USER_ID, { beerId: String(orvalId) });

      const page = response.body as { items: CheckinDto[]; total: number };
      expect(response.status).toBe(HttpStatus.OK);
      expect(page.total).toBe(ALICE_ORVAL_COUNT);
      expect(page.items).toHaveLength(ALICE_ORVAL_COUNT);
      expect(page.items.every((item) => item.beerId === orvalId && item.beerName === "Orval")).toBe(true);
    });

    it("answers an empty page with 200 for an unknown beer", async () => {
      const response = await list(ALICE_USER_ID, { beerId: "9999" });

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({ items: [], total: 0, page: 1, size: PAGE_SIZE });
    });

    it.each([
      ["page 0", { page: "0" }, "page must not be less than 1"],
      ["a non-numeric page", { page: "abc" }, "page must not be less than 1; page must be an integer number"],
      ["a non-numeric beer filter", { beerId: "abc" }, "beerId must not be less than 1; beerId must be an integer number"],
      ["a beer filter of 0", { beerId: "0" }, "beerId must not be less than 1"],
    ])("answers 400 for %s", async (_label, query, expectedMessage) => {
      const response = await list(ALICE_USER_ID, query);

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: expectedMessage });
    });

    it("answers 401 without identity", async () => {
      const response = await request(app.getHttpServer()).get(CHECKINS_PATH);

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
    });
  });

  describe("DELETE /checkins/{id}", () => {
    it("deletes a check-in with its photo, then answers 404 for the check-in and for the photo", async () => {
      const withPhoto = await create(ALICE_USER_ID, chimayId, dayAt(1), PNG_BUFFER);
      const photoId = withPhoto.photoId as string;
      const photosBefore = await app.get(DataSource).query<{ total: number }[]>("SELECT COUNT(*) AS total FROM photos");
      expect(photoId).toMatch(UUID_PATTERN);
      expect((await request(app.getHttpServer()).get(`/api/v1/photos/${photoId}`)).status).toBe(HttpStatus.OK);

      const response = await remove(ALICE_USER_ID, withPhoto.id);

      expect(response.status).toBe(HttpStatus.NO_CONTENT);
      expect(response.body).toEqual({});
      const reread = await request(app.getHttpServer()).get(`${CHECKINS_PATH}/${withPhoto.id}`).set(USER_ID_HEADER_NAME, String(ALICE_USER_ID));
      expect(reread.status).toBe(HttpStatus.NOT_FOUND);
      const photo = await request(app.getHttpServer()).get(`/api/v1/photos/${photoId}`);
      expect(photo.status).toBe(HttpStatus.NOT_FOUND);
      const photosAfter = await app.get(DataSource).query<{ total: number }[]>("SELECT COUNT(*) AS total FROM photos");
      expect(photosAfter[0].total).toBe(photosBefore[0].total - 1);
    });

    it("deletes a check-in without a photo and removes it from the list", async () => {
      const plain = await create(ALICE_USER_ID, chimayId, dayAt(2));
      const before = (await list(ALICE_USER_ID)).body as { total: number };

      const response = await remove(ALICE_USER_ID, plain.id);

      expect(response.status).toBe(HttpStatus.NO_CONTENT);
      const after = (await list(ALICE_USER_ID)).body as { total: number };
      expect(after.total).toBe(before.total - 1);
    });

    it("answers 403 to Alice for Bob's check-in and keeps it", async () => {
      const response = await remove(ALICE_USER_ID, bobCheckin.id);

      expect(response.status).toBe(HttpStatus.FORBIDDEN);
      expect(response.body).toEqual({ message: "You can only access your own check-ins." });
      const kept = await request(app.getHttpServer()).get(`${CHECKINS_PATH}/${bobCheckin.id}`).set(USER_ID_HEADER_NAME, String(BOB_USER_ID));
      expect(kept.status).toBe(HttpStatus.OK);
      expect(kept.body).toEqual(bobCheckin);
    });

    it("answers 404 for an unknown id", async () => {
      const response = await remove(ALICE_USER_ID, UNKNOWN_CHECKIN_ID);

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.body).toEqual({ message: `Check-in ${UNKNOWN_CHECKIN_ID} not found.` });
    });

    it("answers 400 for a non-numeric id", async () => {
      const response = await remove(ALICE_USER_ID, "abc");

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body).toEqual({ message: "Validation failed (numeric string is expected)" });
    });

    it("answers 401 without identity and deletes nothing", async () => {
      const response = await request(app.getHttpServer()).delete(`${CHECKINS_PATH}/${aliceCheckins[0].id}`);

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
      const kept = await request(app.getHttpServer()).get(`${CHECKINS_PATH}/${aliceCheckins[0].id}`).set(USER_ID_HEADER_NAME, String(ALICE_USER_ID));
      expect(kept.status).toBe(HttpStatus.OK);
    });
  });
});
