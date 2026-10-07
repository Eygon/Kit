// Cerveau deterministe de /sk-notion : ce que le superviseur doit faire, a partir de
// l etat du tableau Notion (lignes), de sa memoire (runs.json) et d un message recu.
// Le modele fait les entrees-sorties (requete Notion, claude --bg, SendMessage) ; les
// decisions (qui prendre, quoi repondre seul, quoi demander a l humain) sont ici, testees.
//
// Usage :
//   node notion-plan.mjs tick --rows rows.json --state runs.json --config notion.json [--now ISO]
//   node notion-plan.mjs message --text-file msg.txt --from <session> --state runs.json --rows rows.json --config notion.json
//   node notion-plan.mjs answer --text-file reponse.txt --state runs.json --page <url>
//   node notion-plan.mjs answer --comments-file comments.json --state runs.json --page <url>
//     (comments.json = [{text, at}] de la page : prend les commentaires humains apres askedAt)
// Sortie : JSON sur stdout ({ actions: [...] }).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const STATUS = {
  todo: "À faire", prep: "Claude prépare", impl: "Claude implémente", question: "Question pour toi",
  answered: "Réponse donnée", plan: "Plan à valider", planOk: "Plan validé", done: "Terminé",
  blocked: "Bloqué", draft: "Brouillon", test: "Claude teste",
};
// Statuts de la vue « File Claude » (Terminé et Bloqué en sortent : un run dont la ligne
// disparait est annule par tick).
export const ACTIVE = new Set(Object.values(STATUS).filter((s) => s !== STATUS.done && s !== STATUS.blocked));

// Dans Notion, les commentaires du superviseur sont postes sous le compte de l humain :
// seul ce prefixe les distingue. Tout commentaire Claude le porte ; une reponse humaine
// est un commentaire SANS ce prefixe.
export const CLAUDE_PREFIX = "🤖 Claude — ";
// LEGACY : commentaires Claude d avant le prefixe (une question finit toujours par cette consigne).
const LEGACY = /R[ée]ponds par le num[ée]ro/i;
export const isClaude = (text) => String(text || "").trimStart().startsWith(CLAUDE_PREFIX.trim()) || LEGACY.test(text || "");
export const claudeSays = (text) => (isClaude(text) ? text : CLAUDE_PREFIX + text);

// Reponse humaine a une question posee a `since` : les commentaires humains posterieurs,
// dans l ordre, joints (l humain peut repondre en deux fois). Rien -> null.
export function humanReply(comments, since) {
  const t = (comments || []).filter((c) => !isClaude(c.text) && (!since || (c.at || c.created_time || "") > since))
    .map((c) => String(c.text).trim()).filter(Boolean);
  return t.length ? t.join("\n") : null;
}
const RANK = { Urgente: 0, Haute: 1, Normale: 2, Basse: 3 };
const WAITING = new Set([STATUS.question, STATUS.plan]);

const ageMin = (iso, now) => (iso ? (Date.parse(now) - Date.parse(iso)) / 60000 : Infinity);

// Ordre de prise : priorite, puis numero (le plus ancien d abord).
export function pickOrder(rows) {
  return [...rows].sort((a, b) => (RANK[a["Priorité"]] ?? 2) - (RANK[b["Priorité"]] ?? 2) || (Number(a.Num) || 1e9) - (Number(b.Num) || 1e9));
}

export function route(row) {
  const t = row.Taille || "Auto";
  if (/XS/.test(t)) return "xs";
  if (/Feature/.test(t)) return "feature";
  return "judge";
}

export function tick(rows, state, config, now) {
  const me = config.session;
  const runs = state.runs || {};
  const actions = [];
  const byUrl = new Map(rows.map((r) => [r.url, r]));
  const busy = Object.values(runs).filter((r) => !r.finished && !(r.pending && config.countWaiting !== true)).length;
  let free = Math.max(0, (config.maxParallel ?? 1) - busy);

  // 1. Runs connus : ce que l humain a change sur la ligne depuis le dernier tick.
  for (const [url, run] of Object.entries(runs)) {
    if (run.finished) continue;
    const row = byUrl.get(url);
    if (!row) { actions.push({ type: "cancel", page: url, child: run.child, reason: "sortie de la file (supprimee, Terminé ou Bloqué a la main)" }); continue; }
    const s = row.Statut;
    if (s === STATUS.draft || s === STATUS.todo) { actions.push({ type: "cancel", page: url, child: run.child, reason: `remise en ${s} par l humain` }); continue; }
    if (run.pending && s === STATUS.answered) { actions.push({ type: "relay-answer", page: url, child: run.child, pending: run.pending }); continue; }
    if (run.pending && run.pending.kind === "trio" && s === STATUS.planOk) {
      actions.push({ type: "send", page: url, child: run.child, text: `[SK-ANSWER] ${run.pending.approve} — plan valide dans Notion`, status: STATUS.prep });
      continue;
    }
    if (!run.pending && ageMin(run.lastMsgAt || run.startedAt, now) > (config.staleMinutes ?? 45))
      actions.push({ type: "check-alive", page: url, child: run.child, silentMin: Math.round(ageMin(run.lastMsgAt || run.startedAt, now)) });
  }

  // 2. Lignes verrouillees par moi (ou par un superviseur mort que j adopte : `adopt`, ecrit
  // au demarrage depuis l ancien supervisor.json) sans run en memoire : redemarrage du
  // conteneur, compaction mal reprise. L enfant est perdu, mais le brief et les reponses
  // deja donnees (commentaires humains) suffisent a relancer la phase : `reclaim`. Seul
  // `orphan` (Bloqué) reste quand rien ne permet de reprendre.
  const mine = (s) => s === me || (config.adopt || []).includes(s);
  for (const row of rows) {
    if (!mine(row.Session) || runs[row.url] || [STATUS.done, STATUS.blocked, STATUS.todo, STATUS.draft].includes(row.Statut)) continue;
    const prepPhase = [STATUS.prep, STATUS.question, STATUS.answered, STATUS.plan, STATUS.planOk].includes(row.Statut);
    const r = route(row);
    if (r === "judge" || !(prepPhase || row.Feature)) { actions.push({ type: "orphan", page: row.url, num: row.Num, statut: row.Statut }); continue; }
    if (free > 0) {
      free--;
      actions.push({ type: "reclaim", page: row.url, num: row.Num, title: row["Tâche"], statut: row.Statut, route: r,
        phase: r === "xs" ? "xs" : prepPhase && !row.Feature ? "prep" : "impl", feature: row.Feature || null,
        repo: config.projects?.[row.Projet] || Object.values(config.projects || {})[0], validation: row["Validation du plan"] || "Je valide" });
    } else actions.push({ type: "queued", page: row.url, num: row.Num, reason: "reprise apres redemarrage en attente d une place" });
  }

  // 3. Nouvelles taches, par priorite, dans la limite de maxParallel.
  for (const row of pickOrder(rows.filter((r) => r.Statut === STATUS.todo && !runs[r.url]))) {
    if (row.Session && !mine(row.Session)) continue; // prise par un autre superviseur
    if (!row["Tâche"] || !row["Tâche"].trim()) continue;
    const repo = config.projects?.[row.Projet];
    if (!repo) {
      const known = Object.keys(config.projects || {});
      if (known.length === 1 && !row.Projet) { /* un seul projet : il va de soi */ }
      else { actions.push({ type: "block", page: row.url, reason: row.Projet ? `projet « ${row.Projet} » absent de notion.json` : `colonne Projet vide (${known.join(", ")})` }); continue; }
    }
    // Taille Auto : le modele la tranche d abord et l ecrit dans Notion (visible, corrigeable
    // par l humain), puis relance le tick. Sans ca une XS evidente attendait derriere une prep.
    if (route(row) === "judge") { actions.push({ type: "size", page: row.url, num: row.Num, title: row["Tâche"] }); continue; }
    if (free <= 0) { actions.push({ type: "queued", page: row.url, num: row.Num }); continue; }
    // Une seule prep par depot : .specify/feature.json est unique dans le principal, deux
    // /sk-prep concurrents s y ecrasent.
    const target = repo || Object.values(config.projects)[0];
    if (route(row) !== "xs" && Object.values(runs).some((r) => !r.finished && r.phase === "prep" && r.repo === target) ||
        route(row) !== "xs" && actions.some((a) => (a.type === "claim" && a.route !== "xs" || a.type === "reclaim" && a.phase === "prep") && a.repo === target)) {
      actions.push({ type: "queued", page: row.url, num: row.Num, reason: "une prep tourne deja sur ce depot" });
      continue;
    }
    free--;
    actions.push({
      type: "claim", page: row.url, num: row.Num, title: row["Tâche"], project: row.Projet || Object.keys(config.projects)[0],
      repo: repo || Object.values(config.projects)[0], route: route(row), validation: row["Validation du plan"] || "Je valide",
    });
  }
  return { actions };
}

// --- Messages des sessions enfants (contrat _shared/sk-supervisor.md) ---

export function parseMessage(text) {
  const lines = text.replace(/\r/g, "").split("\n");
  const head = /^\[(SK-START|SK-QUESTION|SK-DONE)\]\s*(.*)$/.exec(lines.find((l) => /^\[SK-/.test(l)) || "");
  if (!head) return { kind: "unknown" };
  const fields = {};
  for (const m of head[2].matchAll(/(\w+)=("[^"]*"|\S+)/g)) fields[m[1]] = m[2].replace(/^"|"$/g, "");
  const out = { kind: head[1], fields };
  if (head[1] === "SK-DONE") out.motif = (/motif=(.*)$/.exec(head[2]) || [])[1] || "";
  if (head[1] !== "SK-QUESTION") return out;
  const body = lines.slice(lines.indexOf(lines.find((l) => /^\[SK-QUESTION\]/.test(l))) + 1).join("\n");
  out.type = fields.type || "autre";
  out.context = ((/Contexte\s*:\s*\n([\s\S]*?)(?:\nOptions\s*:|\nReponse attendue|$)/.exec(body) || [])[1] || "").trim();
  out.options = [...(((/Options\s*:\s*\n([\s\S]*?)(?:\nReponse attendue|$)/.exec(body) || [])[1] || "").matchAll(/^\s*(\d+)\.\s*(.+)$/gm))].map((m) => ({ n: Number(m[1]), label: m[2].trim() }));
  out.expectsText = /\[SK-ANSWER\]\s*texte:/.test(body) || !out.options.length;
  return out;
}

const opt = (q, rx) => q.options.find((o) => rx.test(o.label));
// Mots d alarme d une revue (jamais « RED » : c est le vocabulaire TDD, present dans tout run sain).
const ALARM = /ESCALATE|\bFAIL\b|\brouge|\bSTOP\b|conflit|(?:^|[^a-z])[eé]checs?\b|review2/i; // « typecheck » contient « echec »

// Que faire d une question : repondre seul (answer), laisser le modele trancher depuis le
// detail de la tache (judge, repli relay), ou demander a l humain dans Notion (relay / plan).
export function decideQuestion(q, row = {}) {
  const auto = (o, motif) => ({ type: "answer", text: `[SK-ANSWER] ${o.n} — ${motif}` });
  if (q.type === "go") { const o = opt(q, /^Lancer/i); if (o) return auto(o, "tache Notion prete, lancement automatique"); }
  if (q.type === "trio") {
    const approve = opt(q, /^Approuver/i), edit = opt(q, /^(Editer|Éditer|Modifier)/i);
    if ((row["Validation du plan"] || "Je valide") === "Auto" && approve && !ALARM.test(q.context)) return auto(approve, "validation du plan en Auto dans Notion");
    return { type: "plan", approve: approve?.n ?? 1, edit: edit?.n ?? 2 };
  }
  if (q.type === "verdict") {
    // Avant toute publication : le cahier E2E est joue dans Claude in Chrome par le
    // superviseur (contrat _shared/sk-e2e.md). Revue deja rouge : l humain d abord.
    const pub = opt(q, /^Publier/i), fix = opt(q, /^Corriger/i);
    if (pub && !ALARM.test(q.context)) return { type: "e2e", publish: pub.n, fix: fix?.n ?? 2 };
    return { type: "relay" };
  }
  if (["perimetre", "hypotheses", "xs", "design", "autre"].includes(q.type)) return { type: "judge", fallback: "relay" };
  return { type: "relay" };
}

export function decideMessage(msg, run, row) {
  if (msg.kind === "SK-START") return { type: "log", journal: `${msg.fields.skill || "session"} demarree${msg.fields.slot ? ` (slot ${msg.fields.slot})` : ""}` };
  if (msg.kind === "SK-QUESTION") return { ...decideQuestion(msg, row), question: msg };
  if (msg.kind === "SK-DONE") {
    const issue = msg.fields.issue;
    if (issue === "trio-approved") return { type: "launch-impl", feature: msg.fields.feature };
    if (/^published/.test(issue)) return { type: "done", pr: msg.fields.pr && msg.fields.pr !== "aucun" ? msg.fields.pr : null, motif: msg.motif };
    return { type: "block", reason: `${msg.fields.skill || "run"} ${issue} : ${msg.motif || "sans motif"}` };
  }
  return { type: "ignore" };
}

// Fin du passage navigateur : la ligne de synthese de e2e-report.md decide.
// PASS (aucun FAIL) -> Publier avec pr.md ; FAIL -> Corriger avec findings.md, au plus
// `maxRounds` passes ; au-dela, ou tout BLOQUE, l humain tranche dans Notion.
export function decideE2E(reportText, pending, round = 1, maxRounds = 2) {
  const m = /PASS\s*(\d+)\s*·\s*FAIL\s*(\d+)\s*·\s*BLOQUE\s*(\d+)/i.exec(reportText);
  if (!m) return { type: "relay", reason: "rapport E2E sans ligne de synthese" };
  const [pass, fail, blocked] = m.slice(1).map(Number);
  const summary = `PASS ${pass} · FAIL ${fail} · BLOQUE ${blocked}`;
  // Le message dit qui a joue le cahier : Playwright (repli sans Claude in Chrome) n est pas Chrome.
  const by = /Playwright/i.test(reportText) && !/Claude in Chrome\s*:/i.test(reportText) ? "Playwright" : "Chrome";
  if (fail === 0 && blocked === 0 && pass > 0) return { type: "answer", summary, text: `[SK-ANSWER] ${pending.publish} — Publier · E2E ${by} ${summary}` , withPr: true };
  if (fail > 0 && round < maxRounds) return { type: "answer", summary, text: `[SK-ANSWER] ${pending.fix} — Corriger · E2E ${by} ${summary}`, withFindings: true, nextRound: round + 1 };
  return { type: "relay", summary, reason: fail > 0 ? `${fail} scenario(s) FAIL apres ${round} passe(s) de correction` : `${blocked} scenario(s) BLOQUE : a verifier a la main` };
}

// Reponse humaine (commentaire Notion) -> [SK-ANSWER]. Un chiffre ou le debut d un libelle
// choisit l option ; une phrase sur un trio = « Editer » avec la phrase comme corrections.
export function matchAnswer(text, pending) {
  const t = text.trim().replace(/^\[SK-ANSWER\]\s*/i, "");
  const opts = pending.options || [];
  const num = /^(\d+)\b/.exec(t);
  if (num && opts.some((o) => o.n === Number(num[1]))) return `[SK-ANSWER] ${num[1]} — ${t.slice(num[0].length).replace(/^[\s—:-]+/, "") || "choix de l humain dans Notion"}`;
  const low = t.toLowerCase();
  const byLabel = opts.find((o) => low.startsWith(o.label.toLowerCase().split(/[\s(—]/)[0]));
  if (byLabel) return `[SK-ANSWER] ${byLabel.n} — ${t}`;
  if (pending.kind === "trio") {
    if (/^(ok|oui|go|valid|approuv|c.?est bon|parfait)/i.test(low)) return `[SK-ANSWER] ${pending.approve} — ${t}`;
    return `[SK-ANSWER] ${pending.edit} — corrections demandees dans Notion : ${t}`;
  }
  if (pending.expectsText || !opts.length) return `[SK-ANSWER] texte: ${t}`;
  return null; // ambigu : le modele redemande en commentaire, sans deviner
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const [cmd, ...args] = process.argv.slice(2);
  const o = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  const json = (p, d) => { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return d; } };
  const state = json(o("--state"), { runs: {} });
  const rows = json(o("--rows"), []);
  const config = json(o("--config"), {});
  let out;
  if (cmd === "tick") out = tick(rows, state, config, o("--now") || new Date().toISOString());
  else if (cmd === "message") {
    const msg = parseMessage(readFileSync(o("--text-file"), "utf8"));
    // L expediteur (from-name du message inter-sessions) designe le run ; repli sur feature=.
    const from = o("--from") || msg.fields?.session;
    const page = Object.keys(state.runs || {}).find((u) => from && state.runs[u].child === from)
      || Object.keys(state.runs || {}).find((u) => state.runs[u].feature && state.runs[u].feature === msg.fields?.feature);
    out = { page: page || null, message: msg, decision: decideMessage(msg, page && state.runs[page], rows.find((r) => r.url === page)) };
  } else if (cmd === "answer") {
    const run = state.runs?.[o("--page")];
    const text = o("--comments-file") ? humanReply(json(o("--comments-file"), []), run?.pending?.askedAt) : readFileSync(o("--text-file"), "utf8");
    out = { human: text, answer: run?.pending && text ? matchAnswer(text, run.pending) : null };
  } else { console.error("usage : node notion-plan.mjs tick|message|answer ..."); process.exit(2); }
  console.log(JSON.stringify(out, null, 2));
}
