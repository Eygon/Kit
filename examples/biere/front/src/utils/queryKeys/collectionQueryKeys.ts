export const collectionKeys = {
  all: () => ["collections"] as const,
  list: (userId: number) => [...collectionKeys.all(), "list", userId] as const,
  detail: (userId: number, collectionId: number) => [...collectionKeys.all(), "detail", userId, collectionId] as const,
  mine: (beerId: number | null) => [...collectionKeys.all(), "mine", beerId] as const,
  wishlist: (userId: number) => [...collectionKeys.all(), "wishlist", userId] as const,
};
