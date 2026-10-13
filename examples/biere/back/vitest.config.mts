import { fileURLToPath } from "node:url";
import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: "es6" },
      jsc: {
        target: "es2023",
        keepClassNames: true,
        parser: { syntax: "typescript", decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true, useDefineForClassFields: true },
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  oxc: false,
  test: {
    environment: "node",
    include: ["src/__tests__/**/*.test.ts"],
    coverage: {
      enabled: true,
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/__tests__/**"],
    },
  },
});
