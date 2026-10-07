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
