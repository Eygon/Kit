import type { WishlistItemDto } from "@/modules/pokedex/dtos/wishlist-item.dto";
import type { WishlistItemRecordDto } from "@/modules/tastings/dtos/wishlist-item-record.dto";

export const toWishlistItemDto = (record: WishlistItemRecordDto, beerName: string): WishlistItemDto => ({
  beerId: record.beerId,
  beerName,
  addedAt: record.addedAt,
});
