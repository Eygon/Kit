import { HttpStatus } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { UNIDENTIFIED_USER_MESSAGE } from "@/common/exceptions/exception-messages.constants";
import { ALICE_USER_ID, BOB_USER_ID, CAROL_USER_ID } from "@/database/seed.constants";
import type { BeerPageDto } from "@/modules/beers/dtos/beer-page.dto";
import { createTestApp } from "@/__tests__/support/test-app";
import { USER_ID_HEADER_NAME } from "@/__tests__/support/user-header";

const BEERS_PATH = "/api/v1/beers";
const UNKNOWN_BEER_ID = 999_999;
const NO_TASTING_MESSAGE = "You must check in this beer before reviewing it.";
const REVIEW_TEXT_LENGTH = 500;
const HALF_TEXT_LENGTH = 250;

const ME_PROFILE_PATH = "/api/v1/me/profile";

const reviewPath = (beerId: number | string): string => `${BEERS_PATH}/${beerId}/reviews/me`;

describe("beer reviews API", () => {
  let app: INestApplication;
  let orvalId: number;
  let westmalleId: number;
  let aliceOrvalCheckinId: number;

  const findBeerId = async (name: string): Promise<number> => {
    const response = await request(app.getHttpServer())
      .get(BEERS_PATH)
      .query({ q: name })
      .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID));
    const [beer] = (response.body as BeerPageDto).items.filter((item) => item.name === name);
    return beer.id;
  };

  const countReviews = async (userId: number, beerId: number): Promise<number> => {
    const rows = await app
      .get(DataSource)
      .query<{ total: number }[]>("SELECT COUNT(*) AS total FROM reviews WHERE userId = ? AND beerId = ?", [userId, beerId]);
    return rows[0].total;
  };

  const put = (userId: number, beerId: number | string, body: unknown) =>
    request(app.getHttpServer()).put(reviewPath(beerId)).set(USER_ID_HEADER_NAME, String(userId)).send(body as object);

  const remove = (userId: number, beerId: number | string) =>
    request(app.getHttpServer()).delete(reviewPath(beerId)).set(USER_ID_HEADER_NAME, String(userId));

  const insertReview = async (userId: number, beerId: number): Promise<void> => {
    const now = new Date().toISOString();
    await app
      .get(DataSource)
      .query(
        "INSERT INTO reviews (userId, beerId, rating, text, sweetness, acidity, body, createdAt, updatedAt) VALUES (?, ?, 2, 'Bof', NULL, NULL, NULL, ?, ?)",
        [userId, beerId, now, now],
      );
  };

  beforeAll(async () => {
    app = await createTestApp();
    await app.get(DataSource).query("DELETE FROM reviews");
    orvalId = await findBeerId("Orval");
    westmalleId = await findBeerId("Westmalle Tripel");
    const checkin = await request(app.getHttpServer())
      .post("/api/v1/checkins")
      .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID))
      .field("beerId", String(orvalId))
      .field("drankAt", "2025-10-01T18:00:00.000Z")
      .field("place", "Le Bistrot")
      .field("format", "bottle");
    expect(checkin.status).toBe(HttpStatus.CREATED);
    aliceOrvalCheckinId = checkin.body.checkin.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it("AC1 creates the review of Alice, who tasted Orval, and answers it in full", async () => {
    const response = await put(ALICE_USER_ID, orvalId, { rating: 4.5, text: "Superbe amertume", sweetness: 2 });

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual({
      id: expect.any(Number),
      beerId: orvalId,
      authorId: ALICE_USER_ID,
      authorName: "Alice",
      authorAvatarColor: "#F59E0B",
      authorAvatar: "hop",
      rating: 4.5,
      text: "Superbe amertume",
      sweetness: 2,
      acidity: null,
      body: null,
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/),
      updatedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/),
      isMine: true,
    });
    expect(await countReviews(ALICE_USER_ID, orvalId)).toBe(1);
  });

  it("AC2 replaces the review: same id and creation date, new content, newer modification date, one row", async () => {
    const created = (await put(ALICE_USER_ID, orvalId, { rating: 4.5, text: "Superbe amertume", sweetness: 2 })).body;
    await new Promise((resolve) => setTimeout(resolve, 20));

    const response = await put(ALICE_USER_ID, orvalId, { rating: 3 });

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual({
      ...created,
      rating: 3,
      text: "",
      sweetness: null,
      acidity: null,
      body: null,
      updatedAt: expect.any(String),
    });
    expect(new Date(response.body.updatedAt).getTime()).toBeGreaterThan(new Date(created.updatedAt).getTime());
    expect(await countReviews(ALICE_USER_ID, orvalId)).toBe(1);
  });

  it("AC3 answers 403 to Carol, who never tasted Westmalle Tripel, and stores nothing", async () => {
    const response = await put(CAROL_USER_ID, westmalleId, { rating: 4, text: "Valide" });

    expect(response.status).toBe(HttpStatus.FORBIDDEN);
    expect(response.body).toEqual({ message: NO_TASTING_MESSAGE });
    expect(await countReviews(CAROL_USER_ID, westmalleId)).toBe(0);
  });

  it("AC4 lets Bob replace his review of a beer he never tasted", async () => {
    const now = new Date().toISOString();
    await app
      .get(DataSource)
      .query(
        "INSERT INTO reviews (userId, beerId, rating, text, sweetness, acidity, body, createdAt, updatedAt) VALUES (?, ?, 2, 'Bof', NULL, NULL, NULL, ?, ?)",
        [BOB_USER_ID, westmalleId, now, now],
      );

    const response = await put(BOB_USER_ID, westmalleId, { rating: 5, text: "Finalement top", acidity: 4 });

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toMatchObject({ authorId: BOB_USER_ID, authorName: "Bob", authorAvatar: "malt", rating: 5, text: "Finalement top", acidity: 4, isMine: true });
    expect(await countReviews(BOB_USER_ID, westmalleId)).toBe(1);
  });

  it.each([
    ["a missing rating", {}, "rating"],
    ["a rating of 0.5", { rating: 0.5 }, "rating must not be less than 1"],
    ["a rating of 5.5", { rating: 5.5 }, "rating must not be greater than 5"],
    ["a rating of 3.3", { rating: 3.3 }, "rating must be divisible by 0.5"],
    ["a text of 501 characters", { rating: 3, text: "a".repeat(REVIEW_TEXT_LENGTH + 1) }, "text must be shorter than or equal to 500 characters"],
    ["a text of 501 characters written with CRLF", { rating: 3, text: `${"a".repeat(HALF_TEXT_LENGTH)}\r\n${"b".repeat(HALF_TEXT_LENGTH)}` }, "text must be shorter than or equal to 500 characters"],
    ["a sweetness of 0", { rating: 3, sweetness: 0 }, "sweetness must not be less than 1"],
    ["an acidity of 6", { rating: 3, acidity: 6 }, "acidity must not be greater than 5"],
    ["a body of 2.5", { rating: 3, body: 2.5 }, "body must be an integer number"],
    ["an unknown field", { rating: 3, authorId: 2 }, "property authorId should not exist"],
  ])("AC5 answers 400 for %s and keeps the stored review untouched", async (_label, body, fragment) => {
    const before = (await put(ALICE_USER_ID, orvalId, { rating: 4, text: "Avant" })).body;

    const response = await put(ALICE_USER_ID, orvalId, body);

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body.message).toContain(fragment);
    const after = await put(ALICE_USER_ID, orvalId, { rating: 4, text: "Avant" });
    expect(after.body).toEqual({ ...before, updatedAt: expect.any(String) });
  });

  it("AC5 accepts a text of 500 characters containing CRLF and stores it with LF", async () => {
    const text = `${"a".repeat(HALF_TEXT_LENGTH)}\r\n${"b".repeat(HALF_TEXT_LENGTH - 1)}`;

    const response = await put(ALICE_USER_ID, orvalId, { rating: 3, text });

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body.text).toBe(`${"a".repeat(HALF_TEXT_LENGTH)}\n${"b".repeat(HALF_TEXT_LENGTH - 1)}`);
    expect(response.body.text).toHaveLength(REVIEW_TEXT_LENGTH);
  });

  it("E6 stores a text made only of spaces and line breaks as an empty text", async () => {
    const response = await put(ALICE_USER_ID, orvalId, { rating: 3, text: "   \r\n  " });

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body.text).toBe("");
  });

  it("AC6 answers 401 without identity, even with an invalid body on an unknown beer", async () => {
    const response = await request(app.getHttpServer()).put(reviewPath(UNKNOWN_BEER_ID)).send({ rating: 0 });

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });

  it("AC6 answers 400 before 404 for an invalid body on an unknown beer", async () => {
    const response = await put(CAROL_USER_ID, UNKNOWN_BEER_ID, { rating: 0 });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body.message).toContain("rating must not be less than 1");
  });

  it("AC6 answers 400 for a beer id that is not a number, whatever the body", async () => {
    const response = await put(ALICE_USER_ID, "abc", { rating: 3 });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body.message).toContain("numeric string is expected");
  });

  it("AC6 answers 400 before 403 for an invalid body of a user who never tasted the beer", async () => {
    const response = await put(CAROL_USER_ID, westmalleId, { rating: 0 });

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it("AC6 answers 404 before 403 for a valid body of a user without tasting on an unknown beer", async () => {
    const response = await put(CAROL_USER_ID, UNKNOWN_BEER_ID, { rating: 3 });

    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.body).toEqual({ message: `Beer ${UNKNOWN_BEER_ID} not found.` });
    expect(await countReviews(CAROL_USER_ID, UNKNOWN_BEER_ID)).toBe(0);
  });

  it("US3 AC1 deletes the review of Alice with a 204 and an empty body, and leaves the review of Bob", async () => {
    await put(ALICE_USER_ID, orvalId, { rating: 4, text: "A supprimer" });
    await insertReview(BOB_USER_ID, orvalId);

    const response = await remove(ALICE_USER_ID, orvalId);

    expect(response.status).toBe(HttpStatus.NO_CONTENT);
    expect(response.body).toEqual({});
    expect(await countReviews(ALICE_USER_ID, orvalId)).toBe(0);
    expect(await countReviews(BOB_USER_ID, orvalId)).toBe(1);
  });

  it("US3 AC2 answers 404 with a message when Alice has no review on Orval, and Bob keeps his", async () => {
    const response = await remove(ALICE_USER_ID, orvalId);

    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.body).toEqual({ message: `You have not reviewed beer ${orvalId}.` });
    expect(await countReviews(BOB_USER_ID, orvalId)).toBe(1);
  });

  it("US3 AC3 answers 404 for an unknown beer", async () => {
    const response = await remove(ALICE_USER_ID, UNKNOWN_BEER_ID);

    expect(response.status).toBe(HttpStatus.NOT_FOUND);
    expect(response.body).toEqual({ message: `Beer ${UNKNOWN_BEER_ID} not found.` });
  });

  it("US3 AC3 answers 400 for a beer id that is not a number", async () => {
    const response = await remove(ALICE_USER_ID, "abc");

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body.message).toContain("numeric string is expected");
  });

  it("US3 AC3 answers 401 without identity, even for an unknown or non numeric beer", async () => {
    const unknown = await request(app.getHttpServer()).delete(reviewPath(UNKNOWN_BEER_ID));
    const notNumeric = await request(app.getHttpServer()).delete(reviewPath("abc"));

    expect(unknown.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(unknown.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
    expect(notNumeric.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  it("US3 deletes the review of Bob, who never tasted the beer, without asking for a tasting", async () => {
    expect(await countReviews(BOB_USER_ID, westmalleId)).toBe(1);

    const response = await remove(BOB_USER_ID, westmalleId);

    expect(response.status).toBe(HttpStatus.NO_CONTENT);
    expect(await countReviews(BOB_USER_ID, westmalleId)).toBe(0);
  });

  it("US3 AC4 keeps the review of Alice when she deletes her last tasting of Orval", async () => {
    const saved = await put(ALICE_USER_ID, orvalId, { rating: 4, text: "Je reste" });
    expect(saved.status).toBe(HttpStatus.OK);

    const deleted = await request(app.getHttpServer())
      .delete(`/api/v1/checkins/${aliceOrvalCheckinId}`)
      .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID));

    expect(deleted.status).toBe(HttpStatus.NO_CONTENT);
    const reread = await request(app.getHttpServer())
      .get(`/api/v1/checkins/${aliceOrvalCheckinId}`)
      .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID));
    expect(reread.status).toBe(HttpStatus.NOT_FOUND);
    expect(await countReviews(ALICE_USER_ID, orvalId)).toBe(1);
    const replaced = await put(ALICE_USER_ID, orvalId, { rating: 5 });
    expect(replaced.status).toBe(HttpStatus.OK);
    expect(replaced.body.id).toBe(saved.body.id);
    const removed = await remove(ALICE_USER_ID, orvalId);
    expect(removed.status).toBe(HttpStatus.NO_CONTENT);
    expect(await countReviews(ALICE_USER_ID, orvalId)).toBe(0);
  });

  describe("US4 review page", () => {
    const DAY_MS = 86_400_000;
    const OTHER_REVIEWS = 23;
    const FIRST_OTHER_USER_ID = 100;
    const SHARED_MOMENT_EVERY = 4;
    const reviewsPath = (beerId: number | string): string => `${BEERS_PATH}/${beerId}/reviews`;

    const getPage = (userId: number, beerId: number | string, query: Record<string, string> = {}) =>
      request(app.getHttpServer()).get(reviewsPath(beerId)).query(query).set(USER_ID_HEADER_NAME, String(userId));

    const insertAt = async (userId: number, beerId: number, text: string, moment: Date): Promise<void> => {
      const at = moment.toISOString();
      await app
        .get(DataSource)
        .query(
          "INSERT INTO reviews (userId, beerId, rating, text, sweetness, acidity, body, createdAt, updatedAt) VALUES (?, ?, 3.5, ?, 2, NULL, 4, ?, ?)",
          [userId, beerId, text, at, at],
        );
    };

    it("US4 AC1 serves the review of Carol as mine and Bob then Alice as the others, each with author, content and isMine false", async () => {
      const chimayId = await findBeerId("Chimay Rouge");
      const now = Date.now();
      await insertAt(BOB_USER_ID, chimayId, "Bob hier", new Date(now - DAY_MS));
      await insertAt(CAROL_USER_ID, chimayId, "Carol aujourd'hui", new Date(now));
      await insertAt(ALICE_USER_ID, chimayId, "Alice il y a 3 jours", new Date(now - 3 * DAY_MS));

      const response = await getPage(CAROL_USER_ID, chimayId);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body.mine).toEqual({
        id: expect.any(Number),
        beerId: chimayId,
        authorId: CAROL_USER_ID,
        authorName: "Carol",
        authorAvatarColor: "#8B5CF6",
        authorAvatar: "glass",
        rating: 3.5,
        text: "Carol aujourd'hui",
        sweetness: 2,
        acidity: null,
        body: 4,
        createdAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
        isMine: true,
      });
      expect(response.body.items).toHaveLength(2);
      expect(response.body.items[0]).toEqual({
        id: expect.any(Number),
        beerId: chimayId,
        authorId: BOB_USER_ID,
        authorName: "Bob",
        authorAvatarColor: "#10B981",
        authorAvatar: "malt",
        rating: 3.5,
        text: "Bob hier",
        sweetness: 2,
        acidity: null,
        body: 4,
        createdAt: new Date(now - DAY_MS).toISOString(),
        updatedAt: new Date(now - DAY_MS).toISOString(),
        isMine: false,
      });
      expect(response.body.items[1]).toEqual({
        id: expect.any(Number),
        beerId: chimayId,
        authorId: ALICE_USER_ID,
        authorName: "Alice",
        authorAvatarColor: "#F59E0B",
        authorAvatar: "hop",
        rating: 3.5,
        text: "Alice il y a 3 jours",
        sweetness: 2,
        acidity: null,
        body: 4,
        createdAt: new Date(now - 3 * DAY_MS).toISOString(),
        updatedAt: new Date(now - 3 * DAY_MS).toISOString(),
        isMine: false,
      });
      expect([response.body.total, response.body.page, response.body.size]).toEqual([2, 1, 10]);
    });

    it("US4 AC2 pages 23 reviews of other users 10, 10 and 3 without duplicate or gap, ordered by modification then id, with mine on every page", async () => {
      const pilsnerId = await findBeerId("Pilsner Urquell");
      const base = Date.UTC(2026, 0, 1);
      const dataSource = app.get(DataSource);
      for (let index = 0; index < OTHER_REVIEWS; index += 1) {
        const userId = FIRST_OTHER_USER_ID + index;
        await dataSource.query("INSERT INTO users (id, displayName, avatarColor) VALUES (?, ?, '#112233')", [userId, `Autre ${index}`]);
        await insertAt(userId, pilsnerId, `avis ${index}`, new Date(base + Math.floor(index / SHARED_MOMENT_EVERY) * DAY_MS));
      }
      await insertAt(ALICE_USER_ID, pilsnerId, "Alice la plus récente", new Date(base + 30 * DAY_MS));
      const expectedOrder = Array.from({ length: OTHER_REVIEWS }, (_value, index) => `avis ${index}`)
        .sort((left, right) => {
          const leftIndex = Number(left.slice(5));
          const rightIndex = Number(right.slice(5));
          const byMoment = Math.floor(rightIndex / SHARED_MOMENT_EVERY) - Math.floor(leftIndex / SHARED_MOMENT_EVERY);
          return byMoment !== 0 ? byMoment : rightIndex - leftIndex;
        });

      const pages = [
        await getPage(ALICE_USER_ID, pilsnerId, { page: "1" }),
        await getPage(ALICE_USER_ID, pilsnerId, { page: "2" }),
        await getPage(ALICE_USER_ID, pilsnerId, { page: "3" }),
      ];

      pages.forEach((response, index) => {
        expect(response.status).toBe(HttpStatus.OK);
        expect(response.body.mine).toMatchObject({ text: "Alice la plus récente", isMine: true });
        expect(response.body.total).toBe(OTHER_REVIEWS);
        expect(response.body.page).toBe(index + 1);
        expect(response.body.size).toBe(10);
      });
      expect(pages.map((response) => response.body.items.length)).toEqual([10, 10, 3]);
      expect(pages.flatMap((response) => response.body.items.map((item: { text: string }) => item.text))).toEqual(expectedOrder);
      expect(pages[0].body.items[0].authorName).toMatch(/^Autre /);
    });

    it("US4 AC3 answers 200 with mine null, an empty list and a total of 0 for a beer without review", async () => {
      const sierraId = await findBeerId("Sierra Nevada Pale Ale");

      const response = await getPage(CAROL_USER_ID, sierraId);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({ mine: null, items: [], total: 0, page: 1, size: 10 });
    });

    it("US4 AC4 answers 404 with a message for an unknown beer", async () => {
      const response = await getPage(CAROL_USER_ID, UNKNOWN_BEER_ID);

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.body).toEqual({ message: `Beer ${UNKNOWN_BEER_ID} not found.` });
    });

    it.each([["0"], ["-1"], ["abc"], ["1.5"]])("US4 AC4 answers 400 for the page %s", async (page) => {
      const response = await getPage(CAROL_USER_ID, orvalId, { page });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
      expect(response.body.message).toContain("page");
    });

    it("US4 AC4 answers 400 for a beer id that is not a number", async () => {
      const response = await getPage(CAROL_USER_ID, "abc");

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it("US4 AC4 answers 400 before 404 for an invalid page on an unknown beer", async () => {
      const response = await getPage(CAROL_USER_ID, UNKNOWN_BEER_ID, { page: "0" });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });

    it("US4 AC4 answers 401 without identity, even for an unknown beer or an invalid page", async () => {
      const valid = await request(app.getHttpServer()).get(reviewsPath(orvalId));
      const unknown = await request(app.getHttpServer()).get(reviewsPath(UNKNOWN_BEER_ID)).query({ page: "0" });

      expect(valid.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(valid.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
      expect(unknown.status).toBe(HttpStatus.UNAUTHORIZED);
    });
  });

  describe("author avatar", () => {
    const updateProfile = (userId: number, body: object) =>
      request(app.getHttpServer()).put(ME_PROFILE_PATH).set(USER_ID_HEADER_NAME, String(userId)).send(body);

    it("follows the avatar of Alice on her saved review and on the page after she changes it", async () => {
      const duvelId = await findBeerId("Duvel");
      const checkin = await request(app.getHttpServer())
        .post("/api/v1/checkins")
        .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID))
        .field("beerId", String(duvelId))
        .field("drankAt", "2025-10-02T18:00:00.000Z")
        .field("place", "Le Bistrot")
        .field("format", "bottle");
      expect(checkin.status).toBe(HttpStatus.CREATED);
      const saved = await put(ALICE_USER_ID, duvelId, { rating: 4, text: "Avant changement" });
      const changed = await updateProfile(ALICE_USER_ID, { displayName: "Alice", avatar: "foam" });
      const resaved = await put(ALICE_USER_ID, duvelId, { rating: 4, text: "Après changement" });
      const page = await request(app.getHttpServer())
        .get(`${BEERS_PATH}/${duvelId}/reviews`)
        .set(USER_ID_HEADER_NAME, String(BOB_USER_ID));

      expect(changed.status).toBe(HttpStatus.OK);
      expect(saved.body.authorAvatar).toBe("hop");
      expect(resaved.body).toMatchObject({ authorAvatar: "foam", authorAvatarColor: "#F59E0B" });
      expect(page.body.items.find((item: { authorId: number }) => item.authorId === ALICE_USER_ID)).toMatchObject({
        authorAvatar: "foam",
        authorAvatarColor: "#F59E0B",
      });
      await updateProfile(ALICE_USER_ID, { displayName: "Alice", avatar: "hop" });
    });
  });
});

describe("beer reviews API demo data", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("serves the demo review of Bob with his avatar malt and his avatar color", async () => {
    const list = await request(app.getHttpServer())
      .get(BEERS_PATH)
      .query({ q: "Pilsner Urquell" })
      .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID));
    const [pilsner] = (list.body as BeerPageDto).items.filter((item) => item.name === "Pilsner Urquell");

    const response = await request(app.getHttpServer())
      .get(`${BEERS_PATH}/${pilsner.id}/reviews`)
      .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID));

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body.items.find((item: { authorId: number }) => item.authorId === BOB_USER_ID)).toMatchObject({
      authorName: "Bob",
      authorAvatarColor: "#10B981",
      authorAvatar: "malt",
    });
  });
});
