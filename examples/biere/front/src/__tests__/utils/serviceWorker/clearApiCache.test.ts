import { API_CACHE_NAME } from "@/constants/serviceWorkerConstants";
import { clearApiCache } from "@/utils/serviceWorker/clearApiCache";

describe("clearApiCache", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("deletes the API cache once", async () => {
    const cacheStorage = { delete: vi.fn(async () => true) };

    await clearApiCache(cacheStorage);

    expect(API_CACHE_NAME).toBe("mousse-api");
    expect(cacheStorage.delete).toHaveBeenCalledTimes(1);
    expect(cacheStorage.delete).toHaveBeenCalledWith("mousse-api");
  });

  it("resolves without a cache storage", async () => {

    await expect(clearApiCache(undefined)).resolves.toBeUndefined();
  });

  it("resolves without arguments when the environment has no caches", async () => {

    await expect(clearApiCache()).resolves.toBeUndefined();
  });

  it("uses the global caches when the environment has one", async () => {
    const globalCaches = { delete: vi.fn(async () => true) };
    vi.stubGlobal("caches", globalCaches);

    await clearApiCache();

    expect(globalCaches.delete).toHaveBeenCalledWith("mousse-api");
  });

  it("swallows a failing delete", async () => {
    const cacheStorage = { delete: vi.fn(async () => Promise.reject(new Error("quota"))) };

    await expect(clearApiCache(cacheStorage)).resolves.toBeUndefined();
    expect(cacheStorage.delete).toHaveBeenCalledTimes(1);
  });
});
