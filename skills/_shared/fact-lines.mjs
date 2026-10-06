// Recale les numeros de ligne des Verified facts (plan.md) et de recon.md quand le code a bouge
// depuis la prep (une autre feature fusionnee) : pour chaque `chemin:N-M` suivi d un symbole, si le
// symbole n est plus dans N-M a la ref, cherche sa declaration (sinon sa premiere occurrence) et
// decale la plage. Banc Miro : F3 preparee avant la fusion de F2, 7 faits decales ; a la main,
// c est une recherche par fait dans la session Opus.
//
// Usage : node fact-lines.mjs <FEATURE_DIR> [--ref origin/dev] [--write]
// Sortie : une ligne par fait recale (ancien -> nouveau), ou introuvable ; --write reecrit les fichiers.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const FACT = /`([\w./@-]+\.\w+):(\d+)(?:\s*[-–]\s*(\d+))?`([^`\n]*?)`([A-Za-z_$][\w$.]*)`/g;

const git = (root, args) => {
  try {
    return execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 32 << 20 });
  } catch {
    return null;
  }
};

export function relocate(lines, symbol, from, to) {
  const span = lines.slice(Math.max(0, from - 11), to + 3).join("\n");
  if (span.includes(symbol)) return null;
  const leaf = symbol.split(".").pop();
  const esc = leaf.replace(/[$]/g, "\\$");
  // Meme tolerance que le lint : symbole englobant declare au-dessus de la plage.
  const decl = new RegExp(`(?:function|const|let|class|interface|type|enum|record|struct)\\s+${esc}\\b`);
  if (decl.test(lines.slice(0, to).join("\n"))) return null;
  // Le code a glisse : l occurrence la plus proche de l ancienne position (pas la premiere, qui est
  // souvent l import), hors lignes d import.
  let best = -1;
  lines.forEach((l, i) => {
    if (!l.includes(leaf) || /^\s*import\b/.test(l)) return;
    if (best < 0 || Math.abs(i + 1 - from) < Math.abs(best + 1 - from)) best = i;
  });
  if (best < 0) return { missing: true };
  if (best + 1 === from) return null;
  return { from: best + 1, to: best + 1 + (to - from) };
}

export function relinkText(text, readAtRef) {
  const changes = [];
  const out = text.replace(FACT, (all, path, a, b, mid, symbol) => {
    const content = readAtRef(path);
    if (content == null) return all;
    const from = Number(a);
    const to = Number(b || a);
    const r = relocate(content.split("\n"), symbol, from, to);
    if (!r) return all;
    if (r.missing) {
      changes.push({ path, symbol, old: `${a}${b ? "-" + b : ""}`, missing: true });
      return all;
    }
    const range = b ? `${r.from}-${r.to}` : `${r.from}`;
    changes.push({ path, symbol, old: `${a}${b ? "-" + b : ""}`, new: range });
    return `\`${path}:${range}\`${mid}\`${symbol}\``;
  });
  return { text: out, changes };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const dir = args.find((a) => !a.startsWith("--"));
  const refIdx = args.indexOf("--ref");
  if (!dir) {
    console.error("usage : node fact-lines.mjs <FEATURE_DIR> [--ref origin/dev] [--write]");
    process.exit(2);
  }
  const root = (git(dir, ["rev-parse", "--show-toplevel"]) || "").trim();
  const ref = refIdx >= 0 ? args[refIdx + 1] : "HEAD";
  let backRoot = null;
  try {
    const cfg = JSON.parse(readFileSync(join(root, ".sk", "repos.json"), "utf8"));
    if (typeof cfg.backend === "string" && existsSync(cfg.backend)) backRoot = cfg.backend;
  } catch {}
  const readAtRef = (p) => git(root, ["show", `${ref}:${p}`]) ?? (backRoot ? git(backRoot, ["show", `HEAD:${p}`]) : null);
  let total = 0;
  for (const name of ["plan.md", "recon.md"]) {
    const file = join(dir, name);
    if (!existsSync(file)) continue;
    const { text, changes } = relinkText(readFileSync(file, "utf8"), readAtRef);
    for (const c of changes) console.log(c.missing ? `INTROUVABLE ${name} ${c.path} \`${c.symbol}\` (lignes ${c.old})` : `RECALE ${name} ${c.path} \`${c.symbol}\` ${c.old} -> ${c.new}`);
    total += changes.filter((c) => !c.missing).length;
    if (args.includes("--write") && changes.length) writeFileSync(file, text);
  }
  if (!total) console.log("NONE aucun fait a recaler");
}
