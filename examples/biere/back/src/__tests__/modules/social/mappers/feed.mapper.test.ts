import { describe, expect, it } from "vitest";
import type { FeedActorDto } from "@/modules/social/dtos/feed-actor.dto";
import type { FeedEventDto } from "@/modules/social/dtos/feed-event.dto";
import type { FeedItemDto } from "@/modules/social/dtos/feed-item.dto";
import { FeedItemKindEnum } from "@/modules/social/enums/feed-item-kind.enum";
import { LevelTitleEnum } from "@/modules/social/enums/level-title.enum";
import { toLevel } from "@/modules/social/levels";
import { toFeedActorDto, toFeedItemDto, toFeedPageDto } from "@/modules/social/mappers/feed.mapper";
import { AvatarEnum } from "@/modules/users/enums/avatar.enum";

const PHOTO_ID = "6f1c9c52-3a52-4a73-a1b4-2c2d9b1e0a11";

const BOB_USER = { id: 2, displayName: "Bob", avatarColor: "#10B981", avatar: AvatarEnum.MALT };

const BOB_ACTOR: FeedActorDto = {
  id: 2,
  displayName: "Bob",
  avatar: AvatarEnum.MALT,
  level: 2,
  title: LevelTitleEnum.TASTER,
};

const CHECKIN_EVENT: FeedEventDto = {
  id: "checkin-7",
  kind: FeedItemKindEnum.CHECKIN,
  userId: 2,
  occurredAt: "2026-03-14T18:30:00.000Z",
  beerId: 10,
  place: "Paris",
  rating: 4,
  photoId: PHOTO_ID,
  isDiscovery: true,
  discoveryCount: null,
  reachedLevel: null,
  reachedTitle: null,
  reviewText: null,
};

describe("toFeedActorDto", () => {
  it("keeps the identity of the user and the current level and title", () => {
    expect(toFeedActorDto(BOB_USER, toLevel(7))).toStrictEqual(BOB_ACTOR);
  });
});

describe("toFeedItemDto", () => {
  it("copies every field of the contract from a check-in event, with the actor and the beer name", () => {
    const item = toFeedItemDto(CHECKIN_EVENT, BOB_ACTOR, "Orval");

    expect(item).toStrictEqual<FeedItemDto>({
      id: "checkin-7",
      kind: FeedItemKindEnum.CHECKIN,
      occurredAt: "2026-03-14T18:30:00.000Z",
      actor: BOB_ACTOR,
      beerId: 10,
      beerName: "Orval",
      place: "Paris",
      rating: 4,
      photoId: PHOTO_ID,
      isDiscovery: true,
      discoveryCount: null,
      reachedLevel: null,
      reachedTitle: null,
      reviewText: null,
    });
  });

  it("copies the fields of the other kinds too, and does not leak the internal user id", () => {
    const event: FeedEventDto = {
      ...CHECKIN_EVENT,
      id: "levelUp-2-3",
      kind: FeedItemKindEnum.LEVEL_UP,
      beerId: null,
      place: null,
      rating: null,
      photoId: null,
      isDiscovery: false,
      discoveryCount: 3,
      reachedLevel: 3,
      reachedTitle: LevelTitleEnum.HOP_HEAD,
      reviewText: "Super",
    };

    const item = toFeedItemDto(event, BOB_ACTOR, null);

    expect(item).toStrictEqual({
      id: "levelUp-2-3",
      kind: FeedItemKindEnum.LEVEL_UP,
      occurredAt: "2026-03-14T18:30:00.000Z",
      actor: BOB_ACTOR,
      beerId: null,
      beerName: null,
      place: null,
      rating: null,
      photoId: null,
      isDiscovery: false,
      discoveryCount: 3,
      reachedLevel: 3,
      reachedTitle: LevelTitleEnum.HOP_HEAD,
      reviewText: "Super",
    });
    expect(item).not.toHaveProperty("userId");
  });
});

describe("toFeedPageDto", () => {
  it("wraps the items with the total, the page and the size", () => {
    const item = toFeedItemDto(CHECKIN_EVENT, BOB_ACTOR, "Orval");

    expect(toFeedPageDto([item], 25, 2, 20)).toStrictEqual({ items: [item], total: 25, page: 2, size: 20 });
  });

  it("keeps an empty page with its real total", () => {
    expect(toFeedPageDto([], 25, 3, 20)).toStrictEqual({ items: [], total: 25, page: 3, size: 20 });
  });
});
