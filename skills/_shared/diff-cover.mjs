// Couverture du diff : quelles lignes de PROD ajoutees par l US ne sont executees par aucun test ?
// Le banc A/B du 2026-10-06 (reviewer Sonnet contre Opus) montre que les defauts rates sont
// surtout des branches livrees sans test qui les execute (cylindre jamais construit, cible
// jamais touchee). Ce controle les donne a tous les roles sans lecture : worker (auto-controle),
// reviewer (check 6) et fix.
//
// Entree : un lcov.info (vitest --coverage.reporter=lcov, jest, c8, coverlet --format lcov).
// Usage :
//   node diff-cover.mjs --lcov <lcov.info> --range <base>..<head> [--root <depot>] [--min <pct>]
//   --range <base> seul (sans ..) : arbre de travail, fichiers non suivis compris (worker avant commit).
// Sortie : une ligne par fichier, OK / GAP (lignes non executees, regroupees en plages) ;
// code 1 si un GAP depasse le seuil (par defaut : toute ligne ajoutee executable non couverte).
// NOCOV (fichier hors lcov, ex. point d entree exclu) informe sans bloquer.
import { readFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const TEST = /(^|\/)(__tests__|tests?)\/|\.(?:test|spec)\.[jt]sx?$|Tests?\.cs$/;
const AUTO_PROPERTY = /\{\s*get;\s*(?:(?:private\s+|protected\s+|internal\s+)?(?:set|init);\s*)?\}/;
const SOURCE = /\.(?:[cm]?[jt]sx?|cs)$/;

const slash = (p) => p.replace(/\\/g, "/");

export function parseLcov(text, root = ".") {
  const files = new Map();
  let current = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("SF:")) {
      const abs = resolve(root, line.slice(3));
      current = new Map();
      files.set(slash(relative(resolve(root), abs)), current);
    } else if (line.startsWith("DA:") && current) {
      const [n, hits] = line.slice(3).split(",");
      current.set(Number(n), Number(hits));
    } else if (line === "end_of_record") {
      current = null;
    }
  }
  return files;
}

export function addedLines(diffText) {
  const out = new Map();
  let file = null;
  let next = 0;
  for (const line of diffText.split(/\r?\n/)) {
    if (line.startsWith("+++ ")) {
      const p = line.slice(4).replace(/^b\//, "");
      file = p === "/dev/null" ? null : slash(p);
      if (file && !out.has(file)) out.set(file, new Set());
    } else if (line.startsWith("@@")) {
      const m = /\+(\d+)/.exec(line);
      next = m ? Number(m[1]) : 0;
    } else if (file && line.startsWith("+")) {
      // Propriete auto C# (`{ get; set; }`) : rien a executer, coverlet la compte quand meme.
      if (!AUTO_PROPERTY.test(line)) out.get(file).add(next);
      next++;
    } else if (file && !line.startsWith("-") && !line.startsWith("\\")) {
      next++;
    }
  }
  return out;
}

export function ranges(lines) {
  const sorted = [...lines].sort((a, b) => a - b);
  const out = [];
  for (const n of sorted) {
    const last = out[out.length - 1];
    if (last && n === last[1] + 1) last[1] = n;
    else out.push([n, n]);
  }
  return out.map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(",");
}

export function diffCover(added, coverage) {
  const report = [];
  for (const [file, lines] of added) {
    if (!SOURCE.test(file) || TEST.test(file)) continue;
    const cov = coverage.get(file);
    if (!cov) {
      report.push({ file, status: "NOCOV", executable: 0, missed: [] });
      continue;
    }
    const executable = [...lines].filter((n) => cov.has(n));
    const missed = executable.filter((n) => cov.get(n) === 0);
    report.push({ file, status: missed.length ? "GAP" : "OK", executable: executable.length, missed });
  }
  return report;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const opt = (name, dflt) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : dflt;
  };
  const root = resolve(opt("--root", "."));
  const lcov = opt("--lcov");
  const range = opt("--range");
  const min = Number(opt("--min", "100"));
  if (!lcov || !range) {
    console.error("usage: node diff-cover.mjs --lcov <lcov.info> --range <base>..<head> [--root <depot>] [--min <pct>]");
    process.exit(2);
  }
  const git = (...a) => execFileSync("git", ["-C", root, ...a], { encoding: "utf8", maxBuffer: 64 << 20 });
  const added = addedLines(git("diff", "-U0", "--no-color", range));
  if (!range.includes("..")) {
    for (const f of git("ls-files", "--others", "--exclude-standard").split(/\r?\n/).filter(Boolean)) {
      const n = readFileSync(resolve(root, f), "utf8").split(/\r?\n/).length;
      added.set(slash(f), new Set(Array.from({ length: n }, (_, i) => i + 1)));
    }
  }
  const report = diffCover(added, parseLcov(readFileSync(lcov, "utf8"), root));
  let bad = 0;
  for (const r of report) {
    if (r.status === "NOCOV") {
      console.log(`NOCOV ${r.file} (absent du lcov : exclu de la couverture, ou aucun test lance ne l importe ; mount-check tranche)`);
    } else if (r.status === "GAP") {
      const pct = Math.round((100 * (r.executable - r.missed.length)) / r.executable);
      const over = pct < min;
      if (over) bad++;
      console.log(`GAP ${r.file} ${pct}% lignes ajoutees non executees: ${ranges(r.missed)}${over ? "" : " (sous le seuil)"}`);
    } else {
      console.log(`OK ${r.file} (${r.executable} lignes executables ajoutees)`);
    }
  }
  if (!report.length) console.log("NONE aucune ligne de prod ajoutee");
  process.exit(bad ? 1 : 0);
}
