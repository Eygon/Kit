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
  const plan = "- `src/page.tsx:15-16` — `Toolbar` — toolbar is wired here";
  const { text, changes } = relinkText(plan, () => file);
  assert.equal(changes[0].new, "21-22");
  assert.ok(text.includes("`src/page.tsx:21-22`"));
});

test("cap-check: a sketch is measured with the lint's own count (pure types and Code: refs excluded)", async () => {
  const { capReport } = await import("../cap-check.mjs");
  const sketch = [
    "## [US1] api",
    "- [ ] T001 [US1] Create `Api/Controllers/XController.cs` — Code: `Api/Controllers/YController.cs`",
    "- [ ] T002 [US1] Create `Api/Services/XService.cs` and its interface `Api/Services/Interfaces/IXService.cs`",
    "## [US2] ui",
    ...Array.from({ length: 7 }, (_, i) => `- [ ] T1${i} [US2] Create \`src/c${i}.tsx\``),
  ].join("\n");
  const [a, b] = capReport(sketch);
  assert.deepEqual(a.prod.sort(), ["Api/Controllers/XController.cs", "Api/Services/XService.cs"]);
  assert.equal(a.over, false);
  assert.equal(b.over, true);
});

test("contractWrites: a reference to the contract is not a write, an Extend/Mettre a jour is", async () => {
  const { contractWrites } = await import("../brief-fill.mjs");
  assert.deepEqual(contractWrites(["- [ ] T003 Extend `a.cs` — contract `contracts/x.yaml` — Code: `b.cs`"]), []);
  assert.deepEqual(contractWrites(["- [ ] T009 Extend `contracts/x.yaml` with y", "- [ ] T010 Mettre à jour le contrat `contracts/x.yaml`"]), ["contracts/x.yaml", "contracts/x.yaml"]);
});

test("audit-lint: a path cited in prose next to backticked facts is not a fact", async () => {
  const { mkdtempSync, writeFileSync, mkdirSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join, dirname } = await import("node:path");
  const { execFileSync } = await import("node:child_process");
  const { fileURLToPath } = await import("node:url");
  const lint = join(dirname(fileURLToPath(import.meta.url)), "..", "audit-lint.mjs");
  const repo = mkdtempSync(join(tmpdir(), "lintf-"));
  const sh = (...a) => execFileSync("git", ["-C", repo, ...a], { encoding: "utf8" });
  sh("init", "-q"); mkdirSync(join(repo, "src"));
  writeFileSync(join(repo, "src", "a.ts"), "export function foo() {}\n");
  sh("add", "-A"); sh("-c", "user.email=t@t", "-c", "user.name=t", "commit", "-qm", "i");
  const d = join(repo, "specs", "001-x"); mkdirSync(d, { recursive: true });
  writeFileSync(join(d, "spec.md"), "# s\n");
  writeFileSync(join(d, "tasks.md"), "# Tasks\n\n## [US1] X\n- [ ] T001 [US1] Extend `src/a.ts` — Test: `src/__tests__/a.test.ts`\n");
  const plan = (line) => writeFileSync(join(d, "plan.md"), `# p\n\n## Verified facts\n\n${line}\n`);
  const run = () => { try { return execFileSync("node", [lint, d], { cwd: repo, encoding: "utf8" }); } catch (e) { return String(e.stdout); } };
  plan("- `src/a.ts:1` `foo` — signature lue dans dist/index.d.ts de la lib");
  assert.doesNotMatch(run(), /verified-fact-path-missing/);
  plan("- `src/missing.ts:1` `foo` — absent");
  assert.match(run(), /verified-fact-path-missing/);
});

test("mount-check: a C# class noted `Monté dans: Program.cs` must be cited there, unnoted C# stays SKIP", async () => {
  const { mkdtempSync, writeFileSync, mkdirSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { checkMounts } = await import("../mount-check.mjs");
  const root = mkdtempSync(join(tmpdir(), "mcs-"));
  mkdirSync(join(root, "Api", "Hubs"), { recursive: true });
  writeFileSync(join(root, "Api", "Hubs", "BoardHub.cs"), "public sealed class BoardHub : Hub {}\n");
  writeFileSync(join(root, "Api", "Hubs", "Tracker.cs"), "public sealed class Tracker {}\n");
  const tasks = "- [ ] T004 [US1] Create `Api/Hubs/BoardHub.cs` — Monté dans: `Api/Program.cs`\n- [ ] T003 [US1] Create `Api/Hubs/Tracker.cs`\n";
  const files = ["Api/Hubs/BoardHub.cs", "Api/Hubs/Tracker.cs"];
  writeFileSync(join(root, "Api", "Program.cs"), "app.MapControllers();\n");
  let r = checkMounts({ root, files, tasksText: tasks });
  assert.equal(r[0].status, "UNMOUNTED");
  assert.equal(r[1].status, "SKIP");
  writeFileSync(join(root, "Api", "Program.cs"), "app.MapHub<BoardHub>(\"/hubs/board\");\n");
  r = checkMounts({ root, files, tasksText: tasks });
  assert.equal(r[0].status, "MOUNTED");
});

test("derivePaths: a dependency task opens package.json, its lockfile and a .csproj", async () => {
  const { derivePaths } = await import("../brief-fill.mjs");
  const { prod } = derivePaths([
    "- [ ] T010 [US3] Add the npm dependency `@microsoft/signalr` to `package.json` and refresh `package-lock.json` — Test: `src/__tests__/a.test.ts`",
    "- [ ] T001 [US1] Add the NuGet package to `Tableau.Tests/Tableau.Tests.csproj` — Test: `Tableau.Tests/Hubs/HubTests.cs`",
  ], "");
  for (const p of ["package.json", "package-lock.json", "yarn.lock", "Tableau.Tests/Tableau.Tests.csproj"]) assert.ok(prod.includes(p), p);
  assert.ok(!prod.includes("@microsoft/signalr"));
});

test("gate: vitest for JS test files, dotnet test filtered by class for .cs, per nearest .csproj", async () => {
  const { planGate } = await import("../gate.mjs");
  const { resolve } = await import("node:path");
  const proj = resolve("Api.Tests");
  const exists = () => true;
  const list = (d) => (d === proj ? ["Api.Tests.csproj"] : []);
  const runs = planGate(["src/__tests__/a.test.ts", "Api.Tests/Hubs/HubTests.cs", "Api.Tests/X/OtherTests.cs"], exists, list);
  assert.deepEqual(runs[0].args.slice(0, 3), ["node_modules/vitest/vitest.mjs", "run", "--coverage=false"]);
  assert.equal(runs[1].cmd, "dotnet");
  assert.ok(runs[1].args.includes("FullyQualifiedName~HubTests|FullyQualifiedName~OtherTests"));
});

test("diff-cover: an inserted block sharing its last lines with the neighbour slides to its covered position", async () => {
  const { diffCover } = await import("../diff-cover.mjs");
  // Fichier final : getById (catch jamais execute, lignes 3-4), puis exportBoard (catch couvert, 7-8).
  const text = ["get() {", "  try { a(); }", "  catch {", "    return null; }", "export() {", "  try { b(); }", "  catch {", "    return null; }"].join("\n");
  const cov = new Map([[1, 1], [2, 1], [3, 0], [4, 0], [5, 1], [6, 1], [7, 1], [8, 1]]);
  // git a vu le bloc ajoute en 3-6 (alignement sur le catch existant) au lieu de 5-8.
  const added = new Map([["src/a.ts", new Set([3, 4, 5, 6])]]);
  const [r] = diffCover(added, new Map([["src/a.ts", cov]]), () => text);
  assert.equal(r.status, "OK", JSON.stringify(r));
  const [raw] = diffCover(added, new Map([["src/a.ts", cov]]));
  assert.equal(raw.status, "GAP");
});

test("e2e-oracles: 5xx and unexpected console are captured per take(), verdict needs PASS on every run", async () => {
  const { watch, verdict } = await import("../e2e-oracles.mjs");
  const { EventEmitter } = await import("node:events");
  const page = new EventEmitter();
  const w = watch(page, { api: "http://api", expectedConsole: [/negotiation/] });
  page.emit("console", { type: () => "error", text: () => "Error: The connection was stopped during negotiation." });
  page.emit("console", { type: () => "error", text: () => "TypeError: x is undefined" });
  page.emit("response", { url: () => "http://api/boards", status: () => 500, request: () => ({ method: () => "GET" }) });
  page.emit("response", { url: () => "http://front/app.js", status: () => 500, request: () => ({ method: () => "GET" }) });
  const t = w.take();
  assert.deepEqual(t.console, ["TypeError: x is undefined"]);
  assert.deepEqual(t.fiveXX, [{ m: "GET", u: "/boards", s: 500 }]);
  assert.equal(w.take().fiveXX.length, 0);
  assert.deepEqual(verdict([["PASS", "PASS", "PASS"], ["PASS", "PASS", "FAIL"], ["PASS", "BLOQUE", "PASS"], ["PASS", "PASS"]], 3), ["PASS", "FAIL", "BLOQUE", "BLOQUE"]);
});

test("derivePaths: a shared test helper cited after Test: joins tests[], not the prod cap", async () => {
  const { derivePaths } = await import("../brief-fill.mjs");
  const { prod, tests } = derivePaths(["- [ ] T001 [US1] Extend `src/a/x.ts` — Test: `src/__tests__/x.test.ts`, `src/__tests__/helpers/builders.ts`"], "");
  assert.deepEqual(prod, ["src/a/x.ts"]);
  assert.ok(tests.includes("src/__tests__/helpers/builders.ts"));
});

test("red-replay: splitChanges keeps added/modified test files and prod sources, marks prod created by the US", async () => {
  const { splitChanges } = await import("../red-replay.mjs");
  const { tests, prod } = splitChanges(["M\tsrc/a.ts", "A\tsrc/b.ts", "A\tsrc/__tests__/b.test.ts", "D\tsrc/__tests__/old.test.ts", "M\tsrc/i18n/locales/fr.json", "A\tApi.Tests/HubTests.cs", "M\tApi/Hub.cs", "A\tsrc/__tests__/helpers/builders.ts"].join("\n"));
  assert.deepEqual(tests, ["src/__tests__/b.test.ts", "Api.Tests/HubTests.cs"]);
  assert.deepEqual(prod, [{ path: "src/a.ts", added: false }, { path: "src/b.ts", added: true }, { path: "Api/Hub.cs", added: false }]);
});

test("red-replay: a ticked task whose Test: file the US never touched is reported", async () => {
  const { untouchedTestTasks } = await import("../red-replay.mjs");
  const tasks = "## [US1] X\n- [X] T001 [US1] Create `src/a.ts` — Test: `src/__tests__/a.test.ts`\n- [X] T002 [US1] Extend `src/b.ts` — Test: `src/__tests__/b.test.ts`\n- [X] T003 [US1] Keys — Test: `src/__tests__/i18n/localesParity.test.ts`\n## [US2] Y\n- [X] T004 [US2] Z — Test: `src/__tests__/z.test.ts`\n";
  const out = untouchedTestTasks(tasks, "US1", new Set(["src/__tests__/a.test.ts"]));
  assert.deepEqual(out.map((x) => x.task), ["T002"]);
});

test("contract-cover: each response code of the story's operations needs a test naming the verb and the code", async () => {
  const { contractOps, opsOfStory, contractCover } = await import("../contract-cover.mjs");
  const yaml = "openapi: 3.0.3\npaths:\n  /api/v1/users:\n    get:\n      responses:\n        '200':\n          description: ok\n        '204':\n          description: empty\n  /api/v1/boards/import:\n    post:\n      responses:\n        '201':\n          description: c\n";
  const ops = opsOfStory(contractOps(yaml), ["- [ ] T006 [US2] Create `UsersController.cs` — GET /api/v1/users -> 200 list, 204 empty"]);
  assert.deepEqual(ops.map((o) => o.method + " " + o.path), ["GET /api/v1/users"]);
  const tests = "+    [Test]\n+    public async Task Get_Returns200()\n+        var r = await c.GetAsync(\"/api/v1/users\");\n+        r.StatusCode.ShouldBe(HttpStatusCode.OK);\n+    [Test]\n+    public async Task Delete_Returns204()\n+        await c.GetAsync(\"/x\");\n+        r.StatusCode.ShouldBe(HttpStatusCode.NoContent);";
  const rows = contractCover(ops, tests);
  assert.deepEqual(rows.map((r) => `${r.code}:${r.ok}`), ["200:true", "204:false"]);
});

test("applyConditions resolves nested blocks", async () => {
  const { applyConditions } = await import("../brief-fill.mjs");
  const t = "a\n<!-- if:contract -->\n<!-- if:back -->\nB\n<!-- /if:back -->\nC\n<!-- /if:contract -->\nz";
  assert.equal(applyConditions(t, { contract: true, back: false }), "a\nC\nz");
  assert.equal(applyConditions(t, { contract: true, back: true }), "a\nB\nC\nz");
});

test("e2e-oracles: contraste WCAG (noir/blanc 21, texte clair sur post-it jaune du banc TK-3 sous le seuil)", async () => {
  const { contrast, luminance } = await import("../e2e-oracles.mjs");
  assert.equal(Math.round(contrast("rgb(0, 0, 0)", "rgb(255, 255, 255)")), 21);
  assert.equal(luminance("rgba(255, 255, 255, 1)"), 1);
  assert.ok(contrast("rgb(230, 232, 238)", "rgb(253, 230, 138)") < 1.1);
  assert.ok(contrast("rgb(17, 24, 39)", "rgb(253, 230, 138)") > 4.5);
});
