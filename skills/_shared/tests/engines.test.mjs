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

test("after-parallel: chains of the same root run side by side, stories of a chain in order", async () => {
  const args = {
    barrier: null,
    expectedHash: SHA,
    parallel: [
      { root: "/back", chain: [g("US1"), g("US2")] },
      { root: "/front", chain: [g("US3"), g("US4"), g("US5")] },
    ],
  };
  const { result, calls } = await run("speckit-us-after-parallel.js", args, async (label) => {
    await new Promise((r) => setTimeout(r, 5));
    if (label.startsWith("us:")) return done;
    return { verdict: "PASS", issues: [], contractSha256: SHA };
  });
  assert.equal(result.ok, true);
  assert.equal(result.parallel.length, 5);
  const at = (l) => calls.indexOf(l);
  assert.ok(at("us:US3") < at("us:US2"), "the front lane starts before the back lane finishes");
  assert.ok(at("review:US1") < at("us:US2") && at("review:US4") < at("us:US5"), "a chain stays sequential");
  assert.deepEqual(result.parallel.map((r) => r.root), ["/back", "/back", "/front", "/front", "/front"]);
});

test("after-parallel: a story that fails stops its own lane only", async () => {
  const args = { barrier: null, expectedHash: SHA, parallel: [{ root: "/back", chain: [g("US1"), g("US2")] }, { root: "/front", chain: [g("US3"), g("US4")] }] };
  const { result, calls } = await run("speckit-us-after-parallel.js", args, (label) => {
    if (label === "us:US1") return { stopped: true, reason: "preuve" };
    if (label.startsWith("us:")) return done;
    return { verdict: "PASS", issues: [], contractSha256: SHA };
  });
  assert.equal(result.ok, false);
  assert.ok(!calls.includes("us:US2"));
  assert.ok(calls.includes("us:US4"));
});

test("loop: reviewTier auto gives the first review of a small undeclared US to Sonnet, never review2", async () => {
  const models = {};
  const body = load("speckit-us-loop.js");
  const fn = new AsyncFunction("agent", "log", "args", "parallel", body);
  const small = { stopped: false, commit: "abc1234", filesTouched: ["src/a.ts", "src/__tests__/a.test.ts"], summary: "ok" };
  const declared = { ...small, summary: "layout duplique au niveau module, faute de spec" };
  const agent = async (prompt, opts) => {
    models[opts.label] = opts.model;
    if (opts.label === "us:US1") return small;
    if (opts.label === "us:US2") return declared;
    if (opts.label.startsWith("fix:")) return small;
    if (opts.label === "review:US1") return { verdict: "FAIL", issues: [{ text: "x" }] };
    return { verdict: "PASS", issues: [] };
  };
  await fn(agent, () => {}, { reviewTier: "auto", groups: [g("US1"), g("US2")] }, (fns) => Promise.all(fns.map((f) => f())));
  assert.equal(models["review:US1"], "sonnet");
  assert.equal(models["review2:US1"], "opus");
  assert.equal(models["review:US2"], "opus");
});

test("loop: facts found by a worker reach the next workers of the same repo within the run", async () => {
  const prompts = {};
  const { result } = await run("speckit-us-loop.js", { groups: [g("US1", "/back"), g("US2", "/front"), g("US3", "/back")] }, (label, prompt) => {
    prompts[label] = prompt;
    if (label === "us:US1") return { ...done, facts: [{ fact: "sqlite memoire partagee", source: "a.cs" }] };
    if (label.startsWith("us:")) return done;
    return { verdict: "PASS", issues: [] };
  });
  assert.equal(result.ok, true);
  assert.ok(!prompts["us:US2"].includes("sqlite"));
  assert.ok(prompts["us:US3"].includes("sqlite memoire partagee"));
});
