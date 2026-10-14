import type { FeedItemDto } from "@/types/dtos/feed/feedItemDto";
import { FeedItemKindEnum } from "@/types/enums/feed/feedItemKindEnum";
import { AvatarEnum } from "@/types/enums/user/avatarEnum";
import { LevelTitleEnum } from "@/types/enums/user/levelTitleEnum";
import { feedItemDtoToModel } from "@/types/mappers/feed/feedItemMapper";

const itemDto: FeedItemDto = {
  id: "checkin-12",
  kind: "checkin",
  occurredAt: "2026-10-12T12:00:00.000Z",
  actor: { id: 3, displayName: "Carol", avatar: "glass", level: 4, title: "finePalate" },
  beerId: 7,
  beerName: "Duvel",
  place: "Le Bar",
  rating: 4.5,
  photoId: "0b6f1c1e-6a34-4c8e-9f3a-2f6d7b1c9a10",
  isDiscovery: true,
  discoveryCount: null,
  reachedLevel: null,
  reachedTitle: null,
  reviewText: null,
};

describe("feedItemDtoToModel", () => {
  it("maps a full checkin with its actor", () => {
    expect(feedItemDtoToModel(itemDto)).toEqual({
      ...itemDto,
      kind: FeedItemKindEnum.CHECKIN,
      actor: { id: 3, displayName: "Carol", avatar: AvatarEnum.GLASS, level: 4, title: LevelTitleEnum.FINE_PALATE },
    });
  });

  it("returns null for an unknown kind", () => {
    expect(feedItemDtoToModel({ ...itemDto, kind: "poke" })).toBeNull();
  });

  it("maps a level up with its reached title", () => {
    const model = feedItemDtoToModel({
      ...itemDto,
      id: "levelUp-3-4",
      kind: "levelUp",
      beerId: null,
      beerName: null,
      place: null,
      rating: null,
      photoId: null,
      isDiscovery: false,
      reachedLevel: 4,
      reachedTitle: "finePalate",
    });

    expect(model?.kind).toBe(FeedItemKindEnum.LEVEL_UP);
    expect(model?.reachedLevel).toBe(4);
    expect(model?.reachedTitle).toBe(LevelTitleEnum.FINE_PALATE);
  });

  it("drops an unknown reached title to null", () => {
    expect(feedItemDtoToModel({ ...itemDto, reachedLevel: 3, reachedTitle: "legend" })?.reachedTitle).toBeNull();
  });

  it("resolves every missing nullable to null and a missing isDiscovery to false", () => {
    const sparse = {
      id: "discoveries-3-2026-10-12",
      kind: "discoveries",
      occurredAt: "2026-10-12T12:00:00.000Z",
      actor: itemDto.actor,
    } as unknown as FeedItemDto;

    expect(feedItemDtoToModel(sparse)).toMatchObject({
      kind: FeedItemKindEnum.DISCOVERIES,
      beerId: null,
      beerName: null,
      place: null,
      rating: null,
      photoId: null,
      isDiscovery: false,
      discoveryCount: null,
      reachedLevel: null,
      reachedTitle: null,
      reviewText: null,
    });
  });

  it("keeps falsy but valid values: rating 0, empty review text, empty place", () => {
    const model = feedItemDtoToModel({
      ...itemDto,
      kind: "review",
      rating: 0,
      reviewText: "",
      place: "",
      beerId: 0,
      discoveryCount: 0,
    });

    expect(model?.rating).toBe(0);
    expect(model?.reviewText).toBe("");
    expect(model?.place).toBe("");
    expect(model?.beerId).toBe(0);
    expect(model?.discoveryCount).toBe(0);
  });
});
