import type { WishlistItemRecordDto } from "@/modules/tastings/dtos/wishlist-item-record.dto";
import type { WishlistItem } from "@/modules/tastings/entities/wishlist-item.entity";

export const toWishlistItemRecordDto = (entity: WishlistItem): WishlistItemRecordDto => ({
  beerId: entity.beerId,
  addedAt: entity.addedAt.toISOString(),
});
