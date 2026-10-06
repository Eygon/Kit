import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  plugins: [viteSingleFile()],
  build: { target: "es2022", assetsInlineLimit: 100_000_000, chunkSizeWarningLimit: 4000 },
});
