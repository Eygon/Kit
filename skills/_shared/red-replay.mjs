// Rejoue les tests d une US contre la prod d AVANT l US : la preuve RED, sans croire le worker.
// Banc Miro (nuit du 7 octobre) : 2 workers ont coche leurs cases sans empreinte ni GREEN par
// tache, et une review avait trouve un test tautologique. Un fichier de test qui PASSE sans la
// prod de l US ne prouve rien : RED jamais vu, ou assertion qui n appelle pas le code vise.
//
// Usage : node red-replay.mjs --range <US_BASE>..HEAD [--root <slot>] [--tasks <tasks.md> --us <USn>]
// Dans un worktree temporaire (le slot n est pas touche) : tests de HEAD, prod remise a US_BASE
// (fichier cree par l US = supprime), puis un run par fichier de test.
// Sortie : RED <test> (echoue sans la prod : bon) / PROUVE-RIEN <test> (passe sans la prod) /
// ERREUR ; code 1 si un PROUVE-RIEN. Un test de non-regression d un comportement INCHANGE peut
// passer legitimement : le reviewer tranche, la sortie lui donne le fichier.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { planGate } from "./gate.mjs";

const TEST = /(^|\/)(__tests__|tests?)\/|\.(?:test|spec)\.[jt]sx?$|Tests?\.cs$/;
const SOURCE = /\.(?:[cm]?[jt]sx?|cs)$/;

// Tache [X] de l US dont le fichier `Test:` n a pas ete touche par l US : sa preuve n existe pas
// (banc Miro F12 : 2 runs sur 2 ont coche « le hook lit le registre » sans test qui l aurait vu).
export function untouchedTestTasks(tasksText, us, changed) {
  const out = [];
  let inUs = false;
  for (const line of tasksText.split(/\r?\n/)) {
    const h = /^##\s*\[(US\d+)\]/.exec(line);
    if (h) { inUs = h[1] === us; continue; }
    const m = /^- \[[xX]\]\s+(T\d+)\s+\[(US\d+)\]/.exec(line);
    if (!m || (m[2] !== us && !inUs)) continue;
    const seg = /Test:\s*([^—]*)/.exec(line);
    if (!seg) continue;
    const tests = [...seg[1].matchAll(/`([\w./@-]+\.(?:test|spec)\.[jt]sx?|[\w./@-]+Tests?\.cs)`/g)].map((x) => x[1]);
    if (tests.length && !tests.some((t) => changed.has(t)) && !tests.some((t) => /parity|parite/i.test(t))) out.push({ task: m[1], tests });
  }
  return out;
}

export function splitChanges(nameStatus) {
  const tests = [], prod = [];
  for (const line of nameStatus.split(/\r?\n/).filter(Boolean)) {
    const [status, ...rest] = line.split("\t");
    const path = rest[rest.length - 1];
    if (!SOURCE.test(path)) continue;
    if (TEST.test(path)) { if (status !== "D" && /\.(?:test|spec)\.[jt]sx?$|Tests?\.cs$/.test(path)) tests.push(path); }
    else prod.push({ path, added: status === "A" });
  }
  return { tests, prod };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const args = process.argv.slice(2);
  const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  const root = resolve(opt("--root") || ".");
  const range = opt("--range");
  if (!range || !range.includes("..")) {
    console.error("usage : node red-replay.mjs --range <US_BASE>..HEAD [--root <slot>]");
    process.exit(2);
  }
  const [base] = range.split("..");
  const git = (cwd, ...a) => execFileSync("git", ["-C", cwd, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const nameStatus = git(root, "diff", "--name-status", "--no-renames", range);
  const { tests, prod } = splitChanges(nameStatus);
  const tasksPath = opt("--tasks"), us = opt("--us");
  let missing = 0;
  if (tasksPath && us) {
    const changed = new Set(nameStatus.split(/\r?\n/).filter(Boolean).map((l) => l.split("\t").pop()));
    for (const u of untouchedTestTasks(readFileSync(resolve(root, tasksPath), "utf8"), us, changed)) {
      missing++;
      console.log(`SANS-TEST ${u.task} : ${u.tests.join(", ")} non touche par l US (comportement deja couvert ? sinon test a ajouter)`);
    }
  }
  if (!tests.length) { console.log("NONE aucun fichier de test ajoute ou modifie"); process.exit(missing ? 1 : 0); }
  const wt = mkdtempSync(join(tmpdir(), "sk-red-"));
  let bad = 0;
  try {
    git(root, "worktree", "add", "--detach", "--quiet", wt, "HEAD");
    if (existsSync(join(root, "node_modules"))) symlinkSync(join(root, "node_modules"), join(wt, "node_modules"));
    for (const p of prod) {
      if (p.added) { if (existsSync(join(wt, p.path))) unlinkSync(join(wt, p.path)); }
      else git(wt, "checkout", base, "--", p.path);
    }
    for (const t of tests) {
      // Test de parite des langues : vert avant comme apres par construction, il ne peut pas etre RED.
      if (/parity|parite/i.test(t)) { console.log(`NEUTRE ${t} (test de parite : jamais RED par construction)`); continue; }
      let runs;
      try { runs = planGate([join(wt, t)]); }
      catch (e) { console.log(`ERREUR ${t} : ${e.message}`); continue; }
      const failed = runs.some((r) => spawnSync(r.cmd, r.args, { cwd: wt, stdio: "ignore", shell: process.platform === "win32", timeout: 600000 }).status !== 0);
      if (failed) console.log(`RED ${t} (echoue sans la prod de l US)`);
      else { bad++; console.log(`PROUVE-RIEN ${t} (passe sans la prod de l US : RED jamais vu, ou test qui n appelle pas le code vise)`); }
    }
  } finally {
    try { git(root, "worktree", "remove", "--force", wt); } catch { rmSync(wt, { recursive: true, force: true }); }
  }
  process.exit(bad || missing ? 1 : 0);
}
