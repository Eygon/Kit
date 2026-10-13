import type { AddWishlistItemDto } from "@/types/dtos/wishlist/addWishlistItemDto";
import type { WishlistItemDto } from "@/types/dtos/wishlist/wishlistItemDto";
import type { WishlistItem } from "@/types/models/wishlist/wishlistItem";

export const wishlistItemDtoToModel = (dto: WishlistItemDto): WishlistItem => ({
  beerId: dto.beerId,
  beerName: dto.beerName,
  addedAt: dto.addedAt,
});

export const buildAddWishlistItemDto = (beerId: number): AddWishlistItemDto => ({ beerId });
