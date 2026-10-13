// Corps des agents du kit (sans frontmatter), au format JSON attendu par args.agentBodies des moteurs Workflow.
// Usage : node agent-bodies.mjs            -> {"sk-worker":"...","sk-reviewer":"..."}
// Le moteur ne lit aucun fichier : l orchestrateur fusionne ce JSON dans les args du Workflow, ce qui rend le
// moteur independant du registre d agents (~/.claude/agents) : meme resultat en session cloud neuve.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "agents");
export const agentBodies = (names = ["sk-worker", "sk-reviewer"]) =>
  Object.fromEntries(names.map((n) => [n, readFileSync(join(root, n + ".md"), "utf8").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim()]));

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) process.stdout.write(JSON.stringify(agentBodies()));
