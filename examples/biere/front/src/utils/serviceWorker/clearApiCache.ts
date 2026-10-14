import { API_CACHE_NAME } from "@/constants/serviceWorkerConstants";

export const clearApiCache = async (
  cacheStorage: Pick<CacheStorage, "delete"> | undefined = typeof caches === "undefined" ? undefined : caches,
): Promise<void> => {
  try {
    await cacheStorage?.delete(API_CACHE_NAME);
  } catch {
    return;
  }
};
