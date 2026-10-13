import { describe, expect, it } from "vitest";
import type { WishlistItem } from "@/modules/tastings/entities/wishlist-item.entity";
import { toWishlistItemRecordDto } from "@/modules/tastings/mappers/wishlist-item-record.mapper";

describe("toWishlistItemRecordDto", () => {
  it("maps the beer id and the ISO date and leaks no other column", () => {
    const entity: WishlistItem = { id: 9, userId: 1, beerId: 12, addedAt: new Date("2026-03-14T18:30:00.000Z") };

    expect(toWishlistItemRecordDto(entity)).toStrictEqual({ beerId: 12, addedAt: "2026-03-14T18:30:00.000Z" });
  });
});
