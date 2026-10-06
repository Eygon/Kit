// Faits de feature : la memoire partagee entre les US d un run. Chaque worker (et fix) rend
// facts: [{fact, source}] ; l orchestrateur les verse ici en UNE commande, et brief-fill les
// injecte dans tous les briefs suivants. Avant : recopie a la main dans chaque JSON de brief,
// oubliee ou rendue en [object Object] (banc jeu : 22 faits perdus sur une feature).
//
// Usage : node facts-add.mjs <FEATURE_DIR> <sortie worker .json | -> [--us US3]
// Ecrit <FEATURE_DIR>/facts.json (dedup par texte, les plus recents gardes, MAX_FACTS au plus).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const MAX_FACTS = 40;
const norm = (f) => (f && typeof f === "object" ? { fact: String(f.fact || "").trim(), source: f.source ? String(f.source).trim() : undefined } : { fact: String(f).trim() });

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
export const mergeFacts = (current, incoming, us) => {
  const out = current.filter((f) => !incoming.some((n) => norm(n).fact === f.fact));
  for (const n of incoming.map(norm).filter((f) => f.fact)) out.push(us ? { ...n, us } : n);
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
  return obj && Array.isArray(obj.facts) ? obj.facts : [];
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [dir, src] = process.argv.slice(2);
  const usIdx = process.argv.indexOf("--us");
  const us = usIdx > 0 ? process.argv[usIdx + 1] : undefined;
  if (!dir || !src) {
    console.error("usage : node facts-add.mjs <FEATURE_DIR> <sortie worker .json | -> [--us USn]");
    process.exit(2);
  }
  const text = src === "-" ? readFileSync(0, "utf8") : readFileSync(src, "utf8");
  const incoming = factsOfOutput(text);
  const merged = mergeFacts(readFacts(dir), incoming, us);
  writeFileSync(join(dir, "facts.json"), JSON.stringify(merged, null, 1) + "\n");
  console.log(`facts-add : +${incoming.length} -> ${merged.length} faits dans ${join(dir, "facts.json")}`);
}
