// Carte AC -> test d une User Story, verifiee avant le commit DONE. Le worker ecrit pour chaque
// scenario d acceptation de l US le test qui rougit s il est viole ; le script verifie que chaque
// AC a au moins un test, que ce test existe vraiment (titre dans un it/test du fichier) et que le
// fichier est touche par l US. Banc Haiku 5.5 (TK-2, 2 runs) : code et E2E verts, mais la revue
// Opus a du ajouter les tests de page de l AC6 (annulation) et de l echec serveur, deux fois sur
// deux ; le worker croyait l AC couvert par un test d utilitaire. Ecrire la carte le lui montre.
//
// Usage : node ac-map.mjs --spec <spec.md> --us US1 --map <US1-acmap.json> [--root <slot>] [--range <base>..HEAD]
//   US1-acmap.json : [{ "ac": 1, "file": "src/__tests__/...test.tsx", "test": "<titre ou debut du titre>", "level": "page|unit" }]
// Sortie : une ligne par AC (OK / MANQUE / INTROUVABLE / HORS-US), exit 1 si une ligne n est pas OK.
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { extractAcceptance } from "./spec-ac.mjs";

// Numeros des scenarios d acceptation de l US (« 1. **Given** ... »).
export function acNumbers(specText, us) {
  const block = extractAcceptance(specText, us);
  if (!block) return [];
  return [...String(block).matchAll(/^\s*(\d+)\.\s+/gm)].map((m) => Number(m[1]));
}

// Titres des tests d un fichier : it("..."), test("..."), it.each(...)("...").
export function testTitles(source) {
  const out = [];
  for (const m of source.matchAll(/\b(?:it|test)(?:\.each\([\s\S]*?\))?\(\s*(["'`])((?:\\.|(?!\1).)*)\1/g)) out.push(m[2]);
  return out;
}

export function checkMap({ acs, map, readFile, touched }) {
  const lines = [];
  for (const n of acs) {
    const entries = map.filter((e) => Number(e.ac) === n);
    if (!entries.length) { lines.push({ ac: n, status: "MANQUE", detail: "aucun test declare" }); continue; }
    let ok = null, last = "";
    for (const e of entries) {
      const src = readFile(e.file);
      if (src == null) { last = `fichier absent : ${e.file}`; continue; }
      if (touched && !touched.has(e.file)) { last = `fichier non touche par l US : ${e.file}`; continue; }
      const t = String(e.test || "").trim().toLowerCase();
      const found = t && testTitles(src).some((x) => x.toLowerCase().includes(t));
      if (found) { ok = e; break; }
      last = `test « ${e.test} » introuvable dans ${e.file}`;
    }
    if (ok) lines.push({ ac: n, status: "OK", detail: `${ok.file} — ${ok.test}${ok.level ? ` (${ok.level})` : ""}` });
    else lines.push({ ac: n, status: /non touche/.test(last) ? "HORS-US" : "INTROUVABLE", detail: last });
  }
  const extra = map.filter((e) => !acs.includes(Number(e.ac))).map((e) => e.ac);
  return { lines, extra, ok: lines.every((l) => l.status === "OK") };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const a = process.argv.slice(2);
  const o = (n) => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : undefined; };
  const root = o("--root") || process.cwd();
  const acs = acNumbers(readFileSync(o("--spec"), "utf8"), o("--us"));
  if (!acs.length) { console.error("aucun scenario d acceptation trouve pour " + o("--us")); process.exit(2); }
  let map;
  try { map = JSON.parse(readFileSync(o("--map"), "utf8")); } catch (e) { console.error("carte illisible : " + e.message); process.exit(2); }
  let touched = null;
  if (o("--range")) {
    // + fichiers non suivis : avant le commit DONE, un test cree n est pas encore dans `git diff HEAD`.
    const git = (args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).split("\n").filter(Boolean);
    try { touched = new Set([...git(["diff", "--name-only", o("--range")]), ...git(["ls-files", "--others", "--exclude-standard"])]); } catch { touched = null; }
  }
  const readFile = (f) => { const p = join(root, f); return existsSync(p) ? readFileSync(p, "utf8") : null; };
  const r = checkMap({ acs, map, readFile, touched });
  for (const l of r.lines) console.log(`AC${l.ac} ${l.status} ${l.detail}`);
  if (r.extra.length) console.log(`(AC hors US ignores : ${r.extra.join(", ")})`);
  console.log(r.ok ? `ac-map OK : ${acs.length}/${acs.length} AC relies a un test` : `ac-map KO : ${r.lines.filter((l) => l.status !== "OK").length} AC sans test verifiable`);
  process.exit(r.ok ? 0 : 1);
}
