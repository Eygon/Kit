import { describe, expect, it } from "vitest";
import { buildFeedEvents, sortFeedEvents } from "@/modules/social/feed-events";
import type { FeedEventDto } from "@/modules/social/dtos/feed-event.dto";
import { FEED_KIND_ORDER, FeedItemKindEnum } from "@/modules/social/enums/feed-item-kind.enum";
import { LevelTitleEnum } from "@/modules/social/enums/level-title.enum";
import type { ReviewRecordDto } from "@/modules/beers/dtos/review-record.dto";
import type { CheckinRecordDto } from "@/modules/tastings/dtos/checkin-record.dto";
import { BeerFormatEnum } from "@/modules/beers/enums/beer-format.enum";

const ALICE = 1;
const BOB = 2;
const CAROL = 3;
const ORVAL = 10;
const DUVEL = 11;

const checkin = (id: number, userId: number, beerId: number, drankAt: string, overrides: Partial<CheckinRecordDto> = {}): CheckinRecordDto => ({
  id,
  userId,
  beerId,
  drankAt,
  place: "Paris",
  venueId: null,
  rating: 4,
  aromas: [],
  format: BeerFormatEnum.BOTTLE,
  price: null,
  comment: "",
  photoId: null,
  ...overrides,
});

const review = (id: number, userId: number, beerId: number, updatedAt: string, overrides: Partial<ReviewRecordDto> = {}): ReviewRecordDto => ({
  id,
  userId,
  beerId,
  rating: 4.5,
  text: "Pils de reference",
  sweetness: 2,
  acidity: null,
  body: null,
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt,
  ...overrides,
});

const discoveriesOnDistinctDays = (userId: number, count: number, firstBeerId = 100): CheckinRecordDto[] =>
  Array.from({ length: count }, (_, index) =>
    checkin(index + 1, userId, firstBeerId + index, new Date(Date.parse("2026-02-01T10:00:00.000Z") + index * 86_400_000).toISOString()),
  );

const ofKind = (events: readonly FeedEventDto[], kind: FeedItemKindEnum): FeedEventDto[] => events.filter((card) => card.kind === kind);

const event = (id: string, kind: FeedItemKindEnum, occurredAt: string): FeedEventDto => ({
  id,
  kind,
  userId: BOB,
  occurredAt,
  beerId: null,
  place: null,
  rating: null,
  photoId: null,
  isDiscovery: false,
  discoveryCount: null,
  reachedLevel: null,
  reachedTitle: null,
  reviewText: null,
});

describe("FeedItemKindEnum", () => {
  it("declares the four kinds of the contract", () => {
    expect(Object.values(FeedItemKindEnum)).toEqual(["checkin", "discoveries", "levelUp", "review"]);
  });

  it("ranks level-ups before discoveries before reviews before check-ins", () => {
    expect(FEED_KIND_ORDER).toEqual([
      FeedItemKindEnum.LEVEL_UP,
      FeedItemKindEnum.DISCOVERIES,
      FeedItemKindEnum.REVIEW,
      FeedItemKindEnum.CHECKIN,
    ]);
  });
});

describe("buildFeedEvents", () => {
  it("returns no event for no check-in", () => {
    expect(buildFeedEvents([], [])).toEqual([]);
  });

  it("builds one check-in card per tasting with its identifier, date, beer, place, rating and photo", () => {
    const photoId = "6f1c9c52-3a52-4a73-a1b4-2c2d9b1e0a11";

    const events = buildFeedEvents([checkin(7, BOB, ORVAL, "2026-03-14T18:30:00.000Z", { place: "Lyon", rating: 3.5, photoId })], []);

    expect(events).toStrictEqual([
      {
        id: "checkin-7",
        kind: FeedItemKindEnum.CHECKIN,
        userId: BOB,
        occurredAt: "2026-03-14T18:30:00.000Z",
        beerId: ORVAL,
        place: "Lyon",
        rating: 3.5,
        photoId,
        isDiscovery: true,
        discoveryCount: null,
        reachedLevel: null,
        reachedTitle: null,
        reviewText: null,
      },
    ]);
  });

  it("keeps a null rating and a null photo as they are", () => {
    const [card] = buildFeedEvents([checkin(1, BOB, ORVAL, "2026-03-14T18:30:00.000Z", { rating: null, photoId: null })], []);

    expect(card.rating).toBeNull();
    expect(card.photoId).toBeNull();
  });

  it("stamps only the first tasting of a beer by a user, in date order whatever the input order", () => {
    const events = buildFeedEvents([
      checkin(3, BOB, ORVAL, "2026-03-20T10:00:00.000Z"),
      checkin(1, BOB, ORVAL, "2026-03-10T10:00:00.000Z"),
      checkin(2, BOB, ORVAL, "2026-03-15T10:00:00.000Z"),
    ], []);

    expect(events.map((card) => [card.id, card.isDiscovery])).toEqual([
      ["checkin-1", true],
      ["checkin-2", false],
      ["checkin-3", false],
    ]);
  });

  it("breaks a tie on the date by the lowest id", () => {
    const events = buildFeedEvents([
      checkin(9, BOB, ORVAL, "2026-03-10T10:00:00.000Z"),
      checkin(4, BOB, ORVAL, "2026-03-10T10:00:00.000Z"),
    ], []);

    expect(events.map((card) => [card.id, card.isDiscovery])).toEqual([
      ["checkin-4", true],
      ["checkin-9", false],
    ]);
  });

  it("stamps the first tasting of each beer and of each user separately", () => {
    const events = buildFeedEvents([
      checkin(1, BOB, ORVAL, "2026-03-01T10:00:00.000Z"),
      checkin(2, CAROL, ORVAL, "2026-03-02T10:00:00.000Z"),
      checkin(3, BOB, DUVEL, "2026-03-03T10:00:00.000Z"),
      checkin(4, BOB, ORVAL, "2026-03-04T10:00:00.000Z"),
      checkin(5, CAROL, ORVAL, "2026-03-05T10:00:00.000Z"),
      checkin(6, ALICE, ORVAL, "2026-03-06T10:00:00.000Z"),
    ], []);

    expect(events.map((card) => [card.id, card.isDiscovery])).toEqual([
      ["checkin-1", true],
      ["checkin-2", true],
      ["checkin-3", true],
      ["checkin-4", false],
      ["checkin-5", false],
      ["checkin-6", true],
    ]);
  });
});

describe("buildFeedEvents reviews", () => {
  it("builds one review card per review with its identifier, beer, rating and text, dated of the last modification", () => {
    const events = buildFeedEvents([], [review(5, BOB, ORVAL, "2026-03-14T18:30:00.000Z", { rating: 4.5, text: "Amertume noble" })]);

    expect(events).toStrictEqual([
      {
        id: "review-5",
        kind: FeedItemKindEnum.REVIEW,
        userId: BOB,
        occurredAt: "2026-03-14T18:30:00.000Z",
        beerId: ORVAL,
        place: null,
        rating: 4.5,
        photoId: null,
        isDiscovery: false,
        discoveryCount: null,
        reachedLevel: null,
        reachedTitle: null,
        reviewText: "Amertume noble",
      },
    ]);
  });

  it("keeps an empty review text as an empty text", () => {
    const [card] = buildFeedEvents([], [review(5, BOB, ORVAL, "2026-03-14T18:30:00.000Z", { text: "" })]);

    expect(card.reviewText).toBe("");
  });

  it("builds a card for every review of every author", () => {
    const events = buildFeedEvents([], [review(1, BOB, ORVAL, "2026-03-01T10:00:00.000Z"), review(2, CAROL, ORVAL, "2026-03-02T10:00:00.000Z")]);

    expect(events.map((card) => [card.id, card.userId])).toEqual([
      ["review-1", BOB],
      ["review-2", CAROL],
    ]);
  });
});

describe("buildFeedEvents discoveries", () => {
  it("builds a card for 2 discoveries on the same Paris day and none for a single discovery the next day", () => {
    const events = buildFeedEvents(
      [
        checkin(1, BOB, ORVAL, "2026-10-12T10:00:00.000Z"),
        checkin(2, BOB, DUVEL, "2026-10-12T16:00:00.000Z"),
        checkin(3, BOB, 12, "2026-10-13T10:00:00.000Z"),
      ],
      [],
    );

    expect(ofKind(events, FeedItemKindEnum.DISCOVERIES)).toStrictEqual([
      {
        id: "discoveries-2-2026-10-12",
        kind: FeedItemKindEnum.DISCOVERIES,
        userId: BOB,
        occurredAt: "2026-10-12T16:00:00.000Z",
        beerId: null,
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
  });

  it("counts a tasting at 23:30 Paris and one at 00:30 Paris as two different days, so no card", () => {
    const events = buildFeedEvents(
      [checkin(1, BOB, ORVAL, "2026-10-12T21:30:00.000Z"), checkin(2, BOB, DUVEL, "2026-10-12T22:30:00.000Z")],
      [],
    );

    expect(ofKind(events, FeedItemKindEnum.DISCOVERIES)).toEqual([]);
  });

  it("groups two tastings on both sides of UTC midnight when they share the same Paris day", () => {
    const events = buildFeedEvents(
      [checkin(1, BOB, ORVAL, "2026-10-11T23:30:00.000Z"), checkin(2, BOB, DUVEL, "2026-10-12T00:30:00.000Z")],
      [],
    );

    expect(ofKind(events, FeedItemKindEnum.DISCOVERIES).map((card) => [card.id, card.discoveryCount, card.occurredAt])).toEqual([
      ["discoveries-2-2026-10-12", 2, "2026-10-12T00:30:00.000Z"],
    ]);
  });

  it("counts all the discoveries of the day and dates the card of the last one, whatever the input order", () => {
    const events = buildFeedEvents(
      [
        checkin(3, BOB, 12, "2026-10-12T18:00:00.000Z"),
        checkin(1, BOB, ORVAL, "2026-10-12T08:00:00.000Z"),
        checkin(2, BOB, DUVEL, "2026-10-12T12:00:00.000Z"),
      ],
      [],
    );

    const [card] = ofKind(events, FeedItemKindEnum.DISCOVERIES);
    expect(card.discoveryCount).toBe(3);
    expect(card.occurredAt).toBe("2026-10-12T18:00:00.000Z");
  });

  it("does not count a repeated tasting of a beer already discovered", () => {
    const events = buildFeedEvents(
      [
        checkin(1, BOB, ORVAL, "2026-10-10T10:00:00.000Z"),
        checkin(2, BOB, ORVAL, "2026-10-12T10:00:00.000Z"),
        checkin(3, BOB, DUVEL, "2026-10-12T12:00:00.000Z"),
        checkin(4, BOB, DUVEL, "2026-10-12T14:00:00.000Z"),
      ],
      [],
    );

    expect(ofKind(events, FeedItemKindEnum.DISCOVERIES)).toEqual([]);
  });

  it("builds one card per author and per day, never mixing two authors", () => {
    const events = buildFeedEvents(
      [
        checkin(1, BOB, ORVAL, "2026-10-12T10:00:00.000Z"),
        checkin(2, CAROL, DUVEL, "2026-10-12T11:00:00.000Z"),
        checkin(3, CAROL, ORVAL, "2026-10-12T12:00:00.000Z"),
        checkin(4, BOB, DUVEL, "2026-10-13T10:00:00.000Z"),
        checkin(5, BOB, 12, "2026-10-13T11:00:00.000Z"),
      ],
      [],
    );

    expect(ofKind(events, FeedItemKindEnum.DISCOVERIES).map((card) => [card.id, card.discoveryCount])).toEqual([
      ["discoveries-3-2026-10-12", 2],
      ["discoveries-2-2026-10-13", 2],
    ]);
  });
});

describe("buildFeedEvents level-ups", () => {
  it("builds the level 2 card dated of the 5th discovery and none for the first four", () => {
    const four = buildFeedEvents(discoveriesOnDistinctDays(BOB, 4), []);
    const five = buildFeedEvents(discoveriesOnDistinctDays(BOB, 5), []);

    expect(ofKind(four, FeedItemKindEnum.LEVEL_UP)).toEqual([]);
    expect(ofKind(five, FeedItemKindEnum.LEVEL_UP)).toStrictEqual([
      {
        id: "levelUp-2-2",
        kind: FeedItemKindEnum.LEVEL_UP,
        userId: BOB,
        occurredAt: "2026-02-05T10:00:00.000Z",
        beerId: null,
        place: null,
        rating: null,
        photoId: null,
        isDiscovery: false,
        discoveryCount: null,
        reachedLevel: 2,
        reachedTitle: LevelTitleEnum.TASTER,
        reviewText: null,
      },
    ]);
  });

  it("never builds a card for the level 1", () => {
    const events = buildFeedEvents(discoveriesOnDistinctDays(BOB, 1), []);

    expect(ofKind(events, FeedItemKindEnum.LEVEL_UP)).toEqual([]);
  });

  it("builds a card for every threshold reached: level 2 at the 5th and level 3 at the 15th discovery", () => {
    const events = buildFeedEvents(discoveriesOnDistinctDays(BOB, 16), []);

    expect(ofKind(events, FeedItemKindEnum.LEVEL_UP).map((card) => [card.id, card.occurredAt, card.reachedLevel, card.reachedTitle])).toEqual([
      ["levelUp-2-2", "2026-02-05T10:00:00.000Z", 2, LevelTitleEnum.TASTER],
      ["levelUp-2-3", "2026-02-15T10:00:00.000Z", 3, LevelTitleEnum.HOP_HEAD],
    ]);
  });

  it("builds a card at each of the thresholds 30, 60 and 100, dated of the discovery that reaches it, and none before", () => {
    const beforeThirty = buildFeedEvents(discoveriesOnDistinctDays(BOB, 29), []);
    const events = buildFeedEvents(discoveriesOnDistinctDays(BOB, 101), []);

    expect(ofKind(beforeThirty, FeedItemKindEnum.LEVEL_UP).map((card) => card.id)).toEqual(["levelUp-2-2", "levelUp-2-3"]);
    expect(ofKind(events, FeedItemKindEnum.LEVEL_UP).map((card) => [card.id, card.occurredAt, card.reachedLevel, card.reachedTitle])).toEqual([
      ["levelUp-2-2", "2026-02-05T10:00:00.000Z", 2, LevelTitleEnum.TASTER],
      ["levelUp-2-3", "2026-02-15T10:00:00.000Z", 3, LevelTitleEnum.HOP_HEAD],
      ["levelUp-2-4", "2026-03-02T10:00:00.000Z", 4, LevelTitleEnum.FINE_PALATE],
      ["levelUp-2-5", "2026-04-01T10:00:00.000Z", 5, LevelTitleEnum.MASTER_BREWER],
      ["levelUp-2-6", "2026-05-11T10:00:00.000Z", 6, LevelTitleEnum.FOAM_LEGEND],
    ]);
  });

  it("builds one card per level when several thresholds are crossed the same day", () => {
    const sameDay = Array.from({ length: 16 }, (_, index) => checkin(index + 1, BOB, 100 + index, new Date(Date.parse("2026-02-01T08:00:00.000Z") + index * 60_000).toISOString()));

    const events = buildFeedEvents(sameDay, []);

    expect(ofKind(events, FeedItemKindEnum.LEVEL_UP).map((card) => card.id)).toEqual(["levelUp-2-2", "levelUp-2-3"]);
    expect(ofKind(events, FeedItemKindEnum.DISCOVERIES).map((card) => card.discoveryCount)).toEqual([16]);
  });

  it("counts the discoveries, not the tastings: a repeated tasting does not reach the level", () => {
    const events = buildFeedEvents(
      [...discoveriesOnDistinctDays(BOB, 4), checkin(50, BOB, 100, "2026-03-01T10:00:00.000Z"), checkin(51, BOB, 101, "2026-03-02T10:00:00.000Z")],
      [],
    );

    expect(ofKind(events, FeedItemKindEnum.LEVEL_UP)).toEqual([]);
  });

  it("counts the discoveries of each author on their own", () => {
    const events = buildFeedEvents([...discoveriesOnDistinctDays(BOB, 3), ...discoveriesOnDistinctDays(CAROL, 2, 200).map((card) => ({ ...card, id: card.id + 10 }))], []);

    expect(ofKind(events, FeedItemKindEnum.LEVEL_UP)).toEqual([]);
  });

  it("finds the 5th discovery by the lowest id when two tastings happen on the same instant", () => {
    const events = buildFeedEvents(
      [...discoveriesOnDistinctDays(BOB, 3), checkin(10, BOB, 110, "2026-02-10T10:00:00.000Z"), checkin(11, BOB, 111, "2026-02-10T10:00:00.000Z")],
      [],
    );

    expect(ofKind(events, FeedItemKindEnum.LEVEL_UP).map((card) => card.id)).toEqual(["levelUp-2-2"]);
  });
});

describe("buildFeedEvents sorted", () => {
  it("puts the level-up before the discoveries, the review and the check-in dated of the same instant", () => {
    const sameInstant = "2026-02-20T10:00:00.000Z";
    const checkins = [
      ...discoveriesOnDistinctDays(BOB, 3),
      checkin(20, BOB, 120, "2026-02-20T08:00:00.000Z"),
      checkin(21, BOB, 121, sameInstant),
    ];

    const sorted = sortFeedEvents(buildFeedEvents(checkins, [review(9, BOB, ORVAL, sameInstant)]));

    expect(sorted.slice(0, 4).map((card) => card.id)).toEqual([
      "levelUp-2-2",
      "discoveries-2-2026-02-20",
      "review-9",
      "checkin-21",
    ]);
  });
});

describe("sortFeedEvents", () => {
  it("puts the most recent card first", () => {
    const sorted = sortFeedEvents([
      event("checkin-1", FeedItemKindEnum.CHECKIN, "2026-03-01T10:00:00.000Z"),
      event("checkin-2", FeedItemKindEnum.CHECKIN, "2026-03-03T10:00:00.000Z"),
      event("checkin-3", FeedItemKindEnum.CHECKIN, "2026-03-02T10:00:00.000Z"),
    ]);

    expect(sorted.map((card) => card.id)).toEqual(["checkin-2", "checkin-3", "checkin-1"]);
  });

  it("orders cards of the same instant by kind: level-up, discoveries, review, check-in", () => {
    const sameInstant = "2026-03-01T10:00:00.000Z";

    const sorted = sortFeedEvents([
      event("checkin-9", FeedItemKindEnum.CHECKIN, sameInstant),
      event("review-9", FeedItemKindEnum.REVIEW, sameInstant),
      event("discoveries-2-2026-03-01", FeedItemKindEnum.DISCOVERIES, sameInstant),
      event("levelUp-2-2", FeedItemKindEnum.LEVEL_UP, sameInstant),
    ]);

    expect(sorted.map((card) => card.kind)).toEqual([
      FeedItemKindEnum.LEVEL_UP,
      FeedItemKindEnum.DISCOVERIES,
      FeedItemKindEnum.REVIEW,
      FeedItemKindEnum.CHECKIN,
    ]);
  });

  it("orders cards of the same instant and kind by identifier descending, numbers compared as numbers", () => {
    const sameInstant = "2026-03-01T10:00:00.000Z";

    const sorted = sortFeedEvents([
      event("checkin-9", FeedItemKindEnum.CHECKIN, sameInstant),
      event("checkin-10", FeedItemKindEnum.CHECKIN, sameInstant),
      event("checkin-2", FeedItemKindEnum.CHECKIN, sameInstant),
    ]);

    expect(sorted.map((card) => card.id)).toEqual(["checkin-10", "checkin-9", "checkin-2"]);
  });

  it("lets the date win over the kind", () => {
    const sorted = sortFeedEvents([
      event("levelUp-2-2", FeedItemKindEnum.LEVEL_UP, "2026-03-01T10:00:00.000Z"),
      event("checkin-1", FeedItemKindEnum.CHECKIN, "2026-03-02T10:00:00.000Z"),
    ]);

    expect(sorted.map((card) => card.id)).toEqual(["checkin-1", "levelUp-2-2"]);
  });

  it("does not modify the list it receives", () => {
    const events = [
      event("checkin-1", FeedItemKindEnum.CHECKIN, "2026-03-01T10:00:00.000Z"),
      event("checkin-2", FeedItemKindEnum.CHECKIN, "2026-03-02T10:00:00.000Z"),
    ];

    sortFeedEvents(events);

    expect(events.map((card) => card.id)).toEqual(["checkin-1", "checkin-2"]);
  });

  it("carries the other kinds' fields untouched", () => {
    const levelUp: FeedEventDto = {
      ...event("levelUp-2-2", FeedItemKindEnum.LEVEL_UP, "2026-03-01T10:00:00.000Z"),
      reachedLevel: 2,
      reachedTitle: LevelTitleEnum.TASTER,
    };

    expect(sortFeedEvents([levelUp])).toStrictEqual([levelUp]);
  });
});
