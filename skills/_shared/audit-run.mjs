import { spawn, execFileSync } from "node:child_process";
import {
  readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync,
  readdirSync, copyFileSync, cpSync, rmSync, statSync,
} from "node:fs";
import { join, dirname, basename, resolve } from "node:path";
import { homedir, platform } from "node:os";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const CR = String.fromCharCode(13);
const LF = String.fromCharCode(10);
const BG_CEILING_MS = "2700000";
const DEFAULT_TIMEOUT_MIN = 45;
const IS_WINDOWS = platform() === "win32";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

// --host : quel agent pilote les sessions. Contrat complet dans
// _shared/sk-host.md §9. Les deux hotes n ont ni la meme CLI, ni le meme
// format de transcript ; tout le reste du script est commun.
const HOST = (opt("host", "claude") || "claude").toLowerCase();
if (!["claude", "cursor"].includes(HOST)) {
  console.error(`--host inconnu : ${HOST} (attendu : claude | cursor)`);
  process.exit(2);
}
const HOST_BIN = HOST === "cursor" ? "cursor-agent" : "claude";
// Slug de modele. Obligatoire cote Cursor : omis, la session herite du modele
// par defaut du poste, qui n est pas une decision de la campagne.
const HOST_MODEL = opt("model", null);

// Verifie le 2026-09-14 : lance depuis Git Bash / MSYS, cursor-agent genere
// ses hooks en PowerShell et les fait evaluer par un shell POSIX. Chaque appel
// shell est rejete (`eval: syntax error near unexpected token '&'`) et la
// session entiere est inexploitable — sans rien dire d autre qu un run vide.
if (HOST === "cursor" && IS_WINDOWS && (process.env.MSYSTEM || process.env.SHELL?.includes("/bin/"))) {
  console.error("STOP : --host cursor lance depuis Git Bash / MSYS.");
  console.error("Les hooks de Cursor y bloquent TOUS les appels shell. Relance depuis PowerShell.");
  process.exit(2);
}

const read = (p) => {
  try {
    return readFileSync(p, "utf8").split(CR + LF).join(LF);
  } catch {
    return null;
  }
};

const git = (cwd, ...gitArgs) => {
  try {
    return execFileSync("git", gitArgs, { cwd, encoding: "utf8" }).trim();
  } catch (e) {
    throw new Error(`git ${gitArgs.join(" ")} a echoue dans ${cwd}: ${e.message}`);
  }
};

const gitQuiet = (cwd, ...gitArgs) => {
  try {
    return execFileSync("git", gitArgs, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
};

const resolvePool = (cwd) => {
  const commonDir = git(cwd, "rev-parse", "--path-format=absolute", "--git-common-dir");
  const mainRoot = dirname(commonDir);
  const repoSlug = basename(mainRoot);
  const poolBase =
    process.env.SK_POOL_ROOT && process.env.SK_POOL_ROOT.trim()
      ? process.env.SK_POOL_ROOT.trim()
      : IS_WINDOWS
        ? "C:\\tmp\\sk-pool"
        : join(homedir(), ".cache", "sk-pool");
  const poolRoot = join(poolBase, repoSlug);
  return { mainRoot, repoSlug, poolBase, poolRoot, statusFile: join(poolRoot, "status.md") };
};

const findTranscript = (sessionId) => {
  const projects = join(homedir(), ".claude", "projects");
  if (!existsSync(projects)) return null;
  for (const dir of readdirSync(projects)) {
    const candidate = join(projects, dir, `${sessionId}.jsonl`);
    if (existsSync(candidate)) return candidate;
  }
  return null;
};

// Les sous-agents (Agent, Workflow) n ecrivent PAS dans le transcript du parent
// mais dans <projects>/<dir>/<sessionId>/agent-<id>.jsonl (isSidechain: true).
// Sans eux, `bySidechain` vaut 0 et un Promise.all est indistinguable d une
// sequence : le parent ne voit qu une attente. Constate le 2026-09-08.
const copyAgentTranscripts = (transcriptPath, sessionId, sessionDir) => {
  if (!transcriptPath) return 0;
  // Arborescence reelle, sur DEUX niveaux :
  //   <sessionId>/subagents/agent-<id>.jsonl            -> Agent direct (recon)
  //   <sessionId>/subagents/workflows/wf_<id>/agent-*   -> workers d un Workflow
  // Les seconds portent le fan-out parallel du regime L : sans eux, un Promise.all
  // est indistinguable d une sequence. Constate le 2026-09-09 (4 workers rates).
  const base = join(dirname(transcriptPath), sessionId);
  if (!existsSync(base)) return 0;
  const out = join(sessionDir, "agents");
  let n = 0;
  const walk = (dir, prefix) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, e.name);
      if (e.isDirectory()) walk(full, e.name.startsWith("wf_") ? e.name : prefix);
      else if (/^agent-.*.jsonl$/.test(e.name)) {
        mkdirSync(out, { recursive: true });
        copyFileSync(full, join(out, prefix ? `${prefix}--${e.name}` : e.name));
        n += 1;
      }
    }
  };
  walk(base, "");
  return n;
};

// Slot BACKEND d audit. Le contrat (sk-audit.md §POOL) le prevoit — « une US
// backend prend son propre pool <POOL_BASE>/<BACK_SLUG>/wt-audit-N » — mais rien
// ne le preparait : /sk-impl aurait pris « premier idle » du pool de TRAVAIL
// backend, sans liberation ni capture (le vol de wt-3 du 2026-09-08, cote back).
// Base = branche d integration du backend (origin/<defaut>), pas le HEAD local :
// ce working tree est presque toujours sur une feature d un autre chantier.
const readBackRoot = (mainRoot) => {
  try {
    const cfg = JSON.parse(read(join(mainRoot, ".sk", "repos.json")) || "{}");
    return typeof cfg.backend === "string" && existsSync(cfg.backend) ? cfg.backend : null;
  } catch {
    return null;
  }
};

const prepareBackSlot = (backCtx, slot, branch, log) => {
  const fetched = gitQuiet(backCtx.mainRoot, "fetch", "--quiet", "origin");
  if (fetched === null) log({ event: "back-fetch-failed", detail: "git fetch origin a echoue, base = origin/<defaut> local" });
  const def =
    gitQuiet(backCtx.mainRoot, "symbolic-ref", "--short", "refs/remotes/origin/HEAD")?.replace(/^origin\//, "") || "dev";
  const baseSha = git(backCtx.mainRoot, "rev-parse", `origin/${def}`);
  git(slot, "checkout", "-B", branch, baseSha);
  git(slot, "reset", "--hard", baseSha);
  git(slot, "clean", "-fd");
  return { baseSha, baseRef: `origin/${def}` };
};

const killTree = (child) => {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (IS_WINDOWS) {
    try {
      execFileSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      return;
    } catch {
      child.kill("SIGKILL");
      return;
    }
  }
  child.kill("SIGKILL");
};

// Cursor ne rend PAS un JSON unique : il streame un evenement par ligne.
// On en tire les deux choses dont le reste du script a besoin — le texte final
// (pour le controle « PRET ») et l identifiant de session (impose cote Claude
// par --session-id, seulement RENDU cote Cursor par l evenement init).
const parseCursorStream = (stdout) => {
  let result = "";
  let chatId = null;
  for (const line of stdout.split(LF)) {
    if (!line.trim().startsWith("{")) continue; // la CLI prefixe des traces non JSON
    let e;
    try { e = JSON.parse(line); } catch { continue; }
    if (e.session_id && !chatId) chatId = e.session_id;
    if (e.type === "assistant" && Array.isArray(e.message?.content))
      for (const c of e.message.content) if (c.type === "text" && c.text) result += c.text;
  }
  return { result, chatId };
};

// Recolle turn1.json puis step1..N.json — le stdout brut de chaque tour — en
// un seul .jsonl, dans l ordre, en ne gardant que les lignes JSON (la CLI
// prefixe des traces de retrieval). Rend le chemin ecrit, ou null si aucun
// evenement n a ete capture : un run vide ne doit pas passer pour un run muet.
const buildCursorTranscript = (sessionDir) => {
  const steps = readdirSync(sessionDir)
    .filter((f) => /^step\d+\.json$/.test(f))
    // Tri NUMERIQUE : un tri lexical met step10 avant step2 et intervertit les
    // phases d une campagne longue.
    .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
  const parts = ["turn1.json", ...steps];
  const lines = [];
  for (const p of parts) {
    const raw = read(join(sessionDir, p));
    if (!raw) continue;
    for (const line of raw.split(LF)) if (line.trim().startsWith("{")) lines.push(line.trim());
  }
  if (!lines.length) return null;
  const out = join(sessionDir, "transcript.jsonl");
  writeFileSync(out, lines.join(LF) + LF);
  return out;
};

const runTurn = ({ cwd, env, prompt, sessionId, resume, addDirs, timeoutMs }) =>
  new Promise((done) => {
    const cliArgs = ["-p"];
    if (HOST === "cursor") {
      // --force : pas d approbation interactive (equivalent de bypassPermissions).
      // --trust : ne demande pas la confiance du dossier, le slot est neuf.
      cliArgs.push("--output-format", "stream-json", "--force", "--trust");
      if (HOST_MODEL) cliArgs.push("--model", HOST_MODEL);
      if (resume) cliArgs.push("--resume", sessionId);
    } else {
      cliArgs.push("--output-format", "json", "--permission-mode", "bypassPermissions");
      if (resume) cliArgs.push("--resume", sessionId);
      else cliArgs.push("--session-id", sessionId);
    }
    for (const d of addDirs || []) cliArgs.push("--add-dir", `"${d}"`);

    const child = spawn(HOST_BIN, cliArgs, { cwd, env, shell: true });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      killTree(child);
    }, timeoutMs);

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => {
      clearTimeout(timer);
      let parsed = null;
      if (HOST === "cursor") {
        const { result, chatId } = parseCursorStream(stdout);
        parsed = { result, chatId };
      } else {
        try {
          parsed = JSON.parse(stdout);
        } catch {
          parsed = null;
        }
      }
      done({ code, stdout, stderr, parsed, timedOut });
    });
    child.stdin.end(prompt);
  });

// marks.jsonl : chaque AUDIT_MARK trouve dans un appel d outil du transcript,
// horodate. TOUTES les marques d un appel (matchAll), pas la premiere seule.
// Deux formats : `AUDIT_MARK <skill> <phase> <edge>` (courant) et
// `AUDIT_MARK <phase> <edge>` (ancien, skill absent -> null).
const MARK_RX = /AUDIT_MARK\s+(?:(sk-[a-z]+)\s+)?(bootstrap|cycles|closing)\s+(start|end)/g;
const SHELL_TOOLS = new Set(["Bash", "PowerShell"]);

const writeMarks = (transcriptPath, outPath) => {
  const lines = (read(transcriptPath) || "").split(LF).filter((l) => l.trim());
  const marks = [];
  for (const l of lines) {
    let e;
    try { e = JSON.parse(l); } catch { continue; }

    // Cursor : un evenement par appel d outil, la commande shell est dans
    // tool_call.shellToolCall.args.command. Seul `started` compte — `completed`
    // reprend les memes args et doublerait chaque marque.
    // L horodatage est en ms depuis l epoque, pas en ISO : on convertit ici
    // pour que l analyse ne voie jamais deux formats.
    if (e.type === "tool_call") {
      if (e.subtype !== "started") continue;
      const cmd = e.tool_call?.shellToolCall?.args?.command;
      if (!cmd || !e.timestamp_ms) continue;
      const ts = new Date(Number(e.timestamp_ms)).toISOString();
      for (const m of String(cmd).matchAll(MARK_RX))
        marks.push({ ts, skill: m[1] || null, phase: m[2], edge: m[3], tool: "Shell" });
      continue;
    }

    if (!e.timestamp || e.type !== "assistant" || !Array.isArray(e.message?.content)) continue;
    for (const c of e.message.content) {
      if (c.type !== "tool_use") continue;
      // Une marque est un `echo` : seuls les outils shell en emettent. Un Write
      // ou un Edit dont le contenu MENTIONNE une marque (journal.md qui
      // documente ses phases) produisait de fausses marques, en double ou en
      // triple au meme timestamp, et rendait la decomposition de /sk-impl
      // inexploitable (r2 du 2026-09-08 : 4 faux `bootstrap start`).
      if (!SHELL_TOOLS.has(c.name)) continue;
      const txt = String(c.input?.command ?? "");
      for (const m of txt.matchAll(MARK_RX))
        marks.push({ ts: e.timestamp, skill: m[1] || null, phase: m[2], edge: m[3], tool: c.name });
    }
  }
  writeFileSync(outPath, marks.map((m) => JSON.stringify(m)).join(LF) + (marks.length ? LF : ""));
  return marks.length;
};

const resolveFeatureDir = (slot) => {
  const featureJson = read(join(slot, ".specify", "feature.json"));
  if (featureJson) {
    try {
      const parsed = JSON.parse(featureJson);
      const candidate = parsed.FEATURE_DIR || parsed.featureDir || parsed.dir;
      if (candidate) {
        const abs = resolve(slot, candidate);
        if (existsSync(abs)) return abs;
      }
    } catch {
      return null;
    }
  }
  const specs = join(slot, "specs");
  if (!existsSync(specs)) return null;
  const dirs = readdirSync(specs, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => join(specs, e.name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  return dirs[0] || null;
};

// <CONTRACT> : le fichier contrat nomme par la cle `contract` de
// <FEATURE_DIR>/parallel.yml. Son nom est choisi par la prep, donc inconnu a
// l ecriture de la campagne ; sans ce jeton, la faute C1 (contrat mute en vol)
// etait inexprimable.
const resolveContract = (ctx) => {
  if (!ctx.featureDir) return null;
  const yml = read(join(ctx.featureDir, "parallel.yml"));
  if (!yml) return null;
  const m = yml.match(/^\s*contract:\s*(\S+)/m);
  if (!m) return null;
  const rel = m[1].replace(/^["']|["']$/g, "");
  const candidates = [resolve(ctx.slot, rel), resolve(ctx.mainRoot, rel), resolve(ctx.featureDir, rel)];
  return candidates.find((p) => existsSync(p)) || candidates[0];
};

const expandTokens = (value, ctx) =>
  String(value)
    .split("<SLOT>").join(ctx.slot)
    .split("<MAIN>").join(ctx.mainRoot)
    .split("<POOL_ROOT>").join(ctx.poolRoot)
    .split("<OUT>").join(ctx.outDir)
    .split("<FEATURE_DIR>").join(ctx.featureDir || join(ctx.slot, "specs", "__unresolved__"))
    .split("<CONTRACT>").join(resolveContract(ctx) || join(ctx.slot, "specs", "__contract-unresolved__"));

// Toute mutation est reversible : on garde l etat d origine et runSession le
// remet en place dans son finally. Indispensable depuis que specs/ peut etre une
// jonction vers le depot principal (une mutation de <FEATURE_DIR> y ecrit
// directement) et pour B3/B4 qui touchent .sk/repos.json de l utilisateur.
const snapshot = (ctx, target) => {
  if (!target || !ctx.undo) return;
  if (ctx.undo.some((u) => u.path === target)) return;
  ctx.undo.push({ path: target, before: existsSync(target) ? readFileSync(target) : null });
};

const restoreAll = (undo, log) => {
  for (const u of [...undo].reverse()) {
    try {
      if (u.before === null) {
        if (existsSync(u.path)) rmSync(u.path, { recursive: true, force: true });
      } else {
        mkdirSync(dirname(u.path), { recursive: true });
        writeFileSync(u.path, u.before);
      }
      log({ event: "restore", path: u.path, status: "ok" });
    } catch (e) {
      log({ event: "restore", path: u.path, status: "failed", detail: e.message });
    }
  }
};

const applyMutation = (fault, ctx, log) => {
  const target = fault.path ? expandTokens(fault.path, ctx) : null;
  const record = (status, detail) => {
    log({ event: "fault", fault: fault.id, op: fault.op, status, detail });
    return { id: fault.id, op: fault.op, status, detail, path: target };
  };

  try {
    if (["delete", "write", "append", "replace", "jsonSet"].includes(fault.op)) snapshot(ctx, target);
    if (fault.op === "statusBusy") snapshot(ctx, ctx.statusFile);
    switch (fault.op) {
      case "delete":
        if (!existsSync(target)) return record("skipped", "cible absente");
        rmSync(target, { recursive: true, force: true });
        return record("applied", target);

      case "write":
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, fault.content ?? "");
        return record("applied", target);

      case "append":
        if (!existsSync(target)) return record("skipped", "cible absente");
        appendFileSync(target, fault.content ?? "");
        return record("applied", target);

      case "replace": {
        const text = read(target);
        if (text === null) return record("skipped", "cible absente");
        if (!text.includes(fault.find)) return record("skipped", `motif absent: ${fault.find}`);
        writeFileSync(target, text.split(fault.find).join(fault.replaceWith ?? ""));
        return record("applied", target);
      }

      case "jsonSet": {
        const text = read(target);
        if (text === null) return record("skipped", "cible absente");
        const parsed = JSON.parse(text);
        parsed[fault.key] = fault.value === "null" ? null : fault.value;
        writeFileSync(target, `${JSON.stringify(parsed, null, 2)}${LF}`);
        return record("applied", `${fault.key}=${fault.value}`);
      }

      case "statusBusy": {
        const lines = (fault.slots || ["wt-1", "wt-2", "wt-3", "wt-4"]).map(
          (s) => `${s} | sk-impl-audit-decoy | busy | agent CLAUDE | updated ${new Date().toISOString()}`
        );
        writeFileSync(ctx.statusFile, `${lines.join(LF)}${LF}`);
        return record("applied", `${lines.length} slots marques busy`);
      }

      case "unlinkNodeModules": {
        const nm = join(ctx.slot, "node_modules");
        if (!existsSync(nm)) return record("skipped", "node_modules deja absent");
        rmSync(nm, { recursive: true, force: true });
        return record("applied", nm);
      }

      default:
        return record("skipped", `op inconnue: ${fault.op}`);
    }
  } catch (e) {
    return record("failed", e.message);
  }
};

const startWatcher = (fault, ctx, log) => {
  const trigger = expandTokens(fault.trigger, ctx);
  const pollMs = fault.pollMs || 2000;
  const state = { fired: null, stopped: false };
  const tick = () => {
    if (state.stopped) return;
    if (existsSync(trigger)) {
      state.fired = applyMutation({ ...fault, op: fault.thenOp, path: fault.thenPath }, ctx, log);
      state.stopped = true;
      return;
    }
    setTimeout(tick, pollMs);
  };
  log({ event: "watcher-armed", fault: fault.id, trigger });
  setTimeout(tick, pollMs);
  return {
    stop: () => {
      state.stopped = true;
      return state.fired || { id: fault.id, op: fault.thenOp, status: "skipped", detail: "declencheur jamais apparu" };
    },
  };
};

const ensureSlot = (ctx, slotName) => {
  const slot = join(ctx.poolRoot, slotName);
  if (existsSync(join(slot, ".git"))) return slot;
  mkdirSync(ctx.poolRoot, { recursive: true });
  const baseSha = git(ctx.mainRoot, "rev-parse", "HEAD");
  git(ctx.mainRoot, "worktree", "add", "--detach", slot, baseSha);
  return slot;
};

const linkNodeModules = (ctx, slot) => {
  const target = join(slot, "node_modules");
  if (existsSync(target)) return "present";
  const source = join(ctx.mainRoot, "node_modules");
  if (!existsSync(source)) return "source-absente";
  try {
    if (IS_WINDOWS)
      execFileSync("cmd", ["/c", "mklink", "/J", target, source], { stdio: "ignore" });
    else execFileSync("ln", ["-s", source, target], { stdio: "ignore" });
    return "jonction-creee";
  } catch (e) {
    return `echec: ${e.message}`;
  }
};

const prepareSlot = (ctx, slot, branch) => {
  const baseSha = git(ctx.mainRoot, "rev-parse", "HEAD");
  git(slot, "checkout", "-B", branch, baseSha);
  git(slot, "reset", "--hard", baseSha);
  git(slot, "clean", "-fd");
  return baseSha;
};

const releaseSlot = (ctx, slot, branch) => {
  const fallback =
    gitQuiet(ctx.mainRoot, "symbolic-ref", "--short", "refs/remotes/origin/HEAD")?.replace(/^origin\//, "") || "dev";
  gitQuiet(slot, "checkout", "--detach", `origin/${fallback}`) ?? gitQuiet(slot, "checkout", "--detach", "HEAD");
  gitQuiet(slot, "branch", "-D", branch);
  const marker = `${basename(slot)} | idle`;
  const current = read(ctx.statusFile) || "";
  const kept = current.split(LF).filter((l) => l.trim() && !l.startsWith(`${basename(slot)} |`));
  writeFileSync(ctx.statusFile, `${[...kept, marker].join(LF)}${LF}`);
};

const markBusy = (ctx, slot, branch, sessionId) => {
  const line = `${basename(slot)} | ${branch} | busy | agent ${HOST.toUpperCase()} | session ${sessionId} | updated ${new Date().toISOString()}`;
  const current = read(ctx.statusFile) || "";
  const kept = current.split(LF).filter((l) => l.trim() && !l.startsWith(`${basename(slot)} |`));
  mkdirSync(dirname(ctx.statusFile), { recursive: true });
  writeFileSync(ctx.statusFile, `${[...kept, line].join(LF)}${LF}`);
};

const buildPrefix = (campaign, sessionDir) => {
  const template = read(join(dirname(fileURLToPath(import.meta.url)), "audit-prefix.md"));
  const fallback = "Session d audit non interactive. Reponds exactement PRET et rien d autre.";
  return (template || fallback)
    .split("{{JOURNAL}}").join(join(sessionDir, "journal.md"))
    .split("{{ANSWERS}}").join(join(sessionDir, "answers.jsonl"))
    .split("{{INTENT}}").join(join(sessionDir, "intent.md"))
    .split("{{BASELINE}}").join(campaign.baseline || "- aucune baseline fournie");
};

const runSession = async (session, campaign, ctx) => {
  const sessionDir = join(ctx.outDir, session.id);
  mkdirSync(sessionDir, { recursive: true });
  const progress = join(ctx.outDir, "progress.jsonl");
  const log = (entry) =>
    appendFileSync(progress, `${JSON.stringify({ ts: new Date().toISOString(), session: session.id, ...entry })}${LF}`);

  const slot = ensureSlot(ctx, session.slot);
  const branch = `sk-audit-${session.id}`;
  const sessionCtx = { ...ctx, slot, outDir: sessionDir, featureDir: null, undo: [] };
  // Slot backend : session.backend (explicite) sinon deduit du regime L.
  const wantsBack = session.backend ?? session.regime === "L";
  const backRoot = wantsBack ? readBackRoot(ctx.mainRoot) : null;
  const backCtx = backRoot ? resolvePool(backRoot) : null;
  const backSlot = backCtx ? ensureSlot(backCtx, session.slot) : null;
  let backBase = null;
  const timeoutMs = (campaign.timeoutMin || DEFAULT_TIMEOUT_MIN) * 60_000;
  const faultResults = [];
  const watchers = [];
  const sessionStartedMs = Date.now();

  try {
    log({ event: "session-start", slot: session.slot, regime: session.regime, item: session.item });
    const baseSha = prepareSlot(ctx, slot, branch);
    markBusy(ctx, slot, branch, session.id);
    log({ event: "slot-ready", baseSha, nodeModules: linkNodeModules(ctx, slot) });
    if (wantsBack && !backCtx) log({ event: "back-slot-skipped", detail: ".sk/repos.json sans backend valide : aucune US backend ne pourra tourner" });
    if (backCtx) {
      backBase = prepareBackSlot(backCtx, backSlot, branch, log);
      markBusy(backCtx, backSlot, branch, session.id);
      log({ event: "back-slot-ready", slot: backSlot, baseSha: backBase.baseSha, baseRef: backBase.baseRef });
    }

    const itemDir = join(campaign.corpusRoot, session.item);
    for (const name of ["intent.md", "prompt.txt", "expected.json"]) {
      const src = join(itemDir, name);
      if (existsSync(src)) copyFileSync(src, join(sessionDir, name));
    }

    const env = {
      ...process.env,
      AUDIT_MODE: "1",
      AUDIT_SESSION: session.id,
      AUDIT_OUT_DIR: sessionDir,
      AUDIT_INTENT_FILE: join(sessionDir, "intent.md"),
      CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS: BG_CEILING_MS,
      ...(backSlot ? { AUDIT_BACK_SLOT: backSlot, AUDIT_BACK_BASE: backBase.baseSha } : {}),
    };
    const addDirs = [sessionDir, ctx.poolRoot, ...(backCtx ? [backCtx.poolRoot] : [])];
    const sessionId = randomUUID();
    writeFileSync(join(sessionDir, "session-id.txt"), sessionId);

    const prefix = buildPrefix(campaign, sessionDir);
    const turn1 = await runTurn({ cwd: slot, env, prompt: prefix, sessionId, resume: false, addDirs, timeoutMs: 300_000 });
    writeFileSync(join(sessionDir, "turn1.json"), turn1.stdout || JSON.stringify({ error: turn1.stderr }));
    // Cursor n accepte pas qu on IMPOSE l identifiant de session : il le rend
    // au premier tour, et c est lui qu il faut repasser a --resume ensuite.
    // Cote Claude, --session-id fait foi et cette ligne ne change rien.
    let hostSessionId = sessionId;
    if (HOST === "cursor" && turn1.parsed?.chatId) {
      hostSessionId = turn1.parsed.chatId;
      writeFileSync(join(sessionDir, "session-id.txt"), hostSessionId);
    }
    // Insensible aux accents : le prefixe demande « PRET » sans accent, mais un
    // modele qui ecrit du francais correct repond « PRÊT » et la session etait
    // rejetee au hasard, avant toute mesure. Constate le 2026-09-08.
    const ready = (turn1.parsed?.result || "")
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toUpperCase()
      .includes("PRET");
    log({ event: "turn1", ready, code: turn1.code });
    if (!ready) {
      log({ event: "session-end", status: "frame-refused" });
      return { id: session.id, status: "frame-refused", faults: faultResults };
    }

    let stepIndex = 0;
    for (const step of session.steps) {
      if (step.faults) {
        for (const id of step.faults) {
          const fault = campaign.faults?.[id];
          if (!fault) {
            faultResults.push({ id, status: "skipped", detail: "faute absente de campaign.faults" });
            continue;
          }
          sessionCtx.featureDir = sessionCtx.featureDir || resolveFeatureDir(slot);
          // Garde-fou : depuis que `specs/` peut etre partage entre worktrees,
          // resolveFeatureDir peut retomber sur la spec REELLE la plus recemment
          // modifiee (son repli est le mtime) si `.specify/feature.json` est
          // perime. Les mutations ecrivent dans <FEATURE_DIR> : une mauvaise
          // resolution corromprait le travail de l utilisateur. On exige donc que
          // le dossier ait ete cree ou modifie APRES le debut de la session.
          if (sessionCtx.featureDir) {
            let born = 0;
            try {
              const st = statSync(sessionCtx.featureDir);
              born = Math.max(st.mtimeMs, st.birthtimeMs || 0);
            } catch { born = 0; }
            if (born < sessionStartedMs) {
              faultResults.push({
                id,
                status: "skipped",
                detail: `FEATURE_DIR anterieur a la session (${basename(sessionCtx.featureDir)}) : mutation refusee pour ne pas ecrire dans une spec reelle`,
                path: sessionCtx.featureDir,
              });
              log({ event: "fault", fault: id, status: "refused-stale-featuredir", detail: sessionCtx.featureDir });
              continue;
            }
          }
          if (fault.op === "watch") watchers.push({ id, handle: startWatcher(fault, sessionCtx, log) });
          else faultResults.push(applyMutation(fault, sessionCtx, log));
        }
        continue;
      }

      stepIndex += 1;
      const prompt = step.arg ? `${step.command} "${step.arg.split('"').join("'")}"` : step.command;
      writeFileSync(join(sessionDir, `step${stepIndex}-prompt.txt`), prompt);
      log({ event: "step-start", step: stepIndex, command: step.command });
      const turn = await runTurn({ cwd: slot, env, prompt, sessionId: hostSessionId, resume: true, addDirs, timeoutMs });
      writeFileSync(join(sessionDir, `step${stepIndex}.json`), turn.stdout || JSON.stringify({ error: turn.stderr }));
      sessionCtx.featureDir = resolveFeatureDir(slot);
      log({
        event: "step-end",
        step: stepIndex,
        command: step.command,
        timedOut: turn.timedOut,
        durationMs: turn.parsed?.duration_ms ?? null,
        costUsd: turn.parsed?.total_cost_usd ?? null,
        numTurns: turn.parsed?.num_turns ?? null,
        terminalReason: turn.parsed?.terminal_reason ?? null,
      });
      if (turn.timedOut) {
        log({ event: "session-end", status: "harness-timeout" });
        return { id: session.id, status: "harness-timeout", faults: faultResults };
      }
    }

    for (const w of watchers) faultResults.push(w.handle.stop());

    // Slot detourne : /sk-impl a pris un slot du pool de TRAVAIL (premier idle)
    // au lieu du slot d audit prepare ici. Le diff mesure sur `slot` sort alors
    // vide face a `commits > 0`, et le slot vole reste busy sous un prefixe
    // sk-impl-* qu un vrai run adopterait. Constate le 2026-09-08 (wt-3).
    // On ne libere PAS le slot vole (il peut porter le travail) : on le consigne.
    const hijacked = (read(ctx.statusFile) || "")
      .split(LF)
      .filter((l) => l.includes(`session ${session.id}`) && !l.startsWith(`${basename(slot)} |`))
      .map((l) => l.split("|")[0].trim());
    const backHijacked = backCtx
      ? (read(backCtx.statusFile) || "")
          .split(LF)
          .filter((l) => l.includes(`session ${session.id}`) && !l.startsWith(`${basename(backSlot)} |`))
          .map((l) => l.split("|")[0].trim())
      : [];
    writeFileSync(
      join(sessionDir, "slot-check.json"),
      `${JSON.stringify(
        {
          expected: basename(slot),
          hijacked,
          branchOnSlot: gitQuiet(slot, "branch", "--show-current") || null,
          backExpected: backSlot ? basename(backSlot) : null,
          backPool: backCtx ? backCtx.poolRoot : null,
          backHijacked,
          backBranchOnSlot: backSlot ? gitQuiet(backSlot, "branch", "--show-current") || null : null,
        },
        null,
        2
      )}${LF}`
    );
    if (hijacked.length) log({ event: "slot-hijack", expected: basename(slot), hijacked });
    if (backHijacked.length) log({ event: "back-slot-hijack", expected: basename(backSlot), hijacked: backHijacked });

    // Cursor range ses conversations dans une base SQLite illisible sans
    // dependance — et le kit n en installe aucune. Son flux stream-json de
    // stdout porte deja tout ce que l analyse demande : il EST le transcript.
    // On recolle les tours dans l ordre. Ses sous-agents sont dans le meme
    // flux, il n y a donc rien a copier a cote.
    const transcript = HOST === "cursor" ? buildCursorTranscript(sessionDir) : findTranscript(sessionId);
    if (transcript && HOST !== "cursor") copyFileSync(transcript, join(sessionDir, "transcript.jsonl"));
    const agentCount = HOST === "cursor" ? 0 : copyAgentTranscripts(transcript, sessionId, sessionDir);
    log({ event: "transcript", found: Boolean(transcript), agents: agentCount });
    if (transcript) writeMarks(join(sessionDir, "transcript.jsonl"), join(sessionDir, "marks.jsonl"));

    const diff = gitQuiet(slot, "diff", "--stat", baseSha) || "";
    writeFileSync(join(sessionDir, "slot-diff.txt"), diff);
    // Le patch COMPLET, pas seulement le --stat : releaseSlot fait `clean -fd`
    // et le code produit n est plus relisible ensuite. Trois implementations
    // du meme helper (15, 20, 11 lignes) n ont pu etre comparees qu en volume.
    writeFileSync(join(sessionDir, "slot-diff.full.patch"), gitQuiet(slot, "diff", baseSha) || "");
    if (backSlot) {
      writeFileSync(join(sessionDir, "slot-diff-back.txt"), gitQuiet(backSlot, "diff", "--stat", backBase.baseSha) || "");
      writeFileSync(join(sessionDir, "slot-diff-back.full.patch"), gitQuiet(backSlot, "diff", backBase.baseSha) || "");
      writeFileSync(join(sessionDir, "slot-log-back.txt"), gitQuiet(backSlot, "log", "--oneline", "-n", "20", backBase.baseSha + "..HEAD") || "");
    }
    writeFileSync(join(sessionDir, "slot-log.txt"), gitQuiet(slot, "log", "--oneline", "-n", "20", baseSha + "..HEAD") || "");
    writeFileSync(join(sessionDir, "faults.json"), `${JSON.stringify(faultResults, null, 2)}${LF}`);
    if (sessionCtx.featureDir) {
      writeFileSync(join(sessionDir, "feature-dir.txt"), sessionCtx.featureDir);
      cpSync(sessionCtx.featureDir, join(sessionDir, "trio"), { recursive: true });
      log({ event: "trio-captured", from: sessionCtx.featureDir });
    }

    log({ event: "session-end", status: "completed" });
    return { id: session.id, status: "completed", faults: faultResults };
  } catch (e) {
    log({ event: "session-end", status: "runner-error", detail: e.message });
    return { id: session.id, status: "runner-error", detail: e.message, faults: faultResults };
  } finally {
    for (const w of watchers) w.handle.stop();
    restoreAll(sessionCtx.undo, log);
    try {
      releaseSlot(ctx, slot, branch);
    } catch (e) {
      log({ event: "release-failed", detail: e.message });
    }
    if (backCtx) {
      try {
        releaseSlot(backCtx, backSlot, branch);
      } catch (e) {
        log({ event: "back-release-failed", detail: e.message });
      }
    }
  }
};

const main = async () => {
  const campaignPath = opt("campaign");
  if (!campaignPath) {
    console.error("usage: node audit-run.mjs --campaign <campaign.json> [--dry-run]");
    process.exit(2);
  }
  const campaign = JSON.parse(read(resolve(campaignPath)));
  const ctx = { ...resolvePool(campaign.mainRoot || process.cwd()), outDir: resolve(campaign.outDir) };
  mkdirSync(ctx.outDir, { recursive: true });

  const slots = [...new Set(campaign.sessions.map((s) => s.slot))];
  const waves = [];
  const concurrency = Math.max(1, Math.min(campaign.concurrency || slots.length, slots.length));
  const bySlot = new Map();
  for (const s of campaign.sessions) {
    if (!bySlot.has(s.slot)) bySlot.set(s.slot, []);
    bySlot.get(s.slot).push(s);
  }
  const queues = [...bySlot.values()];
  const depth = Math.max(...queues.map((q) => q.length));
  for (let i = 0; i < depth; i += 1) {
    const wave = queues.map((q) => q[i]).filter(Boolean);
    for (let j = 0; j < wave.length; j += concurrency) waves.push(wave.slice(j, j + concurrency));
  }

  console.log(`runId       : ${campaign.runId}`);
  console.log(`repo        : ${ctx.mainRoot} (${ctx.repoSlug})`);
  console.log(`pool        : ${ctx.poolRoot}`);
  console.log(
    `sessions    : ${campaign.sessions.length} sur ${slots.length} slots, ${waves.length} vague${waves.length > 1 ? "s" : ""}`
  );
  console.log(`timeout     : ${campaign.timeoutMin || DEFAULT_TIMEOUT_MIN} min par etape`);
  for (const s of campaign.sessions) {
    const faults = s.steps.flatMap((st) => st.faults || []);
    console.log(`  ${s.id.padEnd(24)} ${s.slot.padEnd(12)} ${s.regime.padEnd(3)} ${faults.length ? `fautes ${faults.join(",")}` : ""}`);
  }

  if (flag("dry-run")) {
    console.log("\n--dry-run : rien n a ete execute");
    return;
  }

  const results = [];
  for (const wave of waves) {
    const done = await Promise.all(wave.map((s) => runSession(s, campaign, ctx)));
    results.push(...done);
  }

  writeFileSync(join(ctx.outDir, "sessions.json"), `${JSON.stringify(results, null, 2)}${LF}`);
  const counts = results.reduce((a, r) => ({ ...a, [r.status]: (a[r.status] || 0) + 1 }), {});
  console.log(`\ntermine : ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(", ")}`);
  console.log(`artefacts : ${ctx.outDir}`);
  console.log(`analyse   : node audit-analyze.mjs "${ctx.outDir}"`);
};

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
