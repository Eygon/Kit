import { readFileSync, writeFileSync, existsSync, readdirSync, appendFileSync } from "node:fs";
import { join, dirname, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { lintSpec } from "./audit-lint.mjs";

const CR = String.fromCharCode(13);
const LF = String.fromCharCode(10);

const ENGINE_SIGNATURES = [
  { engine: "after-parallel", rx: /speckit-us-after-parallel/ },
  { engine: "workflow-loop", rx: /speckit-us-loop/ },
];

const read = (p) => {
  try {
    return readFileSync(p, "utf8").split(CR + LF).join(LF);
  } catch {
    return null;
  }
};

const readJson = (p) => {
  const text = read(p);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const readJsonl = (p) => {
  const text = read(p);
  if (text === null) return [];
  return text
    .split(LF)
    .filter((l) => l.trim())
    .map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
};

const toolUsesOf = (entry) => {
  const content = entry.message?.content;
  if (!Array.isArray(content)) return [];
  return content.filter((c) => c.type === "tool_use");
};

const SHELL_TOOLS = new Set(["Bash", "PowerShell"]);
const MARK_RX = /AUDIT_MARK\s+(?:(sk-[a-z]+)\s+)?(bootstrap|cycles|closing)\s+(start|end)/g;

// Sous-agents : un fichier agent-<id>.jsonl par agent, copie par le runner.
// Intervalle [premier, dernier timestamp] par agent ; le chevauchement est le
// temps ou >= 2 agents sont actifs en meme temps — la seule mesure qui distingue
// un Promise.all reel d une sequence vue depuis le parent.
const loadAgents = (agentsDir) => {
  if (!existsSync(agentsDir)) return [];
  const out = [];
  for (const f of readdirSync(agentsDir)) {
    // Deux formes : `agent-<id>.jsonl` (Agent direct) et
    // `wf_<id>--agent-<id>.jsonl` (worker d un Workflow, prefixe par le runner).
    if (!/agent-.*\.jsonl$/.test(f)) continue;
    const entries = readJsonl(join(agentsDir, f)).filter((e) => e.timestamp);
    if (!entries.length) continue;
    const ts = entries.map((e) => Date.parse(e.timestamp)).filter(Number.isFinite).sort((a, b) => a - b);
    const tools = {};
    for (const e of entries)
      if (e.type === "assistant" && Array.isArray(e.message?.content))
        for (const c of e.message.content) if (c.type === "tool_use") tools[c.name] = (tools[c.name] || 0) + 1;
    out.push({
      id: entries.find((e) => e.agentId)?.agentId || f.replace(/\.jsonl$/, ""),
      kind: /^wf_/.test(f) ? "workflow-worker" : "agent",
      file: f,
      startMs: ts[0],
      endMs: ts[ts.length - 1],
      durationMs: ts[ts.length - 1] - ts[0],
      entries: entries.length,
      toolCalls: tools,
    });
  }
  return out.sort((a, b) => a.startMs - b.startMs);
};

const agentConcurrency = (agents) => {
  if (!agents.length) return { agentsTotalMs: 0, agentsWallMs: 0, overlapMs: 0, parallelismRatio: null, maxConcurrent: 0 };
  const events = [];
  for (const a of agents) {
    events.push({ ms: a.startMs, d: 1 });
    events.push({ ms: a.endMs, d: -1 });
  }
  events.sort((x, y) => x.ms - y.ms || x.d - y.d);
  let active = 0, wall = 0, overlap = 0, prev = events[0].ms, maxC = 0;
  for (const ev of events) {
    const span = ev.ms - prev;
    if (active >= 1) wall += span;
    if (active >= 2) overlap += span;
    active += ev.d;
    maxC = Math.max(maxC, active);
    prev = ev.ms;
  }
  const total = agents.reduce((s, a) => s + a.durationMs, 0);
  return { agentsTotalMs: total, agentsWallMs: wall, overlapMs: overlap, parallelismRatio: wall ? Math.round((overlap / wall) * 1000) / 10 : null, maxConcurrent: maxC };
};

// RECALL de la recon : les fichiers que /sk-impl a REELLEMENT touches, confrontes
// aux chemins cites dans les Faits verifies de plan.md. Un fichier modifie qui n y
// figurait pas est un trou de recon — invisible autrement, car le lint ne mesure que
// l exactitude de ce qui EST cite, jamais l exhaustivite. Mesure 2026-09-09 : deux
// agents Haiku par depot, 17 ancres toutes exactes, AccountRepository.cs manquant.
const FACTS_HEADING_RX = /^##\s+(?:Verified facts|Faits v[ée]rifi[ée]s)\b.*$/im;
const DIFF_PATH_RX = /^\s*([\w./\\@-]+\.(?:tsx?|jsx?|cs|csproj|json|ya?ml|s?css|sql))\s*\|/gm;

// Les fichiers CREES par le run sont hors recall : la recon ne pouvait pas citer un
// fichier qui n existait pas. Ils se lisent sur le patch complet (`new file mode`),
// pas sur le --stat qui ne distingue pas ajout et modification. Sans cette exclusion
// le detecteur sortait 3 findings HIGH faux sur le repeat 3 (le helper et son test).
const NEW_FILE_RX = /^\+\+\+ b\/(.+)$/gm;
const TASK_CREATE_RX = /^\s*-\s*\[[ Xx]\]\s*(.+)$/gm;
const CREATE_VERB_RX = /\b(create|add|new|cr[ée]e|ajoute|nouveau)\b/i;
const TASK_PATH_RX = /[\w./\\@-]+\.(?:tsx?|jsx?|cs|csproj|json|ya?ml|s?css|sql)\b/g;

const createdFiles = (loaded) => {
  const out = new Set();
  // Source 1 : le patch complet (\`new file mode\`) — la plus fiable, mais absente
  // des runs anterieurs au 2026-09-09 (le runner ne capturait que le --stat).
  for (const patch of [loaded.slotPatch || "", loaded.slotPatchBack || ""]) {
    if (!patch) continue;
    for (const block of patch.split(/^diff --git /m)) {
      if (!/^new file mode/m.test(block)) continue;
      for (const m of block.matchAll(NEW_FILE_RX)) out.add(m[1].trim().replace(/\\/g, "/"));
    }
  }
  // Source 2, repli : les taches dont le verbe est un verbe de creation. Meme
  // regle que audit-lint, pour que les deux excluent le meme ensemble.
  const tasks = loaded.trioDir ? read(join(loaded.trioDir, "tasks.md")) : null;
  if (tasks)
    for (const m of tasks.matchAll(TASK_CREATE_RX)) {
      if (!CREATE_VERB_RX.test(m[1])) continue;
      for (const f of m[1].matchAll(TASK_PATH_RX)) out.add(f[0].replace(/\\/g, "/"));
    }
  return out;
};

const reconRecall = (loaded) => {
  const plan = loaded.trioDir ? read(join(loaded.trioDir, "plan.md")) : null;
  const diffs = [loaded.slotDiff || "", loaded.slotDiffBack || ""].join("\n");
  if (!plan || !diffs.trim()) return null;
  const created = createdFiles(loaded);
  const m = plan.match(FACTS_HEADING_RX);
  if (!m) return null;
  const rest = plan.slice(m.index + m[0].length);
  const next = rest.search(/^##\s+/m);
  const facts = (next === -1 ? rest : rest.slice(0, next)).replace(/\\/g, "/");
  const touched = [...new Set([...diffs.matchAll(DIFF_PATH_RX)].map((x) => x[1].replace(/\\/g, "/")))];
  // Un --stat abrege les chemins longs en «.../dir/file.tsx» : on compare sur le
  // basename, sinon tout fichier profond compterait a tort comme non cite.
  const modified = touched.filter((f) => ![...created].some((c) => c.endsWith(f.split("/").pop())));
  if (!modified.length) return { touched: 0, cited: 0, missed: [], recallPct: null, createdOnly: touched.length };
  const missed = modified.filter((f) => !facts.includes(f.split("/").pop()));
  return {
    touched: modified.length,
    cited: modified.length - missed.length,
    missed,
    recallPct: Math.round(((modified.length - missed.length) / modified.length) * 1000) / 10,
  };
};

const buildTimeline = (loaded) => {
  const entries = loaded.entries;
  const stamped = entries
    .filter((e) => e.timestamp)
    .map((e) => ({ ...e, ms: Date.parse(e.timestamp) }))
    .filter((e) => Number.isFinite(e.ms))
    .sort((a, b) => a.ms - b.ms);

  if (stamped.length < 2) return null;

  const totalMs = stamped[stamped.length - 1].ms - stamped[0].ms;
  const byTool = {};
  const byModel = {};
  let sidechainMs = 0;
  let turnaroundMs = 0;
  let toolMs = 0;
  const marks = [];
  const stepStarts = loaded.stepStarts || [];
  const skillOfStep = (n) => (stepStarts.find((s) => s.step === n)?.command || `step${n}`).replace(/^\//, "");

  for (let i = 0; i < stamped.length - 1; i += 1) {
    const cur = stamped[i];
    const next = stamped[i + 1];
    const delta = next.ms - cur.ms;
    const uses = toolUsesOf(cur);

    for (const u of uses) {
      byTool[u.name] = (byTool[u.name] || 0) + delta;
      // TOUTES les marques de l appel (matchAll), dans tout l input : un seul
      // echo portait souvent `cycles end` ET `closing start`, et .match() ne
      // retenait que la premiere — la phase suivante disparaissait du calcul.
      // ... mais UNIQUEMENT sur les outils shell : une marque est un `echo`. Un
      // Write/Edit dont le contenu MENTIONNE une marque (journal.md documentant
      // ses phases) produisait de fausses marques en double au meme timestamp
      // (r2 du 2026-09-08 : 4 faux `bootstrap start`, /sk-impl illisible).
      if (!SHELL_TOOLS.has(u.name)) continue;
      for (const m of String(u.input?.command ?? "").matchAll(MARK_RX))
        marks.push({ skill: m[1] || null, phase: m[2], edge: m[3], ms: cur.ms });
    }
    if (cur.isSidechain) sidechainMs += delta;
    // Ecart sans appel d outil = le modele genere (thinking + texte). Ce n est
    // PAS de l attente : l ancien nom `idleMs` le laissait croire.
    if (!uses.length) turnaroundMs += delta;
    if (uses.length) toolMs += delta;
    if (cur.type === "assistant" && cur.message?.model)
      byModel[cur.message.model] = (byModel[cur.message.model] || 0) + delta;
  }

  // Marque sans nom de skill (ancien format) : attribuee au skill dont le tour
  // etait en cours a cet instant.
  for (const m of marks) {
    if (m.skill) continue;
    const step = [...stepStarts].reverse().find((s) => s.ms <= m.ms);
    m.skill = step ? skillOfStep(step.step) : "unknown";
  }

  // Appariement en PILE par (skill, phase) : chaque start consomme le end
  // suivant. L ancien code prenait la premiere start et la derniere end de la
  // phase, toutes sessions confondues : deux skills emettant `bootstrap` dans
  // la meme session donnaient une phase couvrant presque tout le run.
  const phaseMs = {};
  const anomalies = [];
  const open = new Map();
  for (const m of marks) {
    const key = `${m.skill}:${m.phase}`;
    if (m.edge === "start") {
      if (open.has(key)) anomalies.push(`${key} : start emis deux fois sans end`);
      open.set(key, m.ms);
    } else if (open.has(key)) {
      phaseMs[key] = (phaseMs[key] || 0) + (m.ms - open.get(key));
      open.delete(key);
    } else {
      anomalies.push(`${key} : end sans start`);
    }
  }
  for (const key of open.keys()) anomalies.push(`${key} : start sans end`);

  // Fenetre de chaque skill = de son step-start au step-start suivant (ou fin).
  const perSkill = {};
  const t0 = stamped[0]?.ms ?? 0;
  const tEnd = stamped[stamped.length - 1]?.ms ?? 0;
  for (let i = 0; i < stepStarts.length; i += 1) {
    const skill = skillOfStep(stepStarts[i].step);
    const from = Math.max(stepStarts[i].ms, t0);
    const to = i + 1 < stepStarts.length ? stepStarts[i + 1].ms : tEnd;
    const windowMs = Math.max(0, to - from);
    const fixed = (phaseMs[`${skill}:bootstrap`] || 0) + (phaseMs[`${skill}:closing`] || 0);
    const cycles = phaseMs[`${skill}:cycles`] || 0;
    // Le hors-phase (avant bootstrap start, apres closing end) est du cout fixe
    // aussi : cadre, echo AUDIT_MODE, synthese finale.
    const unphased = Math.max(0, windowMs - fixed - cycles);
    perSkill[skill] = {
      windowMs,
      bootstrapMs: phaseMs[`${skill}:bootstrap`] || 0,
      cyclesMs: cycles,
      closingMs: phaseMs[`${skill}:closing`] || 0,
      unphasedMs: unphased,
      fixedMs: fixed + unphased,
      fixedShare: windowMs ? Math.round((1000 * (fixed + unphased)) / windowMs) / 10 : null,
      reachedCycles: cycles > 0,
    };
  }
  const first = stepStarts.length ? perSkill[skillOfStep(stepStarts[0].step)] : null;

  const concurrency = agentConcurrency(loaded.agents || []);
  return {
    totalMs,
    // sidechainMs vient des entrees isSidechain du transcript PARENT : toujours 0,
    // les sous-agents ecrivent ailleurs. Les vrais chiffres sont dans `agents`.
    sidechainMs,
    agents: (loaded.agents || []).map((a) => ({ id: a.id, durationMs: a.durationMs, entries: a.entries, toolCalls: a.toolCalls })),
    ...concurrency,
    parentMs: totalMs - sidechainMs,
    toolMs,
    turnaroundMs,
    toolShare: totalMs ? Math.round((1000 * toolMs) / totalMs) / 10 : null,
    phaseMs,
    perSkill,
    anomalies,
    // Compat : la colonne `fixe %` du tableau = cout fixe du PREMIER skill (la
    // prep), seul chiffre comparable d une campagne a l autre quand /sk-impl
    // n atteint pas ses cycles.
    fixedMs: first?.fixedMs ?? null,
    variableMs: first?.cyclesMs ?? null,
    fixedShare: first?.fixedShare ?? null,
    marksSeen: marks.length,
    topTools: Object.entries(byTool)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, ms]) => ({ name, ms })),
    byModel,
  };
};

// Le moteur se lit sur des FAITS : le nom de l outil appele et le scriptPath
// d un Workflow. Jamais sur du texte : l ancien fallback /\b(Agent|Task)\b/
// sur la prose classait `agent-single` une session dont un echo disait
// « aucun Agent lance », et `none` sa voisine qui disait la meme chose dans
// un Write. D ou un `engine-unstable` haut sur un ensemble parfaitement stable.
const detectEngine = (entries) => {
  const uses = entries.flatMap(toolUsesOf);
  const workflowScripts = uses
    .filter((u) => u.name === "Workflow")
    .map((u) => `${u.input?.scriptPath || ""} ${u.input?.name || ""} ${u.input?.script || ""}`)
    .join(LF);
  for (const sig of ENGINE_SIGNATURES) if (sig.rx.test(workflowScripts)) return sig.engine;
  if (uses.some((u) => u.name === "Workflow")) return "workflow-unknown";
  if (uses.some((u) => u.name === "Agent" || u.name === "Task")) return "agent-single";
  return "none";
};

const evaluateFault = (declared, applied, session) => {
  const base = {
    id: declared.id,
    promise: declared.promise || null,
    injection: applied?.status || "skipped",
  };

  if (!applied || applied.status !== "applied")
    return { ...base, verdict: "skipped", why: applied?.detail || "mutation non appliquee" };

  // Une faute appliquee mais jamais ATTEINTE n est pas tenue : elle n est pas
  // eprouvee. Sans ce verdict, un /sk-impl arrete a son pre-requis (slot-diff
  // vide, `/sk-prep` cite) faisait sortir A4/A5/C2 en `held` alors que le code
  // qui devait reagir a la mutation n avait jamais tourne.
  const impl = session.resultImpl;
  const implReachedCycles = Boolean(session.timeline?.perSkill?.["sk-impl"]?.reachedCycles);
  const implStoppedEarly = impl?.outcome === "stopped" && /pre-?requis|prerequis/i.test(impl?.stop?.section || "");
  const needsImpl = ["before-impl", "after-barrier"].includes(declared.inject);
  if (needsImpl && (implStoppedEarly || (!impl && !implReachedCycles && session.faultStepIsImpl)))
    return {
      ...base,
      verdict: "not-exercised",
      why: implStoppedEarly
        ? `/sk-impl arrete a ${impl.stop.section} avant d atteindre le code vise par la faute`
        : "/sk-impl n a jamais atteint ses cycles : la mutation n a pas ete lue",
    };
  const activation = declared.evidence?.activation || [];
  if (activation.length && !activation.some((n) => (session.transcriptText || "").includes(n)))
    return { ...base, verdict: "not-exercised", why: `aucun marqueur d activation vu (${activation.join(", ")})` };

  if (session.status === "runner-error") return { ...base, verdict: "crashed", why: session.detail || "erreur du runner" };
  if (session.status === "harness-timeout")
    return { ...base, verdict: "harness-timeout", why: "budget du banc depasse, pas imputable au kit" };

  const evidence = declared.evidence;
  if (!evidence) return { ...base, verdict: "unknown", why: "aucune evidence declaree: a juger a la main" };

  const reasons = [];
  let held = true;

  if (evidence.noProdDiff) {
    const prodTouched = (session.slotDiff || "")
      .split(LF)
      .filter((l) => /\|/.test(l))
      .map((l) => l.split("|")[0].trim())
      .filter((p) => p && !p.startsWith("specs/") && !/\.md$/.test(p));
    if (prodTouched.length) {
      held = false;
      reasons.push(`code de production ecrit malgre la faute: ${prodTouched.slice(0, 3).join(", ")}`);
    }
  }

  for (const needle of evidence.transcriptMustMention || []) {
    if (!(session.transcriptText || "").includes(needle)) {
      held = false;
      reasons.push(`le transcript ne mentionne jamais "${needle}"`);
    }
  }

  for (const needle of evidence.transcriptMustNotMention || []) {
    if ((session.transcriptText || "").includes(needle)) {
      held = false;
      reasons.push(`le transcript mentionne "${needle}", interdit sous cette faute`);
    }
  }

  return {
    ...base,
    verdict: held ? "held" : "circumvented",
    why: held ? "promesse tenue" : reasons.join(" ; "),
  };
};

const loadSession = (runDir, id) => {
  const dir = join(runDir, id);
  const steps = readdirSync(dir)
    .filter((f) => /^step\d+\.json$/.test(f))
    .sort()
    .map((f) => ({ file: f, data: readJson(join(dir, f)) }));
  const transcriptText = read(join(dir, "transcript.jsonl"));
  const entries = readJsonl(join(dir, "transcript.jsonl"));
  return {
    id,
    dir,
    steps,
    entries,
    transcriptText,
    expected: readJson(join(dir, "expected.json")),
    answers: readJsonl(join(dir, "answers.jsonl")),
    // Un fichier par skill (schema sk-audit.md §result). result.json nu = forme
    // libre d avant le schema : lu, mais signale.
    resultPrep: readJson(join(dir, "result.sk-prep.json")),
    resultImpl: readJson(join(dir, "result.sk-impl.json")),
    resultLegacy: readJson(join(dir, "result.json")),
    faultsApplied: readJson(join(dir, "faults.json")) || [],
    slotDiff: read(join(dir, "slot-diff.txt")) || "",
    slotDiffBack: read(join(dir, "slot-diff-back.txt")) || "",
    slotPatch: read(join(dir, "slot-diff.full.patch")) || "",
    slotPatchBack: read(join(dir, "slot-diff-back.full.patch")) || "",
    slotCheck: readJson(join(dir, "slot-check.json")),
    agents: loadAgents(join(dir, "agents")),
    trioDir: existsSync(join(dir, "trio")) ? join(dir, "trio") : null,
    featureDir: (read(join(dir, "feature-dir.txt")) || "").trim() || null,
    journal: read(join(dir, "journal.md")),
    // Bornes des tours, pour attribuer a un skill les marques de l ancien format
    // (sans nom de skill) : avant le step 2 = premier skill, apres = second.
    stepStarts: readJsonl(join(runDir, "progress.jsonl"))
      .filter((e) => e.session === id && e.event === "step-start")
      .map((e) => ({ step: e.step, command: e.command, ms: Date.parse(e.ts) }))
      .sort((a, b) => a.step - b.step),
  };
};

const RESULT_SCHEMA = {
  top: ["schema", "skill", "session", "outcome", "stop", "featureDir", "engine", "counters", "artifacts"],
  counters: [
    "userStories", "tasks", "tasksChecked", "prodFilesNew", "prodFilesModified", "testFiles",
    "answersSubstituted", "answersGroundedFalse", "agentSpawns", "workflowCalls", "slotsTaken",
    "commits", "merges", "defectsObserved",
  ],
  artifacts: ["parallelYml", "designMd", "contracts", "researchMd"],
};

const validateResult = (r) => {
  if (!r || typeof r !== "object") return ["fichier absent"];
  const missing = [];
  for (const k of RESULT_SCHEMA.top) if (!(k in r)) missing.push(k);
  for (const k of RESULT_SCHEMA.counters) if (!r.counters || !(k in r.counters)) missing.push(`counters.${k}`);
  for (const k of RESULT_SCHEMA.artifacts) if (!r.artifacts || !(k in r.artifacts)) missing.push(`artifacts.${k}`);
  return missing;
};

const analyze = (runDir) => {
  const campaign = readJson(join(runDir, "campaign.json")) || { sessions: [], faults: {} };
  const outcomes = readJson(join(runDir, "sessions.json")) || [];
  const findings = [];
  const add = (severity, rule, message, where) => findings.push({ severity, rule, message, where });

  const sessions = [];
  for (const planned of campaign.sessions) {
    if (!existsSync(join(runDir, planned.id))) {
      add("high", "session-missing", `aucun artefact pour la session ${planned.id}`, planned.id);
      continue;
    }
    const loaded = loadSession(runDir, planned.id);
    const outcome = outcomes.find((o) => o.id === planned.id) || { status: "unknown" };
    const timeline = buildTimeline(loaded);
    const engine = detectEngine(loaded.entries);
    const declaredFaults = planned.steps.flatMap((s) => s.faults || []);
    const hasImplStep = planned.steps.some((s) => s.command === "/sk-impl");
    const faults = declaredFaults.map((fid) =>
      evaluateFault(
        campaign.faults?.[fid] || { id: fid },
        loaded.faultsApplied.find((f) => f.id === fid),
        {
          ...outcome,
          slotDiff: loaded.slotDiff,
          transcriptText: loaded.transcriptText,
          resultImpl: loaded.resultImpl,
          timeline,
          faultStepIsImpl: hasImplStep,
        }
      )
    );
    const resultSchema = {
      prep: loaded.resultPrep ? validateResult(loaded.resultPrep) : null,
      impl: loaded.resultImpl ? validateResult(loaded.resultImpl) : null,
      legacy: Boolean(loaded.resultLegacy),
    };
    const featureDirName = loaded.featureDir ? basename(loaded.featureDir) : loaded.resultPrep?.featureDir ? basename(loaded.resultPrep.featureDir) : null;

    const totals = loaded.steps.reduce(
      (a, s) => ({
        durationMs: a.durationMs + (s.data?.duration_ms || 0),
        costUsd: a.costUsd + (s.data?.total_cost_usd || 0),
        numTurns: a.numTurns + (s.data?.num_turns || 0),
        denials: a.denials + (s.data?.permission_denials?.length || 0),
      }),
      { durationMs: 0, costUsd: 0, numTurns: 0, denials: 0 }
    );

    const lint = loaded.trioDir ? lintSpec(loaded.trioDir) : null;
    const ungrounded = loaded.answers.filter((a) => a.grounded === false).length;

    sessions.push({
      id: planned.id,
      item: planned.item,
      regime: planned.regime,
      status: outcome.status,
      expected: loaded.expected,
      engineExpected: loaded.expected?.engine || null,
      engineObserved: engine,
      timeline,
      totals,
      answers: loaded.answers.length,
      ungrounded,
      faults,
      lint: lint ? { findings: lint.findings.length, high: lint.findings.filter((f) => f.severity === "high").length, metrics: lint.metrics } : null,
      hasTranscript: Boolean(loaded.transcriptText),
      hasImplStep,
      resultSchema,
      featureDirName,
      suffixHonored: featureDirName ? featureDirName.endsWith(planned.id) : null,
      implOutcome: loaded.resultImpl?.outcome ?? null,
      implStop: loaded.resultImpl?.stop?.section ?? null,
      resultPrep: loaded.resultPrep,
      resultImpl: loaded.resultImpl,
      slotDiff: loaded.slotDiff,
      slotDiffBack: loaded.slotDiffBack,
      reconRecall: reconRecall(loaded),
      slotCheck: loaded.slotCheck,
      journalClaimsTime: Boolean(loaded.journal && /\b\d{1,2}:\d{2}\b/.test(loaded.journal)),
    });
  }

  for (const s of sessions) {
    if (s.status === "runner-error") add("high", "session-runner-error", `${s.id}: le runner a echoue`, s.id);
    if (s.status === "frame-refused")
      add("high", "frame-refused", `${s.id}: le tour de cadrage n a pas rendu PRET, la session est sans valeur`, s.id);
    if (s.status === "harness-timeout")
      add("medium", "harness-timeout", `${s.id}: budget du banc depasse, non imputable au kit`, s.id);
    if (!s.hasTranscript)
      add("high", "transcript-missing", `${s.id}: transcript introuvable, aucune mesure de temps possible`, s.id);
    // result.<skill>.json : un par skill, au schema. Le result.json nu d avant
    // le schema est lu mais signale : 4 sessions en ont produit 4 formes.
    if (!s.resultSchema.prep) add("medium", "result-prep-missing", `${s.id}: result.sk-prep.json absent, compteurs de /sk-prep perdus`, s.id);
    else if (s.resultSchema.prep.length)
      add("medium", "result-prep-schema", `${s.id}: result.sk-prep.json hors schema, cles manquantes : ${s.resultSchema.prep.join(", ")}`, s.id);
    if (s.hasImplStep && !s.resultSchema.impl) add("medium", "result-impl-missing", `${s.id}: result.sk-impl.json absent, compteurs de /sk-impl perdus`, s.id);
    else if (s.resultSchema.impl?.length)
      add("medium", "result-impl-schema", `${s.id}: result.sk-impl.json hors schema, cles manquantes : ${s.resultSchema.impl.join(", ")}`, s.id);
    if (s.resultSchema.legacy)
      add("low", "result-legacy-shape", `${s.id}: result.json nu (forme libre d avant le schema), non comparable`, s.id);
    if (s.suffixHonored === false)
      add("medium", "audit-suffix-missing", `${s.id}: FEATURE_DIR \`${s.featureDirName}\` sans le suffixe AUDIT_SESSION — collision possible dans un specs/ partage`, s.id);
    if (s.journalClaimsTime)
      add("low", "journal-self-timed", `${s.id}: le journal porte des horaires alors que la regle 5 les interdit`, s.id);
    // Moteur `none` sur un run qui avait une etape /sk-impl et s est termine
    // « normalement » : /sk-impl n a rien implemente. C etait exactement le cas
    // que l ancienne garde `engineObserved !== "none"` rendait invisible.
    if (s.hasImplStep && s.engineObserved === "none" && s.status === "completed")
      add(
        "high",
        "impl-never-ran",
        `${s.id}: aucun moteur n a tourne (0 Agent, 0 Workflow)${s.implStop ? ` — /sk-impl arrete a ${s.implStop}` : ""} : rien n a ete implemente, la moitie de la chaine n est pas mesuree`,
        s.id
      );
    else if (s.engineExpected && s.engineExpected !== s.engineObserved)
      add("high", "engine-mismatch", `${s.id}: moteur attendu ${s.engineExpected}, observe ${s.engineObserved}`, s.id);
    // Le travail annonce doit etre LA ou le runner mesure. Un result.sk-impl.json
    // qui compte des commits ou des fichiers face a un slot-diff.txt vide veut
    // dire que /sk-impl a ecrit ailleurs (slot du pool de travail, rebranchement)
    // : la mesure de diff est perdue et le run passait « aucun finding bloquant ».
    // Constate le 2026-09-08 : wt-3 pris, wt-audit-1 vide, analyzer vert.
    const implCounters = s.resultImpl?.counters;
    const implClaims = (implCounters?.commits || 0) + (implCounters?.prodFilesNew || 0) + (implCounters?.prodFilesModified || 0);
    if (s.status === "completed" && implClaims > 0 && !s.slotDiff.trim())
      add(
        "high",
        "work-not-captured",
        `${s.id}: result.sk-impl.json annonce ${implCounters.commits} commit(s) et ${(implCounters.prodFilesNew || 0) + (implCounters.prodFilesModified || 0)} fichier(s) prod, mais slot-diff.txt est vide — le travail n est pas dans le slot mesure`,
        s.id
      );
    if (s.reconRecall?.recallPct !== null && s.reconRecall?.missed.length)
      add(
        s.reconRecall.recallPct < 80 ? "high" : "medium",
        "recon-incomplete",
        `${s.id}: ${s.reconRecall.missed.length} fichier(s) touche(s) par /sk-impl absent(s) des Faits verifies (recall ${s.reconRecall.recallPct} %) : ${s.reconRecall.missed.join(", ")} — la recon ne les a pas trouves`,
        s.id
      );
    if (s.slotCheck?.backHijacked?.length)
      add(
        "high",
        "back-slot-hijack",
        `${s.id}: la session a pris ${s.slotCheck.backHijacked.join(", ")} dans le pool de TRAVAIL backend au lieu de ${s.slotCheck.backExpected} — slot laisse busy, travail back non mesure ; a liberer a la main`,
        s.id
      );
    // Travail backend attendu (parallel.yml ecrit, ou crossRepo predit) mais slot
    // backend d audit intact : /sk-impl a ecrit ailleurs, ou n a pas fait l US back.
    const backExpected = Boolean(s.slotCheck?.backExpected) && (s.resultImpl?.artifacts?.parallelYml || s.expected?.crossRepo);
    if (s.status === "completed" && backExpected && !s.slotDiffBack.trim())
      add(
        "high",
        "back-work-not-captured",
        `${s.id}: une US backend etait attendue (parallel.yml / crossRepo) mais slot-diff-back.txt est vide — le travail back n est pas dans le slot backend d audit`,
        s.id
      );
    if (s.slotCheck?.hijacked?.length)
      add(
        "high",
        "slot-hijack",
        `${s.id}: la session a pris ${s.slotCheck.hijacked.join(", ")} (pool de TRAVAIL) au lieu de ${s.slotCheck.expected} — slot laisse busy, mesure faussee ; a liberer a la main`,
        s.id
      );
    if (s.timeline && s.timeline.marksSeen === 0)
      add("medium", "audit-marks-absent", `${s.id}: aucun AUDIT_MARK, la decomposition cout fixe/variable est indisponible`, s.id);
    for (const a of s.timeline?.anomalies || [])
      add("low", "audit-marks-anomaly", `${s.id}: ${a} — decomposition du temps ambigue`, s.id);
    for (const [skill, t] of Object.entries(s.timeline?.perSkill || {}))
      if (t.fixedShare !== null && t.fixedShare > 50 && t.reachedCycles)
        add("medium", "fixed-cost-dominant", `${s.id}/${skill}: ${t.fixedShare} % du temps hors cycles pour un regime ${s.regime}`, s.id);
    if (s.answers && s.ungrounded / s.answers > 0.5)
      add(
        "medium",
        "intent-too-thin",
        `${s.id}: ${s.ungrounded}/${s.answers} reponses non fondees sur l intent`,
        s.id
      );
    if (s.lint?.high)
      add("high", "trio-nonconforming", `${s.id}: ${s.lint.high} findings bloquants sur le trio produit`, `${s.id}/trio`);
    for (const f of s.faults) {
      if (f.verdict === "circumvented")
        add("high", "fault-circumvented", `${s.id}/${f.id}: ${f.promise || "promesse"} non tenue — ${f.why}`, s.id);
      if (f.verdict === "crashed")
        add("high", "fault-crashed", `${s.id}/${f.id}: mort sans diagnostic`, s.id);
      if (f.verdict === "skipped")
        add("low", "fault-not-injected", `${s.id}/${f.id}: mutation non appliquee (${f.why}), aucun verdict`, s.id);
      if (f.verdict === "not-exercised")
        add("medium", "fault-not-exercised", `${s.id}/${f.id}: mutation appliquee mais jamais atteinte (${f.why}) — pas un \`held\``, s.id);
      if (f.verdict === "unknown")
        add("low", "fault-unjudged", `${s.id}/${f.id}: sans evidence declaree, verdict a rendre a la main`, s.id);
    }
  }

  const byItem = new Map();
  for (const s of sessions) {
    if (!byItem.has(s.item)) byItem.set(s.item, []);
    byItem.get(s.item).push(s);
  }

  // Fichiers prod OBSERVES : les compteurs de /sk-prep (cibles declarees) font
  // foi ; le lint ne connait que les chemins cites dans les taches, ou un fichier
  // pris pour modele (« matching its sibling getInitials.ts ») compte a tort.
  const observedProdFilesOf = (s) => {
    const c = s.resultPrep?.counters;
    if (c && typeof c.prodFilesNew === "number" && typeof c.prodFilesModified === "number")
      return c.prodFilesNew + c.prodFilesModified;
    return s.lint?.metrics?.prodPathsCited ?? s.lint?.metrics?.prodFiles ?? null;
  };
  const determinism = [];
  for (const [item, all] of byItem) {
    // Une session harness-timeout ou frame-refused n a pas de moteur : la compter
    // ferait sortir un engine-unstable HIGH sur un ensemble ou une seule session a
    // reellement tourne. Constate le 2026-09-09 (r2 du regime L, budget depasse).
    const list = all.filter((x) => x.status === "completed");
    if (list.length < 2) continue;
    const engines = [...new Set(list.map((s) => s.engineObserved))];
    const durations = list.map((s) => s.totals.durationMs).filter(Boolean);
    const tasks = list.map((s) => s.lint?.metrics?.tasks).filter((v) => typeof v === "number");
    const stories = [...new Set(list.map((s) => s.lint?.metrics?.stories).filter((v) => typeof v === "number"))];
    const spread = (xs) => (xs.length < 2 ? null : Math.round(((Math.max(...xs) - Math.min(...xs)) / Math.max(...xs)) * 1000) / 10);

    // Nom du FEATURE_DIR, suffixe AUDIT_SESSION retire : doit etre identique
    // entre repetitions d un meme besoin. Ne l etait pas (F26).
    const baseNames = [...new Set(list.map((s) => (s.featureDirName || "").replace(new RegExp(`-?${s.id}$`), "")).filter(Boolean))];
    const suffixMissing = list.filter((s) => s.suffixHonored === false).map((s) => s.id);
    const entry = {
      item,
      repeats: list.length,
      engines,
      storiesDistinct: stories,
      featureDirNames: baseNames,
      suffixMissing,
      durationSpreadPct: spread(durations),
      taskSpreadPct: spread(tasks),
      // sk-audit.md §Determinisme annonce prodFiles parmi les grandeurs suivies :
      // il manquait. Les fichiers CIBLES doivent etre identiques d une repetition
      // a l autre sur un besoin gele ; le contraire veut dire que la recon a
      // designe des points d insertion differents.
      prodFilesDistinct: [...new Set(list.map(observedProdFilesOf).filter((v) => typeof v === "number"))],
      costSpreadPct: spread(list.map((s) => s.totals.costUsd).filter(Boolean)),
      answersSpreadPct: spread(list.map((s) => s.answers).filter(Boolean)),
    };
    determinism.push(entry);

    if (baseNames.length > 1)
      add("medium", "feature-dir-unstable", `${item}: le nom du FEATURE_DIR varie entre repetitions (${baseNames.join(" | ")})`, item);
    if (suffixMissing.length && suffixMissing.length < list.length)
      add("medium", "audit-suffix-inconsistent", `${item}: suffixe AUDIT_SESSION applique ${list.length - suffixMissing.length}/${list.length} fois (absent : ${suffixMissing.join(", ")})`, item);
    if (entry.answersSpreadPct !== null && entry.answersSpreadPct > 50)
      add("medium", "gates-unstable", `${item}: nombre de gates ouvertes disperse de ${entry.answersSpreadPct} % entre repetitions`, item);

    if (engines.length > 1)
      add(
        "high",
        "engine-unstable",
        `${item}: le moteur varie entre repetitions (${engines.join(", ")}) sur un besoin identique — a traiter avant tout le reste`,
        item
      );
    if (entry.prodFilesDistinct.length > 1)
      add(
        "high",
        "prod-files-unstable",
        `${item}: nombre de fichiers de production variable entre repetitions (${entry.prodFilesDistinct.join(", ")}) — la recon ne designe pas les memes points d insertion`,
        item
      );
    if (stories.length > 1)
      add("high", "story-count-unstable", `${item}: nombre d US variable entre repetitions (${stories.join(", ")})`, item);
    if (entry.durationSpreadPct !== null && entry.durationSpreadPct > 50)
      add("medium", "duration-unstable", `${item}: duree dispersee de ${entry.durationSpreadPct} % entre repetitions`, item);
  }

  const calibration = sessions
    .filter((s) => s.expected || s.lint)
    .map((s) => ({
      id: s.id,
      expectedProdFiles: s.expected?.prodFiles ?? null,
      observedProdFiles: observedProdFilesOf(s),
      observedProdFilesSource: s.resultPrep?.counters ? "result.sk-prep.json" : "lint (chemins cites)",
      expectedStories: s.expected?.userStories ?? null,
      observedStories: s.lint?.metrics?.stories ?? null,
    }));

  for (const s of sessions) {
    const exp = s.expected?.prodFiles;
    const obs = observedProdFilesOf(s);
    if (typeof exp === "number" && typeof obs === "number" && exp > 0 && obs > exp * 2)
      add(
        "medium",
        "item-mis-sized",
        `${s.id}: ${obs} fichiers de production pour ${exp} predits — l enonce de l item est mal dimensionne, le regenerer sous un nouveau nom plutot que patcher un skill`,
        s.id
      );
  }

  return { runId: campaign.runId || basename(runDir), runDir, sessions, determinism, calibration, findings };
};

const ms = (v) => (typeof v === "number" ? `${Math.round(v / 1000)}s` : "n/a");
const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

const renderReport = (a) => {
  const lines = [];
  const push = (s = "") => lines.push(s);
  const sorted = [...a.findings].sort(
    (x, y) => SEVERITY_ORDER[x.severity] - SEVERITY_ORDER[y.severity] || x.rule.localeCompare(y.rule)
  );

  push(`# Audit ${a.runId}`);
  push();
  push(`Sessions : ${a.sessions.length}. Findings : ${sorted.length} (${["high", "medium", "low"]
    .map((s) => `${sorted.filter((f) => f.severity === s).length} ${s}`)
    .join(", ")}).`);
  push();

  push("## Verdict");
  push();
  const blocking = sorted.filter((f) => f.severity === "high");
  if (!blocking.length) push("Aucun finding bloquant.");
  else for (const f of blocking) push(`- **${f.rule}** (${f.where}) — ${f.message}`);
  push();

  push("## Sessions");
  push();
  push("| session | regime | statut | moteur attendu | moteur observe | duree | cout | fixe % | US | taches | non fondees |");
  push("|---|---|---|---|---|---|---|---|---|---|---|");
  for (const s of a.sessions)
    push(
      `| ${s.id} | ${s.regime} | ${s.status} | ${s.engineExpected || "-"} | ${s.engineObserved} | ${ms(
        s.totals.durationMs
      )} | ${s.totals.costUsd ? `${s.totals.costUsd.toFixed(2)} USD` : "-"} | ${
        s.timeline?.fixedShare ?? "-"
      } | ${s.lint?.metrics?.stories ?? "-"} | ${s.lint?.metrics?.tasks ?? "-"} | ${s.ungrounded}/${s.answers} |`
    );
  push();

  push("## Determinisme");
  push();
  if (!a.determinism.length) push("Une seule repetition par item : le plancher de bruit n est pas mesure.");
  else {
    push("| item | repetitions | moteurs | US | dispersion duree | dispersion taches |");
    push("|---|---|---|---|---|---|");
    for (const d of a.determinism)
      push(
        `| ${d.item} | ${d.repeats} | ${d.engines.join(", ")} | ${d.storiesDistinct.join(", ") || "-"} | ${
          d.durationSpreadPct ?? "-"
        } % | ${d.taskSpreadPct ?? "-"} % |`
      );
  }
  push();

  push("## Fautes injectees");
  push();
  const allFaults = a.sessions.flatMap((s) => s.faults.map((f) => ({ ...f, session: s.id })));
  if (!allFaults.length) push("Aucune faute injectee dans cette campagne.");
  else {
    push("| session | faute | injection | verdict | pourquoi |");
    push("|---|---|---|---|---|");
    for (const f of allFaults) push(`| ${f.session} | ${f.id} | ${f.injection} | **${f.verdict}** | ${f.why} |`);
  }
  push();

  push("## Ou part le temps");
  push();
  for (const s of a.sessions) {
    if (!s.timeline) continue;
    push(`### ${s.id}`);
    push();
    push(
      `total ${ms(s.timeline.totalMs)} — outils ${ms(s.timeline.toolMs)} (${s.timeline.toolShare ?? "-"} %), generation ${ms(
        s.timeline.turnaroundMs
      )}, sous-agents ${s.timeline.agents.length} : cumul ${ms(s.timeline.agentsTotalMs)}, mur ${ms(s.timeline.agentsWallMs)}, chevauchement ${ms(s.timeline.overlapMs)}${
        s.timeline.parallelismRatio === null ? "" : ` (${s.timeline.parallelismRatio} %, max ${s.timeline.maxConcurrent} simultanes)`
      }`
    );
    const skills = Object.entries(s.timeline.perSkill || {});
    if (skills.length) {
      push();
      push("| skill | fenetre | bootstrap | cycles | closing | hors-phase | fixe % | cycles atteints |");
      push("|---|---|---|---|---|---|---|---|");
      for (const [k, t] of skills)
        push(`| ${k} | ${ms(t.windowMs)} | ${ms(t.bootstrapMs)} | ${ms(t.cyclesMs)} | ${ms(t.closingMs)} | ${ms(t.unphasedMs)} | ${t.fixedShare ?? "-"} | ${t.reachedCycles ? "oui" : "NON"} |`);
    }
    if (s.timeline.anomalies?.length) push(`marques : ${s.timeline.anomalies.join(" ; ")}`);
    if (s.timeline.topTools.length)
      push(`postes : ${s.timeline.topTools.map((t) => `${t.name} ${ms(t.ms)}`).join(", ")}`);
    if (s.reconRecall?.recallPct !== null)
      push(
        `recon : ${s.reconRecall.cited}/${s.reconRecall.touched} fichiers touches etaient dans les Faits verifies (recall ${s.reconRecall.recallPct} %)${
          s.reconRecall.missed.length ? ` — manques : ${s.reconRecall.missed.join(", ")}` : ""
        }`
      );
    push();
  }

  push("## Tous les findings");
  push();
  for (const f of sorted) push(`- \`${f.severity}\` **${f.rule}** (${f.where}) — ${f.message}`);
  push();

  push("## A faire");
  push();
  push("Applique un seul correctif, puis rejoue le meme corpus. Un patch a la fois, sinon");
  push("l effet n est pas attribuable. Ne modifie jamais un item du corpus entre deux");
  push("comparaisons : cree `<item>-v2`.");
  push();

  return lines.join(LF);
};

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const runDir = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!runDir) {
    console.error("usage: node audit-analyze.mjs <audit-runs/runId> [--json]");
    process.exit(2);
  }
  const abs = resolve(runDir);
  const result = analyze(abs);
  writeFileSync(join(abs, "findings.json"), `${JSON.stringify(result.findings, null, 2)}${LF}`);
  writeFileSync(join(abs, "analysis.json"), `${JSON.stringify(result, null, 2)}${LF}`);
  for (const s of result.sessions)
    if (s.timeline) writeFileSync(join(abs, s.id, "timeline.json"), `${JSON.stringify(s.timeline, null, 2)}${LF}`);
  const report = renderReport(result);
  // Deux fichiers : report.generated.md est ECRASE a chaque rejeu ; report.md
  // porte le verdict humain et n est jamais touche une fois present. Avant, un
  // seul fichier, et chaque rejeu gratuit detruisait le verdict redige dedans.
  writeFileSync(join(abs, "report.generated.md"), report);
  const human = join(abs, "report.md");
  if (!existsSync(human))
    writeFileSync(
      human,
      [
        `# Verdict — ${result.runId}`,
        "",
        "Rapport genere : `report.generated.md` (recalcule a chaque `audit-analyze`).",
        "Ce fichier-ci est le VERDICT HUMAIN : l analyzer ne l ecrase jamais.",
        "Lis findings.json, juge, ecris ici. Ordre : moteur instable, fautes",
        "contournees, calibration, cout fixe, conformite du livrable.",
        "",
      ].join(LF)
    );

  const historyPath = join(dirname(abs), "history.jsonl");
  appendFileSync(
    historyPath,
    `${JSON.stringify({
      ts: new Date().toISOString(),
      runId: result.runId,
      sessions: result.sessions.length,
      high: result.findings.filter((f) => f.severity === "high").length,
      medium: result.findings.filter((f) => f.severity === "medium").length,
      circumvented: result.sessions.flatMap((s) => s.faults).filter((f) => f.verdict === "circumvented").length,
      costUsd: Math.round(100 * result.sessions.reduce((x, s) => x + s.totals.costUsd, 0)) / 100,
    })}${LF}`
  );

  if (process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
  else console.log(report);
  const highs = result.findings.filter((f) => f.severity === "high").length;
  console.error(`\nanalyse terminee : ${result.findings.length} findings (${highs} hauts) -> ${join(abs, "report.generated.md")}`);
  // Un finding haut est un RESULTAT, pas une panne : exit 0. L ancien exit 1
  // faisait lire « l analyzer a echoue » a qui ne regardait que le code de
  // sortie. --strict retablit l ancien comportement pour une CI.
  process.exit(process.argv.includes("--strict") && highs ? 1 : 0);
}

export { analyze, renderReport };
