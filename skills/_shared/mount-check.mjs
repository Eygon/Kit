// Controle de montage partage : un composant, un hook ou un service cree est-il utilise par du
// code de production ? Appele par le worker (auto-controle), le fix et le reviewer (check 10),
// pour qu ils jugent tous de la meme facon.
//
// Un grep du nom exporte ne suffit pas (revue du 2026-09-23 sur la 916) : il compte un
// `import type` depuis le module et un homonyme d une autre feature, et il rate
// `export default X`. Ici, un consommateur est un import de VALEUR dont le specifier se
// resout vers le fichier cree (relatif, alias tsconfig, import() dynamique, barrel), dont
// le binding sert hors de l import ; un hook doit en plus etre appele.
//
// Usage :
//   node mount-check.mjs [--root <depot>] [--tasks <tasks.md>] [--range <a>..<b>] [<fichier>...]
// Sortie : une ligne par fichier, MOUNTED / PLANNED / SKIP (types seuls) / UNMOUNTED ; code 1 si un UNMOUNTED.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve, relative, basename } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { mountKind } from "./audit-lint.mjs";

const SOURCE = /\.(?:ts|tsx|js|jsx)$/;
const TEST = /(^|\/)__tests__\/|\.(?:test|spec)\.[jt]sx?$/;
const EXTENSIONS = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js", "/index.jsx"];
const CS_MOUNT_NOTE = /(?:Mont[ée]e?s?\s+dans|Mounted\s+in)\s*:\s*`?([\w./@-]+\.cs)`?(?:\s*\((US\d+)\))?/i;
const MOUNT_NOTE = /(?:Mont[ée]e?s?\s+dans|Mounted\s+in)\s*:\s*`?([\w./@-]+\.(?:tsx?|jsx?))`?(?:\s*\((US\d+)\))?/i;

const slash = (p) => p.replace(/\\/g, "/");
const key = (p) => slash(resolve(p)).toLowerCase();

const readText = (p) => {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return null;
  }
};

const walk = (dir, out = []) => {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (SOURCE.test(e.name)) out.push(p);
  }
  return out;
};

// tsconfig peut porter des commentaires : ils sortent avant JSON.parse.
const readAliases = (root) => {
  const raw = readText(join(root, "tsconfig.json"));
  if (!raw) return [];
  const clean = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'])\/\/.*$/gm, "$1").replace(/,(\s*[}\]])/g, "$1");
  let paths = {};
  try {
    const cfg = JSON.parse(clean);
    paths = (cfg.compilerOptions && cfg.compilerOptions.paths) || {};
  } catch {
    return [];
  }
  return Object.entries(paths).map(([alias, targets]) => ({
    prefix: alias.replace(/\*$/, ""),
    wildcard: alias.endsWith("*"),
    target: String((targets || [])[0] || "").replace(/^\.\//, "").replace(/\*$/, ""),
  }));
};

const resolveSpecifier = (spec, fromFile, root, aliases) => {
  let base = null;
  if (spec.startsWith(".")) base = resolve(dirname(fromFile), spec);
  else {
    const alias = aliases.find((a) => (a.wildcard ? spec.startsWith(a.prefix) : spec === a.prefix));
    if (!alias) return null;
    base = join(root, alias.target, alias.wildcard ? spec.slice(alias.prefix.length) : "");
  }
  for (const ext of EXTENSIONS) {
    const candidate = `${base}${ext}`;
    if (existsSync(candidate) && statSync(candidate).isFile()) return key(candidate);
  }
  return null;
};

// Imports d un fichier : { spec, bindings, typeOnly, dynamic, reexport }.
const parseImports = (text) => {
  const out = [];
  // Clause sans guillemet ni point-virgule : un `import "x.css";` ne doit pas avaler l import suivant.
  const statics = /(?:^|[;\n])\s*import\s+(type\s+)?([^;"'`]*?)\s+from\s+["']([^"']+)["']/g;
  for (const m of text.matchAll(statics)) {
    const clause = m[2].trim();
    const bindings = [];
    let valueSpecifiers = 0;
    const named = clause.match(/\{([\s\S]*?)\}/);
    const head = clause.replace(/\{[\s\S]*?\}/, "").replace(/,/g, " ").trim();
    const ns = head.match(/\*\s+as\s+([A-Za-z_$][\w$]*)/);
    if (ns) {
      bindings.push(ns[1]);
      valueSpecifiers += 1;
    } else if (head) {
      bindings.push(head.split(/\s+/)[0]);
      valueSpecifiers += 1;
    }
    if (named) {
      for (const part of named[1].split(",").map((s) => s.trim()).filter(Boolean)) {
        const isType = /^type\s+/.test(part);
        const local = part.replace(/^type\s+/, "").split(/\s+as\s+/).pop().trim();
        if (!isType) {
          bindings.push(local);
          valueSpecifiers += 1;
        }
      }
    }
    out.push({ spec: m[3], bindings, typeOnly: Boolean(m[1]) || valueSpecifiers === 0, dynamic: false, reexport: false });
  }
  for (const m of text.matchAll(/import\(\s*(?:\/\*[\s\S]*?\*\/\s*)?["']([^"']+)["']\s*\)/g))
    out.push({ spec: m[1], bindings: [], typeOnly: false, dynamic: true, reexport: false });
  for (const m of text.matchAll(/export\s+(type\s+)?(?:\*(?:\s+as\s+[A-Za-z_$][\w$]*)?|\{[^}]*\})\s+from\s+["']([^"']+)["']/g))
    out.push({ spec: m[2], bindings: [], typeOnly: Boolean(m[1]), dynamic: false, reexport: true });
  return out;
};

// Le binding sert-il hors des lignes d import ? Pour un hook : est-il appele ?
const usedIn = (text, binding, mustCall) => {
  const body = text.replace(/(?:^|\n)\s*import\s+(?:type\s+)?[^;"'`]*?\s+from\s+["'][^"']+["'];?/g, "\n");
  const name = binding.replace(/[$]/g, "\\$");
  return mustCall ? new RegExp(`\\b${name}\\s*\\(`).test(body) : new RegExp(`\\b${name}\\b`).test(body);
};

const exportedNames = (text) => {
  const names = new Set();
  for (const m of text.matchAll(/export\s+(?:default\s+)?(?:async\s+)?(?:function\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of text.matchAll(/export\s+default\s+([A-Za-z_$][\w$]*)\s*;?\s*$/gm)) if (!["function", "class", "async"].includes(m[1])) names.add(m[1]);
  for (const m of text.matchAll(/export\s+\{([^}]*)\}(?!\s*from)/g))
    for (const part of m[1].split(",").map((s) => s.trim()).filter(Boolean)) names.add(part.split(/\s+as\s+/).pop().trim());
  return [...names];
};

export const checkMounts = ({ root, files, tasksText = null }) => {
  const aliases = readAliases(root);
  const sources = walk(join(root, "src")).filter((f) => !TEST.test(slash(relative(root, f))));
  // Texte lu une fois ; imports analyses seulement pour les fichiers qui citent le module.
  const texts = new Map();
  const textOf = (f) => {
    if (!texts.has(f)) texts.set(f, readText(f) || "");
    return texts.get(f);
  };
  // La cible est une cle en minuscules : le prefiltre compare en minuscules aussi.
  const lowers = new Map();
  const lowerOf = (f) => {
    if (!lowers.has(f)) lowers.set(f, textOf(f).toLowerCase());
    return lowers.get(f);
  };
  const parsed = new Map();
  const importsOf = (f) => {
    if (!parsed.has(f)) parsed.set(f, parseImports(textOf(f)));
    return parsed.get(f);
  };
  const taskLines = tasksText ? tasksText.split(/\r?\n/).filter((l) => /^\s*-\s*\[[ Xx]\]/.test(l)) : [];

  // Consommateurs de valeur d un module ; un barrel qui le re-exporte transmet ses propres
  // consommateurs (profondeur 3).
  const consumersOf = (target, isHook, depth = 0, seen = new Set()) => {
    if (depth > 3 || seen.has(target)) return [];
    seen.add(target);
    const found = [];
    const stem = basename(target).replace(/\.[^.]+$/, "");
    const hint = stem === "index" ? basename(dirname(target)) : stem;
    for (const f of sources) {
      if (key(f) === target) continue;
      if (!lowerOf(f).includes(hint)) continue;
      const text = textOf(f);
      for (const imp of importsOf(f)) {
        if (imp.typeOnly || resolveSpecifier(imp.spec, f, root, aliases) !== target) continue;
        const rel = slash(relative(root, f));
        if (imp.reexport) {
          for (const c of consumersOf(key(f), isHook, depth + 1, seen)) found.push({ ...c, via: `${rel} -> ${c.via}` });
          continue;
        }
        if (imp.dynamic) {
          found.push({ file: rel, via: "import()" });
          continue;
        }
        const used = imp.bindings.filter((b) => usedIn(text, b, isHook));
        if (used.length) found.push({ file: rel, via: used.join(",") });
      }
    }
    return found;
  };

  return files.map((file) => {
    const rel = slash(file);
    const abs = key(join(root, rel));
    const kind = mountKind(rel) || "module";
    const text = readText(join(root, rel));
    // Hors JS/TS (C#, SQL...) : le montage passe par la DI et la decouverte des controllers, et se
    // prouve par un test d integration, pas par un import (banc L : 4 faux UNMOUNTED sur du .cs).
    // Exception : une classe C# annotee `Monté dans: <x>.cs` doit etre citee par ce fichier (DI de
    // Program.cs, MapHub) ; sans annotation, SKIP comme avant (banc Miro F8 : hub et tracker).
    if (/\.cs$/.test(rel)) {
      const csNote = taskLines.map((l) => (l.includes(basename(rel)) && l.indexOf(basename(rel)) < l.search(/Mont[ée]e?s?\s+dans|Mounted\s+in/i)) ? CS_MOUNT_NOTE.exec(l) : null).find(Boolean);
      if (csNote && text !== null) {
        const cls = basename(rel, ".cs");
        const host = readText(join(root, csNote[1])) || "";
        if (new RegExp(`\\b${cls}\\b`).test(host)) return { file: rel, kind: "class", status: "MOUNTED", consumers: [{ file: csNote[1], via: "cite la classe" }] };
        if (csNote[2]) return { file: rel, kind: "class", status: "PLANNED", target: csNote[1], owner: csNote[2] };
        return { file: rel, kind: "class", status: "UNMOUNTED", reason: `${csNote[1]} ne cite pas ${cls} (enregistrement DI / MapHub / appel attendu)` };
      }
    }
    if (!SOURCE.test(rel)) return { file: rel, kind: "other", status: "SKIP", reason: "hors JS/TS : montage prouve par le test d integration de l US" };
    if (text === null) return { file: rel, kind, status: "UNMOUNTED", reason: "fichier absent" };
    // Point d entree (charge par index.html ou nomme main/index a la racine de src) : c est la
    // racine du montage, personne ne l importe (banc jeu : main.ts UNMOUNTED a chaque US).
    const html = readText(join(root, "index.html")) || "";
    if (/^src\/(?:main|index)\.[jt]sx?$/.test(rel) || html.includes(`/${rel}`) || html.includes(`"${rel}"`))
      return { file: rel, kind: "entry", status: "SKIP", reason: "point d entree, racine du montage" };
    // Un fichier qui n exporte que des types (props, DTO) n a rien a monter : les workers le
    // passaient en argument et recevaient un UNMOUNTED a justifier (banc, 3 workers sur 4).
    if (!mountKind(rel) && exportedNames(text).length === 0 && /\bexport\s+(?:type|interface)\b/.test(text))
      return { file: rel, kind: "type", status: "SKIP", reason: "types seulement, rien a monter" };
    const consumers = consumersOf(abs, kind === "hook");
    if (consumers.length) return { file: rel, kind, status: "MOUNTED", consumers };
    // La tache du fichier le cite AVANT toute note « Monte dans » : une autre tache qui le nomme
    // comme cible de montage (T016 « Monte dans: commentsPanel.tsx ») n est pas la sienne (banc Miro).
    const owns = (l, needle) => {
      const at = l.indexOf(needle);
      const note = l.search(/Mont[ée]e?s?\s+dans|Mounted\s+in/i);
      return at >= 0 && (note < 0 || at < note);
    };
    const line = taskLines.find((l) => owns(l, rel)) || taskLines.find((l) => owns(l, basename(rel)));
    const note = line ? line.match(MOUNT_NOTE) : null;
    if (note && note[2]) return { file: rel, kind, status: "PLANNED", target: note[1], owner: note[2] };
    const names = exportedNames(text);
    const why = kind === "hook"
      ? `aucun fichier de prod n importe ce hook par valeur ET ne l appelle (${names.join(", ") || "aucun export"})`
      : `aucun fichier de prod n importe ce module par valeur (${names.join(", ") || "aucun export"})`;
    return { file: rel, kind, status: "UNMOUNTED", reason: why };
  });
};

const addedInRange = (root, range) => {
  try {
    return execFileSync("git", ["-C", root, "diff", "--diff-filter=A", "--name-only", range], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      // Tout module source ajoute, pas seulement composant/hook/service : sur une stack sans
      // React (banc jeu three.js), le filtre mountKind rendait NONE a chaque US. Types seuls
      // et point d entree sortent en SKIP plus loin.
      .filter((f) => mountKind(f) || (/^src\/.*\.[jt]sx?$/.test(f) && !/(__tests__\/|\.(test|spec)\.|\.d\.ts$)/.test(f))
        || (/\.cs$/.test(f) && !/(^|\/)[\w.]*Tests?\//.test(f) && !/Tests?\.cs$/.test(f)));
  } catch {
    return null;
  }
};

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  const args = process.argv.slice(2);
  const opt = (name) => {
    const i = args.indexOf(`--${name}`);
    return i === -1 ? undefined : args[i + 1];
  };
  const withValue = new Set(["--root", "--tasks", "--range"].map((n) => args.indexOf(n) + 1).filter((i) => i > 0));
  const root = resolve(opt("root") || process.cwd());
  const explicit = args.filter((a, i) => !a.startsWith("--") && !withValue.has(i));
  let files = explicit;
  if (opt("range")) {
    const added = addedInRange(root, opt("range"));
    if (added === null) {
      console.log(`ERROR range illisible : ${opt("range")}`);
      process.exit(2);
    }
    files = [...new Set([...explicit, ...added])];
  }
  if (!files.length) {
    console.log("NONE aucun module ajoute a controler");
    process.exit(0);
  }
  const tasksText = opt("tasks") ? readText(resolve(root, opt("tasks"))) : null;
  const results = checkMounts({ root, files, tasksText });
  if (args.includes("--json")) console.log(JSON.stringify(results, null, 2));
  else
    for (const r of results) {
      if (r.status === "MOUNTED") console.log(`MOUNTED ${r.file} <- ${r.consumers.map((c) => `${c.file} (${c.via})`).join(" ; ")}`);
      else if (r.status === "PLANNED") console.log(`PLANNED ${r.file} -> ${r.target} (${r.owner})`);
      else if (r.status === "SKIP") console.log(`SKIP ${r.file} : ${r.reason}`);
      else console.log(`UNMOUNTED ${r.file} : ${r.reason}`);
    }
  process.exit(results.some((r) => r.status === "UNMOUNTED") ? 1 : 0);
}
