import { describe, expect, it } from "vitest";
import { toWishlistItemDto } from "@/modules/pokedex/mappers/wishlist-item.mapper";

describe("toWishlistItemDto", () => {
  it("adds the beer name to the record", () => {
    expect(toWishlistItemDto({ beerId: 12, addedAt: "2026-03-14T18:30:00.000Z" }, "Orval")).toStrictEqual({
      beerId: 12,
      beerName: "Orval",
      addedAt: "2026-03-14T18:30:00.000Z",
    });
  });
});
