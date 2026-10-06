// Extrait de design.md pour UNE US (/sk-impl §4) : les sections `## C<n>` / `### C<n>` des
// ancres de l US, texte integral, plus la table des tokens (§3) et les arbitrages lib<->design
// (§5) entiers. Decoupe par titres, sans reformulation : un mot change est une valeur perdue au
// pixel. Le parent le faisait a la main (grep -n puis sed -n), une source d ecart de plus.
//
// Usage : node design-extract.mjs <design.md> --anchors C1,C4 [--out <design-US4.md>]
// Exit 1 si une ancre est absente de design.md.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const level = (l) => (l.match(/^(#{1,6})\s/) || [, ""])[1].length;

// Section starting at a heading line: up to the next heading of the same or a higher level.
const sectionAt = (lines, i) => {
  const lv = level(lines[i]);
  let j = i + 1;
  while (j < lines.length && !(level(lines[j]) && level(lines[j]) <= lv)) j++;
  return lines.slice(i, j).join("\n").trimEnd();
};

export const extractDesign = (text, anchors) => {
  const lines = text.split(/\r?\n/);
  const find = (rx) => lines.findIndex((l) => level(l) >= 2 && rx.test(l));
  const missing = [];
  const parts = [];
  const head = lines.findIndex((l) => /^#\s/.test(l));
  parts.push(`${head >= 0 ? lines[head] : "# Design"} — extrait (${anchors.join(", ")})`);
  for (const [rx, label] of [[/^#{2,4}\s+(?:§?\s*3\b|3\.|Token|Correspondance)/i, "§3"], [/^#{2,4}\s+(?:§?\s*5\b|5\.|Arbitrage|Library\s*<->|Lib\s*<->)/i, "§5"]]) {
    const i = find(rx);
    if (i >= 0) parts.push(sectionAt(lines, i));
    else missing.push(label);
  }
  for (const a of anchors) {
    const id = a.replace(/^#/, "");
    const i = find(new RegExp(`^#{2,4}\\s+${id}\\b`));
    if (i < 0) missing.push(`#${id}`);
    else parts.push(sectionAt(lines, i));
  }
  return { text: parts.join("\n\n") + "\n", missing };
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (n) => {
    const i = args.indexOf(`--${n}`);
    return i >= 0 ? args[i + 1] : null;
  };
  const file = args.find((a) => !a.startsWith("--") && a !== opt("anchors") && a !== opt("out"));
  const anchors = (opt("anchors") || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!file || !anchors.length) {
    console.error("usage : node design-extract.mjs <design.md> --anchors C1,C4 [--out <fichier>]");
    process.exit(2);
  }
  const r = extractDesign(readFileSync(file, "utf8"), anchors);
  if (opt("out")) writeFileSync(opt("out"), r.text);
  else process.stdout.write(r.text);
  for (const m of r.missing) console.error(`KO absent de design.md : ${m}`);
  if (opt("out")) console.log(`design-extract : ${anchors.join(", ")} -> ${opt("out")} (${Buffer.byteLength(r.text)} octets)`);
  process.exit(r.missing.length ? 1 : 0);
}
