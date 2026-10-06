// node --test skills/_shared/tests/*.test.mjs — tests of the deterministic helpers of the kit.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { tasksOfStory, applyConditions } from "../brief-fill.mjs";
import { localesOf } from "../sk-probe.mjs";
import { propsOf } from "../recon-seed.mjs";

test("tasksOfStory reads the kit layout `## [USn]`", () => {
  const t = "## [US3] Titre\n\n- [ ] T010 Creer `src/c.ts`\n- [X] T011 [US3] Modifier `src/d.ts`\n\n## [US4] x\n- [ ] T012 y\n";
  assert.equal(tasksOfStory(t, "US3").length, 2);
  assert.equal(tasksOfStory(t, "US4").length, 1);
});

test("tasksOfStory reads spec-kit's own layout (Phase k: User Story n, [USn] labels)", () => {
  const t = [
    "## Phase 3: User Story 1 - Filtre (Priority: P1)",
    "### Tests for User Story 1",
    "- [ ] T001 [P] [US1] Test in src/__tests__/a.test.ts",
    "### Implementation for User Story 1",
    "- [ ] T002 [US1] Creer `src/a.ts`",
    "## Phase 4: User Story 2 - Autre (Priority: P2)",
    "- [ ] T003 [US2] Modifier `src/b.ts`",
    "## Phase 5: Polish",
    "- [ ] T004 [US1] label wins over heading",
  ].join("\n");
  assert.deepEqual(tasksOfStory(t, "US1").map((l) => l.match(/T\d+/)[0]), ["T001", "T002", "T004"]);
  assert.deepEqual(tasksOfStory(t, "US2").map((l) => l.match(/T\d+/)[0]), ["T003"]);
  assert.equal(tasksOfStory(t, "US11").length, 0);
});

test("applyConditions keeps or drops marked blocks", () => {
  const t = "a\n<!-- if:design -->\nD\n<!-- /if:design -->\nb\n<!-- if:contract -->\nC\n<!-- /if:contract -->\nc\n";
  assert.equal(applyConditions(t, { design: true, contract: false }), "a\nD\nb\nc\n");
  assert.equal(applyConditions(t, { design: false, contract: false }), "a\nb\nc\n");
});

test("localesOf picks the folder with the most languages", () => {
  const r = localesOf(["src/i18n/locales/fr.json", "src/i18n/locales/en.json", "src/i18n/locales/es.json", "public/i18n/fr.json", "src/__tests__/i18n/fr.json"]);
  assert.deepEqual(r, { dir: "src/i18n/locales", langs: ["en", "es", "fr"] });
});

test("propsOf reads the destructured props of a component", () => {
  const src = "export const PaginatedGrid = <T,>({\n  columns,\n  data,\n  pageSize = 20,\n  onRowClick,\n}: P<T>) => null";
  assert.deepEqual(propsOf(src, "PaginatedGrid"), ["columns", "data", "pageSize", "onRowClick"]);
  assert.deepEqual(propsOf("export function Badge({ tone, children }: Props) {}", "Badge"), ["tone", "children"]);
});

import { indexIds, alwaysOf, idsOfStory, normId } from "../standards-pack.mjs";

test("standards-pack reads index ids, alwaysInject and story anchors", () => {
  const yml = "_meta:\n  maxPerGroup: 5\n  alwaysInject:\n    - no-comments\n    - css/tailwind-tokens\n\nno-comments:\n  description: x\n  tags: [naming]\n\ncss:\n  tailwind-tokens:\n    description: y\n  rem-units:\n    description: z\n";
  assert.deepEqual([...indexIds(yml)].sort(), ["css/rem-units", "css/tailwind-tokens", "no-comments"]);
  assert.deepEqual(alwaysOf(yml), ["no-comments", "css/tailwind-tokens"]);
  const tasks = "## [US1] A\nStandards: @agent-os/standards/react/hooks, @agent-os/standards/api/service-structure.md\n- [ ] T001 [US1] x\n## [US2] B\nStandards: @agent-os/standards/react/forms\n- [ ] T002 [US2] y @agent-os/standards/react/i18n\n";
  assert.deepEqual(idsOfStory(tasks, "US1").sort(), ["api/service-structure", "react/hooks"]);
  assert.deepEqual(idsOfStory(tasks, "US2").sort(), ["react/forms", "react/i18n"]);
  assert.equal(normId("`@agent-os/standards/react/hooks.md`,"), "react/hooks");
});

test("standards-pack takes the file-level Standards line for every story", () => {
  const tasks = "# Tasks: x\n\nStandards: @agent-os/standards/api/service-structure, @agent-os/standards/http-status\n\n## [US1] A\n- [ ] T001 [US1] x\n## [US2] B\nStandards: @agent-os/standards/react/forms\n";
  assert.deepEqual(idsOfStory(tasks, "US1").sort(), ["api/service-structure", "http-status"]);
  assert.deepEqual(idsOfStory(tasks, "US2").sort(), ["api/service-structure", "http-status", "react/forms"]);
});

import { mergeTasks } from "../tasks-merge.mjs";

test("tasks-merge unions the [X] of each slot copy by task id, never unticks", () => {
  const front = "## [US1] a\n- [ ] T001 [US1] back\n- [X] T010 [US3] front\n- [ ] T011 [US3] front\n";
  const back = "## [US1] a\n- [X] T001 [US1] back\n- [ ] T010 [US3] front\n- [ ] T011 [US3] front\n";
  const r = mergeTasks(front, [back]);
  assert.deepEqual(r.added, ["T001"]);
  assert.equal(r.text, "## [US1] a\n- [X] T001 [US1] back\n- [X] T010 [US3] front\n- [ ] T011 [US3] front\n");
});

import { derivePaths } from "../brief-fill.mjs";
import { extractDesign } from "../design-extract.mjs";

test("derivePaths reads prod and test paths of the task lines, LOCALES from recon.md", () => {
  const tasks = [
    "- [ ] T001 [US1] Creer `src/a/b.tsx` et son type `src/types/b.ts` — Code: `src/x/model.tsx` — Test: `src/__tests__/a/b.test.tsx` — Monté dans: `src/pages/p.tsx`",
    "- [ ] T002 [US1] Ajouter les cles dans `src/i18n/locales/fr.json` — Test: `src/__tests__/i18n/parity.test.ts`",
    "- [ ] T003 [US1] Creer `src/c.ts` — Monté dans: `src/pages/q.tsx` (US2)",
  ];
  const recon = "- LOCALES : src/i18n/locales/{en,es,fr}.json — chaque cle";
  const r = derivePaths(tasks, recon);
  assert.deepEqual(r.prod.sort(), ["src/a/b.tsx", "src/c.ts", "src/i18n/locales/en.json", "src/i18n/locales/es.json", "src/i18n/locales/fr.json", "src/pages/p.tsx", "src/types/b.ts"]);
  assert.deepEqual(r.tests.sort(), ["src/__tests__/a/b.test.tsx", "src/__tests__/i18n/parity.test.ts"]);
});

test("extractDesign keeps the anchored sections, the tokens table and the arbitrations verbatim", () => {
  const d = "# Design\n## 3. Token mapping\n| a | b |\n## C1 Panel\nwidth 360px\n### Etats\nhover\n## C2 Header\nh 48px\n## 5. Library <-> design arbitrations\n- G1 x\n";
  const r = extractDesign(d, ["C1"]);
  assert.deepEqual(r.missing, []);
  assert.match(r.text, /## C1 Panel\nwidth 360px\n### Etats\nhover/);
  assert.match(r.text, /\| a \| b \|/);
  assert.match(r.text, /G1 x/);
  assert.doesNotMatch(r.text, /C2 Header/);
  assert.deepEqual(extractDesign(d, ["C9"]).missing, ["#C9"]);
});

import { runChecks } from "../standards-pack.mjs";
import { mkdtempSync, writeFileSync as wf, mkdirSync as md } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { join as pj } from "node:path";

test("standards-pack check catches the banned patterns on added lines only", () => {
  const dir = mkdtempSync(pj(tmpdir(), "skchk-"));
  const g = (...a) => execFileSync("git", a, { cwd: dir, stdio: "ignore" });
  g("init", "-q"); md(pj(dir, "src/api"), { recursive: true }); md(pj(dir, "Api/Controllers"), { recursive: true });
  wf(pj(dir, "src/a.tsx"), "export const A = () => null;\n");
  g("add", "-A"); g("-c", "user.email=a@b", "-c", "user.name=t", "commit", "-qm", "base");
  wf(pj(dir, "src/a.tsx"), "export const A = () => null;\n// explain\nconst x: any = 1;\nif (r.status === 404) {}\n<button>x</button>\n");
  wf(pj(dir, "src/api/s.ts"), "const d = new Date().toISOString();\n");
  wf(pj(dir, "Api/Controllers/X.cs"), "public class X : ControllerBase { }\n[Table(\"t\")]\n");
  const pack = "## Controles mecaniques\n\n```json\n" + JSON.stringify(Object.entries(JSON.parse(readFileSync(new URL("../standards-checks.json", import.meta.url), "utf8"))).filter(([k]) => k !== "_doc").flatMap(([id, rs]) => rs.map((r) => ({ id, ...r })))) + "\n```\n";
  const ids = runChecks(dir, pack, {}).map((h) => h.split(" ")[1]);
  for (const id of ["no-comments", "typing/generic-unknown-slots", "http-status", "septeo-library-first", "api/service-structure", "global/sealed-by-default", "controllers/controller-patterns", "data-access/ef-entity-type-configuration"])
    assert.ok(ids.includes(id), `missing ${id}`);
  assert.ok(!runChecks(dir, pack, {}).some((h) => h.includes("export const A")));
});

test("contractWrites flags a task that writes the frozen contract, not one that cites it", async () => {
  const { contractWrites } = await import("../brief-fill.mjs");
  assert.deepEqual(contractWrites(["- [ ] T040 [US7] Extend `specs/001-x/contracts/comments.yaml` `CommentDto` with `pinned`"]), ["specs/001-x/contracts/comments.yaml"]);
  assert.deepEqual(contractWrites(["- [ ] T012 [US3] Create `src/api/c.ts` (GET contracts/comments.yaml `getComments`) — Code: `specs/001-x/contracts/comments.yaml`"]), []);
});

test("audit-lint leaves the `and its` companions out of the file cap, up to 8 files", async () => {
  const { mkdtempSync, writeFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join, dirname } = await import("node:path");
  const { execFileSync } = await import("node:child_process");
  const { fileURLToPath } = await import("node:url");
  const lint = join(dirname(fileURLToPath(import.meta.url)), "..", "audit-lint.mjs");
  const run = (lines) => {
    const d = mkdtempSync(join(tmpdir(), "lint-"));
    writeFileSync(join(d, "tasks.md"), `# Tasks\n\n## [US1] X\n${lines.join("\n")}\n`);
    writeFileSync(join(d, "spec.md"), "# s\n");
    writeFileSync(join(d, "plan.md"), "# p\n");
    try { return execFileSync("node", [lint, d], { encoding: "utf8" }); } catch (e) { return String(e.stdout); }
  };
  const t = (n, body) => `- [ ] T00${n} [US1] ${body} — Test: \`src/__tests__/t${n}.test.ts\``;
  const base = [t(3, "Create `src/a/useC.ts`"), t(4, "Create `src/a/d.tsx`"), t(5, "Create `src/a/e.tsx`"), t(6, "Extend `src/a/page.tsx`")];
  assert.doesNotMatch(run([t(1, "Create `src/a/useA.ts` and its key factory `src/k/aKeys.ts`"), t(2, "Create `src/a/useB.ts` and its key factory `src/k/bKeys.ts`"), ...base]), /story-too-many-prod-files/);
  assert.match(run([t(1, "Create `src/a/useA.ts` and its key factory `src/k/aKeys.ts`, `src/k/a2.ts`"), t(2, "Create `src/a/useB.ts` and its key factory `src/k/bKeys.ts`, `src/k/b2.ts`"), ...base]), /compagnons compris/);
});

test("standards-pack reads a flat index (`game/x:` keys) and its tags", async () => {
  const { indexIds, indexTags } = await import("../standards-pack.mjs");
  const yml = "_meta:\n  alwaysInject:\n    - no-comments\n\nno-comments:\n  description: d\n  tags: [naming]\n\ngame/dom-hud:\n  description: d\n  tags: [ui]\n\nreact:\n  file-decomposition:\n    description: d\n    tags: [structure]\n";
  const ids = indexIds(yml);
  for (const id of ["no-comments", "game/dom-hud", "react/file-decomposition"]) assert.ok(ids.has(id), id);
  assert.deepEqual(indexTags(yml).get("game/dom-hud"), ["ui"]);
});

test("derivePaths keeps the test of a companion cited in the task body", async () => {
  const { derivePaths } = await import("../brief-fill.mjs");
  const r = derivePaths(["- [ ] T002 [US1] Create `src/r/b.ts` and its texture factory `src/r/t/s.ts` (test `src/__tests__/r/t/s.test.ts`) — Test: `src/__tests__/r/b.test.ts`"], "");
  assert.deepEqual(r.tests.sort(), ["src/__tests__/r/b.test.ts", "src/__tests__/r/t/s.test.ts"]);
  assert.ok(r.prod.includes("src/r/t/s.ts"));
});

test("derivePaths opens the recon.md PARTAGE files to every story", async () => {
  const { derivePaths } = await import("../brief-fill.mjs");
  const r = derivePaths(["- [ ] T005 [US2] Create `src/e/t.ts` — Test: `src/__tests__/e/t.test.ts`"], "## Pieges verifies\n\n- PARTAGE : `src/config/visualConfig.ts`, `src/ui/texts.ts` — ajout seulement\n");
  assert.deepEqual(r.shared, ["src/config/visualConfig.ts", "src/ui/texts.ts"]);
  assert.ok(r.prod.includes("src/config/visualConfig.ts"));
});

test("brief-fill renders worker facts given as {fact, source} objects", async () => {
  const { mkdtempSync, writeFileSync, readFileSync, mkdirSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join, dirname } = await import("node:path");
  const { execFileSync } = await import("node:child_process");
  const { fileURLToPath } = await import("node:url");
  const here = dirname(fileURLToPath(import.meta.url));
  const slot = mkdtempSync(join(tmpdir(), "bf-"));
  const fd = join(slot, "specs", "001-x");
  mkdirSync(join(fd, "briefs"), { recursive: true });
  writeFileSync(join(fd, "tasks.md"), "## [US1] X\n- [ ] T001 [US1] Create `src/a/b.ts` — Test: `src/__tests__/a/b.test.ts`\n");
  writeFileSync(join(fd, "spec.md"), "### User Story 1 - X\n**Acceptance Scenarios**:\n1. **Given** a, **When** b, **Then** c.\n");
  const json = join(fd, "briefs", "US1.json");
  writeFileSync(json, JSON.stringify({ featureDir: fd, slot, us: "US1", skShared: join(here, ".."), lecture: [], facts: [{ fact: "le stick vit dans #app", source: "src/e/t.ts:12" }, "fait texte"] }));
  try { execFileSync("node", [join(here, "..", "brief-fill.mjs"), json, "--out", join(fd, "briefs")], { cwd: slot, encoding: "utf8" }); } catch {}
  const brief = readFileSync(join(fd, "briefs", "US1-worker.md"), "utf8");
  assert.match(brief, /- le stick vit dans #app — source: src\/e\/t\.ts:12/);
  assert.match(brief, /- fait texte/);
  assert.doesNotMatch(brief, /object Object/);
});

test("facts-add merges worker facts by text, keeps the newest, and brief-fill injects facts.json", async () => {
  const { mergeFacts, factsOfOutput, MAX_FACTS } = await import("../facts-add.mjs");
  const a = mergeFacts([], [{ fact: "f1", source: "a" }, "f2"], "US1");
  const b = mergeFacts(a, [{ fact: "f1", source: "b" }], "US2");
  assert.deepEqual(b.map((f) => f.fact), ["f2", "f1"]);
  assert.equal(b[1].source, "b");
  assert.equal(mergeFacts([], Array.from({ length: MAX_FACTS + 5 }, (_, i) => `x${i}`)).length, MAX_FACTS);
  assert.deepEqual(factsOfOutput('rapport\n```json\n{"stopped":false,"facts":[{"fact":"z","source":"s"}]}\n```\nfin').map((f) => f.fact), ["z"]);
});

test("lanes plans waves: shared prod file keeps order, disjoint stories run together, PARTAGE ignored with union", async () => {
  const { planWaves } = await import("../lanes.mjs");
  const tasks = [
    "## [US1] A", "- [ ] T001 [US1] Create `src/a/one.ts` and extend `src/config/shared.ts` — Test: `src/__tests__/a/one.test.ts`",
    "## [US2] B", "- [ ] T002 [US2] Create `src/b/two.ts` and extend `src/config/shared.ts` — Test: `src/__tests__/b/two.test.ts`",
    "## [US3] C", "- [ ] T003 [US3] Extend `src/a/one.ts` — Test: `src/__tests__/a/one.test.ts`",
  ].join("\n");
  assert.deepEqual(planWaves(tasks).waves, [["US1"], ["US2", "US3"]]);
  assert.deepEqual(planWaves(tasks, { shared: ["src/config/shared.ts"] }).waves, [["US1", "US2"], ["US3"]]);
});

test("diff-cover: added lines never executed are reported as GAP, tests and NOCOV are not blocking", async () => {
  const { addedLines, parseLcov, diffCover, ranges } = await import("../diff-cover.mjs");
  const diff = [
    "+++ b/src/a.ts",
    "@@ -0,0 +1,4 @@",
    "+const x = 1;",
    "+export const f = () => {",
    "+  return x;",
    "+};",
    "+++ b/src/__tests__/a.test.ts",
    "@@ -0,0 +1 @@",
    "+it('x', () => {});",
    "+++ b/src/main.ts",
    "@@ -3,0 +4 @@",
    "+start();",
  ].join("\n");
  const lcov = ["SF:src/a.ts", "DA:1,1", "DA:2,1", "DA:3,0", "end_of_record"].join("\n");
  const report = diffCover(addedLines(diff), parseLcov(lcov, "."));
  assert.deepEqual(report.map((r) => [r.file, r.status, r.missed]), [
    ["src/a.ts", "GAP", [3]],
    ["src/main.ts", "NOCOV", []],
  ]);
  assert.equal(ranges([7, 3, 4, 5, 9]), "3-5,7,9");
});

test("diff-cover: C# auto-properties are not executable lines", async () => {
  const { addedLines } = await import("../diff-cover.mjs");
  const diff = ["+++ b/Api/X.cs", "@@ -0,0 +1,3 @@", "+public int Id { get; set; }", "+public string N { get; private set; }", "+return Id;"].join("\n");
  assert.deepEqual([...addedLines(diff).get("Api/X.cs")], [3]);
});

test("facts: us and repo survive a round trip, and a repo only sees its own facts", async () => {
  const { mergeFacts, factsForRepo } = await import("../facts-add.mjs");
  const a = mergeFacts([], [{ fact: "back trick", source: "x.cs" }], "US1", "/r/back");
  const b = mergeFacts(a, [{ fact: "front trick", source: "y.ts" }], "US4", "/r/front");
  const all = mergeFacts(b, [{ fact: "global" }]);
  assert.deepEqual(factsForRepo(all, "/r/front").map((f) => f.fact), ["front trick", "global"]);
  assert.equal(all[0].us, "US1");
  assert.equal(all[0].repo, "/r/back");
});

test("mount-check: a task naming the file as its mount target does not shadow the file's own task", async () => {
  const { mkdtempSync, mkdirSync, writeFileSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { checkMounts } = await import("../mount-check.mjs");
  const root = mkdtempSync(join(tmpdir(), "mc-"));
  mkdirSync(join(root, "src/panel"), { recursive: true });
  writeFileSync(join(root, "src/panel/panel.tsx"), "export const Panel = () => null;\n");
  const tasks = [
    "- [X] T016 [US5] Create `src/useX.ts` — Monté dans: `src/panel/panel.tsx`",
    "- [X] T018 [US5] Create `src/panel/panel.tsx` — Monté dans: `src/board.tsx` (US6)",
  ].join("\n");
  const [r] = checkMounts({ root, files: ["src/panel/panel.tsx"], tasksText: tasks });
  assert.equal(r.status, "PLANNED");
  assert.equal(r.owner, "US6");
});

test("lanes: a story naming a class created earlier (same stack) or citing (USn) waits; a same name across stacks does not", async () => {
  const { planWaves } = await import("../lanes.mjs");
  const tasks = [
    "## [US1] model",
    "- [ ] T001 [US1] Create `Api/Entities/Comment.cs` and its DTO `Api/Dtos/CommentDto.cs`",
    "## [US2] api",
    "- [ ] T002 [US2] Create `Api/Controllers/CommentsController.cs` returning `CommentDto`",
    "## [US3] front model",
    "- [ ] T003 [US3] Create `src/types/models/comment.ts` (Comment model)",
    "## [US4] front hook",
    "- [ ] T004 [US4] Create `src/hooks/useComments.ts` calling the service (US3)",
  ].join("\n");
  assert.deepEqual(planWaves(tasks).waves, [["US1", "US3"], ["US2", "US4"]]);
});

test("diff-cover: a branch never taken on an executed added line is reported as BRANCH", async () => {
  const { addedLines, parseLcov, diffCover } = await import("../diff-cover.mjs");
  const diff = ["+++ b/Api/C.cs", "@@ -0,0 +1,2 @@", "+var r = Get();", "+return r.Count == 0 ? NoContent() : Ok(r);"].join("\n");
  const lcov = ["SF:Api/C.cs", "DA:1,3", "DA:2,3", "BRDA:2,0,0,0", "BRDA:2,0,1,3", "end_of_record"].join("\n");
  const [r] = diffCover(addedLines(diff), parseLcov(lcov, "."));
  assert.equal(r.status, "BRANCH");
  assert.deepEqual(r.branches, [2]);
});

test("fact-lines: a fact whose symbol slid is moved to the nearest non-import occurrence", async () => {
  const { relinkText } = await import("../fact-lines.mjs");
  const file = ["import Toolbar from './t';", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "const x = 1;", "", "  <Toolbar a={1} />"].join("\n");
  const plan = "- `src/page.tsx:3-4` — `Toolbar` — toolbar is wired here";
  const { text, changes } = relinkText(plan, () => file);
  assert.equal(changes[0].new, "21-22");
  assert.ok(text.includes("`src/page.tsx:21-22`"));
});
