// Fills the three briefs of one user story (worker us-sonnet.md, reviewer us-reviewer.md, fix
// us-fix.md) from a small JSON written by /sk-impl. The parent keeps the judgment (which files
// the US may touch, which facts it established, what the worker should open first); the script
// does the copying that was done by hand and went wrong: task lines and acceptance scenarios
// copied verbatim, the same paths in the three briefs, no placeholder left behind, no `Test:`
// or `Monté dans:` of the US forgotten in the path lists.
// Measured: on 918 the parent wrote such a script outside the kit and its workers needed 17-36
// turns, against 48-98 on 917 where briefs were written by hand (facts lost from US3 on, review
// and fix prompts missing on 8 groups out of 10).
//
// Usage: node brief-fill.mjs <us.json> [--out <dir>]
//   us.json : { "featureDir": "<slot>/specs/<feature>", "slot": "<SLOT_CWD>", "us": "US3",
//     "skShared": "<SK_HOME>/skills/_shared", "prod": [...], "tests": [...], "standards": [...],
//     "lecture": [...], "facts": [...], "designPath"?, "anchors"?: ["#C1"], "contractPath"?,
//     "contractHash"?, "reconPath"?, "specPath"?, "tasksPath"?, "workerNotes"?, "reviewNotes"? }
// Writes <out>/<US>-worker.md, -review.md, -fix.md (out defaults to the json's folder) and exits 1
// when a brief would be incomplete. Prints one line per check.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { extractAcceptance } from "./spec-ac.mjs";
import { buildPack, idsOfStory } from "./standards-pack.mjs";
import { extractDesign } from "./design-extract.mjs";

const norm = (p) => String(p).replace(/\\/g, "/").replace(/^api:/, "").trim();

// Task lines of one story. A line belongs to USn when it carries the `[USn]` label, wherever
// it sits, or when it has no label and sits under a `## [USn] ...` or `## Phase k: User Story n`
// heading (spec-kit's own layout). Matching the `## [USn]` heading only returned 0 tasks on a
// tasks.md left in spec-kit's layout, and brief-fill then refused every brief.
// Chemins de contrat (contracts/*.yaml|json) qu une tache ECRIT : hors Code:/Eviter:/Test:.
export const contractWrites = (tasks) =>
  tasks.flatMap((line) =>
    [...line.replace(/(?:Code|Eviter|Avoid|Test):\s*[^—]*/g, " ").matchAll(/`([^`]*contracts\/[^`]+\.(?:ya?ml|json))`/g)].map((m) => m[1].replace(/\\/g, "/")),
  );

export const tasksOfStory = (tasksText, us) => {
  const n = String(us).replace(/^US/i, "");
  const label = new RegExp(`\\[US${n}\\]`, "i");
  const anyLabel = /\[US\d+\]/i;
  const head = new RegExp(`^##\\s+(?:\\[US${n}\\]|(?:Phase\\s+\\d+\\s*:\\s*)?User Story\\s+${n}\\b)`, "i");
  const out = [];
  let inStory = false;
  for (const line of tasksText.split(/\r?\n/)) {
    if (/^##\s/.test(line)) inStory = head.test(line);
    if (!/^- \[[ xX]\] T\d+/.test(line)) continue;
    if (label.test(line) || (inStory && !anyLabel.test(line))) out.push(line);
  }
  return out;
};

const TEST_REF = /Test:\s*`?([^`\s(]+\.(?:test|spec)\.[jt]sx?|[^`\s(]+Tests?\.cs)`?/g;
const MOUNT_REF = /Mont[ée] dans:\s*`?([^`\s(]+)`?(\s*\((US\d+)\))?/g;

export const checkStory = (tasks, us, json) => {
  const prod = new Set((json.prod || []).map(norm));
  const tests = new Set((json.tests || []).map(norm));
  const problems = [];
  for (const line of tasks) {
    for (const m of line.matchAll(TEST_REF))
      if (!tests.has(norm(m[1]))) problems.push(`test cite par la tache absent de tests[] : ${norm(m[1])}`);
    for (const m of line.matchAll(MOUNT_REF)) {
      const owner = m[3];
      if (owner && owner.toUpperCase() !== us.toUpperCase()) continue;
      if (!prod.has(norm(m[1]))) problems.push(`cible de montage de l US absente de prod[] : ${norm(m[1])}`);
    }
  }
  return problems;
};

const replaceAll = (text, pairs) => pairs.reduce((t, [from, to]) => t.split(from).join(to), text);

// `<!-- if:design -->...<!-- /if:design -->` : kept (markers removed) when the condition holds,
// dropped otherwise. A brief without design or contract no longer carries the ~5 KB of rules
// that only apply to them, which every agent read in full and some applied anyway.
export const applyConditions = (text, conds) =>
  text
    .replace(/<!-- if:(\w+) -->\n?([\s\S]*?)<!-- \/if:\1 -->\n?/g, (_, name, body) => (conds[name] ? body : ""))
    .replace(/\n{3,}/g, "\n\n");

// prod[] et tests[] deduits des lignes de tache quand le parent ne les donne pas : chemins de la
// ligne hors `Code:` / `Eviter:` / `Test:`, cibles `Monté dans:` sans (US<n>), fichiers LOCALES de
// recon.md si une tache touche une langue ; `Test:` pour les tests. Le parent garde la main : ce
// qu il donne s ajoute. (Banc : l orchestrateur passait ~3 min a recopier, et oubliait un fichier.)
export const derivePaths = (tasks, reconText) => {
  const prod = new Set();
  const tests = new Set();
  for (const line of tasks) {
    for (const m of line.matchAll(TEST_REF)) tests.add(norm(m[1]));
    for (const m of line.matchAll(MOUNT_REF)) if (!m[3]) prod.add(norm(m[1]));
    const body = line.replace(/(?:Code|Eviter|Avoid|Test):\s*[^—]*/g, " ").replace(MOUNT_REF, " ");
    for (const m of body.matchAll(/`([\w./@-]+\.(?:tsx?|jsx?|cs|json|s?css))`/g)) {
      const p = norm(m[1]);
      if (p.includes("/") && !/(^|\/)(?:__tests__|specs|contracts)\//.test(p) && !/\.(test|spec)\./.test(p)) prod.add(p);
      // Test d un compagnon cite dans le corps (« and its x `a.ts` (test `a.test.ts`) ») : banc jeu.
      else if (p.includes("/") && /\.(test|spec)\./.test(p)) tests.add(p);
    }
  }
  if (reconText && [...prod].some((p) => /(?:locales|i18n|translations|lang)\/[\w-]+\.json$/.test(p))) {
    const loc = reconText.match(/LOCALES\s*:\s*([\w./-]+)\/\{([^}]+)\}\.json/);
    if (loc) for (const l of loc[2].split(",")) prod.add(`${loc[1]}/${l.trim()}.json`);
  }
  // Fichiers partages (registre de config, textes) ou les standards rangent des entrees : toute US
  // peut y AJOUTER (recon.md `- PARTAGE : \`a.ts\`, \`b.ts\``). Banc jeu : 2 ESCALATE pour visualConfig.
  const shared = reconText ? [...(reconText.match(/^- PARTAGE\s*:.*$/m)?.[0] || "").matchAll(/`([\w./@-]+)`/g)].map((m) => norm(m[1])) : [];
  for (const p of shared) prod.add(p);
  return { prod: [...prod], tests: [...tests], shared };
};

export const fillBriefs = (json, templates) => {
  const us = json.us;
  const dir = json.featureDir;
  const feature = basename(norm(dir));
  const tasksPath = json.tasksPath || join(dir, "tasks.md");
  const specPath = json.specPath || join(dir, "spec.md");
  const reconPath = json.reconPath || (existsSync(join(dir, "recon.md")) ? join(dir, "recon.md") : "aucun");
  const tasks = tasksOfStory(readFileSync(tasksPath, "utf8"), us);
  const derived = derivePaths(tasks, reconPath !== "aucun" && existsSync(reconPath) ? readFileSync(reconPath, "utf8") : "");
  json.prod = [...new Set([...(json.prod || []).map(norm), ...derived.prod])];
  json.tests = [...new Set([...(json.tests || []).map(norm), ...derived.tests])];
  const sharedNote = derived.shared.length ? `\n\n## Fichiers partages (ajout seulement)\n\n${derived.shared.map((p) => `- \`${p}\``).join("\n")} : tu peux y AJOUTER les entrees que les standards y rangent (config visuelle, textes...) ; ne modifie ni ne retire une entree existante.\n` : "";
  const acceptance = extractAcceptance(readFileSync(specPath, "utf8"), us);
  const list = (a) => (a && a.length ? a.join("\n") : "aucune");
  // Les workers rendent facts: [{fact, source}] ; recopies tels quels, ils sortaient en
  // « [object Object] » (banc jeu : 22 faits perdus sur une feature entiere).
  const factLine = (f) => (f && typeof f === "object" ? `${f.fact}${f.source ? ` — source: ${f.source}` : ""}` : String(f));
  const facts = json.facts && json.facts.length ? json.facts.map((f) => "- " + factLine(f)).join("\n") : "Aucun fait transmis : recon.md fait foi.";
  // Standards : corps des standards de l US (alwaysInject + ancres de tasks.md + json.standards),
  // lus dans le depot de l US (standardsRoot : le slot front, ou le slot back pour une US back).
  const standardsRoot = json.standardsRoot || json.slot;
  const standardsIds = [...new Set([...(json.standards || []), ...idsOfStory(readFileSync(tasksPath, "utf8"), us)])];
  const pack = json.noStandardsPack ? null : buildPack({ root: standardsRoot, ref: json.standardsRef || null, ids: standardsIds, prodPaths: json.prod || [] });
  const packPath = pack && !pack.error ? join(json.briefsDir || join(dir, "briefs"), `${us}-standards.md`) : null;
  // Design : ancres `Design: design.md#C<n>` des taches de l US -> extrait design-<US>.md ecrit par
  // l outil (sections + §3 + §5, sans reformulation), sauf si le parent a deja donne designPath.
  const anchorsOfTasks = [...new Set(tasks.flatMap((l) => [...l.matchAll(/Design:\s*`?design\.md#(C\d+(?:\s*,\s*#?C\d+)*)/g)].flatMap((m) => m[1].match(/C\d+/g))))];
  const designFile = join(dir, "design.md");
  let designExtract = null;
  if (!json.designPath && anchorsOfTasks.length && existsSync(designFile)) {
    designExtract = extractDesign(readFileSync(designFile, "utf8"), anchorsOfTasks);
    json.designPath = join(json.briefsDir || join(dir, "briefs"), `design-${us}.md`);
    json.anchors = json.anchors || anchorsOfTasks.map((a) => "#" + a);
  }
  const common = [
    ["<SLOT_CWD>", json.slot],
    ["<US_ID>", us],
    ["<SK_SHARED>", json.skShared],
    ["<PROD_PATHS>", list(json.prod)],
    ["<TEST_FILES>", list(json.tests)],
    ["<RECON_PATH ou aucun>", reconPath],
    ["<RECON_PATH ou vide>", reconPath === "aucun" ? "vide" : reconPath],
    ["<CONTRACT_PATH ou vide>", json.contractPath || "vide"],
    ["<CONTRACT_PATH>", json.contractPath || "vide"],
    ["<CONTRACT_HASH ou vide>", json.contractHash || "vide"],
    ["<DESIGN_PATH ou aucun>", json.designPath || "aucun"],
    ["<DESIGN_PATH ou vide>", json.designPath || "vide"],
    ["<#C<n>, #C<m>... ou aucune>", json.anchors && json.anchors.length ? json.anchors.join(", ") : "aucune"],
    ["<#C<n>... ou vide>", json.anchors && json.anchors.length ? json.anchors.join(", ") : "vide"],
    ["<TASKS_PATH>", tasksPath],
    ["<SPEC_PATH>", specPath],
    ["<STANDARDS_PACK>", packPath || "aucun (agent-os/standards absent du depot de l US)"],
    ["<STANDARDS_ROOT>", standardsRoot],
  ];
  const conds = { design: Boolean(json.designPath), contract: Boolean(json.contractPath) };
  templates = {
    worker: applyConditions(templates.worker, conds),
    review: applyConditions(templates.review, conds),
    fix: applyConditions(templates.fix, conds),
  };
  const worker = replaceAll(templates.worker, [
    ...common,
    ["<FEATURE>", feature],
    ["<STANDARDS_PATHS>", list(json.standards)],
    ["<fichier:lignes, un par ligne, ou aucune>", list(json.lecture)],
    ["<FACTS>", facts],
    ["<TASK_LIST>", tasks.join("\n")],
    ["<ACCEPTANCE>", acceptance || "(aucun scenario dans spec.md pour cette US)"],
  ]) + sharedNote + (json.workerNotes ? `\n\n## Precisions du parent\n\n${json.workerNotes}\n` : "");
  const review = replaceAll(templates.review, common) + sharedNote + (json.reviewNotes ? `\n\n## Precisions du parent\n\n${json.reviewNotes}\n` : "");
  const fix = replaceAll(templates.fix, common) + sharedNote + (json.workerNotes ? `\n\n## Precisions du parent\n\n${json.workerNotes}\n` : "");

  const problems = [];
  if (!tasks.length) problems.push(`aucune tache sous ## [${us}] dans ${tasksPath}`);
  if (!acceptance) problems.push(`aucun scenario d acceptation pour ${us} dans ${specPath}`);
  if (!(json.prod || []).length) problems.push("prod[] vide");
  if (pack && pack.error) problems.push(`standards : ${pack.error}`);
  if (designExtract) for (const m of designExtract.missing) problems.push(`design : ${m} absent de design.md`);
  if (anchorsOfTasks.length && !json.designPath) problems.push("design : taches ancrees Design: mais design.md absent");
  if (pack && !pack.error) for (const u of pack.unknown) problems.push(`standard inconnu de l index de ${standardsRoot} : ${u}`);
  problems.push(...checkStory(tasks, us, json));
  // Fichier de prod nomme par une tache (Creer / Etendre `x`) absent de prod[] : le worker le cree
  // quand meme et le declare en ecart (banc L, US3 : un enum oublie par le parent).
  const prodSet = new Set((json.prod || []).map(norm));
  for (const line of tasks) {
    const body = line.replace(/(?:Code|Eviter|Avoid|Test):\s*[^—]*/g, " ").replace(MOUNT_REF, " ");
    for (const m of body.matchAll(/`([\w./@-]+\.(?:tsx?|jsx?|cs|json|ya?ml|s?css))`/g)) {
      const p = norm(m[1]);
      if (!p.includes("/") || /(^|\/)(?:__tests__|specs|contracts)\//.test(p) || /\.(test|spec)\./.test(p)) continue;
      if (!prodSet.has(p) && !existsSync(join(json.slot, p))) problems.push(`fichier cree par une tache absent de prod[] : ${p}`);
    }
  }
  // Contrat gele (contractHash) : aucune tache ne l ecrit. Une tache qui l etend est un defaut de
  // prep (le contrat se change en /sk-prep, puis nouveau gel), pas un travail de worker.
  if (json.contractHash) {
    const hit = contractWrites(tasks);
    if (hit.length) problems.push(`tache qui ecrit le contrat gele (defaut de prep, a corriger dans le trio) : ${hit.join(", ")}`);
  }
  // A placeholder left behind (`<PROD_PATHS>`) is a hole the agent fills by searching.
  for (const [name, text] of [["worker", worker], ["review", review], ["fix", fix]]) {
    const left = [...new Set((text.match(/<(?:[A-Z][A-Z_]{2,}|fichier:lignes)[^>\n]*>/g) || []).filter((p) => !/^<(?:US_BASE|DONE|Tnnn|re\d)/.test(p)))];
    if (left.length) problems.push(`${name} : placeholder non rempli ${left.join(", ")}`);
  }
  return { worker, review, fix, tasks: tasks.length, acceptance: Boolean(acceptance), problems, pack: pack && !pack.error ? { path: packPath, text: pack.text, ids: pack.ids } : null, design: designExtract ? { path: json.designPath, text: designExtract.text } : null };
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) {
    console.error("usage: node brief-fill.mjs <us.json> [--out <dir>]");
    process.exit(2);
  }
  const outIdx = args.indexOf("--out");
  const out = outIdx >= 0 ? args[outIdx + 1] : dirname(resolve(file));
  const json = JSON.parse(readFileSync(file, "utf8"));
  const here = dirname(fileURLToPath(import.meta.url));
  const templates = {
    worker: readFileSync(join(here, "us-sonnet.md"), "utf8"),
    review: readFileSync(join(here, "us-reviewer.md"), "utf8"),
    fix: readFileSync(join(here, "us-fix.md"), "utf8"),
  };
  json.briefsDir = json.briefsDir || out;
  const r = fillBriefs(json, templates);
  mkdirSync(out, { recursive: true });
  for (const kind of ["worker", "review", "fix"]) writeFileSync(join(out, `${json.us}-${kind}.md`), r[kind]);
  if (r.design) {
    writeFileSync(r.design.path, r.design.text);
    console.log(`${json.us} : extrait design -> ${r.design.path}`);
  }
  if (r.pack) {
    const p = join(out, `${json.us}-standards.md`);
    // Ecarts acceptes par l humain en clarify (plan.md) : portes par le pack, non opposables.
    const plan = existsSync(join(json.featureDir, "plan.md")) ? readFileSync(join(json.featureDir, "plan.md"), "utf8") : "";
    const accepted = plan.split(/\r?\n/).filter((l) => /(?:Ecart accept[ée]|D[ée]p[oô]t prime)\s*:/i.test(l));
    const extra = accepted.length ? `\n## Ecarts acceptes par l humain (non opposables)\n\n${accepted.join("\n")}\n` : "";
    writeFileSync(p, r.pack.text.split("<SK_SHARED>").join(json.skShared) + extra);
    console.log(`${json.us} : standards ${r.pack.ids.join(", ")} -> ${p}`);
  }
  console.log(`${json.us} : ${r.tasks} taches, AC ${r.acceptance ? "ok" : "ABSENTS"}, briefs dans ${out}`);
  for (const p of r.problems) console.log(`KO ${p}`);
  process.exit(r.problems.length ? 1 : 0);
}
