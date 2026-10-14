import { httpClient } from "@/api/httpClient";
import { HttpError } from "@/api/httpError";
import type { WishlistItemDto } from "@/types/dtos/wishlist/wishlistItemDto";
import { buildAddWishlistItemDto, wishlistItemDtoToModel } from "@/types/mappers/wishlist/wishlistItemMapper";
import type { WishlistItem } from "@/types/models/wishlist/wishlistItem";
import { ME_WISHLIST, ME_WISHLIST_ITEM } from "@/utils/apiURL/apiURL";
import { DisplayError } from "@/utils/displayError/displayError";

export default class WishlistService {
  static async getAll(): Promise<WishlistItem[]> {
    const response = await httpClient.get<WishlistItemDto[]>(ME_WISHLIST());
    if (response.data === null) return [];
    return response.data.map(wishlistItemDtoToModel);
  }

  static async add(beerId: number): Promise<WishlistItem> {
    try {
      const response = await httpClient.post<WishlistItemDto>(ME_WISHLIST(), buildAddWishlistItemDto(beerId));
      if (response.data === null) throw new HttpError(response.status, "Empty wishlist item");
      return wishlistItemDtoToModel(response.data);
    } catch (error) {
      DisplayError(error);
      throw error;
    }
  }

  static async remove(beerId: number): Promise<void> {
    try {
      await httpClient.delete(ME_WISHLIST_ITEM(beerId));
    } catch (error) {
      DisplayError(error);
      throw error;
    }
  }
}
