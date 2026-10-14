import WishlistService from "@/api/wishlist/wishlistService";

export const fetchWishlist = () => WishlistService.getAll();

export const addToWishlist = (beerId: number) => WishlistService.add(beerId);

export const removeFromWishlist = (beerId: number) => WishlistService.remove(beerId);
