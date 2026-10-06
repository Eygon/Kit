// node --test skills/_shared/tests/*.test.mjs — tests of the deterministic helpers of the kit.
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
