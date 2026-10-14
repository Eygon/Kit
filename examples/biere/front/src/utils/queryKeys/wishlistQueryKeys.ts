export const wishlistKeys = {
  all: () => ["wishlist"] as const,
  me: () => [...wishlistKeys.all(), "me"] as const,
};
