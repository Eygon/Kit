import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/__tests__/**/*.test.ts"],
    coverage: { enabled: true, provider: "v8", reporter: ["text-summary"], include: ["src/**/*.ts"], exclude: ["src/__tests__/**", "src/main.ts"] },
  },
});
