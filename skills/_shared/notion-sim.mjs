// Faux Notion local pour /sk-notion : meme tableau, memes operations que le MCP Notion
// (lecture de la vue, fetch d une page, maj des proprietes, ajout de section, commentaires),
// dans un fichier JSON. Sert au banc et aux postes sans connecteur Notion : le superviseur
// suit SKILL.md a l identique, seules les entrees-sorties passent par ce script.
//
// Usage (board = chemin du JSON, cree par `init` ; ou variable NOTION_BOARD) :
//   node notion-sim.mjs init    --board b.json --from seed.json
//   node notion-sim.mjs view    --board b.json [--out rows.json]        lignes actives (vue File Claude)
//   node notion-sim.mjs fetch   --board b.json --page TK-2              page : proprietes + corps
//   node notion-sim.mjs set     --board b.json --page TK-2 Statut="Claude prépare" Journal="..."
//   node notion-sim.mjs append  --board b.json --page TK-2 --file section.md
//   node notion-sim.mjs comment --board b.json --page TK-2 --file c.txt [--as human]
//   node notion-sim.mjs comments --board b.json --page TK-2 [--since ISO]
//   node notion-sim.mjs render  --board b.json --out board.md             tableau lisible
// Les commentaires ecrits par le superviseur portent CLAUDE_PREFIX (meme compte que l humain
// dans le vrai Notion : seul le prefixe les distingue).
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CLAUDE_PREFIX, ACTIVE } from "./notion-plan.mjs";

export function load(path) { return JSON.parse(readFileSync(path, "utf8")); }
export function save(path, board) { writeFileSync(path, JSON.stringify(board, null, 1)); }

export function find(board, ref) {
  const p = board.pages.find((x) => x.url === ref || x.props.Num === ref || x.props.Num === `TK-${ref}`);
  if (!p) throw new Error(`page inconnue : ${ref}`);
  return p;
}

// Ligne de vue : url + proprietes sous leur nom exact (comme le mode view du MCP).
export function view(board) {
  return board.pages.filter((p) => ACTIVE.has(p.props.Statut)).map((p) => ({ url: p.url, ...p.props }))
    .sort((a, b) => (Number(String(a.Num).replace(/\D/g, "")) || 0) - (Number(String(b.Num).replace(/\D/g, "")) || 0));
}

export function setProps(board, ref, kv, now) {
  const p = find(board, ref);
  for (const [k, v] of Object.entries(kv)) p.props[k] = v === "" ? null : v;
  p.editedAt = now;
  return p;
}

// Ecrit par Claude -> prefixe force (idempotent) ; ecrit par l humain -> tel quel.
export function addComment(board, ref, text, { as = "claude", now } = {}) {
  const p = find(board, ref);
  const body = as === "claude" && !text.startsWith(CLAUDE_PREFIX) ? `${CLAUDE_PREFIX}${text}` : text;
  const c = { id: `c${(p.comments.length + 1)}`, author: board.owner || "Thomas", at: now, text: body };
  p.comments.push(c);
  return c;
}

export function render(board) {
  const out = [`# ${board.title || "Tâches"} (faux Notion local)`, "", "| Num | Tâche | Statut | Priorité | Taille | Journal | Résultat | Tests navigateur |", "|---|---|---|---|---|---|---|---|"];
  for (const p of board.pages) {
    const x = p.props;
    out.push(`| ${x.Num} | ${x["Tâche"]} | ${x.Statut} | ${x["Priorité"] || ""} | ${x.Taille || ""} | ${x.Journal || ""} | ${x["Résultat"] || ""} | ${x["Tests navigateur"] || ""} |`);
  }
  for (const p of board.pages) {
    out.push("", `## ${p.props.Num} — ${p.props["Tâche"]}`, "", p.body.trim());
    if (p.comments.length) out.push("", "**Commentaires**", ...p.comments.map((c) => `- ${c.at?.slice(11, 16) || ""} ${c.text.replace(/\n/g, " / ")}`));
  }
  return out.join("\n") + "\n";
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  // La commande est le premier mot qui n est ni une option ni sa valeur (« --board b set » marche).
  const argv = process.argv.slice(2);
  const ci = argv.findIndex((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--")));
  const cmd = argv[ci];
  const args = argv.filter((_, i) => i !== ci);
  const o = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  const path = o("--board") || process.env.NOTION_BOARD;
  const now = o("--now") || new Date().toISOString();
  const text = () => readFileSync(o("--file"), "utf8").trim();
  if (cmd === "init") { if (existsSync(path)) { console.error("board existe deja"); process.exit(1); } save(path, load(o("--from"))); process.exit(0); }
  const board = load(path);
  let out;
  if (cmd === "view") { out = view(board); if (o("--out")) writeFileSync(o("--out"), JSON.stringify(out, null, 1)); }
  else if (cmd === "fetch") { const p = find(board, o("--page")); out = { url: p.url, properties: p.props, content: p.body }; }
  else if (cmd === "set") {
    const kv = Object.fromEntries(args.filter((a, i) => /^[^-][^=]*=/.test(a) && !(i > 0 && args[i - 1].startsWith("--"))).map((a) => [a.slice(0, a.indexOf("=")), a.slice(a.indexOf("=") + 1)]));
    out = setProps(board, o("--page"), kv, now).props; save(path, board);
  } else if (cmd === "append") { const p = find(board, o("--page")); p.body = `${p.body.trimEnd()}\n\n${text()}\n`; save(path, board); out = { ok: true }; }
  else if (cmd === "comment") { out = addComment(board, o("--page"), text(), { as: o("--as") || "claude", now }); save(path, board); }
  else if (cmd === "comments") { const s = o("--since"); out = find(board, o("--page")).comments.filter((c) => !s || c.at > s); }
  else if (cmd === "render") { const md = render(board); if (o("--out")) writeFileSync(o("--out"), md); else process.stdout.write(md); process.exit(0); }
  else { console.error("usage : node notion-sim.mjs init|view|fetch|set|append|comment|comments|render ..."); process.exit(2); }
  console.log(JSON.stringify(out, null, 1));
}
