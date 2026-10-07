// Passage lot e2e5 : node run.mjs <n> [<n> ...]  (ex. node run.mjs 1 2 3), puis node run.mjs --summary
// Chaque script part d une base fraiche (back relance par restart-back.sh). Aucun appel serialise.
import { execSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const E = new URL(".", import.meta.url).pathname;
const SCRIPTS = ["f16", "f7", "f8", "f9", "x"];
const args = process.argv.slice(2);

if (args[0] !== "--summary") {
  for (const n of args) {
    for (const s of SCRIPTS) {
      execSync(`bash ${E}restart-back.sh`, { stdio: "ignore" });
      const out = `${E}out/run${n}-${s}.json`;
      const r = spawnSync("node", [E + s + ".mjs"], { env: { ...process.env, OUT: out }, encoding: "utf8", timeout: 600000 });
      writeFileSync(`${E}out/run${n}-${s}.log`, (r.stdout || "") + (r.stderr || ""));
      process.stdout.write(`--- run ${n} ${s} (exit ${r.status})\n${r.stdout}${r.status ? r.stderr : ""}`);
      if (!existsSync(out)) writeFileSync(out, JSON.stringify({ script: s, results: [], crashed: (r.stderr || "").slice(0, 2000) }));
    }
  }
} else {
  // Synthese : PASS seulement si PASS a chaque run ; un FAIL sur un run = FAIL ; BLOQUE sinon.
  const runs = [1, 2, 3].filter((n) => existsSync(`${E}out/run${n}-x.json`));
  const by = new Map();
  for (const n of runs) for (const s of SCRIPTS) {
    const j = JSON.parse(readFileSync(`${E}out/run${n}-${s}.json`, "utf8"));
    for (const r of j.results) { if (!by.has(r.id)) by.set(r.id, { id: r.id, title: r.title, script: s, runs: [] }); by.get(r.id).runs.push({ n, verdict: r.verdict, cause: r.cause }); }
  }
  const rows = [...by.values()].map((x) => {
    const v = x.runs.map((r) => r.verdict);
    const final = v.length < runs.length ? "BLOQUE" : v.every((y) => y === "PASS") ? "PASS" : v.includes("FAIL") ? "FAIL" : "BLOQUE";
    return { ...x, final, pattern: v.join("/") };
  });
  writeFileSync(E + "out/summary.json", JSON.stringify({ runs, rows }, null, 1));
  const c = (k) => rows.filter((r) => r.final === k).length;
  console.log(`runs ${runs.join(",")} : PASS ${c("PASS")} · FAIL ${c("FAIL")} · BLOQUE ${c("BLOQUE")}`);
  for (const r of rows) console.log(`${r.final.padEnd(6)} ${r.pattern.padEnd(16)} #${r.id} ${r.title}${r.final !== "PASS" ? " -- " + r.runs.find((x) => x.verdict !== "PASS")?.cause : ""}`);
}
