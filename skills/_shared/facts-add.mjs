// Faits de feature : la memoire partagee entre les US d un run. Chaque worker (et fix) rend
// facts: [{fact, source}] ; l orchestrateur les verse ici en UNE commande, et brief-fill les
// injecte dans tous les briefs suivants. Avant : recopie a la main dans chaque JSON de brief,
// oubliee ou rendue en [object Object] (banc jeu : 22 faits perdus sur une feature).
//
// Usage : node facts-add.mjs <FEATURE_DIR> <sortie worker .json | -> [--us US3] [--slot <cwd du worker>]
// --slot range le fait sous son depot (git common dir, commun aux worktrees du pool) : brief-fill
// ne le donne qu aux US du meme depot (banc Miro : les recettes SQLite du back arrivaient au front).
// Ecrit <FEATURE_DIR>/facts.json (dedup par texte, les plus recents gardes, MAX_FACTS au plus).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const MAX_FACTS = 40;
const norm = (f) => {
  if (!f || typeof f !== "object") return { fact: String(f).trim() };
  const out = { fact: String(f.fact || "").trim() };
  if (f.source) out.source = String(f.source).trim();
  if (f.us) out.us = String(f.us);
  if (f.repo) out.repo = String(f.repo);
  return out;
};

// Cle de depot d un slot : le git common dir, identique pour tous les worktrees d un meme depot.
export const repoKey = (slot) => {
  if (!slot) return undefined;
  try {
    const dir = execFileSync("git", ["-C", slot, "rev-parse", "--path-format=absolute", "--git-common-dir"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return dir.replace(/\\/g, "/").replace(/\/\.git\/?$/, "").toLowerCase();
  } catch {
    return undefined;
  }
};

// Faits visibles depuis un depot : ceux du meme depot et ceux sans depot (anciens, ou poses a la main).
export const factsForRepo = (facts, repo) => (repo ? facts.filter((f) => !f.repo || f.repo === repo) : facts);

export const readFacts = (featureDir) => {
  const p = join(featureDir, "facts.json");
  if (!existsSync(p)) return [];
  try {
    const v = JSON.parse(readFileSync(p, "utf8"));
    return Array.isArray(v) ? v.map(norm).filter((f) => f.fact) : [];
  } catch {
    return [];
  }
};

// Fusion : un fait au meme texte remplace l ancien (source a jour) et passe en fin ; les plus
// anciens sortent au-dela de MAX_FACTS.
export const mergeFacts = (current, incoming, us, repo) => {
  const out = current.filter((f) => !incoming.some((n) => norm(n).fact === f.fact));
  for (const n of incoming.map(norm).filter((f) => f.fact)) out.push({ ...n, ...(us ? { us } : {}), ...(repo ? { repo } : {}) });
  return out.slice(-MAX_FACTS);
};

// Le texte rendu par un worker : JSON nu, ou JSON au milieu d un rapport (```json ... ```).
export const factsOfOutput = (text) => {
  const tryParse = (s) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const obj = tryParse(text.trim()) || (fenced && tryParse(fenced[1])) || tryParse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  // Un facts.json d une autre voie (tableau nu) se verse tel quel : fusion des voies paralleles.
  if (Array.isArray(obj)) return obj;
  return obj && Array.isArray(obj.facts) ? obj.facts : [];
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [dir, src] = process.argv.slice(2);
  const usIdx = process.argv.indexOf("--us");
  const us = usIdx > 0 ? process.argv[usIdx + 1] : undefined;
  const slotIdx = process.argv.indexOf("--slot");
  const repo = slotIdx > 0 ? repoKey(process.argv[slotIdx + 1]) : undefined;
  if (!dir || !src) {
    console.error("usage : node facts-add.mjs <FEATURE_DIR> <sortie worker .json | -> [--us USn]");
    process.exit(2);
  }
  const text = src === "-" ? readFileSync(0, "utf8") : readFileSync(src, "utf8");
  const incoming = factsOfOutput(text);
  const merged = mergeFacts(readFacts(dir), incoming, us, repo);
  writeFileSync(join(dir, "facts.json"), JSON.stringify(merged, null, 1) + "\n");
  console.log(`facts-add : +${incoming.length} -> ${merged.length} faits dans ${join(dir, "facts.json")}`);
}
