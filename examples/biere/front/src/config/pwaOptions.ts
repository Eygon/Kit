import type { VitePWAOptions } from "vite-plugin-pwa";
import {
  API_CACHE_MAX_AGE_SECONDS,
  API_CACHE_MAX_ENTRIES,
  API_CACHE_NAME,
  API_CACHEABLE_STATUSES,
  API_NETWORK_TIMEOUT_SECONDS,
} from "../constants/serviceWorkerConstants";

export const isApiReadRequest = ({ url, request }: { url: URL; request: Request }) =>
  request.method === "GET" && url.pathname.startsWith("/api/v1/") && !url.pathname.startsWith("/api/v1/photos/");

export const pwaOptions: Partial<VitePWAOptions> = {
  strategies: "generateSW",
  registerType: "prompt",
  injectRegister: false,
  manifest: false,
  devOptions: { enabled: false },
  workbox: {
    globPatterns: ["**/*.{js,css,html,woff2,png,webmanifest}"],
    navigateFallback: "index.html",
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    runtimeCaching: [
      {
        urlPattern: isApiReadRequest,
        handler: "NetworkFirst",
        method: "GET",
        options: {
          cacheName: API_CACHE_NAME,
          networkTimeoutSeconds: API_NETWORK_TIMEOUT_SECONDS,
          expiration: { maxEntries: API_CACHE_MAX_ENTRIES, maxAgeSeconds: API_CACHE_MAX_AGE_SECONDS },
          cacheableResponse: { statuses: [...API_CACHEABLE_STATUSES] },
        },
      },
    ],
  },
};
