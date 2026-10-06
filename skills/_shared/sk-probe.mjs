// One Bash call instead of six to eight: everything /sk-prep and /sk-impl establish before their
// first real step (audit mode, supervisor heartbeat in UTC, default branch, .sk/repos.json, agent-os
// index, spec-kit script variant, i18n locales and parity test, tsconfig aliases). Each detection
// used to be a separate tool call at 3.5-8 s, and the supervisor age was miscomputed in local time.
//
// Usage: node sk-probe.mjs [--root <repo>] [--skill sk-prep|sk-impl] [--json]
// Prints `key=value` lines (or one JSON object). Never fails: an unknown value is `none`.
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, basename, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { homedir, platform } from "node:os";
import { fileURLToPath } from "node:url";

const git = (cwd, ...a) => {
  try {
    return execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
};
const readText = (p) => {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return null;
  }
};
const readJson = (p) => {
  const t = readText(p);
  if (t === null) return null;
  try {
    return JSON.parse(t.replace(/^\uFEFF/, ""));
  } catch {
    return null;
  }
};
// tsconfig allows comments and trailing commas.
const readJsonc = (p) => {
  const t = readText(p);
  if (t === null) return null;
  const stripped = t
    .replace(/^\uFEFF/, "")
    .replace(/("(?:[^"\\]|\\.)*")|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (m, s) => s || "")
    .replace(/,(\s*[}\]])/g, "$1");
  try {
    return JSON.parse(stripped);
  } catch {
    return null;
  }
};

export const defaultBranch = (root) => {
  const head = git(root, "symbolic-ref", "--short", "refs/remotes/origin/HEAD");
  if (head) return head;
  for (const b of ["origin/dev", "origin/develop", "origin/main", "origin/master"])
    if (git(root, "rev-parse", "--verify", "--quiet", b)) return b;
  return null;
};

const refFiles = (root, ref) => {
  const out = ref ? git(root, "ls-tree", "-r", "--name-only", ref) : null;
  return out ? out.split("\n").filter(Boolean) : [];
};

export const localesOf = (files) => {
  const byDir = new Map();
  for (const f of files) {
    const m = f.match(/^(.*\/(?:locales|i18n|translations|lang)(?:\/[\w-]+)*)\/([a-z]{2}(?:[-_][A-Za-z]{2})?)\.json$/);
    if (!m || /node_modules|__tests__|__mocks__/.test(f)) continue;
    if (!byDir.has(m[1])) byDir.set(m[1], []);
    byDir.get(m[1]).push(m[2]);
  }
  let best = null;
  for (const [dir, langs] of byDir) if (!best || langs.length > best.langs.length) best = { dir, langs: langs.sort() };
  return best;
};

export const parityTestOf = (root, ref, files) => {
  const tests = files.filter((f) => /(__tests__\/|\.(test|spec)\.[jt]sx?$)/.test(f) && /\.[jt]sx?$/.test(f));
  const named = tests.find((f) => /(parity|locales?|i18n|translations?)/i.test(basename(f)));
  if (named) return named;
  if (!ref) return null;
  const hit = git(root, "grep", "-l", "-E", "deepKeys|same deep keys|parity", ref, "--", ...tests.slice(0, 2000));
  return hit ? hit.split("\n")[0].replace(/^[^:]+:/, "") : null;
};

export const aliasesOf = (root) => {
  const ts = readJsonc(join(root, "tsconfig.json"));
  let paths = ts?.compilerOptions?.paths;
  if (!paths && ts?.references) {
    for (const r of ts.references) {
      const sub = readJsonc(join(root, r.path.endsWith(".json") ? r.path : join(r.path, "tsconfig.json")));
      if (sub?.compilerOptions?.paths) {
        paths = sub.compilerOptions.paths;
        break;
      }
    }
  }
  return paths ? Object.entries(paths).map(([k, v]) => `${k}->${[].concat(v).join("|")}`) : [];
};

// Standards present on disk but absent from index.yml: no prep can pick them, so they are never
// applied (front of the bench: 4 out of 53, among them react/grid-filters).
const unindexed = (top, indexText) => {
  const dir = join(top, "agent-os", "standards");
  const ids = new Set();
  let group = null;
  for (const l of indexText.split(/\r?\n/)) {
    const g = l.match(/^([\w.-]+):\s*$/);
    const c = l.match(/^ {2}([\w.-]+):\s*$/);
    const d = l.match(/^ {2}description:/);
    if (g) group = g[1];
    else if (c && group) ids.add(group + "/" + c[1]);
    else if (d && group) ids.add(group);
  }
  const out = [];
  const walk = (d, rel) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(d, e.name), rel + e.name + "/");
      else if (e.name.endsWith(".md")) {
        const id = rel + e.name.replace(/\.md$/, "");
        if (!ids.has(id)) out.push(id);
      }
    }
  };
  try { walk(dir, ""); } catch { return []; }
  return out;
};

const supervisorOf = () => {
  if (process.env.SK_NO_SUPERVISOR === "1") return { state: "disabled" };
  const dir = process.env.SK_SUPERVISOR_DIR || (platform() === "win32" ? "C:\\tmp\\mon-developpeur" : join(homedir(), ".cache", "mon-developpeur"));
  const s = readJson(join(dir, "supervisor.json"));
  if (!s || !s.heartbeatAt) return { state: "none" };
  const age = Math.floor((Date.now() - Date.parse(s.heartbeatAt)) / 60000);
  return { state: age < 30 ? "alive" : "stale", ageMinutes: age, name: s.name || s.agent || "none" };
};

export const probe = (root, skill) => {
  const top = git(root, "rev-parse", "--show-toplevel") || root;
  const common = git(root, "rev-parse", "--path-format=absolute", "--git-common-dir");
  const mainRoot = common ? dirname(common) : top;
  const ref = defaultBranch(top);
  const files = refFiles(top, ref);
  const repos = readJson(join(mainRoot, ".sk", "repos.json"));
  const ps = join(top, ".specify", "scripts", "powershell");
  const sh = join(top, ".specify", "scripts", "bash");
  const variant = existsSync(join(ps, "create-new-feature.ps1")) ? "ps1" : existsSync(join(sh, "create-new-feature.sh")) ? "sh" : "none";
  const scriptDir = variant === "ps1" ? ps : variant === "sh" ? sh : null;
  const feature = readJson(join(top, ".specify", "feature.json"));
  const featureDir = feature && (feature.FEATURE_DIR || feature.featureDir || feature.dir);
  const loc = localesOf(files);
  const index = join(top, "agent-os", "standards", "index.yml");
  const indexText = readText(index);
  const always = indexText ? (indexText.match(/alwaysInject:\s*\n((?:\s+-\s+.+\n?)+)/) || [, ""])[1].match(/-\s+(\S+)/g) : null;
  const sup = supervisorOf();
  return {
    skill: skill || "none",
    auditMode: process.env.AUDIT_MODE === "1" ? 1 : 0,
    auditSession: process.env.AUDIT_SESSION || "none",
    supervisor: sup.state,
    supervisorAgeMin: sup.ageMinutes ?? "none",
    supervisorName: sup.name ?? "none",
    repoRoot: top.replace(/\\/g, "/"),
    mainRoot: mainRoot.replace(/\\/g, "/"),
    isWorktree: common ? resolve(common) !== resolve(join(top, ".git")) : false,
    branch: git(top, "branch", "--show-current") || "none",
    defaultRef: ref || "none",
    defaultSha: ref ? git(top, "rev-parse", "--short", ref) : "none",
    dirty: (git(top, "status", "--porcelain") || "") !== "",
    backend: repos ? (typeof repos.backend === "string" ? repos.backend : "null") : "absent",
    legacyBackend: repos && typeof repos.legacyBackend === "string" ? repos.legacyBackend : "null",
    legacyFrontend: repos && typeof repos.legacyFrontend === "string" ? repos.legacyFrontend : "null",
    standardsIndex: indexText ? "agent-os/standards/index.yml" : "none",
    standardsAlways: always ? always.map((s) => s.replace(/^-\s+/, "")).join(",") : "none",
    standardsUnindexed: indexText ? unindexed(top, indexText).join(",") || "none" : "none",
    speckitScripts: variant,
    createFeature: scriptDir ? join(scriptDir, `create-new-feature.${variant}`).replace(/\\/g, "/") : "none",
    setupTasks: scriptDir ? join(scriptDir, `setup-tasks.${variant}`).replace(/\\/g, "/") : "none",
    featureJson: featureDir ? `${featureDir}${existsSync(resolve(top, featureDir)) ? "" : " (ABSENT)"}` : "none",
    specsCount: existsSync(join(top, "specs")) ? readdirSync(join(top, "specs")).length : 0,
    localesDir: loc ? loc.dir : "none",
    locales: loc ? loc.langs.join(",") : "none",
    parityTest: loc ? parityTestOf(top, ref, files) || "none" : "none",
    aliases: aliasesOf(top).join(" ") || "none",
    vitest: existsSync(join(top, "node_modules", "vitest", "vitest.mjs")) ? "node node_modules/vitest/vitest.mjs" : "none",
    tsc: existsSync(join(top, "node_modules", "typescript", "bin", "tsc")) ? "node node_modules/typescript/bin/tsc" : "none",
    eslint: existsSync(join(top, "node_modules", "eslint", "bin", "eslint.js")) ? "node node_modules/eslint/bin/eslint.js" : "none",
  };
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const opt = (n) => {
    const i = args.indexOf(`--${n}`);
    return i >= 0 ? args[i + 1] : null;
  };
  const r = probe(resolve(opt("root") || "."), opt("skill"));
  if (args.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else for (const [k, v] of Object.entries(r)) console.log(`${k}=${v}`);
}
