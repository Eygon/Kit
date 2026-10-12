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

// Cas limites (« Edge Cases ») de l US : E1, E2... dans l ordre. Banc N1-N3 (12 oct) : la loupe tests a trouve a chaque US des cas
// limites de la spec sans test (ligature, retour d ecran, rechargement, saisie avec espaces, tableau vide) : 3 a 7 pistes par US.
// La section appartient a l US dont le titre la precede ; une section placee avant toute US ou apres la derniere vaut pour toutes.
export function edgeCases(specText, us) {
  const n = String(us).replace(/^US/i, "");
  const lines = String(specText).split(/\r?\n/);
  const storyRe = /^#{2,4}\s+(?:User Story\s+(\d+)\b|\[US(\d+)\])/i;
  let current = null; const sections = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(storyRe);
    if (m) { current = m[1] || m[2]; continue; }
    if (/^#{2,4}\s+Edge Cases/i.test(lines[i])) {
      const items = []; let j = i + 1;
      for (; j < lines.length && !/^#{1,4}\s/.test(lines[j]); j++) {
        if (/^\s*[-*]\s+/.test(lines[j])) items.push(lines[j].replace(/^\s*[-*]\s+/, "").trim());
        else if (items.length && lines[j].trim() && /^\s{2,}/.test(lines[j])) items[items.length - 1] += " " + lines[j].trim();
      }
      sections.push({ us: current, items });
    }
  }
  const mine = sections.filter((x) => x.us === n);
  const use = mine.length ? mine : sections.filter((x) => x.us === null || x.us === String(Math.max(...lines.map((l) => Number((l.match(storyRe) || [])[1] || (l.match(storyRe) || [])[2] || 0)))));
  return use.flatMap((x) => x.items).map((text, i) => ({ id: `E${i + 1}`, text }));
}

// Titres des tests d un fichier : it("..."), test("..."), it.each(...)("...") ; C# : le nom de la methode
// qui porte [Test], [TestCase(...)], [Fact] ou [Theory] (banc N1, back : l outil rendait INTROUVABLE pour les 8 AC).
export function testTitles(source) {
  const out = [];
  for (const m of source.matchAll(/\b(?:it|test)(?:\.each\([\s\S]*?\))?\(\s*(["'`])((?:\\.|(?!\1).)*)\1/g)) out.push(m[2]);
  for (const m of source.matchAll(/\[(?:Test|TestCase|TestCaseSource|Fact|Theory)\b[^\]]*\](?:\s*\[[^\]]*\])*\s*public\s+(?:async\s+)?(?:Task|void)\s+(\w+)/g)) out.push(m[1]);
  return out;
}

export function checkMap({ acs, map, readFile, touched }) {
  const lines = [];
  for (const n of acs) {
    const entries = map.filter((e) => String(e.ac) === String(n));
    if (!entries.length) { lines.push({ ac: n, status: "MANQUE", detail: "aucun test declare" }); continue; }
    const skip = entries.find((e) => e.skip);
    if (skip) {
      const why = String(skip.skip).trim();
      lines.push(why.length >= 15 ? { ac: n, status: "SKIP", detail: why } : { ac: n, status: "MANQUE", detail: "skip sans raison (15 caracteres minimum)" });
      continue;
    }
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
  const extra = map.filter((e) => !acs.map(String).includes(String(e.ac))).map((e) => e.ac);
  return { lines, extra, ok: lines.every((l) => l.status === "OK" || l.status === "SKIP") };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const a = process.argv.slice(2);
  const o = (n) => { const i = a.indexOf(n); return i >= 0 ? a[i + 1] : undefined; };
  const root = o("--root") || process.cwd();
  const specText = readFileSync(o("--spec"), "utf8");
  const edges = a.includes("--no-edge") ? [] : edgeCases(specText, o("--us"));
  const acs = [...acNumbers(specText, o("--us")), ...edges.map((e) => e.id)];
  if (!acNumbers(specText, o("--us")).length) { console.error("aucun scenario d acceptation trouve pour " + o("--us")); process.exit(2); }
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
  for (const l of r.lines) console.log(`${typeof l.ac === "number" ? "AC" + l.ac : l.ac} ${l.status} ${l.detail}${typeof l.ac === "string" ? " | " + (edges.find((e) => e.id === l.ac)?.text || "").slice(0, 80) : ""}`);
  if (r.extra.length) console.log(`(AC hors US ignores : ${r.extra.join(", ")})`);
  const skips = r.lines.filter((l) => l.status === "SKIP").length;
console.log(r.ok ? `ac-map OK : ${acs.length}/${acs.length} AC et cas limites relies (${edges.length} cas limites, ${skips} ecartes avec raison : le relecteur les juge)` : `ac-map KO : ${r.lines.filter((l) => l.status !== "OK" && l.status !== "SKIP").length} AC ou cas limites sans test verifiable`);
  process.exit(r.ok ? 0 : 1);
}
