import { buildAddWishlistItemDto, wishlistItemDtoToModel } from "@/types/mappers/wishlist/wishlistItemMapper";

describe("wishlistItemDtoToModel", () => {
  it("maps every field of the dto", () => {
    expect(wishlistItemDtoToModel({ beerId: 7, beerName: "Chimay Rouge", addedAt: "2026-10-12T12:00:00.000Z" })).toEqual({
      beerId: 7,
      beerName: "Chimay Rouge",
      addedAt: "2026-10-12T12:00:00.000Z",
    });
  });
});

describe("buildAddWishlistItemDto", () => {
  it("wraps the beer id in the request body", () => {
    expect(buildAddWishlistItemDto(42)).toEqual({ beerId: 42 });
  });
});
