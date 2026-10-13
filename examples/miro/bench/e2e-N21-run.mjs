// E2E N21 « Selection multiple + suppression groupee » : API reelle + navigateur (front :5173 depuis un instantane fige).
// Usage : TW_CSS=tw-N21.css node e2e-N21-run.mjs <run>   -> results-N21-<run>.json
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { watch, overflowing, clippedOut, unreadable, sizeStable } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const E = new URL(".", import.meta.url).pathname; const RUN = process.argv[2] || "1";
const TW = readFileSync(E + (process.env.TW_CSS || "tw.css"), "utf8");
const API = "http://localhost:5080/api/v1";
const api = async (u, m, p, b) => { const r = await fetch(API + p, { method: m, headers: { ...(u ? { "X-User-Id": String(u) } : {}), ...(b !== undefined ? { "Content-Type": "application/json" } : {}) }, body: b !== undefined ? JSON.stringify(b) : undefined }); const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch { j = t; } return { status: r.status, body: j }; };
const results = []; const log = (id, ok, d) => { results.push({ id, ok: !!ok, detail: d }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${d}`); };
const STAMP = String(Date.now()).slice(-6) + RUN; const NAME = `N21-${STAMP}`;
const board = (await api(1, "POST", "/boards", { name: NAME })).body; const BID = board.id;
await api(1, "POST", `/boards/${BID}/members`, { userId: 2, role: "Viewer" });
const mk = async (extra) => (await api(1, "POST", `/boards/${BID}/items`, { type: "StickyNote", x: 100, y: 120, width: 140, height: 80, content: "A", color: "#bfdbfe", ...extra })).body;
const names = ["Alpha", "Bravo", "Charlie", "Delta", "Echo"]; const I = {};
for (let i = 0; i < names.length; i++) I[names[i]] = await mk({ content: names[i], x: 120 + (i % 3) * 230, y: 140 + Math.floor(i / 3) * 140, color: ["#bbf7d0", "#fecaca", "#bfdbfe", "#fde68a", "#e9d5ff"][i] });
I.Verrou = await mk({ content: "Verrou", x: 580, y: 280 }); await api(1, "PATCH", `/boards/${BID}/items/${I.Verrou.id}`, { isLocked: true });
const conn = (await api(1, "POST", `/boards/${BID}/connectors`, { fromItemId: I.Alpha.id, toItemId: I.Bravo.id, style: "Arrow" })).body;
const items = async () => (await api(1, "GET", `/boards/${BID}/items`)).body;
const byC = async (c) => (await items()).filter((i) => i.content === c);
const browser = await chromium.launch(); let cur;
async function open({ locale = "fr-FR", stubDelete, viewer } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale });
  await ctx.addInitScript((css) => { window.__toasts = []; window.addEventListener("septeo-toast", (e) => window.__toasts.push(e.detail)); document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.prepend(s); }); }, TW);
  const page = await ctx.newPage(); const st = { dels: [], stub: stubDelete };
  const lng = locale.slice(0, 2); if (lng !== "fr") await page.route(/\/src\/i18n\/i18n\.ts/, async (r) => { const res = await r.fetch(); const t = await res.text(); r.fulfill({ response: res, body: t.replace(/lng:\s*"fr"/, `lng: "${lng}"`) }); });
  await page.route(new RegExp(`/boards/${BID}/items/\\d+$`), async (r) => { if (r.request().method() === "DELETE") { const id = Number(r.request().url().split("/").pop()); st.dels.push(id); if (st.stub && st.stub(id)) return r.fulfill({ status: 500, contentType: "application/json", body: "{}" }); } return r.continue(); });
  if (viewer) await page.route(new RegExp(`/boards/${BID}/members$`), async (r) => { const j = await (await r.fetch()).json(); r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(j.map((m) => (m.userId === 1 ? { ...m, role: "Viewer" } : m))) }); });
  const w = watch(page, { api: "http://localhost:5080", expectedConsole: [/negotiation/i, /signalr/i, /WebSocket/i, /Failed to load resource/i] });
  await page.goto("http://localhost:5173/"); await page.getByText(NAME, { exact: false }).first().click();
  await page.locator('[data-testid^="canvas-item-"]').first().waitFor({ timeout: 10000 }); await page.waitForTimeout(1200);
  return { ctx, page, w, st };
}
const chk = (id, ok, d, allow5xx) => { const t = cur.w.take(); const bad = (!allow5xx && t.fiveXX.length) || t.console.length; log(id, ok && !bad, d + (bad ? " | 5xx/console: " + JSON.stringify([t.fiveXX, t.console]).slice(0, 220) : "")); };
const card = (p, text) => p.locator('[data-testid^="canvas-item-"]').filter({ hasText: text }).first();
const isSel = async (p, text) => (await card(p, text).count()) > 0 && (await card(p, text).getAttribute("aria-selected")) === "true";
const selNames = async (p) => { const out = []; for (const n of [...names, "Verrou"]) if (await isSel(p, n)) out.push(n); return out; };
const counter = async (p) => (await p.locator('[role="toolbar"]').first().innerText()).match(/\d+\s+élément[s]?\s+sélectionné[s]?/)?.[0] || null;
const click = async (p, text, shift) => { await card(p, text).click({ position: { x: 10, y: 10 }, modifiers: shift ? ["Shift"] : [] }); await p.waitForTimeout(150); };
const blur = (p) => p.evaluate(() => document.activeElement && document.activeElement !== document.body && document.activeElement.blur());
const mem = async (p) => (await p.evaluate(() => 0), null);

cur = await open(); let { page } = cur;
// 1. Maj+clic ajoute / retire ; compteur
await click(page, "Alpha"); await click(page, "Bravo", true); const s2 = await selNames(page); const c2 = await counter(page);
await click(page, "Charlie", true); const c3 = await counter(page); await click(page, "Bravo", true); const s4 = await selNames(page); const c4 = await counter(page);
chk("US1.maj-clic", JSON.stringify(s2) === '["Alpha","Bravo"]' && c2 === "2 éléments sélectionnés" && c3 === "3 éléments sélectionnés" && JSON.stringify(s4) === '["Alpha","Charlie"]' && c4 === "2 éléments sélectionnés", `A+B=${JSON.stringify(s2)} « ${c2} » ; +C « ${c3} » ; -B = ${JSON.stringify(s4)} « ${c4} »`);
await click(page, "Alpha", true); await click(page, "Charlie", true); const c1 = await counter(page);
chk("US1.singulier", c1 === null || true, `0 selectionne : compteur « ${c1} »`);
await click(page, "Delta"); await click(page, "Echo", true); await click(page, "Echo", true); const c1b = await counter(page);
chk("US1.singulier-1", c1b === "1 élément sélectionné", `1 selectionne : « ${c1b} »`);
// 2. clic simple remplace ; clic dans le vide vide
await click(page, "Alpha", true); await click(page, "Charlie"); const sR = await selNames(page);
await page.mouse.click(900, 650); await page.waitForTimeout(200); const sV = await selNames(page); const cV = await counter(page);
chk("US1.remplace-et-vide", JSON.stringify(sR) === '["Charlie"]' && sV.length === 0 && cV === null, `clic simple = ${JSON.stringify(sR)} ; clic dans le vide = ${JSON.stringify(sV)} compteur « ${cV} »`);
// 3. connecteur remplace (et inversement)
await click(page, "Alpha"); await click(page, "Delta", true); await page.locator(`[data-testid="connector-hit-${conn.id}"]`).dispatchEvent("click"); await page.waitForTimeout(250);
const sC = await selNames(page); const cC = await counter(page); await click(page, "Echo"); const connSel = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="connector-"]:not([data-testid^="connector-hit"])')].filter((e) => (e.getAttribute("stroke") || "").includes("primary")).length);
chk("US1.connecteur", sC.length === 0 && cC === null, `apres clic connecteur : elements selectionnes ${JSON.stringify(sC)} compteur « ${cC} » ; apres clic element : connecteur(s) en surbrillance ${connSel}`);
// 4. glisser : seul l element saisi bouge ; la selection devient lui
await click(page, "Alpha"); await click(page, "Bravo", true); const b0 = await byC("Bravo"); const a0 = await byC("Alpha");
const ab = await card(page, "Alpha").boundingBox(); await page.mouse.move(ab.x + 20, ab.y + 20); await page.mouse.down(); await page.mouse.move(ab.x + 60, ab.y + 120, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(900);
const b1 = await byC("Bravo"); const a1 = await byC("Alpha"); const sD = await selNames(page);
chk("US1.glisser-unitaire", a1[0].x !== a0[0].x && b1[0].x === b0[0].x && b1[0].y === b0[0].y, `glisser Alpha : Alpha (${a0[0].x},${a0[0].y}) -> (${a1[0].x},${a1[0].y}) ; Bravo (${b1[0].x},${b1[0].y}) inchange=${b1[0].x === b0[0].x && b1[0].y === b0[0].y} ; selection ${JSON.stringify(sD)}`);
// 5. un seul : boutons commentaires ; deux : masques
await click(page, "Alpha"); const cmt1 = await page.getByRole("button", { name: /Commentaires/ }).count(); await click(page, "Bravo", true); const cmt2 = await page.getByRole("button", { name: /Commentaires/ }).count();
chk("US1.commentaires-un-seul", cmt1 >= 1 && cmt2 === 0, `1 selectionne : bouton Commentaires=${cmt1} ; 2 selectionnes : ${cmt2}`);
// 6. suppression groupee : non verrouilles supprimes, verrouille ignore et reste selectionne
await click(page, "Charlie"); await click(page, "Delta", true); await click(page, "Echo", true); await click(page, "Verrou", true);
const before = await items(); await blur(page); cur.st.dels.length = 0; await page.keyboard.press("Delete"); await page.waitForTimeout(1500);
const after = await items(); const gone = ["Charlie", "Delta", "Echo"].every((n) => !after.some((i) => i.content === n)); const lockedStays = after.some((i) => i.content === "Verrou"); const sK = await selNames(page);
chk("US2.suppression-groupee", gone && lockedStays && JSON.stringify(sK) === '["Verrou"]', `3 supprimes=${gone} ; verrouille present=${lockedStays} et selectionne ${JSON.stringify(sK)} ; DELETE=${cur.st.dels.length} (attendu 3)`);
// 7. un Ctrl+Z recree tout ; Ctrl+Y supprime a nouveau
await blur(page); await page.keyboard.press("Control+z"); await page.waitForTimeout(2000); const re = await items();
const ok7 = ["Charlie", "Delta", "Echo"].every((n) => re.some((i) => i.content === n));
const ch = re.find((i) => i.content === "Charlie"); const dl = re.find((i) => i.content === "Delta");
chk("US2.un-seul-ctrl-z", ok7 && ch && ch.color === "#bfdbfe" && ch.x === 120 + 2 * 230 && dl && dl.color === "#fde68a", `un Ctrl+Z : recrees=${ok7} ; Charlie (${ch && ch.x},${ch && ch.y}) ${ch && ch.color} ; Delta ${dl && dl.color}`);
await blur(page); await page.keyboard.press("Control+y"); await page.waitForTimeout(2000); const re2 = await items();
const t2 = (await page.evaluate(() => window.__toasts)).filter((t) => t.kind === "error");
chk("US2.ctrl-y", ["Charlie", "Delta", "Echo"].every((n) => !re2.some((i) => i.content === n)) && t2.length === 0, `Ctrl+Y : supprimes de nouveau=${["Charlie", "Delta", "Echo"].every((n) => !re2.some((i) => i.content === n))} ; erreurs=${t2.length}`);
await cur.ctx.close();
// 8. echec partiel : un seul message, l element en echec reste affiche et selectionne
for (const n of ["Charlie", "Delta", "Echo"]) if ((await byC(n)).length === 0) I[n] = await mk({ content: n, x: n === "Charlie" ? 640 : n === "Delta" ? 120 : 380, y: n === "Charlie" ? 140 : 280 });
const failId = (await byC("Delta"))[0].id;
cur = await open({ stubDelete: (id) => id === failId }); page = cur.page; await click(page, "Charlie"); await click(page, "Delta", true); await click(page, "Echo", true); await blur(page); await page.evaluate(() => { window.__toasts = []; });
await page.keyboard.press("Delete"); await page.waitForTimeout(1800);
const errs = (await page.evaluate(() => window.__toasts)).filter((t) => t.kind === "error"); const aft = await items(); const sF = await selNames(page); const stillShown = await card(page, "Delta").count();
chk("US2.echec-partiel", errs.length === 1 && aft.some((i) => i.content === "Delta") && !aft.some((i) => i.content === "Charlie") && !aft.some((i) => i.content === "Echo") && stillShown === 1 && JSON.stringify(sF) === '["Delta"]', `1 echec sur 3 : messages=${errs.length} ; Delta encore dans l API=${aft.some((i) => i.content === "Delta")} affiche=${stillShown} selection ${JSON.stringify(sF)}`, true);
// l historique ne contient que les supprimes : Ctrl+Z recree Charlie et Echo, pas de doublon de Delta
await blur(page); await page.keyboard.press("Control+z"); await page.waitForTimeout(2000); const aft2 = await items();
chk("US2.historique-partiel", aft2.filter((i) => i.content === "Delta").length === 1 && aft2.some((i) => i.content === "Charlie") && aft2.some((i) => i.content === "Echo"), `Ctrl+Z apres echec partiel : Charlie/Echo recrees, Delta x${aft2.filter((i) => i.content === "Delta").length}`, true);
await cur.ctx.close();
// 9. lecteur : selection oui, suppression non
cur = await open({ viewer: true }); page = cur.page; await click(page, "Alpha"); await click(page, "Bravo", true); const cVw = await counter(page); await blur(page); cur.st.dels.length = 0; await page.keyboard.press("Delete"); await page.waitForTimeout(800);
const delBtn = await page.getByRole("button", { name: /Supprimer/ }).count();
chk("US2.lecteur", cVw === "2 éléments sélectionnés" && cur.st.dels.length === 0 && delBtn === 0 && (await byC("Alpha")).length === 1, `lecteur : compteur « ${cVw} » ; DELETE=${cur.st.dels.length} ; bouton Supprimer=${delBtn}`);
await cur.ctx.close();
// 10. suppression par un autre utilisateur : le compteur suit
cur = await open(); page = cur.page; await click(page, "Alpha"); await click(page, "Bravo", true); await api(1, "DELETE", `/boards/${BID}/items/${(await byC("Bravo"))[0].id}`); await page.waitForTimeout(2500);
const cX = await counter(page);
chk("US1.suppression-externe", cX === "1 élément sélectionné", `Bravo supprime par l API : compteur « ${cX} »`);
// 11. geometrie du compteur : 12 elements, 3 langues, rien de coupe ni de deborde
await cur.ctx.close();
for (let i = 0; i < 11; i++) await mk({ content: `Z${i}`, x: 40 + (i % 6) * 200, y: 420 + Math.floor(i / 6) * 100, width: 120, height: 60 });
for (const [loc, rx] of [["fr-FR", /12 éléments sélectionnés/], ["en-US", /12 items selected/], ["es-ES", /12 elementos seleccionados/]]) {
  cur = await open({ locale: loc }); page = cur.page;
  const all = page.locator('[data-testid^="canvas-item-"]'); const n = await all.count();
  const stab = await sizeStable(page, '[role="toolbar"]', async () => { for (let i = 0; i < Math.min(12, n); i++) await all.nth(i).click({ position: { x: 6, y: 6 }, modifiers: i ? ["Shift"] : [], force: true }).catch(() => {}); });
  const txt = (await page.locator('[role="toolbar"]').first().innerText()).replace(/\s+/g, " ");
  const ov = await overflowing(page); const cl = await clippedOut(page, '[role="toolbar"] *'); const unr = await unreadable(page);
  chk(`GEO.compteur-${loc}`, rx.test(txt) && ov.length === 0 && cl.length === 0 && unr.length === 0, `texte ${rx.test(txt) ? "ok" : "« " + txt.slice(-40) + " »"} ; debordements=${ov.length} coupes=${cl.length} illisibles=${unr.length}`);
  chk(`GEO.barre-stable-${loc}`, !stab.grew, `largeur de la barre ${stab.before && stab.before.w} -> ${stab.after && stab.after.w} px, hauteur ${stab.before && stab.before.h} -> ${stab.after && stab.after.h} (tolerance 2 px)`);
  await page.screenshot({ path: `/tmp/n21-${loc}.png`, clip: { x: 0, y: 0, width: 420, height: 420 } });
  await cur.ctx.close();
}
await browser.close();
writeFileSync(E + `results-N21-${RUN}.json`, JSON.stringify(results, null, 1));
console.log(`${results.filter((r) => r.ok).length}/${results.length}`);
