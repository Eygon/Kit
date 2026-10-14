export const breweryKeys = {
  all: () => ["breweries"] as const,
  list: () => [...breweryKeys.all(), "list"] as const,
};
