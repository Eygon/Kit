export const dexKeys = {
  all: () => ["dex"] as const,
  me: () => [...dexKeys.all(), "me"] as const,
};
