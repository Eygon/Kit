import type { FeedItemDto } from "@/types/dtos/feed/feedItemDto";
import { feedPageDtoToModel } from "@/types/mappers/feed/feedPageMapper";

const itemDto = (id: string, kind = "checkin"): FeedItemDto => ({
  id,
  kind,
  occurredAt: "2026-10-12T12:00:00.000Z",
  actor: { id: 3, displayName: "Carol", avatar: "glass", level: 4, title: "finePalate" },
  beerId: 7,
  beerName: "Duvel",
  place: null,
  rating: null,
  photoId: null,
  isDiscovery: false,
  discoveryCount: null,
  reachedLevel: null,
  reachedTitle: null,
  reviewText: null,
});

describe("feedPageDtoToModel", () => {
  it("maps every item in order and keeps total, page and size", () => {
    const page = feedPageDtoToModel({ items: [itemDto("checkin-2"), itemDto("review-1", "review")], total: 9, page: 2, size: 20 });

    expect(page.items.map((item) => item.id)).toEqual(["checkin-2", "review-1"]);
    expect(page.total).toBe(9);
    expect(page.page).toBe(2);
    expect(page.size).toBe(20);
  });

  it("ignores the cards of an unknown kind and keeps the others", () => {
    const page = feedPageDtoToModel({
      items: [itemDto("checkin-2"), itemDto("poke-1", "poke"), itemDto("checkin-1")],
      total: 3,
      page: 1,
      size: 20,
    });

    expect(page.items.map((item) => item.id)).toEqual(["checkin-2", "checkin-1"]);
  });

  it("maps an empty page", () => {
    expect(feedPageDtoToModel({ items: [], total: 0, page: 1, size: 20 })).toEqual({ items: [], total: 0, page: 1, size: 20 });
  });
});
