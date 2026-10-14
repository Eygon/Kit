#!/bin/bash
# Construit la demo hebergeable de Mousse (artefact) : le VRAI front (branche dev) + le faux serveur d'API navigateur (mock-api.js).
# Sortie : /tmp/mousse-artifact/{index.html,app.js,app.css,mock-api.js,seed-data.js}
# Usage : bash build-artifact.sh [depot front, defaut /home/user/biere/front]
set -euo pipefail
FRONT="${1:-/home/user/biere/front}"; HERE="$(cd "$(dirname "$0")" && pwd)"; W=/tmp/mousse-build; OUT=/tmp/mousse-artifact
rm -rf "$W" "$OUT"; mkdir -p "$W" "$OUT"
git -C "$FRONT" archive dev | tar -x -C "$W"
ln -s "$FRONT/node_modules" "$W/node_modules"
cd "$W"
python3 - <<'PY'
import re
p='src/main.tsx'; s=open(p).read()
s=s.replace('import { BrowserRouter } from "react-router";','import { MemoryRouter } from "react-router";').replace('<BrowserRouter>','<MemoryRouter>').replace('</BrowserRouter>','</MemoryRouter>')
s=re.sub(r'\n  void registerServiceWorker\(\{.*?\}\);\n','\n',s,flags=re.S)
s=s.replace('import { registerServiceWorker } from "@/utils/serviceWorker/registerServiceWorker";\n','')
open(p,'w').write(s)
p='src/utils/apiURL/apiURL.ts'; s=open(p).read()
s=s.replace('export const PHOTO_BY_ID = (photoId: string) => `${API_V1()}/photos/${photoId}`;','export const PHOTO_BY_ID = (photoId: string) =>\n  (globalThis as unknown as { __mockPhotos?: Map<string, string> }).__mockPhotos?.get(photoId) ?? `${API_V1()}/photos/${photoId}`;')
open(p,'w').write(s)
open('vite.config.ts','w').write('''import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: {
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: { output: { inlineDynamicImports: true, entryFileNames: "app.js", assetFileNames: "app[extname]" } },
  },
});
''')
PY
grep -q MemoryRouter src/main.tsx && ! grep -q registerServiceWorker src/main.tsx
VITE_API_URL=https://mousse.mock node node_modules/vite/bin/vite.js build 2>&1 | tail -6
cp dist/app.js "$OUT/app.js"; cp dist/app.css "$OUT/app.css"
[ -f "$HERE/mock-api.js" ] && cp "$HERE/mock-api.js" "$OUT/mock-api.js" && cp "$HERE/seed-data.js" "$OUT/seed-data.js"
cp "$HERE/artifact-index.html" "$OUT/index.html"
ls -la "$OUT"
