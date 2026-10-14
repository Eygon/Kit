export const badgeKeys = {
  all: () => ["badges"] as const,
  me: () => [...badgeKeys.all(), "me"] as const,
};
