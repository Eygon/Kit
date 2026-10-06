// Prints the acceptance scenarios of one user story of a spec-kit spec.md, verbatim, so that
// /sk-impl hands the worker the same criteria the reviewer judges on (check 6). Without them the
// worker only sees the tasks and leaves an AC untested: measured on 918 US3, 3 workers out of 3
// (Sonnet high, Sonnet medium, Opus medium) missed the same AC5, as the real run had.
//
// Usage: node spec-ac.mjs <spec.md> <US id, e.g. US3 or 3>
// Exit 0 with the block on stdout; exit 2 when the story or its scenarios are not found.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export const extractAcceptance = (text, usId) => {
  const n = String(usId).replace(/^US/i, "");
  const lines = text.split(/\r?\n/);
  // "### User Story 3 - ..." (spec-kit template) or "### [US3] ..." (specs written by /sk-prep)
  const storyRe = new RegExp(`^#{2,4}\\s+(User Story\\s+${n}\\b|\\[US${n}\\])`, "i");
  const start = lines.findIndex((l) => storyRe.test(l));
  if (start < 0) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^#{1,4}\s/.test(lines[i])) {
      end = i;
      break;
    }
  }
  const story = lines.slice(start, end);
  const ac = story.findIndex((l) => /acceptance (scenarios|criteria)|sc[ée]narios d.acceptation|crit[èe]res d.acceptation/i.test(l));
  if (ac < 0) return null;
  const block = story.slice(ac + 1);
  while (block.length && !block[block.length - 1].trim()) block.pop();
  while (block.length && !block[0].trim()) block.shift();
  return block.length ? block.join("\n") : null;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [file, us] = process.argv.slice(2);
  if (!file || !us) {
    console.error("usage: node spec-ac.mjs <spec.md> <US id>");
    process.exit(2);
  }
  const out = extractAcceptance(readFileSync(file, "utf8"), us);
  if (!out) {
    console.error(`no acceptance scenarios for ${us} in ${file}`);
    process.exit(2);
  }
  console.log(out);
}
