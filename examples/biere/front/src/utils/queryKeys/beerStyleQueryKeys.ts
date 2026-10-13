export const beerStyleKeys = {
  all: () => ["beer-styles"] as const,
  groups: () => [...beerStyleKeys.all(), "groups"] as const,
};
