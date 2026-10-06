// Planificateur de vagues : quelles US d un tasks.md peuvent tourner en meme temps, chacune dans
// son slot, sans se marcher dessus. Deux US qui touchent un meme fichier de prod restent dans
// l ordre de tasks.md (la seconde peut dependre de la premiere) ; une US qui reutilise (Code:)
// un fichier qu une US anterieure touche, ou que celle-ci annonce `Monte dans: x (USn)`, attend
// aussi. Tout le reste part en parallele. Les fichiers PARTAGE de recon.md (ajout seul) ne
// creent pas de dependance avec --union ; leur fusion demande alors une passe de resolution
// (agent, union des deux cotes) : le pilote git merge=union a ete MESURE casse (objet as const
// tronque, 10 erreurs tsc sur le banc jeu), ne pas l utiliser.
//
// Usage : node lanes.mjs <FEATURE_DIR> [--union] [--json]
// Sortie : une vague par ligne (`vague 1 : US1, US6`), puis le gain sur l enchainement.
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseTasks } from "./audit-lint.mjs";

const isProd = (p) => p.includes("/") && !/(^|\/)(__tests__|specs|contracts)\//.test(p) && !/\.(test|spec)\./.test(p) && !/\.md$/.test(p);

export const sharedOf = (reconText) =>
  [...((reconText || "").match(/^- PARTAGE\s*:.*$/m)?.[0] || "").matchAll(/`([\w./@-]+)`/g)].map((m) => m[1]);

export const planWaves = (tasksText, { shared = [] } = {}) => {
  const tasks = parseTasks(tasksText).filter((t) => t.story && t.story !== "unassigned");
  const order = [...new Set(tasks.map((t) => t.story))];
  const touched = new Map(order.map((s) => [s, new Set()]));
  const reused = new Map(order.map((s) => [s, new Set()]));
  const mountsFor = new Map(order.map((s) => [s, new Set()]));
  const skip = new Set(shared);
  for (const t of tasks) {
    for (const p of t.paths) {
      if (!isProd(p) || skip.has(p)) continue;
      (t.reusedOnly.has(p) ? reused : touched).get(t.story).add(p);
    }
    for (const m of t.mounts) if (m.owner && touched.has(m.owner)) mountsFor.get(m.owner).add(t.story);
  }
  // Texte de chaque US hors notes de montage (une note « Monte dans: x (US6) » regarde en avant),
  // et symboles crees (nom de fichier sans extension) : une US qui nomme `BoardService.getMembers
  // (US4)` ou la classe `UserRepository` creee plus tot en depend sans toucher son fichier (banc
  // Miro F2 : US5 lisait le service de US4, et le planificateur les mettait dans la meme vague).
  const text = new Map(order.map((s) => [s, ""]));
  const createdBy = new Map(order.map((s) => [s, new Set()]));
  for (const t of tasks) {
    text.set(t.story, text.get(t.story) + " " + t.body.replace(/(?:Mont[ée]e?s?\s+dans|Mounted\s+in)\s*:[^—]*/gi, " "));
    // `created` ne garde que le fichier de tete : une tache « Create » cree aussi ses compagnons (« and its DTO »).
    const made = [...(t.created || []), ...(t.createLead ? t.paths.filter((p) => !t.reusedOnly.has(p)) : [])];
    for (const p of made) if (isProd(p)) createdBy.get(t.story).add(p.split("/").pop().replace(/\.[^.]+$/, ""));
  }
  const names = (s) => [...createdBy.get(s)].filter((n) => n.length >= 4 && n !== "index");
  // Meme nom des deux cotes d un contrat (`Comment` entite .NET et modele TS) : pas une dependance.
  const family = (s) => new Set([...touched.get(s)].map((p) => (/\.cs$/.test(p) ? "cs" : "js")));
  const sameStack = (a, b) => [...family(a)].some((f) => family(b).has(f));
  const deps = new Map(order.map((s) => [s, new Set()]));
  order.forEach((b, j) => {
    for (const a of order.slice(0, j)) {
      const ta = touched.get(a);
      const named = new RegExp(`\\(${a}\\)`).test(text.get(b)) || (sameStack(a, b) && names(a).some((n) => new RegExp(`(?<![/.])${n}s?\\b`).test(text.get(b))));
      const clash = named || [...touched.get(b)].some((p) => ta.has(p)) || [...reused.get(b)].some((p) => ta.has(p)) || mountsFor.get(b).has(a);
      if (clash) deps.get(b).add(a);
    }
  });
  const wave = new Map();
  for (const s of order) wave.set(s, 1 + Math.max(0, ...[...deps.get(s)].map((d) => wave.get(d))));
  const waves = [];
  for (const s of order) (waves[wave.get(s) - 1] ||= []).push(s);
  return { order, waves, deps: Object.fromEntries([...deps].map(([k, v]) => [k, [...v]])) };
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2];
  if (!dir) {
    console.error("usage : node lanes.mjs <FEATURE_DIR> [--union] [--json]");
    process.exit(2);
  }
  const recon = existsSync(join(dir, "recon.md")) ? readFileSync(join(dir, "recon.md"), "utf8") : "";
  const shared = process.argv.includes("--union") ? sharedOf(recon) : [];
  const plan = planWaves(readFileSync(join(dir, "tasks.md"), "utf8"), { shared });
  if (process.argv.includes("--json")) console.log(JSON.stringify({ ...plan, shared }, null, 1));
  else {
    plan.waves.forEach((w, i) => console.log(`vague ${i + 1} : ${w.join(", ")}`));
    console.log(`${plan.order.length} US en ${plan.waves.length} vagues${shared.length ? ` (PARTAGE hors dependances : ${shared.length} fichiers)` : ""}`);
  }
}
