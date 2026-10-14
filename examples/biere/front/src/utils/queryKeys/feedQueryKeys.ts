export const feedKeys = {
  all: () => ["feed"] as const,
  list: () => [...feedKeys.all(), "list"] as const,
};
