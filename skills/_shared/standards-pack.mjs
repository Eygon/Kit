// Standards agent-os, appliques STRICTEMENT sans tour d outil de plus.
//
// pack  : assemble dans UN fichier le corps des standards d une US (les `_meta.alwaysInject` de
//         l index + les ids ancres pour l US), lus dans le depot de l US (front ou back : chacun a
//         son agent-os/standards/index.yml), plus les controles mecaniques qui s y rattachent.
//         Le worker et le reviewer le lisent au premier tour, avec recon.md : avant, le brief ne
//         portait que des chemins (« pas les corps ») et aucun check de revue ne les opposait.
// check : passe ces controles sur les lignes AJOUTEES d un diff (worker avant DONE, reviewer
//         check 11). Un grep par regle, en un seul appel.
//
// Usage :
//   node standards-pack.mjs pack  --root <depot de l US> [--ref <ref git>] (--ids a,b | --tasks <tasks.md> --us US1) [--out <fichier>]
//   node standards-pack.mjs check --root <depot> --pack <fichier pack> [--range <a>..<b> | --staged | (defaut : HEAD + arbre)]
// pack sort en 1 si un id est inconnu de l index (ancre mal ecrite = standard jamais applique).
// check sort en 1 s il y a au moins un hit, une ligne par hit : `<fichier>:<ligne> <id> — <msg>`.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const STD_DIR = "agent-os/standards";

const git = (cwd, ...a) => {
  try {
    return execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 64 << 20 });
  } catch {
    return null;
  }
};

const readAt = (root, ref, rel) => {
  if (ref) return git(root, "show", `${ref}:${rel}`);
  try {
    return readFileSync(join(root, rel), "utf8");
  } catch {
    return null;
  }
};

export const normId = (s) =>
  String(s).trim().replace(/`/g, "").replace(/[),;]+$/, "").replace(/^@?agent-os\/standards\//, "").replace(/\.md$/, "").replace(/\.$/, "");

// Ids of the index: `group:` then `  name:` with a description, or a top-level `name:` with a
// description. `_meta` is not a standard.
export const indexIds = (yml) => {
  const ids = new Set();
  const lines = yml.split(/\r?\n/);
  let group = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const top = l.match(/^([A-Za-z0-9_.-]+):\s*$/);
    const topWithValue = l.match(/^([A-Za-z0-9_.-]+):\s*\S/);
    const child = l.match(/^ {2}([A-Za-z0-9_.-]+):\s*$/);
    if (top) {
      group = top[1] === "_meta" ? "_meta" : top[1];
      const next = lines[i + 1] || "";
      if (group !== "_meta" && /^ {2}description:/.test(next)) {
        ids.add(group);
        group = null;
      }
      continue;
    }
    if (topWithValue) {
      group = null;
      continue;
    }
    if (child && group && group !== "_meta") ids.add(`${group}/${child[1]}`);
  }
  return ids;
};

export const alwaysOf = (yml) => {
  const m = yml.match(/alwaysInject:\s*\n((?:[ \t]+-[ \t]+.+\n?)+)/);
  return m ? [...m[1].matchAll(/-\s+(\S+)/g)].map((x) => normId(x[1])) : [];
};

// `Standards: @agent-os/standards/a, b` lines of one story in tasks.md (under `## [USn]`), plus
// any `@agent-os/standards/...` anchor on its task lines.
export const idsOfStory = (tasksText, us) => {
  const n = String(us).replace(/^US/i, "");
  const head = new RegExp(`^##\\s+(?:\\[US${n}\\]|(?:Phase\\s+\\d+\\s*:\\s*)?User Story\\s+${n}\\b)`, "i");
  const ids = new Set();
  let inStory = false;
  // Avant le premier `## ` : en-tete du fichier, ses ancres valent pour toutes les US.
  let preamble = true;
  for (const line of tasksText.split(/\r?\n/)) {
    if (/^##\s/.test(line)) {
      preamble = false;
      inStory = head.test(line);
    }
    if (preamble) inStory = true;
    const labelled = new RegExp(`\\[US${n}\\]`, "i").test(line);
    if (!inStory && !labelled) continue;
    if (preamble) inStory = false;
    for (const m of line.matchAll(/@agent-os\/standards\/[\w./-]+/g)) ids.add(normId(m[0]));
    const s = line.match(/^\s*(?:\*\*)?Standards(?:\*\*)?\s*:\s*(.+)$/i);
    if (s) for (const part of s[1].split(/[,\s]+/)) if (/^[\w./@-]+$/.test(part) && part.includes("/") || /^[a-z][\w-]+$/.test(part)) ids.add(normId(part));
  }
  return [...ids].filter(Boolean);
};

const frontmatter = (text) => {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  return m ? { head: m[1], body: text.slice(m[0].length) } : { head: "", body: text };
};

// metadata.checks in a standard's frontmatter: `- re: "..."` / `files: "..."` / `msg: "..."`.
const ownChecks = (head) => {
  const block = head.match(/checks:\s*\n([\s\S]*)$/);
  if (!block) return [];
  const out = [];
  let cur = null;
  for (const l of block[1].split(/\r?\n/)) {
    const kv = l.match(/^\s*(-\s*)?(re|files|skip|msg):\s*"?(.*?)"?\s*$/);
    if (!kv) continue;
    if (kv[1] || !cur) {
      cur = {};
      out.push(cur);
    }
    cur[kv[2]] = kv[3].replace(/\\\\/g, "\\");
  }
  return out.filter((c) => c.re);
};

export const buildPack = ({ root, ref, ids }) => {
  const yml = readAt(root, ref, `${STD_DIR}/index.yml`);
  if (yml === null) return { error: `${STD_DIR}/index.yml absent de ${root}${ref ? ` sur ${ref}` : ""}` };
  const known = indexIds(yml);
  const always = alwaysOf(yml);
  const wanted = [...new Set([...always, ...ids.map(normId)])];
  const unknown = [];
  const parts = [];
  const checks = [];
  const table = JSON.parse(readFileSync(join(HERE, "standards-checks.json"), "utf8"));
  for (const id of wanted) {
    const text = readAt(root, ref, `${STD_DIR}/${id}.md`);
    if (text === null || (!known.has(id) && !always.includes(id))) {
      unknown.push(id);
      if (text === null) continue;
    }
    const { head, body } = frontmatter(text);
    parts.push(`<!-- standard: ${id}${always.includes(id) ? " (alwaysInject)" : ""} -->\n${body.trim()}\n`);
    for (const c of [...(table[id] || []), ...ownChecks(head)]) checks.push({ id, ...c });
  }
  const header = [
    "# Standards de cette US — MUST",
    "",
    `Depot : ${root}${ref ? ` (${ref})` : ""}. Standards : ${wanted.join(", ")}.`,
    "Chaque fichier de prod que tu ecris ou modifies les respecte. Un ecart est un defaut de revue",
    "(check 11), au meme titre qu un AC non tenu. Les controles mecaniques en fin de fichier se",
    "lancent en UNE commande : node <SK_SHARED>/standards-pack.mjs check --root <slot> --pack <ce fichier>.",
    "",
  ].join("\n");
  const machine = checks.length
    ? "\n## Controles mecaniques\n\n```json\n" + JSON.stringify(checks, null, 0).replace(/},{/g, "},\n{") + "\n```\n"
    : "\n## Controles mecaniques\n\naucun pour ces standards.\n";
  return { text: header + "\n" + parts.join("\n") + machine, ids: wanted, unknown, checks: checks.length };
};

const addedLines = (root, mode) => {
  const args = ["diff", "--unified=0", "--no-color"];
  if (mode.range) args.push(mode.range);
  else if (mode.staged) args.push("--cached");
  else args.push("HEAD");
  const out = git(root, ...args) || "";
  const res = [];
  let file = null;
  let ln = 0;
  for (const l of out.split("\n")) {
    if (l.startsWith("+++ ")) {
      file = l.slice(4).replace(/^b\//, "");
      continue;
    }
    const h = l.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (h) {
      ln = Number(h[1]);
      continue;
    }
    if (l.startsWith("+") && file && file !== "/dev/null") res.push({ file, line: ln++, text: l.slice(1) });
  }
  if (!mode.range && !mode.staged) {
    const untracked = (git(root, "ls-files", "--others", "--exclude-standard") || "").split("\n").filter(Boolean);
    for (const f of untracked) {
      let t;
      try {
        t = readFileSync(join(root, f), "utf8");
      } catch {
        continue;
      }
      t.split("\n").forEach((text, i) => res.push({ file: f, line: i + 1, text }));
    }
  }
  return res;
};

export const runChecks = (root, packText, mode) => {
  const m = packText.match(/## Controles mecaniques\s*\n+```json\n([\s\S]*?)\n```/);
  if (!m) return [];
  const checks = JSON.parse("[" + m[1].trim().replace(/^\[|\]$/g, "") + "]").flat();
  const hits = [];
  for (const a of addedLines(root, mode)) {
    for (const c of checks) {
      if (c.files && !new RegExp(c.files).test(a.file)) continue;
      if (c.skip && new RegExp(c.skip).test(a.file)) continue;
      if (new RegExp(c.re).test(a.text)) hits.push(`${a.file}:${a.line} ${c.id} — ${c.msg || c.re} — ${a.text.trim().slice(0, 100)}`);
    }
  }
  return hits;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, ...args] = process.argv.slice(2);
  const opt = (n) => {
    const i = args.indexOf(`--${n}`);
    return i >= 0 ? args[i + 1] : null;
  };
  const root = resolve(opt("root") || ".");
  if (cmd === "pack") {
    let ids = (opt("ids") || "").split(",").filter(Boolean);
    if (opt("tasks")) ids = ids.concat(idsOfStory(readFileSync(opt("tasks"), "utf8"), opt("us") || "US1"));
    const r = buildPack({ root, ref: opt("ref"), ids });
    if (r.error) {
      console.error(`standards-pack : ${r.error}`);
      process.exit(2);
    }
    const out = opt("out");
    if (out) writeFileSync(out, r.text);
    else process.stdout.write(r.text);
    if (out) console.log(`standards-pack : ${r.ids.length} standards, ${r.checks} controles, ${Buffer.byteLength(r.text)} octets -> ${out}`);
    for (const u of r.unknown) console.log(`KO standard inconnu de l index : ${u}`);
    process.exit(r.unknown.length ? 1 : 0);
  } else if (cmd === "check") {
    const pack = opt("pack");
    if (!pack || !existsSync(pack)) {
      console.error("standards-pack check : --pack <fichier> requis");
      process.exit(2);
    }
    const hits = runChecks(root, readFileSync(pack, "utf8"), { range: opt("range"), staged: args.includes("--staged") });
    for (const h of hits) console.log(h);
    console.log(hits.length ? `${hits.length} ecart(s) aux standards` : "standards : 0 ecart mecanique");
    process.exit(hits.length ? 1 : 0);
  } else {
    console.error("usage : node standards-pack.mjs pack|check ...");
    process.exit(2);
  }
}
