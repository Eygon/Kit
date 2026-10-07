// node --test skills/_shared/tests/*.test.mjs — decisions of /sk-notion (notion-plan.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
import { tick, parseMessage, decideMessage, decideQuestion, matchAnswer, pickOrder, STATUS } from "../notion-plan.mjs";

const cfg = { session: "kit-9a", projects: { Tableau: "/repo/front" }, maxParallel: 1 };
const NOW = "2026-10-07T10:00:00Z";
const row = (n, extra = {}) => ({ url: `p${n}`, Num: String(n), "Tâche": `tache ${n}`, Statut: STATUS.todo, Projet: "Tableau", Taille: "Feature", ...extra });

test("tick prend la tache la plus prioritaire, puis la plus ancienne, dans la limite de maxParallel", () => {
  const rows = [row(1, { "Priorité": "Basse" }), row(2, { "Priorité": "Urgente" }), row(3, { "Priorité": "Urgente" })];
  const { actions } = tick(rows, { runs: {} }, cfg, NOW);
  assert.deepEqual(actions.map((a) => [a.type, a.page]), [["claim", "p2"], ["queued", "p3"], ["queued", "p1"]]);
  assert.equal(actions[0].repo, "/repo/front");
  assert.equal(actions[0].route, "feature");
});

test("tick : une tache qui attend l humain ne bloque pas la suivante", () => {
  const state = { runs: { p1: { child: "sk-prep-TK1", pending: { kind: "question", options: [] }, startedAt: NOW } } };
  const rows = [row(1, { Statut: STATUS.question, Session: "kit-9a" }), row(2)];
  assert.deepEqual(tick(rows, state, cfg, NOW).actions.map((a) => a.type), ["claim"]);
});

test("tick ignore une tache verrouillee par un autre superviseur et bloque un projet inconnu", () => {
  const rows = [row(1, { Session: "autre-poste" }), row(2, { Projet: "Inconnu" })];
  const { actions } = tick(rows, { runs: {} }, { ...cfg, projects: { Tableau: "/r", Back: "/b" } }, NOW);
  assert.deepEqual(actions.map((a) => a.type), ["block"]);
  assert.match(actions[0].reason, /Inconnu/);
});

test("tick relaie une reponse, valide un plan, annule une tache remise en brouillon", () => {
  const state = { runs: {
    p1: { child: "c1", pending: { kind: "question", options: [{ n: 1, label: "A" }] } },
    p2: { child: "c2", pending: { kind: "trio", approve: 1, edit: 2 } },
    p3: { child: "c3", startedAt: NOW },
  } };
  const rows = [row(1, { Statut: STATUS.answered }), row(2, { Statut: STATUS.planOk }), row(3, { Statut: STATUS.draft })];
  const t = tick(rows, state, cfg, NOW).actions;
  assert.deepEqual(t.map((a) => a.type), ["relay-answer", "send", "cancel"]);
  assert.match(t[1].text, /^\[SK-ANSWER\] 1 — /);
});

test("tick signale un enfant muet et une ligne orpheline", () => {
  const state = { runs: { p1: { child: "c1", startedAt: "2026-10-07T08:00:00Z" } } };
  const rows = [row(1, { Statut: STATUS.prep }), row(2, { Statut: STATUS.impl, Session: "kit-9a" })];
  assert.deepEqual(tick(rows, state, cfg, NOW).actions.map((a) => a.type), ["check-alive", "orphan"]);
});

const Q = `[SK-QUESTION] projet=front feature=012-x skill=sk-prep slot=prep type=trio
Contexte :
3 US, 9 taches, audit-lint 0 HIGH.
Options :
1. Approuver
2. Editer
3. Rejeter
Reponse attendue : [SK-ANSWER] <n> — <motif>`;

test("parseMessage lit type, contexte et options d une SK-QUESTION", () => {
  const m = parseMessage(Q);
  assert.equal(m.kind, "SK-QUESTION");
  assert.equal(m.type, "trio");
  assert.equal(m.options.length, 3);
  assert.equal(m.context, "3 US, 9 taches, audit-lint 0 HIGH.");
  assert.equal(parseMessage("[SK-DONE] projet=a feature=012-x skill=sk-impl slot=wt-1 issue=published pr=https://x/pr/1 state=aucun motif=3 US livrees").fields.pr, "https://x/pr/1");
});

test("decideQuestion : trio auto ou plan a valider, go automatique, verdict prudent", () => {
  const m = parseMessage(Q);
  assert.equal(decideQuestion(m, { "Validation du plan": "Auto" }).type, "answer");
  assert.deepEqual(decideQuestion(m, {}), { type: "plan", approve: 1, edit: 2 });
  const go = parseMessage("[SK-QUESTION] type=go\nContexte :\nslot wt-1\nOptions :\n1. Lancer\n2. Ajuster\n3. Abandonner\n");
  assert.equal(decideQuestion(go).text, "[SK-ANSWER] 1 — tache Notion prete, lancement automatique");
  const red = parseMessage("[SK-QUESTION] type=verdict\nContexte :\nUS2 ESCALATE\nOptions :\n1. Publier\n2. Corriger\n");
  assert.equal(decideQuestion(red).type, "relay");
  assert.equal(decideQuestion(parseMessage("[SK-QUESTION] type=perimetre\nContexte :\nx\nOptions :\n1. a\n")).type, "judge");
});

test("decideMessage : fin de prep -> impl, publie -> termine, stop -> bloque", () => {
  assert.equal(decideMessage(parseMessage("[SK-DONE] feature=012-x skill=sk-prep issue=trio-approved pr=aucun motif=ok")).type, "launch-impl");
  assert.equal(decideMessage(parseMessage("[SK-DONE] feature=012-x skill=sk-impl issue=published-branch pr=aucun motif=ok")).pr, null);
  assert.match(decideMessage(parseMessage("[SK-DONE] skill=sk-impl issue=stopped pr=aucun motif=review2 FAIL")).reason, /review2 FAIL/);
});

test("matchAnswer : chiffre, libelle, phrase sur un trio, texte libre, ambigu", () => {
  const p = { kind: "question", options: [{ n: 1, label: "Garder le filtre" }, { n: 2, label: "Supprimer le filtre" }] };
  assert.equal(matchAnswer("2", p), "[SK-ANSWER] 2 — choix de l humain dans Notion");
  assert.equal(matchAnswer("supprimer, il ne sert plus", p), "[SK-ANSWER] 2 — supprimer, il ne sert plus");
  assert.equal(matchAnswer("je ne sais pas", p), null);
  const trio = { kind: "trio", approve: 1, edit: 2, options: [] };
  assert.equal(matchAnswer("OK pour moi", trio), "[SK-ANSWER] 1 — OK pour moi");
  assert.match(matchAnswer("ajoute un test sur le vide", trio), /^\[SK-ANSWER\] 2 — corrections/);
  assert.equal(matchAnswer("bleu", { kind: "question", options: [], expectsText: true }), "[SK-ANSWER] texte: bleu");
});

test("pickOrder : priorite vide = Normale", () => {
  assert.deepEqual(pickOrder([row(5), row(9, { "Priorité": "Haute" }), row(1, { "Priorité": "Basse" })]).map((r) => Number(r.Num)), [9, 5, 1]);
});

test("verdict vert -> passage E2E Chrome ; synthese du rapport -> Publier, Corriger ou humain", async () => {
  const { decideE2E } = await import("../notion-plan.mjs");
  const v = parseMessage("[SK-QUESTION] type=verdict\nContexte :\nUS1 PASS, US2 FIXED, gates vertes\nOptions :\n1. Publier\n2. Corriger\n3. Abandonner\n");
  const d = decideQuestion(v);
  assert.deepEqual(d, { type: "e2e", publish: 1, fix: 2 });
  assert.match(decideE2E("PASS 6 · FAIL 0 · BLOQUE 0", d).text, /^\[SK-ANSWER\] 1 — Publier/);
  const f = decideE2E("PASS 4 · FAIL 2 · BLOQUE 0", d, 1);
  assert.equal(f.withFindings, true);
  assert.match(f.text, /^\[SK-ANSWER\] 2 — Corriger/);
  assert.equal(decideE2E("PASS 4 · FAIL 1 · BLOQUE 0", d, 2).type, "relay");
  assert.equal(decideE2E("PASS 5 · FAIL 0 · BLOQUE 1", d).type, "relay");
  assert.equal(decideE2E("rien", d).type, "relay");
});

test("tick : une seule prep a la fois par depot, une XS passe a cote", () => {
  const two = { ...cfg, maxParallel: 3 };
  const rows = [row(1, { Taille: "Feature" }), row(2, { Taille: "Auto" }), row(3, { Taille: "Petite (XS)" }), row(5)];
  const a = tick(rows, { runs: {} }, two, NOW).actions;
  assert.deepEqual(a.map((x) => [x.type, x.page]), [["claim", "p1"], ["size", "p2"], ["claim", "p3"], ["queued", "p5"]]);
  const b = tick([row(4, { Taille: "Feature" }), row(9, { Statut: STATUS.prep })], { runs: { p9: { phase: "prep", repo: "/repo/front", startedAt: NOW } } }, two, NOW).actions;
  assert.equal(b.find((x) => x.page === "p4").reason, "une prep tourne deja sur ce depot");
});

test("verdict : le vocabulaire TDD (RED/GREEN) n est pas une alarme, une revue rouge l est", () => {
  const ok = parseMessage("[SK-QUESTION] type=verdict\nContexte :\n4 commits RED(1)/GREEN(1)/RED(2)/GREEN(2), gates vertes\nOptions :\n1. Publier\n2. Corriger d'abord\n3. Abandonner\n");
  assert.equal(decideQuestion(ok).type, "e2e");
  const ko = parseMessage("[SK-QUESTION] type=verdict\nContexte :\nreview2 FAIL sur US2\nOptions :\n1. Publier\n2. Corriger\n");
  assert.equal(decideQuestion(ko).type, "relay");
});

test("verdict : « typecheck » n est pas un « echec »", () => {
  const ok = parseMessage("[SK-QUESTION] type=verdict\nContexte :\nnpm run typecheck : 1 erreur preexistante hors diff\nOptions :\n1. Publier\n2. Corriger\n");
  assert.equal(decideQuestion(ok).type, "e2e");
  assert.equal(decideQuestion(parseMessage("[SK-QUESTION] type=verdict\nContexte :\nEchec du squash\nOptions :\n1. Publier\n")).type, "relay");
});

// --- Constat banc : les commentaires Claude sont sous le compte de l humain dans Notion ---
import { humanReply, isClaude, claudeSays, CLAUDE_PREFIX, ACTIVE } from "../notion-plan.mjs";
import * as sim from "../notion-sim.mjs";

test("humanReply ignore les commentaires prefixes Claude et ceux d avant la question", () => {
  const c = [
    { text: "vieux commentaire", at: "2026-10-07T09:00:00Z" },
    { text: `${CLAUDE_PREFIX}Question : 1. A 2. B`, at: "2026-10-07T10:00:00Z" },
    { text: "1", at: "2026-10-07T10:05:00Z" },
    { text: "  🤖 Claude — je relance", at: "2026-10-07T10:06:00Z" },
  ];
  assert.equal(humanReply(c, "2026-10-07T10:00:00Z"), "1");
  assert.equal(humanReply(c.slice(0, 2), "2026-10-07T09:30:00Z"), null);
  assert.equal(humanReply([{ text: "2" }, { text: "parce que" }]), "2\nparce que");
});

test("claudeSays prefixe une seule fois ; isClaude reconnait le prefixe", () => {
  assert.equal(claudeSays("Plan pret"), `${CLAUDE_PREFIX}Plan pret`);
  assert.equal(claudeSays(claudeSays("x")), `${CLAUDE_PREFIX}x`);
  assert.ok(isClaude(`${CLAUDE_PREFIX}x`) && !isClaude("Claude a raison"));
});

test("faux Notion : la vue sort Terminé/Bloqué, les commentaires Claude sont prefixes, l humain non", () => {
  const b = { pages: [
    { url: "u1", props: { Num: "TK-1", "Tâche": "a", Statut: "Terminé" }, body: "", comments: [] },
    { url: "u2", props: { Num: "TK-2", "Tâche": "b", Statut: "Question pour toi" }, body: "", comments: [] },
    { url: "u3", props: { Num: "TK-10", "Tâche": "c", Statut: "À faire" }, body: "", comments: [] },
  ] };
  assert.deepEqual(sim.view(b).map((r) => r.Num), ["TK-2", "TK-10"]);
  assert.ok(ACTIVE.has("Claude teste") && !ACTIVE.has("Bloqué"));
  sim.addComment(b, "TK-2", "Question", { now: "2026-10-07T10:00:00Z" });
  sim.addComment(b, "2", "1", { as: "human", now: "2026-10-07T10:01:00Z" });
  assert.equal(b.pages[1].comments[0].text, `${CLAUDE_PREFIX}Question`);
  assert.equal(humanReply(b.pages[1].comments, "2026-10-07T10:00:00Z"), "1");
  sim.setProps(b, "TK-2", { Statut: "Réponse donnée", Session: "" }, "t");
  assert.equal(b.pages[1].props.Session, null);
});

test("tick : apres redemarrage, reprend les taches de l ancien superviseur (adopt) au lieu de les laisser verrouillees", () => {
  const rows = [
    row(2, { Statut: STATUS.question, Session: "kit-old" }),
    row(3, { Statut: STATUS.impl, Session: "kit-old", Feature: "003-x" }),
    row(4, { Statut: STATUS.impl, Session: "kit-old" }),
    row(5, { Statut: STATUS.todo, Session: "autre-vivant" }),
  ];
  const sans = tick(rows, { runs: {} }, { ...cfg, maxParallel: 2 }, NOW).actions;
  assert.deepEqual(sans, [], "sans adopt : verrou d un autre, on ne touche a rien");
  const t = tick(rows, { runs: {} }, { ...cfg, maxParallel: 2, adopt: ["kit-old"] }, NOW).actions;
  assert.deepEqual(t.map((a) => [a.type, a.page, a.phase]), [["reclaim", "p2", "prep"], ["reclaim", "p3", "impl"], ["orphan", "p4", undefined]]);
  const plein = tick(rows.slice(0, 2), { runs: {} }, { ...cfg, maxParallel: 1, adopt: ["kit-old"] }, NOW).actions;
  assert.deepEqual(plein.map((a) => a.type), ["reclaim", "queued"]);
});

test("humanReply : une question Claude d avant le prefixe n est pas prise pour la reponse (reprise sans askedAt)", () => {
  const c = [{ text: "Question : 1. A 2. B\nRéponds par le numéro ou une phrase, puis mets le statut sur Réponse donnée.", at: "t1" }];
  assert.equal(humanReply(c), null);
  assert.equal(humanReply([...c, { text: "1", at: "t2" }]), "1");
});

test("tick : une reprise de prep (reclaim) occupe le depot, la nouvelle feature attend", () => {
  const rows = [row(2, { Statut: STATUS.question, Session: "kit-old" }), row(3)];
  const t = tick(rows, { runs: {} }, { ...cfg, maxParallel: 2, adopt: ["kit-old"] }, NOW).actions;
  assert.deepEqual(t.map((a) => a.type), ["reclaim", "queued"]);
  assert.match(t[1].reason, /prep/);
});

test("decideE2E dit qui a joue le cahier (Playwright en repli, Chrome sinon)", async () => {
  const { decideE2E } = await import("../notion-plan.mjs");
  const d = { publish: 1, fix: 2 };
  assert.match(decideE2E("**PASS 12 · FAIL 0 · BLOQUE 0** — Playwright (Claude in Chrome absent du banc)", d).text, /E2E Playwright PASS 12/);
  assert.match(decideE2E("PASS 3 · FAIL 0 · BLOQUE 0 — Claude in Chrome", d).text, /E2E Chrome PASS 3/);
});

test("cycle complet sur le faux Notion : prise, question relayee, reponse humaine, plan Auto, verdict, fin", async () => {
  const { tick, parseMessage, decideMessage, matchAnswer, decideE2E } = await import("../notion-plan.mjs");
  const board = { pages: [{ url: "u1", props: { Num: "TK-9", "Tâche": "Dupliquer", Statut: "À faire", Projet: "Tableau", Taille: "Feature", "Validation du plan": "Auto" }, body: "detail", comments: [] }] };
  const state = { runs: {} };
  const c = { session: "sup", projects: { Tableau: "/r" }, maxParallel: 2 };
  let a = tick(sim.view(board), state, c, NOW).actions;
  assert.deepEqual(a.map((x) => x.type), ["claim"]);
  sim.setProps(board, "TK-9", { Statut: "Claude prépare", Session: "sup" }, NOW);
  state.runs.u1 = { child: "sk-prep-TK9", phase: "prep", startedAt: NOW };
  // question produit -> relay : commentaire Claude, puis reponse humaine
  const q = parseMessage("[SK-QUESTION] projet=f feature=009-x skill=sk-prep slot=prep type=hypotheses\nContexte :\nverrouille ?\nOptions :\n1. Oui\n2. Non\nReponse attendue : [SK-ANSWER] <n> — <motif>");
  assert.equal(decideMessage(q, state.runs.u1, board.pages[0].props).type, "judge");
  sim.addComment(board, "TK-9", "Question : 1. Oui 2. Non. Reponds par le numero.", { now: "2026-10-07T10:01:00Z" });
  state.runs.u1.pending = { kind: "question", options: q.options, askedAt: "2026-10-07T10:01:00Z" };
  sim.addComment(board, "TK-9", "2 parce que", { as: "human", now: "2026-10-07T10:02:00Z" });
  sim.setProps(board, "TK-9", { Statut: "Réponse donnée" }, NOW);
  a = tick(sim.view(board), state, c, NOW).actions;
  assert.equal(a[0].type, "relay-answer");
  assert.equal(matchAnswer(humanReply(board.pages[0].comments, a[0].pending.askedAt), a[0].pending), "[SK-ANSWER] 2 — parce que");
  state.runs.u1.pending = null;
  // trio en Auto -> repondu seul ; verdict vert -> E2E -> Publier ; SK-DONE -> done
  const trio = parseMessage("[SK-QUESTION] projet=f feature=009-x skill=sk-prep slot=prep type=trio\nContexte :\nlint ok\nOptions :\n1. Approuver\n2. Editer\n3. Rejeter\n");
  assert.equal(decideMessage(trio, state.runs.u1, board.pages[0].props).type, "answer");
  const v = decideMessage(parseMessage("[SK-QUESTION] projet=f feature=009-x skill=sk-impl slot=s type=verdict\nContexte :\nRevue PASS\nOptions :\n1. Publier\n2. Corriger\n3. Abandonner\n"), state.runs.u1, {});
  assert.equal(v.type, "e2e");
  assert.equal(decideE2E("PASS 3 · FAIL 0 · BLOQUE 0 Playwright", v).withPr, true);
  assert.equal(decideMessage(parseMessage("[SK-DONE] projet=f feature=009-x skill=sk-impl slot=s issue=published pr=aucun state=x motif=ok"), state.runs.u1, {}).type, "done");
  sim.setProps(board, "TK-9", { Statut: "Terminé", Session: "" }, NOW);
  state.runs.u1.finished = true;
  assert.deepEqual(tick(sim.view(board), state, c, NOW).actions, []);
});
