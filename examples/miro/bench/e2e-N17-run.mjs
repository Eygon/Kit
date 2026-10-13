// E2E N17 « Journal d activite » : API reelle (US1, US2) + navigateur sur le back reel (US3, US4).
// Usage : TW_CSS=tw-N17.css node e2e-N17-run.mjs <run>   -> results-N17-<run>.json
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { watch } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const E = new URL(".", import.meta.url).pathname; const RUN = process.argv[2] || "1";
const TW = readFileSync(E + (process.env.TW_CSS || "tw.css"), "utf8");
const API = "http://localhost:5080/api/v1";
const api = async (u, m, p, b) => { const r = await fetch(API + p, { method: m, headers: { ...(u ? { "X-User-Id": String(u) } : {}), ...(b !== undefined ? { "Content-Type": "application/json" } : {}) }, body: b !== undefined ? JSON.stringify(b) : undefined }); const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch { j = t; } return { status: r.status, body: j, text: t }; };
const results = []; const log = (id, ok, d) => { results.push({ id, ok: !!ok, detail: d }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${d}`); };
const STAMP = String(Date.now()).slice(-6) + RUN;
const mkBoard = async (name) => (await api(1, "POST", "/boards", { name })).body;
const item = (b, extra = {}) => api(1, "POST", `/boards/${b}/items`, { type: "StickyNote", x: 10, y: 10, width: 100, height: 60, content: "c", color: "#fde68a", ...extra });
const act = async (b, u = 1, q = "") => api(u, "GET", `/boards/${b}/activity${q}`);
// ---- US1 : enregistrement
const B1 = await mkBoard(`N17-${STAMP}`);
const empty = await act(B1.id);
log("API.vide", empty.status === 200 && empty.body.entries.length === 0 && empty.body.nextBefore === null, `tableau sans activite -> ${empty.status} ${JSON.stringify(empty.body)}`);
await api(1, "POST", `/boards/${B1.id}/members`, { userId: 2, role: "Editor" }); await api(1, "POST", `/boards/${B1.id}/members`, { userId: 3, role: "Viewer" });
const it1 = (await item(B1.id, { content: "Plan de sprint" })).body; const shape = (await item(B1.id, { type: "Shape", content: "" })).body;
await api(1, "DELETE", `/boards/${B1.id}/items/${shape.id}`);
const longText = "L".repeat(130); const it3 = (await item(B1.id, { content: longText })).body; await api(1, "DELETE", `/boards/${B1.id}/items/${it3.id}`);
await api(1, "DELETE", `/boards/${B1.id}/members/3`);
const E1 = (await act(B1.id, 2)).body.entries; const asc = [...E1].reverse();
const kinds = asc.map((e) => e.kind);
log("API.US1-enregistrement", JSON.stringify(kinds) === JSON.stringify(["MemberAdded", "MemberAdded", "ItemCreated", "ItemCreated", "ItemDeleted", "ItemCreated", "ItemDeleted", "MemberRemoved"]) && asc.every((e) => e.actorId === 1 && e.actorName === "Alice" && e.occurredAt), `types dans l ordre : ${JSON.stringify(kinds)}`);
log("API.US1-libelles", asc[2].targetLabel === "Plan de sprint" && asc[3].targetLabel === "" && asc[4].targetLabel === "" && asc[6].targetLabel === "L".repeat(120) && asc[7].targetLabel === "Carol" && asc[0].targetLabel === "Bob", `libelles : ${JSON.stringify(asc.map((e) => e.targetLabel.slice(0, 14)))} ; suppression d un texte de 130 -> ${asc[6].targetLabel.length} car.`);
// pas d entree pour deplacement, verrou, role, connecteur, commentaire ; rien en cas de refus
const n0 = (await act(B1.id)).body.entries.length;
await api(1, "PATCH", `/boards/${B1.id}/items/${it1.id}`, { x: 99 }); await api(1, "PATCH", `/boards/${B1.id}/items/${it1.id}`, { isLocked: true });
await api(1, "PATCH", `/boards/${B1.id}/members/2`, { role: "Viewer" }); await api(1, "POST", `/boards/${B1.id}/items/${it1.id}/comments`, { body: "c" });
const itB = (await item(B1.id, { content: "B" })).body; // +1 entree (creation)
await api(1, "POST", `/boards/${B1.id}/connectors`, { fromItemId: it1.id, toItemId: itB.id, style: "Arrow" });
const refus = [await api(2, "POST", `/boards/${B1.id}/items`, { type: "StickyNote", x: 1, y: 1, width: 10, height: 10, content: "x", color: "#fff" }), await api(1, "DELETE", `/boards/${B1.id}/items/${it1.id}`), await api(1, "POST", `/boards/${B1.id}/members`, { userId: 2, role: "Editor" }), await api(1, "DELETE", `/boards/${B1.id}/members/1`)];
const n1 = (await act(B1.id)).body.entries.length;
log("API.US1-non-journalise", n1 === n0 + 1, `deplacer/verrouiller/role/commentaire/connecteur : aucune entree (+1 pour la creation de B seulement) : ${n0} -> ${n1} ; refus ${refus.map((r) => r.status)} (viewer 403, verrouille 409, doublon 400, proprietaire 400)`);
// ---- US2 : pagination
const B2 = await mkBoard(`N17p-${STAMP}`); await api(1, "POST", `/boards/${B2.id}/members`, { userId: 3, role: "Viewer" });
for (let i = 1; i <= 24; i++) await item(B2.id, { content: `e${i}` });
const p1 = (await act(B2.id, 3)).body; const p2 = (await act(B2.id, 3, `?before=${p1.nextBefore}`)).body;
const ids = [...p1.entries, ...p2.entries].map((e) => e.id);
log("API.US2-pages", p1.entries.length === 20 && p1.nextBefore !== null && p2.entries.length === 5 && p2.nextBefore === null && new Set(ids).size === 25 && ids.every((v, i) => i === 0 || v < ids[i - 1]) && p1.entries[0].targetLabel === "e24", `25 entrees : page 1 = ${p1.entries.length} (curseur ${p1.nextBefore}), page 2 = ${p2.entries.length} (curseur ${p2.nextBefore}) ; sans doublon, ordre decroissant ; plus recente = ${p1.entries[0].targetLabel}`);
const B3 = await mkBoard(`N17e-${STAMP}`); for (let i = 0; i < 20; i++) await item(B3.id, { content: `x${i}` });
const ex = (await act(B3.id)).body; log("API.US2-exactement-20", ex.entries.length === 20 && ex.nextBefore === null, `exactement 20 entrees -> ${ex.entries.length}, curseur ${ex.nextBefore}`);
const lim = [await act(B2.id, 3, "?limit=1"), await act(B2.id, 3, "?limit=50"), await act(B2.id, 3, "?limit=0"), await act(B2.id, 3, "?limit=51"), await act(B2.id, 3, "?limit=abc"), await act(B2.id, 3, "?before=abc")];
log("API.US2-limit", lim[0].body.entries.length === 1 && lim[1].body.entries.length === 25 && lim.slice(2).every((r) => r.status === 400), `limit 1 -> ${lim[0].body.entries.length}, 50 -> ${lim[1].body.entries.length} ; 0/51/abc/before=abc -> ${lim.slice(2).map((r) => r.status)}`);
const dr = [await act(B2.id, 1, ""), await api(3, "GET", "/boards/2/activity"), await api(1, "GET", "/boards/999999/activity"), await api(null, "GET", `/boards/${B2.id}/activity`), await api(1, "GET", "/boards/999999/activity?limit=0"), await api(3, "GET", "/boards/2/activity?limit=0")];
log("API.US2-droits", dr[0].status === 200 && dr[1].status === 403 && dr[2].status === 404 && dr[3].status === 401 && dr[4].status === 404 && dr[5].status === 403, `membre ${dr[0].status} ; non-membre ${dr[1].status} ; inconnu ${dr[2].status} ; sans identite ${dr[3].status} ; inconnu+limit=0 ${dr[4].status} ; non-membre+limit=0 ${dr[5].status} (droits avant validation)`);
const wr = [await api(1, "POST", `/boards/${B2.id}/activity`, {}), await api(1, "DELETE", `/boards/${B2.id}/activity`), await api(1, "PATCH", `/boards/${B2.id}/activity`, {})];
log("API.US2-lecture-seule", wr.every((r) => [404, 405].includes(r.status)), `ecritures sur /activity -> ${wr.map((r) => r.status)}`);
// ---- UI
const browser = await chromium.launch(); let cur;
const chk = (id, ok, detail, allow5xx) => { const t = cur.w.take(); const bad = (!allow5xx && t.fiveXX.length) || t.console.length; log(id, ok && !bad, detail + (bad ? " | 5xx/console: " + JSON.stringify([t.fiveXX, t.console]).slice(0, 220) : "")); };
async function open(name, { stub } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" });
  await ctx.addInitScript((css) => { document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.prepend(s); }); }, TW);
  const page = await ctx.newPage(); const st = { reqs: [] };
  await page.route(/\/api\/v1\/boards\/\d+\/activity/, async (route) => { st.reqs.push(route.request().url()); if (st.stub) return st.stub(route); return route.continue(); });
  st.stub = stub;
  const w = watch(page, { api: "http://localhost:5080", expectedConsole: [/negotiation/i, /signalr/i, /WebSocket/i, /Failed to load resource/i] });
  await page.goto("http://localhost:5173/"); await page.getByText(name, { exact: false }).first().click(); await page.waitForTimeout(1200);
  return { ctx, page, w, st };
}
const BTN = (p) => p.getByRole("button", { name: /^Activité/ }).first();
const panel = (p) => p.getByRole("complementary", { name: /Activité/ }).or(p.getByRole("dialog", { name: /Activité/ })).or(p.locator("aside").filter({ hasText: /Activité/ })).first();
const lines = async (p) => (await panel(p).getByRole("listitem").allInnerTexts()).map((t) => t.replace(/\s+/g, " ").trim());
cur = await open(`N17p-${STAMP}`); let { page } = cur;
chk("US4.AC1", (await BTN(page).count()) === 1, `bouton Activite present=${await BTN(page).count()}`);
await BTN(page).click(); await page.waitForTimeout(1200);
let l1 = await lines(page); const more = panel(page).getByRole("button", { name: /Voir plus/ });
chk("US4.AC2", l1.length === 20 && /Alice a ajouté un élément/.test(l1[0]) && /il y a|à l'instant|maintenant/i.test(l1[0]) && (await more.count()) === 1, `20 entrees, 1re : « ${l1[0]} » ; Voir plus=${await more.count()}`);
await more.click(); await page.waitForTimeout(1200); const l2 = await lines(page);
chk("US4.AC3", l2.length === 26 || l2.length === 25, `apres Voir plus : ${l2.length} entrees ; Voir plus encore la=${await more.count()} (attendu 0)`);
chk("US4.AC3b", (await more.count()) === 0, "plus de page : Voir plus disparait");
await cur.ctx.close();
// vide
cur = await open(`N17-${STAMP}`); page = cur.page; await BTN(page).click(); await page.waitForTimeout(1000);
const phr = (await lines(page)).join(" | ");
chk("US4.phrases", /Alice a ajouté Bob/.test(phr) && /Alice a retiré Carol/.test(phr) && /Alice a supprimé un élément/.test(phr), `phrases : ${phr.slice(0, 200)}`);
await cur.ctx.close();
const B4 = await mkBoard(`N17v-${STAMP}`);
cur = await open(`N17v-${STAMP}`); page = cur.page; await BTN(page).click(); await page.waitForTimeout(1000);
chk("US4.AC4", (await page.getByText(/Aucune activité pour le moment/).count()) === 1 && (await panel(page).getByRole("button", { name: /Voir plus/ }).count()) === 0, `etat vide=${await page.getByText(/Aucune activité pour le moment/).count()}`);
await cur.ctx.close();
// erreur au premier chargement puis Reessayer
cur = await open(`N17p-${STAMP}`, { stub: (r) => r.fulfill({ status: 500, contentType: "application/json", body: "{}" }) }); page = cur.page; await BTN(page).click(); await page.waitForTimeout(1500); cur.w.take();
const retry = page.getByRole("button", { name: /Réessayer/ });
const errShown = (await page.getByRole("alert").count()) >= 1 && (await retry.count()) >= 1;
cur.st.stub = null; await retry.first().click(); await page.waitForTimeout(1200);
chk("US4.AC5", errShown && (await lines(page)).length === 20, `erreur : bandeau+Reessayer=${errShown} ; apres Reessayer ${await lines(page).then((x) => x.length)} entrees`, true);
await cur.ctx.close();
// Voir plus en echec : les entrees restent + bandeau
cur = await open(`N17p-${STAMP}`); page = cur.page; await BTN(page).click(); await page.waitForTimeout(1200);
cur.st.stub = (r) => r.fulfill({ status: 500, contentType: "application/json", body: "{}" });
await panel(page).getByRole("button", { name: /Voir plus/ }).click(); await page.waitForTimeout(1500); cur.w.take();
chk("US4.AC6", (await lines(page)).length === 20 && (await page.getByRole("button", { name: /Réessayer/ }).count()) >= 1, `echec de Voir plus : ${(await lines(page)).length} entrees gardees ; Reessayer=${await page.getByRole("button", { name: /Réessayer/ }).count()}`, true);
cur.st.stub = null; await page.getByRole("button", { name: /Réessayer/ }).first().click(); await page.waitForTimeout(1200);
chk("US4.AC6b", (await lines(page)).length >= 25, `apres Reessayer : ${(await lines(page)).length} entrees`);
// rouverture = rechargement depuis la 1re page ; panneau Commentaires ferme ; crayon dans le panneau
const reqsBefore = cur.st.reqs.length; await panel(page).getByRole("button", { name: /Fermer|Close|×/ }).first().click().catch(() => page.keyboard.press("Escape")); await page.waitForTimeout(400);
await BTN(page).click(); await page.waitForTimeout(1000);
chk("US4.AC9", cur.st.reqs.length > reqsBefore && (await lines(page)).length === 20, `reouverture : nouvelle requete=${cur.st.reqs.length > reqsBefore} ; ${(await lines(page)).length} entrees (premiere page)`);
const comments = page.getByRole("button", { name: /Commentaires/ }).first();
if (await comments.count()) { await comments.click().catch(() => {}); await page.waitForTimeout(500); chk("US4.AC7", (await panel(page).count()) === 0 || !(await panel(page).isVisible().catch(() => false)), "ouvrir Commentaires ferme Activite"); await BTN(page).click(); await page.waitForTimeout(500); }
const pencil = page.getByRole("button", { name: /Crayon/ }).first(); let itemsBefore = (await api(1, "GET", `/boards/${B2.id}/items`)).body.length;
if (await pencil.count()) { await pencil.click(); const bx = await panel(page).boundingBox(); if (bx) { await page.mouse.move(bx.x + 40, bx.y + 200); await page.mouse.down(); await page.mouse.move(bx.x + 120, bx.y + 260, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(700); } }
const itemsAfter = (await api(1, "GET", `/boards/${B2.id}/items`)).body.length;
chk("US4.AC8", itemsAfter === itemsBefore, `glisser dans le panneau avec le crayon : elements ${itemsBefore} -> ${itemsAfter}`);
await cur.ctx.close(); await browser.close();
writeFileSync(E + `results-N17-${RUN}.json`, JSON.stringify(results, null, 1));
console.log(`${results.filter((r) => r.ok).length}/${results.length}`);
