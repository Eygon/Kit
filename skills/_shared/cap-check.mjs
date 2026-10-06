// Cap d une esquisse de decoupage AVANT la question de clarify (sk-prep A.2). L esquisse s ecrit au
// format tasks.md (`## [USn] titre` puis `- [ ] T001 [USn] Create `a.ts` and its DTO `b.ts` — Code: `c.ts``)
// et se mesure avec le MEME compte que le lint : sans lui, 3 preps sur 4 du banc Miro redecoupaient
// apres la reponse de l humain, parce que le cap n etait connu qu au lint.
//
// Usage : node cap-check.mjs <esquisse.md>
// Sortie : une ligne par US (OK / TROP), avec les fichiers comptes ; code 1 si une US depasse.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseTasks, countStory, MAX_CAP } from "./audit-lint.mjs";

export const capReport = (text) => {
  const by = new Map();
  for (const t of parseTasks(text)) if (t.story && t.story !== "unassigned") (by.get(t.story) || by.set(t.story, []).get(t.story)).push(t);
  return [...by].map(([story, list]) => {
    const { prod, companionFiles } = countStory(list);
    const over = list.length > MAX_CAP.tasks || prod.size > MAX_CAP.prod || prod.size + companionFiles.size > MAX_CAP.withCompanions;
    return { story, tasks: list.length, prod: [...prod], companions: [...companionFiles], over };
  });
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = process.argv[2];
  if (!file) {
    console.error("usage : node cap-check.mjs <esquisse.md>");
    process.exit(2);
  }
  const rows = capReport(readFileSync(file, "utf8"));
  for (const r of rows)
    console.log(`${r.over ? "TROP" : "OK  "} ${r.story} : ${r.tasks}/${MAX_CAP.tasks} taches, ${r.prod.length}/${MAX_CAP.prod} fichiers (+${r.companions.length} compagnons, ${MAX_CAP.withCompanions} max) : ${[...r.prod, ...r.companions.map((c) => c + " (compagnon)")].join(", ")}`);
  process.exit(rows.some((r) => r.over) ? 1 : 0);
}
