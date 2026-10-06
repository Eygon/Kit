// Reunit les cases [X] de plusieurs copies de tasks.md (une par slot : front, back) dans une
// seule. En regime L, chaque voie parallele coche SA copie : deux `sed -i` concurrents sur le meme
// fichier pouvaient perdre une case. Union par id de tache (T001...), jamais de decoche.
//
// Usage : node tasks-merge.mjs <tasks.md cible> <tasks.md source> [<source>...]
// Ecrit la cible et imprime les ids ajoutes. Exit 0.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const LINE = /^(\s*-\s*\[)([ xX])(\]\s*(T\d{2,4}[a-z]?)\b.*)$/;

export const checkedIds = (text) =>
  new Set(text.split(/\r?\n/).map((l) => l.match(LINE)).filter((m) => m && m[2] !== " ").map((m) => m[4]));

export const mergeTasks = (target, sources) => {
  const done = new Set(sources.flatMap((s) => [...checkedIds(s)]));
  const added = [];
  const out = target
    .split(/(\r?\n)/)
    .map((l) => {
      const m = l.match(LINE);
      if (!m || m[2] !== " " || !done.has(m[4])) return l;
      added.push(m[4]);
      return `${m[1]}X${m[3]}`;
    })
    .join("");
  return { text: out, added };
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [target, ...sources] = process.argv.slice(2);
  if (!target || !sources.length) {
    console.error("usage : node tasks-merge.mjs <cible> <source> [<source>...]");
    process.exit(2);
  }
  const r = mergeTasks(readFileSync(target, "utf8"), sources.map((s) => readFileSync(s, "utf8")));
  writeFileSync(target, r.text);
  console.log(r.added.length ? `tasks-merge : ${r.added.join(", ")} coches dans ${target}` : "tasks-merge : rien a reporter");
}
