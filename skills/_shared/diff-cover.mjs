// Couverture du diff : quelles lignes de PROD ajoutees par l US ne sont executees par aucun test ?
// Le banc A/B du 2026-10-06 (reviewer Sonnet contre Opus) montre que les defauts rates sont
// surtout des branches livrees sans test qui les execute (cylindre jamais construit, cible
// jamais touchee). Ce controle les donne a tous les roles sans lecture : worker (auto-controle),
// reviewer (check 6) et fix.
//
// Entree : un lcov.info (vitest --coverage.reporter=lcov, jest, c8, coverlet --format lcov).
// Usage :
//   node diff-cover.mjs --lcov <lcov.info | dossier> --range <base>..<head> [--root <depot>] [--min <pct>]
//   --range <base> seul (sans ..) : arbre de travail, fichiers non suivis compris (worker avant commit).
// Sortie : une ligne par fichier, OK / GAP (lignes non executees, regroupees en plages) ;
// code 1 si un GAP depasse le seuil (par defaut : toute ligne ajoutee executable non couverte).
// NOCOV (fichier hors lcov, ex. point d entree exclu) informe sans bloquer.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, relative } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const TEST = /(^|\/)(__tests__|tests?)\/|\.(?:test|spec)\.[jt]sx?$|Tests?\.cs$/;
const AUTO_PROPERTY = /\{\s*get;\s*(?:(?:private\s+|protected\s+|internal\s+)?(?:set|init);\s*)?\}/;
const SOURCE = /\.(?:[cm]?[jt]sx?|cs)$/;

const slash = (p) => p.replace(/\\/g, "/");

// --lcov accepte un dossier : coverlet ecrit <dossier>/<guid>/coverage.info, vitest lcov.info.
// On prend le .info le plus recent (banc Miro : le chemin lcov.info du brief n existait pas cote .NET).
export function findLcov(path) {
  if (!statSync(path).isDirectory()) return path;
  let best = null;
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = resolve(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".info")) {
        const t = statSync(p).mtimeMs;
        if (!best || t > best.t) best = { p, t };
      }
    }
  };
  walk(path);
  if (!best) throw new Error(`aucun fichier .info sous ${path}`);
  return best.p;
}

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
    } else if (line.startsWith("BRDA:") && current) {
      // BRDA:<ligne>,<bloc>,<branche>,<pris|->. Une branche jamais prise sur une ligne executee :
      // le 204 d un `count == 0 ? NoContent() : Ok()` (banc Miro F2), invisible a la couverture de ligne.
      const [n, , , taken] = line.slice(5).split(",");
      const key = `br:${n}`;
      const miss = taken === "-" || Number(taken) === 0;
      current.set(key, (current.get(key) || 0) + (miss ? 1 : 0));
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

// Bloc ajoute ambigu : un bloc insere qui finit (ou commence) par les memes lignes que son voisin
// peut etre aligne a plusieurs positions equivalentes (« slider » de diff). git choisit l une, et un
// catch/return deja present mais jamais execute sortait en GAP (banc Miro F9). On essaie chaque
// glissement valide d une plage et on garde celui qui laisse le moins de lignes non executees.
export function slide(lines, text, cov) {
  if (!text) return lines;
  const out = new Set();
  const sorted = [...lines].sort((a, b) => a - b);
  const runs = [];
  for (const n of sorted) {
    const last = runs[runs.length - 1];
    if (last && n === last[1] + 1) last[1] = n;
    else runs.push([n, n]);
  }
  const missedOf = (a, b) => { let m = 0; for (let n = a; n <= b; n++) if (cov.get(n) === 0) m++; return m; };
  for (const [a0, b0] of runs) {
    let best = [a0, b0];
    let bestMissed = missedOf(a0, b0);
    for (const dir of [1, -1]) {
      let a = a0, b = b0;
      // Vers le bas : la premiere ligne du bloc egale celle qui suit le bloc ; vers le haut, l inverse.
      while (dir > 0 ? text[a - 1] === text[b] && b < text.length : a > 1 && text[a - 2] === text[b - 1]) {
        a += dir; b += dir;
        const m = missedOf(a, b);
        if (m < bestMissed) { best = [a, b]; bestMissed = m; }
      }
    }
    for (let n = best[0]; n <= best[1]; n++) out.add(n);
  }
  return out;
}

export function diffCover(added, coverage, readText = () => null) {
  const report = [];
  for (const [file, raw] of added) {
    if (!SOURCE.test(file) || TEST.test(file)) continue;
    const cov = coverage.get(file);
    if (!cov) {
      report.push({ file, status: "NOCOV", executable: 0, missed: [] });
      continue;
    }
    const text = readText(file);
    const lines = slide(raw, text ? text.split(/\r?\n/) : null, cov);
    const executable = [...lines].filter((n) => cov.has(n));
    const missed = executable.filter((n) => cov.get(n) === 0);
    const branches = executable.filter((n) => cov.get(n) > 0 && cov.get(`br:${n}`) > 0);
    report.push({ file, status: missed.length ? "GAP" : branches.length ? "BRANCH" : "OK", executable: executable.length, missed, branches });
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
      // Fichier neuf, pas encore suivi : toutes ses lignes sont ajoutees, avec le meme filtre que le
      // diff (banc Miro F4 : un worker a ecrit un test d Include pour des navigations EF `{ get; set; }`).
      const lines = readFileSync(resolve(root, f), "utf8").split(/\r?\n/);
      added.set(slash(f), new Set(lines.map((l, i) => (AUTO_PROPERTY.test(l) ? 0 : i + 1)).filter(Boolean)));
    }
  }
  const head = range.includes("..") ? range.split("..").pop() || "HEAD" : null;
  const readText = (f) => { try { return head ? git("show", `${head}:${f}`) : readFileSync(resolve(root, f), "utf8"); } catch { return null; } };
  const report = diffCover(added, parseLcov(readFileSync(findLcov(lcov), "utf8"), root), readText);
  let bad = 0;
  for (const r of report) {
    if (r.status === "NOCOV") {
      console.log(`NOCOV ${r.file} (absent du lcov : exclu de la couverture, ou aucun test lance ne l importe ; mount-check tranche)`);
    } else if (r.status === "GAP") {
      const pct = Math.round((100 * (r.executable - r.missed.length)) / r.executable);
      const over = pct < min;
      if (over) bad++;
      console.log(`GAP ${r.file} ${pct}% lignes ajoutees non executees: ${ranges(r.missed)}${over ? "" : " (sous le seuil)"}`);
    } else if (r.status === "BRANCH") {
      console.log(`BRANCH ${r.file} branche jamais prise sur les lignes ajoutees: ${ranges(r.branches)}`);
    } else {
      console.log(`OK ${r.file} (${r.executable} lignes executables ajoutees)`);
    }
  }
  if (!report.length) console.log("NONE aucune ligne de prod ajoutee");
  process.exit(bad ? 1 : 0);
}
