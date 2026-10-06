// Runs the Workflow engines with a fake agent(): routing and agent counts, no model call.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const load = (name) => readFileSync(join(HERE, "..", name), "utf8").replace(/^export const meta = \{[\s\S]*?\n\}\n/m, "");

const run = async (name, args, reply) => {
  const calls = [];
  const agent = async (prompt, opts) => {
    calls.push(opts.label);
    return reply(opts.label, prompt);
  };
  const fanOut = (fns) => Promise.all(fns.map((f) => f()));
  const body = load(name);
  const fn = new AsyncFunction("agent", "log", "args", "parallel", body);
  const result = await fn(agent, () => {}, args, fanOut);
  return { result, calls };
};

const SHA = "a".repeat(64);
const done = { stopped: false, commit: "abc1234", facts: [] };
const g = (id, root) => ({ id, prompt: `w ${id}`, reviewPrompt: `r ${id}`, fixPrompt: `f ${id}`, root });

test("loop: PASS chains every story, FAIL pays one fix then review2", async () => {
  let reviews = 0;
  const { result, calls } = await run("speckit-us-loop.js", { groups: [g("US1"), g("US2")] }, (label) => {
    if (label.startsWith("us:") || label.startsWith("fix:")) return done;
    reviews += 1;
    if (label === "review:US2") return { verdict: "FAIL", issues: [{ text: "x" }] };
    return { verdict: "PASS", issues: [] };
  });
  assert.equal(result.ok, true);
  assert.deepEqual(calls, ["us:US1", "review:US1", "us:US2", "review:US2", "fix:US2", "review2:US2"]);
});

test("after-parallel: the barrier review's sha256 freezes the contract, no hash agent", async () => {
  const args = { barrier: g("US1", "/back"), parallel: [g("US2", "/back"), g("US3", "/front")], hashPrompt: "sha256 du contrat" };
  const { result, calls } = await run("speckit-us-after-parallel.js", args, (label) => {
    if (label.startsWith("us:")) return done;
    if (label.startsWith("review")) return { verdict: "PASS", issues: [], contractSha256: SHA };
    return { sha256: SHA };
  });
  assert.equal(result.ok, true);
  assert.equal(result.frozenHash, SHA);
  assert.equal(calls.filter((c) => c.startsWith("hash:")).length, 0);
});

test("after-parallel: a parallel reviewer that measures a different sha stops the run", async () => {
  const args = { barrier: g("US1", "/back"), parallel: [g("US2", "/back2"), g("US3", "/front")], hashPrompt: "sha256 du contrat" };
  const { result } = await run("speckit-us-after-parallel.js", args, (label) => {
    if (label.startsWith("us:")) return done;
    if (label === "review:US3") return { verdict: "PASS", issues: [], contractSha256: "b".repeat(64) };
    return { verdict: "PASS", issues: [], contractSha256: SHA };
  });
  assert.equal(result.ok, false);
});

test("after-parallel: without reviewer sha256 the engine still pays its hash agents", async () => {
  const args = { barrier: g("US1", "/back"), parallel: [g("US2", "/back2"), g("US3", "/front")], hashPrompt: "sha256 du contrat" };
  const { result, calls } = await run("speckit-us-after-parallel.js", args, (label) => {
    if (label.startsWith("us:")) return done;
    if (label.startsWith("review")) return { verdict: "PASS", issues: [] };
    return { sha256: SHA };
  });
  assert.equal(result.ok, true);
  assert.equal(calls.filter((c) => c.startsWith("hash:")).length, 2);
});
