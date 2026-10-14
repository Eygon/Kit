import { HttpStatus } from "@nestjs/common";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp } from "@/__tests__/support/test-app";
import { TEST_CONFIG } from "@/__tests__/support/test-config";
import { USER_ID_HEADER_NAME } from "@/__tests__/support/user-header";
import { UNIDENTIFIED_USER_MESSAGE } from "@/common/exceptions/exception-messages.constants";
import { ALICE_USER_ID, BOB_USER_ID, CAROL_USER_ID } from "@/database/seed.constants";
import type { BeerPageDto } from "@/modules/beers/dtos/beer-page.dto";
import type { CreatedCheckinDto } from "@/modules/pokedex/dtos/created-checkin.dto";
import type { FeedPageDto } from "@/modules/social/dtos/feed-page.dto";
import { AvatarEnum } from "@/modules/users/enums/avatar.enum";
import { Review } from "@/modules/beers/entities/review.entity";
import { Checkin } from "@/modules/tastings/entities/checkin.entity";
import { Photo } from "@/modules/tastings/entities/photo.entity";
import { Follow } from "@/modules/social/entities/follow.entity";

const FEED_PATH = "/api/v1/me/feed";
const BEERS_PATH = "/api/v1/beers";
const CHECKINS_PATH = "/api/v1/checkins";
const BEERS_NEEDED = 5;
const FEED_PAGE_SIZE = 20;
const DEMO_TASTING_COUNT = 21;
const TOTAL_CARDS = 25;
const TOTAL_CARDS_WITH_LEVEL_UP = 26;
const PILSNER_NAME = "Pilsner Urquell";
const LEVEL_UP_THRESHOLD = 5;
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const FIRST_DAY = Date.parse("2025-10-01T18:00:00.000Z");
const PAGE_MIN_MESSAGE = "page must not be less than 1";
const PAGE_INTEGER_MESSAGE = "page must be an integer number";
const PNG_BUFFER = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("pixels")]);

describe("feed API", () => {
  let app: INestApplication;
  let beerIds: number[];
  let beerNames: string[];
  let seededReviews: Review[];

  const readFeed = (userId: number, page?: number | string): request.Test =>
    request(app.getHttpServer())
      .get(page === undefined ? FEED_PATH : `${FEED_PATH}?page=${page}`)
      .set(USER_ID_HEADER_NAME, String(userId));

  const feedOf = async (userId: number, page?: number | string): Promise<FeedPageDto> => {
    const response = await readFeed(userId, page);
    expect(response.status).toBe(HttpStatus.OK);
    return response.body as FeedPageDto;
  };

  const follow = async (userId: number, targetId: number): Promise<void> => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/users/${targetId}/follow`)
      .set(USER_ID_HEADER_NAME, String(userId));
    expect(response.status).toBe(HttpStatus.CREATED);
  };

  const drink = async (userId: number, beerId: number, drankAt: string, place = "Paris", rating = "4", photo = false) => {
    const call = request(app.getHttpServer())
      .post(CHECKINS_PATH)
      .set(USER_ID_HEADER_NAME, String(userId))
      .field("beerId", String(beerId))
      .field("drankAt", drankAt)
      .field("place", place)
      .field("format", "bottle")
      .field("rating", rating);
    const response = await (photo
      ? call.attach("file", PNG_BUFFER, { filename: "photo.bin", contentType: "application/octet-stream" })
      : call);
    expect(response.status).toBe(HttpStatus.CREATED);
    return (response.body as CreatedCheckinDto).checkin;
  };

  beforeAll(async () => {
    app = await createTestApp();
    const response = await request(app.getHttpServer()).get(BEERS_PATH).set(USER_ID_HEADER_NAME, String(ALICE_USER_ID));
    expect(response.status).toBe(HttpStatus.OK);
    const beers = (response.body as BeerPageDto).items.slice(0, BEERS_NEEDED);
    beerIds = beers.map((item) => item.id);
    beerNames = beers.map((item) => item.name);
    seededReviews = await app.get(DataSource).getRepository(Review).find();
  });

  beforeEach(async () => {
    const dataSource = app.get(DataSource);
    await dataSource.getRepository(Follow).clear();
    await dataSource.getRepository(Checkin).clear();
    await dataSource.getRepository(Photo).clear();
    await dataSource.getRepository(Review).clear();
  });

  afterAll(async () => {
    await app.close();
  });

  it("answers 401 without the user header", async () => {
    const response = await request(app.getHttpServer()).get(FEED_PATH);

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });

  it("answers 401 before 400 when the header is missing and the page is invalid", async () => {
    const response = await request(app.getHttpServer()).get(`${FEED_PATH}?page=0`);

    expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
    expect(response.body).toEqual({ message: UNIDENTIFIED_USER_MESSAGE });
  });

  it("shows two cards of a followed author, newest first, with author, beer, place, rating and photo, only the first stamped", async () => {
    await follow(ALICE_USER_ID, BOB_USER_ID);
    const first = await drink(BOB_USER_ID, beerIds[0], "2025-10-01T18:00:00.000Z", "Paris", "4", true);
    const second = await drink(BOB_USER_ID, beerIds[0], "2025-10-05T18:00:00.000Z", "Lyon", "2");
    expect(first.photoId).not.toBeNull();

    const feed = await feedOf(ALICE_USER_ID);

    const actor = { id: BOB_USER_ID, displayName: "Bob", avatar: AvatarEnum.MALT, level: 1, title: "curious" };
    expect(feed).toEqual({
      items: [
        {
          id: `checkin-${second.id}`,
          kind: "checkin",
          occurredAt: "2025-10-05T18:00:00.000Z",
          actor,
          beerId: beerIds[0],
          beerName: expect.any(String),
          place: "Lyon",
          rating: 2,
          photoId: null,
          isDiscovery: false,
          discoveryCount: null,
          reachedLevel: null,
          reachedTitle: null,
          reviewText: null,
        },
        {
          id: `checkin-${first.id}`,
          kind: "checkin",
          occurredAt: "2025-10-01T18:00:00.000Z",
          actor,
          beerId: beerIds[0],
          beerName: expect.any(String),
          place: "Paris",
          rating: 4,
          photoId: first.photoId,
          isDiscovery: true,
          discoveryCount: null,
          reachedLevel: null,
          reachedTitle: null,
          reviewText: null,
        },
      ],
      total: 2,
      page: 1,
      size: FEED_PAGE_SIZE,
    });
    expect(feed.items[0].beerName).not.toBe("");
  });

  it("shows on each card the name of the beer of its own tasting", async () => {
    await follow(ALICE_USER_ID, BOB_USER_ID);
    const first = await drink(BOB_USER_ID, beerIds[0], "2025-10-01T18:00:00.000Z");
    const second = await drink(BOB_USER_ID, beerIds[1], "2025-10-02T18:00:00.000Z");
    const third = await drink(BOB_USER_ID, beerIds[2], "2025-10-03T18:00:00.000Z");

    const feed = await feedOf(ALICE_USER_ID);

    expect(new Set(beerNames.slice(0, 3)).size).toBe(3);
    expect(feed.items.map((item) => [item.id, item.beerId, item.beerName])).toEqual([
      [`checkin-${third.id}`, beerIds[2], beerNames[2]],
      [`checkin-${second.id}`, beerIds[1], beerNames[1]],
      [`checkin-${first.id}`, beerIds[0], beerNames[0]],
    ]);
  });

  it("shows the author with the level of today on every card", async () => {
    await follow(ALICE_USER_ID, BOB_USER_ID);
    await Promise.all(
      beerIds.map((beerId, index) => drink(BOB_USER_ID, beerId, new Date(FIRST_DAY + index * DAY_MS).toISOString())),
    );

    const feed = await feedOf(ALICE_USER_ID);

    expect(feed.items.filter((item) => item.kind === "checkin")).toHaveLength(BEERS_NEEDED);
    feed.items.forEach((item) => {
      expect(item.actor).toEqual({ id: BOB_USER_ID, displayName: "Bob", avatar: AvatarEnum.MALT, level: 2, title: "taster" });
    });
  });

  it("shows the level 2 card dated of the 5th discovery before the check-in of the same date, and no card for the level 1", async () => {
    await follow(ALICE_USER_ID, BOB_USER_ID);
    for (let index = 0; index < BEERS_NEEDED; index += 1) {
      await drink(BOB_USER_ID, beerIds[index], new Date(FIRST_DAY + index * DAY_MS).toISOString());
    }

    const feed = await feedOf(ALICE_USER_ID);

    const fifthDate = new Date(FIRST_DAY + (LEVEL_UP_THRESHOLD - 1) * DAY_MS).toISOString();
    const levelUps = feed.items.filter((item) => item.kind === "levelUp");
    expect(levelUps).toHaveLength(1);
    expect(levelUps[0]).toEqual({
      id: `levelUp-${BOB_USER_ID}-2`,
      kind: "levelUp",
      occurredAt: fifthDate,
      actor: { id: BOB_USER_ID, displayName: "Bob", avatar: AvatarEnum.MALT, level: 2, title: "taster" },
      beerId: null,
      beerName: null,
      place: null,
      rating: null,
      photoId: null,
      isDiscovery: false,
      discoveryCount: null,
      reachedLevel: 2,
      reachedTitle: "taster",
      reviewText: null,
    });
    expect(feed.items.slice(0, 2).map((item) => [item.kind, item.occurredAt])).toEqual([
      ["levelUp", fifthDate],
      ["checkin", fifthDate],
    ]);
    expect(feed.total).toBe(BEERS_NEEDED + 1);
  });

  it("shows one discoveries card for the 2 beers of the 12th and none for the single beer of the 13th, Paris time", async () => {
    await follow(ALICE_USER_ID, BOB_USER_ID);
    await drink(BOB_USER_ID, beerIds[0], "2025-10-12T16:00:00.000Z");
    await drink(BOB_USER_ID, beerIds[1], "2025-10-12T17:00:00.000Z");
    await drink(BOB_USER_ID, beerIds[2], "2025-10-13T16:00:00.000Z");

    const feed = await feedOf(ALICE_USER_ID);

    const discoveries = feed.items.filter((item) => item.kind === "discoveries");
    expect(discoveries).toEqual([
      {
        id: `discoveries-${BOB_USER_ID}-2025-10-12`,
        kind: "discoveries",
        occurredAt: "2025-10-12T17:00:00.000Z",
        actor: { id: BOB_USER_ID, displayName: "Bob", avatar: AvatarEnum.MALT, level: 1, title: "curious" },
        beerId: null,
        beerName: null,
        place: null,
        rating: null,
        photoId: null,
        isDiscovery: false,
        discoveryCount: 2,
        reachedLevel: null,
        reachedTitle: null,
        reviewText: null,
      },
    ]);
    expect(feed.total).toBe(4);
  });

  it("counts a tasting at 23:30 Paris and one at 00:30 Paris as two days: no discoveries card", async () => {
    await follow(ALICE_USER_ID, BOB_USER_ID);
    await drink(BOB_USER_ID, beerIds[0], "2025-10-12T21:30:00.000Z");
    await drink(BOB_USER_ID, beerIds[1], "2025-10-12T22:30:00.000Z");

    const feed = await feedOf(ALICE_USER_ID);

    expect(feed.items.map((item) => item.kind)).toEqual(["checkin", "checkin"]);
  });

  it("shows the seeded review of Bob on Pilsner Urquell with its beer, its rating and its text, dated of its last modification", async () => {
    const reviews = app.get(DataSource).getRepository(Review);
    await reviews.save(seededReviews);
    const beers = await request(app.getHttpServer())
      .get(`${BEERS_PATH}?q=Pilsner`)
      .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID));
    const pilsner = (beers.body as BeerPageDto).items.find((item) => item.name === PILSNER_NAME);
    expect(pilsner).toBeDefined();
    const bobsReview = seededReviews.find((row) => row.userId === BOB_USER_ID && row.beerId === pilsner?.id);
    expect(bobsReview).toBeDefined();
    const modifiedAt = new Date("2026-02-10T09:00:00.000Z");
    await reviews.update({ id: bobsReview?.id }, { updatedAt: modifiedAt });
    await follow(ALICE_USER_ID, BOB_USER_ID);

    const feed = await feedOf(ALICE_USER_ID);

    const card = feed.items.find((item) => item.id === `review-${bobsReview?.id}`);
    expect(card).toEqual({
      id: `review-${bobsReview?.id}`,
      kind: "review",
      occurredAt: modifiedAt.toISOString(),
      actor: { id: BOB_USER_ID, displayName: "Bob", avatar: AvatarEnum.MALT, level: 1, title: "curious" },
      beerId: pilsner?.id,
      beerName: PILSNER_NAME,
      place: null,
      rating: 4.5,
      photoId: null,
      isDiscovery: false,
      discoveryCount: null,
      reachedLevel: null,
      reachedTitle: null,
      reviewText: bobsReview?.text,
    });
    expect(bobsReview?.text).not.toBe("");
    expect(feed.total).toBe(seededReviews.filter((row) => row.userId === BOB_USER_ID).length);
  });

  it("shows no review card of a user the reader does not follow", async () => {
    await app.get(DataSource).getRepository(Review).save(seededReviews);
    await follow(ALICE_USER_ID, CAROL_USER_ID);

    const feed = await feedOf(ALICE_USER_ID);

    expect(feed.items.length).toBeGreaterThan(0);
    feed.items.forEach((item) => expect(item.actor.id).toBe(CAROL_USER_ID));
  });

  it("answers 200 with an empty list and a total of 0 when Alice follows nobody, even though she has tastings", async () => {
    await drink(ALICE_USER_ID, beerIds[0], "2025-10-01T18:00:00.000Z");
    await drink(BOB_USER_ID, beerIds[1], "2025-10-02T18:00:00.000Z");

    const response = await readFeed(ALICE_USER_ID);

    expect(response.status).toBe(HttpStatus.OK);
    expect(response.body).toEqual({ items: [], total: 0, page: 1, size: FEED_PAGE_SIZE });
  });

  it("never shows the tastings of Alice herself among the cards of the authors she follows", async () => {
    await follow(ALICE_USER_ID, BOB_USER_ID);
    await drink(ALICE_USER_ID, beerIds[0], "2025-10-09T18:00:00.000Z");
    const bobs = await drink(BOB_USER_ID, beerIds[0], "2025-10-01T18:00:00.000Z");

    const feed = await feedOf(ALICE_USER_ID);

    expect(feed.items.map((item) => item.id)).toEqual([`checkin-${bobs.id}`]);
    expect(feed.total).toBe(1);
  });

  it("keeps the feed empty when the followed author has no tasting yet", async () => {
    await follow(ALICE_USER_ID, CAROL_USER_ID);

    expect(await feedOf(ALICE_USER_ID)).toEqual({ items: [], total: 0, page: 1, size: FEED_PAGE_SIZE });
  });

  it("merges the cards of every followed author by date and stamps each author's own first tasting", async () => {
    await follow(ALICE_USER_ID, BOB_USER_ID);
    await follow(ALICE_USER_ID, CAROL_USER_ID);
    const bobFirst = await drink(BOB_USER_ID, beerIds[0], "2025-10-01T18:00:00.000Z");
    const carolFirst = await drink(CAROL_USER_ID, beerIds[0], "2025-10-03T18:00:00.000Z");
    const bobSecond = await drink(BOB_USER_ID, beerIds[0], "2025-10-04T18:00:00.000Z");

    const feed = await feedOf(ALICE_USER_ID);

    expect(feed.items.map((item) => [item.id, item.actor.id, item.isDiscovery])).toEqual([
      [`checkin-${bobSecond.id}`, BOB_USER_ID, false],
      [`checkin-${carolFirst.id}`, CAROL_USER_ID, true],
      [`checkin-${bobFirst.id}`, BOB_USER_ID, true],
    ]);
  });

  it("slices 25 tastings and the level-up card into pages of 20, 6 and 0 with the total 26 and no duplicate", async () => {
    await follow(ALICE_USER_ID, BOB_USER_ID);
    for (let index = 0; index < TOTAL_CARDS; index += 1) {
      await drink(BOB_USER_ID, beerIds[index % BEERS_NEEDED], new Date(FIRST_DAY + index * DAY_MS).toISOString());
    }

    const [first, second, third] = [await feedOf(ALICE_USER_ID, 1), await feedOf(ALICE_USER_ID, 2), await feedOf(ALICE_USER_ID, 3)];

    expect([first.items.length, second.items.length, third.items.length]).toEqual([20, 6, 0]);
    expect([first.total, second.total, third.total]).toEqual(Array(3).fill(TOTAL_CARDS_WITH_LEVEL_UP));
    expect([first.page, second.page, third.page]).toEqual([1, 2, 3]);
    expect([first.size, second.size, third.size]).toEqual([20, 20, 20]);
    const ids = [...first.items, ...second.items].map((item) => item.id);
    expect(new Set(ids).size).toBe(TOTAL_CARDS_WITH_LEVEL_UP);
    const dates = [...first.items, ...second.items].map((item) => item.occurredAt);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it.each([
    ["0", PAGE_MIN_MESSAGE],
    ["-1", PAGE_MIN_MESSAGE],
    ["abc", `${PAGE_MIN_MESSAGE}; ${PAGE_INTEGER_MESSAGE}`],
    ["1.5", PAGE_INTEGER_MESSAGE],
  ])("answers 400 with a message for the page %s", async (page, message) => {
    const response = await readFeed(ALICE_USER_ID, page);

    expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    expect(response.body).toEqual({ message });
  });

  it("drops the card of a tasting Bob deletes, and stamps the remaining tasting when the first one was deleted", async () => {
    await follow(ALICE_USER_ID, BOB_USER_ID);
    const first = await drink(BOB_USER_ID, beerIds[0], "2025-10-01T18:00:00.000Z");
    const second = await drink(BOB_USER_ID, beerIds[0], "2025-10-05T18:00:00.000Z");
    expect((await feedOf(ALICE_USER_ID)).items.map((item) => item.id)).toEqual([`checkin-${second.id}`, `checkin-${first.id}`]);

    const removed = await request(app.getHttpServer())
      .delete(`${CHECKINS_PATH}/${first.id}`)
      .set(USER_ID_HEADER_NAME, String(BOB_USER_ID));
    expect(removed.status).toBe(HttpStatus.NO_CONTENT);

    const feed = await feedOf(ALICE_USER_ID);
    expect(feed.items.map((item) => [item.id, item.isDiscovery])).toEqual([[`checkin-${second.id}`, true]]);
    expect(feed.total).toBe(1);
  });

  it("drops the discoveries and level-up cards of a deleted 5th discovery, and lowers the level of Bob", async () => {
    await follow(ALICE_USER_ID, BOB_USER_ID);
    for (let index = 0; index < BEERS_NEEDED - 1; index += 1) {
      await drink(BOB_USER_ID, beerIds[index], new Date(FIRST_DAY + index * DAY_MS).toISOString());
    }
    const lastDay = FIRST_DAY + (BEERS_NEEDED - 2) * DAY_MS;
    const fifth = await drink(BOB_USER_ID, beerIds[BEERS_NEEDED - 1], new Date(lastDay + HOUR_MS).toISOString());
    const before = await feedOf(ALICE_USER_ID);
    expect(before.items.filter((item) => item.kind !== "checkin").map((item) => item.id)).toEqual([
      `levelUp-${BOB_USER_ID}-2`,
      `discoveries-${BOB_USER_ID}-2025-10-04`,
    ]);

    const removed = await request(app.getHttpServer())
      .delete(`${CHECKINS_PATH}/${fifth.id}`)
      .set(USER_ID_HEADER_NAME, String(BOB_USER_ID));
    expect(removed.status).toBe(HttpStatus.NO_CONTENT);

    const after = await feedOf(ALICE_USER_ID);
    expect(after.items.map((item) => item.kind)).toEqual(["checkin", "checkin", "checkin", "checkin"]);
    expect(after.items[0].actor).toMatchObject({ level: 1, title: "curious" });
  });

  it("drops a card as soon as its tasting is deleted, even the most recent one", async () => {
    await follow(ALICE_USER_ID, BOB_USER_ID);
    const first = await drink(BOB_USER_ID, beerIds[0], "2025-10-01T18:00:00.000Z");
    const second = await drink(BOB_USER_ID, beerIds[0], "2025-10-05T18:00:00.000Z");

    const removed = await request(app.getHttpServer())
      .delete(`${CHECKINS_PATH}/${second.id}`)
      .set(USER_ID_HEADER_NAME, String(BOB_USER_ID));
    expect(removed.status).toBe(HttpStatus.NO_CONTENT);

    expect((await feedOf(ALICE_USER_ID)).items.map((item) => item.id)).toEqual([`checkin-${first.id}`]);
  });
});

describe("feed API with the demo activity", () => {
  let demoApp: INestApplication;

  const allCardsOfAlice = async (): Promise<FeedPageDto["items"]> => {
    const first = await request(demoApp.getHttpServer()).get(FEED_PATH).set(USER_ID_HEADER_NAME, String(ALICE_USER_ID));
    expect(first.status).toBe(HttpStatus.OK);
    const { total, size } = first.body as FeedPageDto;
    const pages = Math.ceil(total / size);
    const cards = [...(first.body as FeedPageDto).items];
    for (let page = 2; page <= pages; page += 1) {
      const next = await request(demoApp.getHttpServer())
        .get(`${FEED_PATH}?page=${page}`)
        .set(USER_ID_HEADER_NAME, String(ALICE_USER_ID));
      expect(next.status).toBe(HttpStatus.OK);
      cards.push(...(next.body as FeedPageDto).items);
    }
    return cards;
  };

  beforeAll(async () => {
    demoApp = await createTestApp([], { ...TEST_CONFIG, seedDemoActivity: true });
  });

  afterAll(async () => {
    await demoApp.close();
  });

  it.each([BOB_USER_ID, CAROL_USER_ID])(
    "shows in the feed of Alice a tasting, a daily discovery and a level-up of user %i",
    async (userId) => {
      const cards = (await allCardsOfAlice()).filter((card) => card.actor.id === userId);

      expect(cards.map((card) => card.kind)).toEqual(expect.arrayContaining(["checkin", "discoveries", "levelUp"]));
    },
  );

  it("only shows cards of the followed Bob and Carol, with every demo tasting", async () => {
    const cards = await allCardsOfAlice();

    expect(new Set(cards.map((card) => card.actor.id))).toEqual(new Set([BOB_USER_ID, CAROL_USER_ID]));
    expect(cards.filter((card) => card.kind === "checkin")).toHaveLength(DEMO_TASTING_COUNT);
  });
});
