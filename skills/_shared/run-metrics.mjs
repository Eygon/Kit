// Mesure d un run /sk-impl a partir des transcripts d un Workflow : pour chaque agent, duree,
// tours de modele, appels d outil, part du temps en outils, premiere ecriture dans src/,
// latence mediane d un appel et tokens generes. Sert a juger une regle de brief sur des
// chiffres (reference 916 US21 : 93 appels, 68 tours, 1re ecriture a 13,8 min sur 24,3)
// plutot que sur une impression.
//
// Usage : node run-metrics.mjs <dossier du workflow : .../subagents/workflows/wf_xxx> [--json]
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const median = (xs) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : 0);

const readJsonl = (file) =>
  readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

export const agentMetrics = (file) => {
  let meta = {};
  try {
    meta = JSON.parse(readFileSync(file.replace(/\.jsonl$/, ".meta.json"), "utf8"));
  } catch {
    // an agent without its meta file keeps an empty label
  }
  const lines = readJsonl(file);
  const stamped = lines.filter((l) => l.timestamp);
  if (!stamped.length) return null;
  const start = Date.parse(stamped[0].timestamp);
  let end = start;
  let lastInputAt = null;
  let modelMs = 0;
  let turns = 0;
  let outTokens = 0;
  let firstWrite = null;
  const pending = new Map();
  const latencies = [];
  for (const l of stamped) {
    const t = Date.parse(l.timestamp);
    end = Math.max(end, t);
    const content = l.message && Array.isArray(l.message.content) ? l.message.content : [];
    if (l.type === "assistant") {
      if (lastInputAt !== null) {
        modelMs += t - lastInputAt;
        turns += 1;
        lastInputAt = null;
      }
      outTokens += (l.message.usage && l.message.usage.output_tokens) || 0;
      for (const c of content) {
        if (c.type !== "tool_use") continue;
        pending.set(c.id, t);
        const path = String((c.input && c.input.file_path) || "");
        if (firstWrite === null && (c.name === "Write" || c.name === "Edit") && /[\\/]src[\\/]/.test(path)) firstWrite = t;
      }
    }
    if (l.type === "user") {
      let result = false;
      for (const c of content) {
        if (c.type === "tool_result" && pending.has(c.tool_use_id)) {
          latencies.push(t - pending.get(c.tool_use_id));
          pending.delete(c.tool_use_id);
          result = true;
        }
      }
      if (result || typeof (l.message && l.message.content) === "string") lastInputAt = t;
    }
  }
  const totalMs = end - start;
  const toolMs = latencies.reduce((a, b) => a + b, 0);
  return {
    label: meta.description || "",
    minutes: +(totalMs / 60000).toFixed(1),
    turns,
    toolCalls: latencies.length,
    toolShare: totalMs ? Math.round((100 * toolMs) / totalMs) : 0,
    modelShare: totalMs ? Math.round((100 * modelMs) / totalMs) : 0,
    medianCallSeconds: +(median(latencies) / 1000).toFixed(1),
    firstWriteMinute: firstWrite === null ? null : +((firstWrite - start) / 60000).toFixed(1),
    outputTokensK: Math.round(outTokens / 1000),
  };
};

export const workflowMetrics = (dir) =>
  readdirSync(dir)
    .filter((f) => /^agent-.*\.jsonl$/.test(f))
    .map((f) => agentMetrics(join(dir, f)))
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label));

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  const dir = process.argv[2];
  if (!dir) {
    console.error("usage: node run-metrics.mjs <dossier du workflow> [--json]");
    process.exit(2);
  }
  const rows = workflowMetrics(dir);
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  }
  console.log("agent                     min  tours appels outils% 1re-ecriture s/appel ktok");
  for (const r of rows)
    console.log(
      `${r.label.slice(0, 24).padEnd(24)} ${String(r.minutes).padStart(5)} ${String(r.turns).padStart(5)} ${String(r.toolCalls).padStart(6)} ${String(r.toolShare).padStart(6)}% ${String(r.firstWriteMinute ?? "-").padStart(11)} ${String(r.medianCallSeconds).padStart(7)} ${String(r.outputTokensK).padStart(4)}`
    );
}
