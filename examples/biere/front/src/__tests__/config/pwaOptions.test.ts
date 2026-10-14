import { readFileSync } from "node:fs";
import path from "node:path";
import { isApiReadRequest, pwaOptions } from "@/config/pwaOptions";
import * as constants from "@/constants/serviceWorkerConstants";

const API_ORIGIN = "http://localhost:5090";

const buildContext = (method: string, href: string) => ({ url: new URL(href), request: new Request(href, { method }) });

const readJson = (relativePath: string) =>
  JSON.parse(readFileSync(path.resolve(process.cwd(), relativePath), "utf8"));

describe("vite-plugin-pwa dependency", () => {
  it("pins vite-plugin-pwa to the exact 1.3.0 in devDependencies", () => {
    expect(readJson("package.json").devDependencies["vite-plugin-pwa"]).toBe("1.3.0");
  });

  it("records vite-plugin-pwa 1.3.0 in the lockfile root and packages", () => {
    const lock = readJson("package-lock.json");

    expect(lock.packages[""].devDependencies["vite-plugin-pwa"]).toBe("1.3.0");
    expect(lock.packages["node_modules/vite-plugin-pwa"].version).toBe("1.3.0");
  });

  it("declares the virtual module types in tsconfig", () => {
    expect(readJson("tsconfig.json").compilerOptions.types).toContain("vite-plugin-pwa/client");
  });
});

describe("pwaOptions", () => {
  it("generates the service worker, with the manifest left to the static file", () => {
    expect(pwaOptions.strategies).toBe("generateSW");
    expect(pwaOptions.registerType).toBe("prompt");
    expect(pwaOptions.injectRegister).toBe(false);
    expect(pwaOptions.manifest).toBe(false);
  });

  it("keeps the service worker disabled in development", () => {
    expect(pwaOptions.devOptions).toEqual({ enabled: false });
  });

  it("precaches js, css, html, woff2, png and webmanifest files", () => {
    const globPatterns = pwaOptions.workbox?.globPatterns ?? [];
    const [pattern] = globPatterns;
    const extensions = /\{(.*)\}/.exec(pattern)?.[1].split(",");

    expect(globPatterns).toHaveLength(1);
    expect(extensions).toEqual(expect.arrayContaining(["js", "css", "html", "woff2", "png", "webmanifest"]));
  });

  it("falls back to index.html, cleans old caches and claims clients", () => {
    expect(pwaOptions.workbox).toMatchObject({
      navigateFallback: "index.html",
      cleanupOutdatedCaches: true,
      clientsClaim: true,
    });
  });

  it("carries no hex colour", () => {
    expect(JSON.stringify(pwaOptions)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe("serviceWorkerConstants", () => {
  it("names the API cache and bounds its freshness, size and statuses", () => {

    expect(constants.API_CACHE_NAME).toBe("mousse-api");
    expect(constants.API_NETWORK_TIMEOUT_SECONDS).toBe(4);
    expect(constants.API_CACHE_MAX_AGE_SECONDS).toBe(604800);
    expect(constants.API_CACHE_MAX_ENTRIES).toBe(200);
    expect(constants.API_CACHEABLE_STATUSES).toEqual([200]);
  });
});

describe("isApiReadRequest", () => {
  it.each([
    "/api/v1/beers?page=0",
    "/api/v1/me/dex",
    "/api/v1/beers/1",
    "/api/v1/venues?q=a",
    "/api/v1/me/feed?page=0",
  ])("caches the GET read %s", (route) => {
    expect(isApiReadRequest(buildContext("GET", `${API_ORIGIN}${route}`))).toBe(true);
  });

  it.each([
    ["POST", "/api/v1/checkins"],
    ["PUT", "/api/v1/beers/1/reviews/me"],
    ["PATCH", "/api/v1/me/collections/1"],
    ["DELETE", "/api/v1/me/collections/1"],
  ])("never caches a %s write to %s", (method, route) => {
    expect(isApiReadRequest(buildContext(method, `${API_ORIGIN}${route}`))).toBe(false);
  });

  it("never caches a photo", () => {
    const photo = `${API_ORIGIN}/api/v1/photos/3f2b8c1e-6a4d-4c1b-9d57-0e1f2a3b4c5d`;

    expect(isApiReadRequest(buildContext("GET", photo))).toBe(false);
  });

  it("never caches a map tile or a shell script", () => {
    expect(isApiReadRequest(buildContext("GET", "https://tile.openstreetmap.org/12/2048/1362.png"))).toBe(false);
    expect(isApiReadRequest(buildContext("GET", "http://localhost:5174/assets/index-abc123.js"))).toBe(false);
  });

  it("answers the same once serialised and rebuilt from its source", () => {
    const rebuilt = new Function(`return (${isApiReadRequest.toString()})`)() as typeof isApiReadRequest;
    const contexts = [
      buildContext("GET", `${API_ORIGIN}/api/v1/beers/1`),
      buildContext("POST", `${API_ORIGIN}/api/v1/checkins`),
      buildContext("GET", `${API_ORIGIN}/api/v1/photos/abc`),
      buildContext("GET", "http://localhost:5174/assets/index-abc123.js"),
    ];

    expect(contexts.map((context) => rebuilt(context))).toEqual(contexts.map((context) => isApiReadRequest(context)));
  });
});

describe("pwaOptions runtime caching", () => {
  it("serves API reads network first with the constants as options", () => {
    const runtimeCaching = pwaOptions.workbox?.runtimeCaching ?? [];

    expect(runtimeCaching).toEqual([
      {
        urlPattern: isApiReadRequest,
        handler: "NetworkFirst",
        method: "GET",
        options: {
          cacheName: constants.API_CACHE_NAME,
          networkTimeoutSeconds: constants.API_NETWORK_TIMEOUT_SECONDS,
          expiration: {
            maxEntries: constants.API_CACHE_MAX_ENTRIES,
            maxAgeSeconds: constants.API_CACHE_MAX_AGE_SECONDS,
          },
          cacheableResponse: { statuses: [...constants.API_CACHEABLE_STATUSES] },
        },
      },
    ]);
  });

  it("caches only a 200 response, never a 404 or a 500", () => {
    const [{ options }] = pwaOptions.workbox?.runtimeCaching ?? [];

    expect(options?.cacheableResponse?.statuses).toEqual([200]);
  });

  it("expires a copy after 7 days and gives the network 4 seconds", () => {
    const [{ options }] = pwaOptions.workbox?.runtimeCaching ?? [];

    expect(options?.expiration?.maxAgeSeconds).toBe(7 * 24 * 60 * 60);
    expect(options?.networkTimeoutSeconds).toBe(4);
  });
});
