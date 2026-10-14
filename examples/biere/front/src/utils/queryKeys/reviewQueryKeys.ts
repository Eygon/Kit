export const reviewKeys = {
  all: () => ["reviews"] as const,
  list: (beerId: number) => [...reviewKeys.all(), "list", beerId] as const,
};
