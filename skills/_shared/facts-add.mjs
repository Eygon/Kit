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

// Memoire du DEPOT, entre features et entre runs : <git common dir>/sk-facts.json (commun a tous
// les worktrees du pool, jamais commite). Banc Haiku/Sonnet du 7 octobre : les 10 workers de TK-2
// ont chacun redecouvert le meme piege des tests du depot (listener click d useShortcutsHelp qui
// avale le clic du test suivant), plusieurs minutes de bisection chacun, alors que le premier
// l avait rendu dans ses facts. La memoire de feature (facts.json) ne survit pas a la feature.
export const MAX_REPO_FACTS = 30;
export const repoFactsPath = (slot) => {
  if (!slot) return undefined;
  try {
    const dir = execFileSync("git", ["-C", slot, "rev-parse", "--path-format=absolute", "--git-common-dir"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return join(dir, "sk-facts.json");
  } catch {
    return undefined;
  }
};
export const readRepoFacts = (slot) => {
  const p = repoFactsPath(slot);
  if (!p || !existsSync(p)) return [];
  try {
    const v = JSON.parse(readFileSync(p, "utf8"));
    return Array.isArray(v) ? v.map((f) => ({ ...norm(f), ...(f.feature ? { feature: String(f.feature) } : {}) })).filter((f) => f.fact) : [];
  } catch {
    return [];
  }
};
export const addRepoFacts = (slot, incoming, feature) => {
  const p = repoFactsPath(slot);
  if (!p) return 0;
  const cur = readRepoFacts(slot);
  const inc = incoming.map(norm).filter((f) => f.fact);
  const out = cur.filter((f) => !inc.some((n) => n.fact === f.fact));
  for (const n of inc) out.push({ fact: n.fact, ...(n.source ? { source: n.source } : {}), ...(feature ? { feature } : {}) });
  const kept = out.slice(-MAX_REPO_FACTS);
  writeFileSync(p, JSON.stringify(kept, null, 1) + "\n");
  return kept.length;
};
// Un fait dont la source cite un fichier qui n existe plus dans le slot est perime : on le tait.
export const liveFacts = (facts, slot) =>
  facts.filter((f) => {
    const m = String(f.source || "").match(/([\w@.-]+\/[\w./@-]+\.\w+)/);
    return !m || !slot || existsSync(join(slot, m[1]));
  });

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
  const slot = slotIdx > 0 ? process.argv[slotIdx + 1] : undefined;
  const nRepo = slot ? addRepoFacts(slot, incoming, resolve(dir).split(/[\\/]/).pop()) : 0;
  console.log(`facts-add : +${incoming.length} -> ${merged.length} faits dans ${join(dir, "facts.json")}${slot ? ` ; ${nRepo} dans la memoire du depot` : ""}`);
}
