// E2E N16 « Couleur d etiquette d un tableau » : API reelle (US1) + navigateur sur le back reel (US2, US3).
// Usage : TW_CSS=tw-N16.css node e2e-N16-run.mjs <run>   -> results-N16-<run>.json
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { watch, overflowing } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const E = new URL(".", import.meta.url).pathname; const RUN = process.argv[2] || "1";
const TW = readFileSync(E + (process.env.TW_CSS || "tw.css"), "utf8");
const API = "http://localhost:5080/api/v1";
const api = async (u, m, p, b) => { const r = await fetch(API + p, { method: m, headers: { ...(u ? { "X-User-Id": String(u) } : {}), ...(b !== undefined ? { "Content-Type": "application/json" } : {}) }, body: b !== undefined ? JSON.stringify(b) : undefined }); const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch { j = t; } return { status: r.status, body: j, text: t }; };
const results = []; const log = (id, ok, d) => { results.push({ id, ok: !!ok, detail: d }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${d}`); };
const STAMP = String(Date.now()).slice(-6) + RUN; const NAME = `N16-${STAMP}`; const OTHER = `N16o-${STAMP}`; const LONG = "N16" + STAMP + "x".repeat(100 - ("N16" + STAMP).length);
const mine = (await api(1, "POST", "/boards", { name: NAME })).body; await api(1, "POST", `/boards/${mine.id}/members`, { userId: 2, role: "Editor" }); await api(1, "POST", `/boards/${mine.id}/members`, { userId: 3, role: "Viewer" });
const col = async (id, u = 1) => (await api(u, "GET", "/boards")).body.find((b) => b.id === id)?.color;
// ---- US1 API
const a1 = await api(1, "PATCH", `/boards/${mine.id}/color`, { color: "Blue" });
log("API.AC1", a1.status === 204 && a1.text === "" && (await col(mine.id)) === "Blue", `Blue -> ${a1.status}, liste : ${await col(mine.id)}`);
const a2 = await api(1, "PATCH", `/boards/${mine.id}/color`, { color: null }); const det = (await api(1, "GET", `/boards/${mine.id}`)).body;
log("API.AC2", a2.status === 204 && (await col(mine.id)) === null && det.color === null, `null -> ${a2.status}, liste ${await col(mine.id)}, detail ${det.color}`);
await api(1, "PATCH", `/boards/${mine.id}/color`, { color: "Green" }); const a3 = await api(1, "PATCH", `/boards/${mine.id}/color`, { color: "Green" });
log("API.AC3", a3.status === 204 && (await col(mine.id)) === "Green", `Green deux fois -> ${a3.status}, ${await col(mine.id)}`);
const bad = [await api(1, "PATCH", `/boards/${mine.id}/color`, { color: "Brown" }), await api(1, "PATCH", `/boards/${mine.id}/color`, { color: "red" }), await api(1, "PATCH", `/boards/${mine.id}/color`, { color: 3 }), await api(1, "PATCH", `/boards/${mine.id}/color`, {})];
log("API.AC4", bad.every((r) => r.status === 400) && (await col(mine.id)) === "Green", `Brown/red/3/champ absent -> ${bad.map((r) => r.status)} ; couleur inchangee ${await col(mine.id)}`);
const forb = [await api(2, "PATCH", `/boards/${mine.id}/color`, { color: "Red" }), await api(3, "PATCH", `/boards/${mine.id}/color`, { color: "Red" }), await api(3, "PATCH", "/boards/2/color", { color: "Red" }), await api(2, "PATCH", `/boards/${mine.id}/color`, { color: "Brown" })];
log("API.AC5/6/9", forb.every((r) => r.status === 403) && (await col(mine.id)) === "Green", `editeur/lecteur/non-membre/editeur+Brown -> ${forb.map((r) => r.status)} (droits avant validation)`);
const e7 = await api(1, "PATCH", "/boards/999999/color", { color: "Red" }); const e8 = await api(null, "PATCH", `/boards/${mine.id}/color`, { color: "Red" });
log("API.AC7/8", e7.status === 404 && e8.status === 401, `inexistant ${e7.status} ; sans identite ${e8.status}`);
const created = (await api(1, "POST", "/boards", { name: `N16c-${STAMP}` })).body;
log("API.AC10", created.color === null, `creation -> color=${created.color}`);
// ---- UI : tableau de Bob colore par Bob, Alice editrice (pastille visible, pas de bouton)
const bobs = (await api(2, "POST", "/boards", { name: OTHER })).body; await api(2, "POST", `/boards/${bobs.id}/members`, { userId: 1, role: "Editor" }); await api(2, "PATCH", `/boards/${bobs.id}/color`, { color: "Red" });
await api(1, "POST", "/boards", { name: LONG });
await api(1, "PATCH", `/boards/${mine.id}/color`, { color: null });
const browser = await chromium.launch(); let cur;
const chk = (id, ok, detail, allow5xx) => { const t = cur.w.take(); const bad = (!allow5xx && t.fiveXX.length) || t.console.length; log(id, ok && !bad, detail + (bad ? " | 5xx/console: " + JSON.stringify([t.fiveXX, t.console]).slice(0, 220) : "")); };
async function open({ stub } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" });
  await ctx.addInitScript((css) => { document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.prepend(s); }); }, TW);
  await ctx.addInitScript(() => { window.__toasts = []; window.addEventListener("septeo-toast", (e) => window.__toasts.push(e.detail)); });
  const page = await ctx.newPage(); const sent = []; let gets = 0;
  await page.route(/\/api\/v1\/boards\/\d+\/color$/, async (route) => { sent.push(route.request().postDataJSON()); if (stub) return stub(route); return route.continue(); });
  await page.route(/\/api\/v1\/boards$/, (route) => { if (route.request().method() === "GET") gets++; return route.continue(); });
  const w = watch(page, { api: "http://localhost:5080", expectedConsole: [/negotiation/i, /signalr/i, /WebSocket/i, /Failed to load resource/i] });
  await page.goto("http://localhost:5173/"); await page.getByRole("listitem").filter({ hasText: NAME }).first().waitFor({ timeout: 10000 });
  return { ctx, page, w, sent, gets: () => gets };
}
const card = (p, n) => p.getByRole("listitem").filter({ hasText: n }).first();
const colorBtn = (p, n) => card(p, n).getByRole("button", { name: /^Couleur/ });
let dlg; const D = (p) => p.getByRole("dialog").filter({ hasText: /Couleur du tableau/ }).first();
const toasts = (p) => p.evaluate(() => window.__toasts);
cur = await open(); let { page } = cur; dlg = D(page);
chk("US3.AC1-3", (await colorBtn(page, NAME).count()) === 1 && (await colorBtn(page, OTHER).count()) === 0 && (await card(page, OTHER).innerText()).includes("Couleur : Rouge"), `proprietaire : bouton Couleur=${await colorBtn(page, NAME).count()} ; editeur : bouton=${await colorBtn(page, OTHER).count()}, pastille « ${(await card(page, OTHER).innerText()).match(/Couleur : \w+/)?.[0]} »`);
chk("US2.AC2", !/Couleur : /.test(await card(page, NAME).innerText()), "tableau sans couleur : aucune pastille ni texte");
const open0 = await card(page, NAME).getByRole("button").first().innerText();
await colorBtn(page, NAME).click(); await page.waitForTimeout(400);
dlg = D(page);
const btns = await dlg.getByRole("button").allInnerTexts();
chk("US3.AC4/5", await dlg.isVisible() && btns.length >= 9 && /Aucune couleur/.test(btns.join("|")) && /actuelle/.test((await dlg.getByRole("button", { name: /Aucune couleur/ }).innerText())) && (await card(page, NAME).count()) > 0, `fenetre : ${btns.length} boutons ${JSON.stringify(btns.map((b) => b.replace(/\n/g, " ")).slice(0, 10))}`);
// choix vert
const g0 = cur.gets();
await dlg.getByRole("button", { name: /Vert/ }).click(); await page.waitForTimeout(1200);
chk("US3.AC6", cur.sent.length === 1 && cur.sent[0].color === "Green" && !(await dlg.isVisible().catch(() => false)) && /Couleur : Vert/.test(await card(page, NAME).innerText()) && (await col(mine.id)) === "Green" && (await toasts(page)).length === 0 && cur.gets() === g0, `PATCH ${JSON.stringify(cur.sent)} ; fenetre fermee ; pastille « Couleur : Vert » ; API=${await col(mine.id)} ; toasts=${(await toasts(page)).length} ; rechargements de la liste=${cur.gets() - g0}`);
// pas de bouton imbrique, bouton d ouverture inchange
chk("US3.structure", (await page.evaluate(() => document.querySelectorAll("button button").length)) === 0, "aucun bouton imbrique");
// la fenetre indique le vert comme actuel ; Aucune couleur -> null
await colorBtn(page, NAME).click(); await page.waitForTimeout(300);
const curGreen = await dlg.getByRole("button", { name: /Vert/ }).innerText();
await dlg.getByRole("button", { name: /Aucune couleur/ }).click(); await page.waitForTimeout(1000);
chk("US3.AC7", /actuelle/.test(curGreen) && cur.sent[1]?.color === null && !/Couleur : /.test(await card(page, NAME).innerText()) && (await col(mine.id)) === null, `vert marque actuel=${/actuelle/.test(curGreen)} ; null envoye=${cur.sent[1]?.color === null} ; pastille retiree ; API=${await col(mine.id)}`);
await cur.ctx.close();
// fermer sans choisir : rien envoye
cur = await open(); page = cur.page; dlg = D(page); await colorBtn(page, NAME).click(); await page.waitForTimeout(300); await page.keyboard.press("Escape"); await page.waitForTimeout(300);
const closedBtn = dlg.getByRole("button", { name: /Fermer|Close/i });
if (await dlg.isVisible().catch(() => false) && (await closedBtn.count())) await closedBtn.first().click();
chk("US3.AC10", cur.sent.length === 0 && (await col(mine.id)) === null, `fenetre fermee sans choix : demandes=${cur.sent.length}, couleur inchangee=${await col(mine.id)}`);
await cur.ctx.close();
// echec : un seul toast generique, fenetre ouverte, pastille inchangee ; double clic : une seule demande
for (const [label, stub] of [["500", (r) => r.fulfill({ status: 500, contentType: "application/json", body: "{}" })], ["403", (r) => r.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ message: "x" }) })], ["reseau", (r) => r.abort("connectionrefused")]]) {
  cur = await open({ stub }); page = cur.page; dlg = D(page); await colorBtn(page, NAME).click(); await page.waitForTimeout(300);
  await dlg.getByRole("button", { name: /Rouge/ }).click(); await page.waitForTimeout(1200); const ts = await toasts(page); cur.w.take();
  chk(`US3.AC9-${label}`, ts.length === 1 && /Une erreur est survenue/.test(ts[0].message) && (await dlg.isVisible()) && !/Couleur : /.test(await card(page, NAME).innerText()), `${label} -> toasts=${JSON.stringify(ts).slice(0, 100)} ; fenetre ouverte=${await dlg.isVisible()} ; pastille inchangee`, true);
  await cur.ctx.close();
}
cur = await open({ stub: async (r) => { await new Promise((x) => setTimeout(x, 700)); return r.continue(); } }); page = cur.page; dlg = D(page); await colorBtn(page, NAME).click(); await page.waitForTimeout(300);
await dlg.getByRole("button", { name: /Bleu/ }).dblclick(); await page.waitForTimeout(300);
const dis = await dlg.getByRole("button", { name: /Orange/ }).isDisabled(); await page.waitForTimeout(1500);
chk("US3.AC8+dblclic", cur.sent.length === 1 && dis, `double clic -> demandes=${cur.sent.length} ; boutons desactives pendant l envoi=${dis}`);
await api(1, "PATCH", `/boards/${mine.id}/color`, { color: null });
await cur.ctx.close();
// debordement : nom de 100 caracteres, pastille et bouton visibles
cur = await open(); page = cur.page; dlg = D(page); await api(1, "PATCH", `/boards/${mine.id}/color`, { color: "Blue" });
const longId = (await api(1, "GET", "/boards")).body.find((b) => b.name === LONG).id; await api(1, "PATCH", `/boards/${longId}/color`, { color: "Purple" }); await page.reload(); await card(page, LONG).waitFor({ timeout: 10000 });
const ov = await overflowing(page); const bb = await colorBtn(page, LONG).boundingBox();
chk("US3.debordement", ov.length === 0 && bb && bb.width >= 20, `debordements=${JSON.stringify(ov).slice(0, 150)} ; bouton Couleur de la carte au nom de 100 car. = ${JSON.stringify(bb)}`);
await api(1, "PATCH", `/boards/${mine.id}/color`, { color: null }); await api(1, "PATCH", `/boards/${longId}/color`, { color: null });
await cur.ctx.close(); await browser.close();
writeFileSync(E + `results-N16-${RUN}.json`, JSON.stringify(results, null, 1));
console.log(`${results.filter((r) => r.ok).length}/${results.length}`);
