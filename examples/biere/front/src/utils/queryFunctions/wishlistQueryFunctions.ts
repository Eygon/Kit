import WishlistService from "@/api/wishlist/wishlistService";

export const addToWishlist = (beerId: number) => WishlistService.add(beerId);

export const removeFromWishlist = (beerId: number) => WishlistService.remove(beerId);
