// Chaque code de reponse du contrat, pour les operations que l US livre, est-il asserte par un test
// ajoute par l US ? Banc Miro : 2 FIXED sur 8 de la nuit etaient un 204 « liste vide » du contrat
// que le worker n avait pas teste ; le reviewer Opus l a vu, aucun outil ne le disait.
//
// Usage : node contract-cover.mjs --contract <contracts/x.yaml> --tasks <tasks.md> --us <USn>
//                                 --range <base>..<head> | --range <base> (arbre de travail + non suivis)
//                                 [--root <depot>]
// Operations retenues : celles dont une tache de l US cite le chemin, ou le verbe et le dernier
// segment litteral (« POST import », « GET {id:int}/export », « PATCH ... item »).
// Sortie : OK <code> / MANQUE <code> (operations) ; code 1 si un MANQUE.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const TEST = /(^|\/)(__tests__|tests?)\/|\.(?:test|spec)\.[jt]sx?$|Tests?\.cs$/;
const NAMES = {
  200: ["OK", "Ok\\(", "EnsureSuccessStatusCode", "IsSuccessStatusCode"], 201: ["Created"], 204: ["NoContent"], 400: ["BadRequest"], 401: ["Unauthorized"],
  403: ["Forbidden"], 404: ["NotFound"], 409: ["Conflict"], 413: ["RequestEntityTooLarge", "PayloadTooLarge"],
  422: ["UnprocessableEntity"],
};
const norm = (p) => ("/" + p.replace(/^\/+/, "")).replace(/\{(\w+)(?::[^}]+)?\}/g, "{$1}").replace(/\/+$/, "");

// Lecture minimale d un OpenAPI YAML : chemin -> methode -> codes de reponse.
export function contractOps(yaml) {
  const ops = [];
  let inPaths = false, path = null, method = null, inResponses = false, pathIndent = -1;
  for (const raw of yaml.split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    const indent = raw.length - raw.trimStart().length;
    const line = raw.trim();
    if (indent === 0) { inPaths = line === "paths:"; path = null; continue; }
    if (!inPaths) continue;
    const pm = /^['"]?(\/[^'":]*(?::[^'"]*)?)['"]?:\s*$/.exec(line);
    if (pm && (pathIndent < 0 || indent <= pathIndent)) { pathIndent = indent; path = pm[1]; method = null; continue; }
    const mm = /^(get|post|put|patch|delete):\s*$/i.exec(line);
    if (path && mm && indent > pathIndent) { method = mm[1].toUpperCase(); inResponses = false; ops.push({ path: norm(path), method, codes: [] }); continue; }
    if (method && /^responses:\s*$/.test(line)) { inResponses = true; continue; }
    const cm = /^['"]?([1-5]\d\d)['"]?:/.exec(line);
    if (inResponses && cm) ops[ops.length - 1].codes.push(Number(cm[1]));
  }
  return ops;
}

export function storyLines(tasksText, us) {
  const out = [];
  let inUs = false;
  for (const line of tasksText.split(/\r?\n/)) {
    const h = /^##\s*\[(US\d+)\]/.exec(line);
    if (h) { inUs = h[1] === us; continue; }
    const m = /^- \[[ xX]\]\s+T\d+\s+\[(US\d+)\]/.exec(line);
    if (m && (m[1] === us || inUs)) out.push(line);
  }
  return out;
}

// Une operation concerne l US si une de ses taches cite son chemin complet, ou son verbe ET le dernier
// segment litteral du chemin sur la meme ligne (« POST import », « PATCH ... a locked item »).
export function opsOfStory(ops, lines) {
  const text = lines.map((l) => l.replace(/\{(\w+)(?::[^}]+)?\}/g, "{$1}"));
  return ops.filter((op) => {
    if (text.some((l) => l.includes(op.path) || l.includes(op.path.replace(/^\/api\/v\d+/, "")))) return true;
    const lit = op.path.split("/").filter((x) => x && !x.startsWith("{")).pop() || "";
    const stem = lit.replace(/s$/, "");
    const rx = new RegExp(`\\b${op.method}\\b[^—]*\\b${stem}s?\\b|\\b${stem}s?\\b[^—]*\\b${op.method}\\b`);
    return lit && text.some((l) => rx.test(l));
  });
}

const VERB = {
  GET: /GetAsync|GetFromJsonAsync|\bGet_?\w*\(|\bGet_|["'`]GET["'`]|\.get\(/,
  POST: /PostAsync|PostAsJsonAsync|\bPost_|["'`]POST["'`]|\.post\(/,
  PUT: /PutAsync|PutAsJsonAsync|\bPut_|["'`]PUT["'`]|\.put\(/,
  PATCH: /PatchAsync|PatchAsJsonAsync|\bPatch_|["'`]PATCH["'`]|\.patch\(/,
  DELETE: /DeleteAsync|\bDelete_|["'`]DELETE["'`]|\.delete\(/,
};
const codeRx = (code) => new RegExp(`\\b${code}\\b|\\b(?:${(NAMES[code] || []).join("|") || "__none__"})\\b`);

// Un test (bloc entre deux [Test] / it( / test() couvre (methode, code) s il cite les deux.
export function contractCover(ops, testText, requireResource = false) {
  const chunks = testText.split(/\n(?=\+?\s*(?:\[Test|\[TestCase|\[Fact|\[Theory|it\(|test\(|it\.each))/);
  const rows = [];
  for (const op of ops) {
    for (const code of op.codes) {
      const rx = codeRx(code);
      const lit = (op.path.split("/").filter((x) => x && !x.startsWith("{")).pop() || "").replace(/s$/, "");
      const resRx = new RegExp(lit, "i");
      const ok = chunks.some((c) => {
        if (!(rx.test(c) || (code === 200 && op.method === "GET" && /GetFromJsonAsync/.test(c)))) return false;
        if (requireResource && lit && !resRx.test(c)) return false;
        // Verbe lu d abord dans le NOM du test (`Get_Returns204_...`, `AllVerbs_...`) : un test de
        // DELETE appelle souvent GetAsync pour verifier l effet, il ne couvre pas le GET.
        const name = (/(?:Task|void)\s+(\w+)\s*\(/.exec(c) || /(?:it|test)\(\s*["'`]([^"'`]+)/.exec(c) || [])[1] || "";
        if (/^AllVerbs/i.test(name)) return true;
        const named = /^(Get|Post|Put|Patch|Delete)(?:_|[A-Z])/.exec(name);
        if (named) return named[1].toUpperCase() === op.method;
        return (VERB[op.method] || /./).test(c);
      });
      rows.push({ code, where: [`${op.method} ${op.path}`], ok });
    }
  }
  return rows;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  const root = resolve(opt("--root") || ".");
  const [contract, tasks, us, range] = ["--contract", "--tasks", "--us", "--range"].map(opt);
  if (!contract || !tasks || !us || !range) {
    console.error("usage : node contract-cover.mjs --contract <x.yaml> --tasks <tasks.md> --us <USn> --range <base>..<head>|<base> [--root <depot>]");
    process.exit(2);
  }
  const git = (...a) => execFileSync("git", ["-C", root, ...a], { encoding: "utf8", maxBuffer: 64 << 20 });
  // Lignes ajoutees aux fichiers de test de l US (et fichiers de test non suivis en mode arbre).
  const files = git("diff", "--name-only", range).split(/\r?\n/).filter((f) => f && TEST.test(f));
  let testText = files.length ? git("diff", "-U0", range, "--", ...files).split(/\r?\n/).filter((l) => l.startsWith("+")).join("\n") : "";
  if (!range.includes(".."))
    for (const f of git("ls-files", "--others", "--exclude-standard").split(/\r?\n/).filter((x) => x && TEST.test(x))) testText += "\n" + readFileSync(resolve(root, f), "utf8");
  const ops = opsOfStory(contractOps(readFileSync(resolve(contract), "utf8")), storyLines(readFileSync(resolve(tasks), "utf8"), us));
  if (!ops.length) { console.log(`NONE aucune operation du contrat citee par les taches de ${us}`); process.exit(0); }
  const rows = contractCover(ops, testText);
  // Un MANQUE deja couvert par un test existant (comportement anterieur que le contrat redit) n est
  // pas bloquant : DEJA (banc Miro F11 : PATCH 403 teste par une feature precedente).
  if (rows.some((r) => !r.ok)) {
    const head = range.includes("..") ? range.split("..").pop() || "HEAD" : null;
    const all = (head ? git("ls-tree", "-r", "--name-only", head) : git("ls-files")).split(/\r?\n/).filter((f) => f && TEST.test(f) && /\.(?:[cm]?[jt]sx?|cs)$/.test(f));
    let full = "";
    for (const f of all) { try { full += "\n" + (head ? git("show", `${head}:${f}`) : readFileSync(resolve(root, f), "utf8")); } catch {} }
    const again = contractCover(ops.map((op) => ({ ...op, codes: op.codes.filter((c) => rows.some((r) => !r.ok && r.code === c && r.where[0] === `${op.method} ${op.path}`)) })), full, true);
    for (const a of again) if (a.ok) rows.find((r) => r.code === a.code && r.where[0] === a.where[0]).deja = true;
  }
  for (const r of rows) console.log(`${r.ok ? "OK" : r.deja ? "DEJA" : "MANQUE"} ${r.code} (${r.where.join(", ")})${r.deja ? " : couvert par un test existant, pas par l US" : ""}`);
  process.exit(rows.some((r) => !r.ok && !r.deja) ? 1 : 0);
}
