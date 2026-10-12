// Regenere tw.css (utilitaires Tailwind v4) depuis les sources d un slot : le front du banc est servi par Vite SANS le
// plugin Tailwind, tw.css est injecte par les E2E. Un tw.css perime ne contient pas les classes ajoutees par la feature
// (banc N3 : min-w-0 / break-words absents, le correctif de debordement semblait sans effet).
// Usage : node mktw.mjs <slot> [out=tw.css]
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
const slot = process.argv[2]; const out = process.argv[3] || new URL("tw.css", import.meta.url).pathname;
const req = createRequire(join(slot, "package.json"));
const { compile } = await import(pathToFileURL(join(dirname(req.resolve("tailwindcss/package.json")), "dist/lib.mjs")).href);
const files = []; (function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(tsx?|css|html)$/.test(f)) files.push(p); } })(join(slot, "src"));
const cand = new Set(); for (const f of files) for (const t of readFileSync(f, "utf8").split(/[\s"'`<>{}=;,]+/)) if (t && t.length < 120) cand.add(t);
const input = readFileSync(join(slot, "src/index.css"), "utf8").split("\n").filter((l) => !l.includes("septeo")).join("\n");
const compiler = await compile(input, { base: slot, loadStylesheet: async (id, base) => { const p = id === "tailwindcss" ? join(dirname(req.resolve("tailwindcss/package.json")), "index.css") : join(base, id); return { path: p, base: dirname(p), content: readFileSync(p, "utf8") }; } });
writeFileSync(out, compiler.build([...cand]));
console.log(`tw.css : ${files.length} fichiers, ${cand.size} candidats -> ${out}`);
