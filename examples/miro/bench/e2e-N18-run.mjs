// E2E N18 « Indicateur d edition en direct » : 3 navigateurs (Alice 1 :5173, Bob 2 :5174, Carol lectrice 3 :5175) sur l API reelle + SignalR reel.
// Usage : TW_CSS=tw-N18.css node e2e-N18-run.mjs <run>   -> results-N18-<run>.json
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { watch, clippedOut } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const E = new URL(".", import.meta.url).pathname; const RUN = process.argv[2] || "1";
const TW = readFileSync(E + (process.env.TW_CSS || "tw.css"), "utf8");
const FRONT_NM = "/tmp/claude-0/-home-user-Kit/6d0ce183-8a0e-5e9b-8ccd-4301258ef079/scratchpad/nbench/front/node_modules/@microsoft/signalr";
const signalr = createRequire(import.meta.url)(FRONT_NM);
const API = "http://localhost:5080/api/v1";
const api = async (u, m, p, b) => { const r = await fetch(API + p, { method: m, headers: { ...(u ? { "X-User-Id": String(u) } : {}), ...(b !== undefined ? { "Content-Type": "application/json" } : {}) }, body: b !== undefined ? JSON.stringify(b) : undefined }); const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch { j = t; } return { status: r.status, body: j }; };
const results = []; const log = (id, ok, d) => { results.push({ id, ok: !!ok, detail: d }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${d}`); };
const STAMP = String(Date.now()).slice(-6) + RUN; const NAME = `N18-${STAMP}`;
const board = (await api(1, "POST", "/boards", { name: NAME })).body;
await api(1, "POST", `/boards/${board.id}/members`, { userId: 2, role: "Editor" }); await api(1, "POST", `/boards/${board.id}/members`, { userId: 3, role: "Viewer" });
const mk = async (x, y, content) => (await api(1, "POST", `/boards/${board.id}/items`, { type: "StickyNote", x, y, width: 160, height: 90, content, color: "#fde68a" })).body;
const i1 = await mk(300, 260, "Premier"); const i2 = await mk(300, 380, "Deuxieme"); const i3 = await mk(600, 0, "Au bord haut"); const i4 = await mk(700, 300, "Quatrieme");
const browser = await chromium.launch();
const PORTS = { A: 5173, B: 5174, C: 5175 };
async function open(who, { hold } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" });
  await ctx.addInitScript((css) => { document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.prepend(s); }); }, TW);
  const page = await ctx.newPage();
  if (hold) await page.routeWebSocket(/\/hubs?\//i, (ws) => { const s = ws.connectToServer(); hold.push({ ws, s }); });
  const w = watch(page, { api: "http://localhost:5080", expectedConsole: [/negotiation/i, /signalr/i, /WebSocket/i, /Failed to load resource/i, /reconnect/i, /connection/i] });
  await page.goto(`http://localhost:${PORTS[who]}/`); await page.getByText(NAME, { exact: false }).first().click();
  await page.locator(`[data-testid="canvas-item-${i1.id}"]`).waitFor({ timeout: 10000 }); await page.waitForTimeout(1500);
  return { ctx, page, w, who };
}
const item = (p, id) => p.page.locator(`[data-testid="canvas-item-${id}"]`);
const badge = (p, id) => p.page.locator(`[data-testid="editing-badge-${id}"]`);
const txt = async (p, id) => p.page.evaluate((i) => { const e = document.querySelector(`[data-testid="editing-badge-${i}"]`); return e ? e.textContent.replace(/\s+/g, " ").trim() : null; }, id);
const waitTxt = async (p, id, re, ms = 6000) => { const t0 = Date.now(); let t; while (Date.now() - t0 < ms) { t = await txt(p, id); if (re === null ? t === null : (t !== null && re.test(t))) return { ok: true, t }; await p.page.waitForTimeout(150); } return { ok: false, t }; };
const dbl = async (p, id) => { await item(p, id).dblclick({ position: { x: 20, y: 40 } }); await p.page.getByText("Modifier le contenu").first().waitFor({ timeout: 5000 }); };
const closeDrawer = async (p) => { await p.page.keyboard.press("Escape"); await p.page.waitForTimeout(300); if (await p.page.getByText("Modifier le contenu").count()) { const c = p.page.getByRole("button", { name: /Fermer|Close/ }).first(); if (await c.count()) await c.click(); } await p.page.waitForTimeout(300); };
const chk = (id, ok, d, p) => { const t = p ? p.w.take() : { fiveXX: [], console: [] }; const bad = t.fiveXX.length || t.console.length; log(id, ok && !bad, d + (bad ? " | 5xx/console: " + JSON.stringify([t.fiveXX, t.console]).slice(0, 220) : "")); };

const holdA = []; const A = await open("A", { hold: holdA }); const B = await open("B"); const C = await open("C");
// 1. Alice ouvre l edition : Bob et Carol voient le badge, pas Alice
await dbl(A, i1.id);
const r1b = await waitTxt(B, i1.id, /^Alice édite…$/); const r1c = await waitTxt(C, i1.id, /^Alice édite…$/);
chk("AC1.badge-autres", r1b.ok && r1c.ok, `Bob : « ${r1b.t} » ; Carol : « ${r1c.t} »`, B);
chk("AC2.pas-son-badge", (await txt(A, i1.id)) === null, `Alice voit son propre badge : ${await txt(A, i1.id)}`, A);
// 2. non bloquant : Bob edite aussi le meme element
await dbl(B, i1.id);
const r2a = await waitTxt(A, i1.id, /^Bob édite…$/); const r2c = await waitTxt(C, i1.id, /^Alice et Bob éditent…$/);
chk("AC3.deux-editeurs", r2a.ok && r2c.ok && (await txt(B, i1.id)) === "Alice édite…", `Alice voit : « ${r2a.t} » ; Carol : « ${r2c.t} » (ordre de debut) ; Bob : « ${await txt(B, i1.id)} »`, A);
// 3. Alice enregistre : son badge disparait chez les autres, Bob reste
await A.page.getByRole("button", { name: /^Enregistrer/ }).first().click(); await A.page.waitForTimeout(500);
const r3c = await waitTxt(C, i1.id, /^Bob édite…$/); const r3b = await waitTxt(B, i1.id, null);
chk("AC4.validation", r3c.ok && r3b.ok, `apres validation d Alice : Carol « ${r3c.t} » ; Bob voit le badge d Alice : ${r3b.t}`, C);
// 4. Bob annule (ferme) : plus rien
await closeDrawer(B);
const r4c = await waitTxt(C, i1.id, null); const r4a = await waitTxt(A, i1.id, null);
chk("AC5.annulation", r4c.ok && r4a.ok, `apres fermeture par Bob : Carol ${r4c.t}, Alice ${r4a.t}`, C);
// 5. changement d element : i1 puis i2
await dbl(A, i1.id); await waitTxt(B, i1.id, /Alice/); await closeDrawer(A); await dbl(A, i2.id);
const r5 = await waitTxt(B, i2.id, /^Alice édite…$/); const r5b = await waitTxt(B, i1.id, null);
chk("AC6.un-seul-element", r5.ok && r5b.ok, `Alice sur le 2e element : badge i2 « ${r5.t} », i1 « ${r5b.t} »`, B);
await closeDrawer(A);
// 6. superposition : le badge d i1 recouvre le haut d i2 ; un vrai clic sous le badge selectionne i2
await dbl(A, i1.id); await waitTxt(B, i1.id, /Alice/);
const bb = await badge(B, i1.id).boundingBox(); const ib = await item(B, i2.id).boundingBox();
await item(B, i2.id).click({ position: { x: 8, y: 4 } }); await B.page.waitForTimeout(300);
const sel2 = (await item(B, i2.id).getAttribute("aria-selected")) === "true";
chk("AC7.badge-ne-gene-pas", sel2, `clic sur le haut d i2 (badge ${Math.round(bb.y)}-${Math.round(bb.y + bb.height)}, i2 ${Math.round(ib.y)}) : i2 selectionne=${sel2}`, B);
// 7. geometrie : badge d un element au bord haut du tableau ; taille constante au zoom
await dbl(A, i3.id); await closeDrawer(A);
await A.page.keyboard.press("Escape");
await dbl(A, i3.id); const r7 = await waitTxt(B, i3.id, /Alice/);
const g = await B.page.evaluate((id) => { const b = document.querySelector(`[data-testid="editing-badge-${id}"]`); if (!b) return null; const r = b.getBoundingClientRect(); const clip = []; for (let e = b.parentElement; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.overflow !== "visible" || cs.overflowY !== "visible") clip.push(e.getBoundingClientRect()); } const inside = clip.every((c) => r.top >= c.top - 0.5 && r.bottom <= c.bottom + 0.5 && r.left >= c.left - 0.5 && r.right <= c.right + 0.5); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), inside, clipTop: clip.map((c) => Math.round(c.top)) }; }, i3.id);
const clp = await clippedOut(B.page, '[data-testid^="editing-badge-"]');
chk("AC8.badge-visible-bord-haut", r7.ok && g && g.inside && clp.length === 0, `badge d un element a y=0 : ${JSON.stringify(g)} (doit etre dans la zone visible du tableau, pas coupe par son conteneur)`, B);
await closeDrawer(A);
// zoom : taille du badge constante
await dbl(A, i1.id); await waitTxt(B, i1.id, /Alice/);
const h0 = (await badge(B, i1.id).boundingBox()).height; const w0 = (await item(B, i1.id).boundingBox()).width;
await B.page.mouse.move(700, 500); await B.page.keyboard.down("Control"); for (let k = 0; k < 4; k++) { await B.page.mouse.wheel(0, -200); await B.page.waitForTimeout(80); } await B.page.keyboard.up("Control"); await B.page.waitForTimeout(500);
const h1 = (await badge(B, i1.id).boundingBox())?.height; const w1 = (await item(B, i1.id).boundingBox()).width;
chk("AC9.taille-constante-au-zoom", Math.abs(w1 / w0 - 1) > 0.05 ? Math.abs(h1 - h0) < 1.5 : true, `zoom : largeur de l element ${Math.round(w0)} -> ${Math.round(w1)} ; hauteur du badge ${Math.round(h0)} -> ${Math.round(h1)}`, B);
await closeDrawer(A);
// 8. recrue : Alice edite, Carol recharge -> badge immediat
await dbl(A, i4.id); await waitTxt(B, i4.id, /Alice/);
await C.page.reload(); await C.page.getByText(NAME, { exact: false }).first().click().catch(() => {}); await C.page.locator(`[data-testid="canvas-item-${i1.id}"]`).waitFor({ timeout: 10000 });
const r8 = await waitTxt(C, i4.id, /^Alice édite…$/, 5000);
chk("AC10.nouvel-arrivant", r8.ok, `Carol recharge pendant l edition d Alice : « ${r8.t} »`, C);
// 9. coupure de connexion d Alice (cote serveur) puis reconnexion automatique : badge disparait puis reapparait
const n0 = holdA.length;
await B.page.evaluate((id) => { window.__bl = []; const q = () => !!document.querySelector(`[data-testid="editing-badge-${id}"]`); let last = q(); window.__bl.push({ t: performance.now(), p: last }); new MutationObserver(() => { const c = q(); if (c !== last) { last = c; window.__bl.push({ t: performance.now(), p: c }); } }).observe(document.body, { childList: true, subtree: true, attributes: true }); }, i4.id);
holdA[holdA.length - 1].s.close();
await B.page.waitForTimeout(6000);
const bl = await B.page.evaluate(() => window.__bl); const r9b = await waitTxt(B, i4.id, /^Alice édite…$/, 15000);
const vanished = bl.some((e, k) => k > 0 && e.p === false);
chk("AC11.coupure-reconnexion", vanished && r9b.ok, `connexion d Alice coupee : badge chez Bob disparu=${vanished} (journal ${JSON.stringify(bl.map((e) => e.p))}) ; apres reconnexion : « ${r9b.t} » (ws ${n0} -> ${holdA.length})`, B);
await closeDrawer(A); await waitTxt(B, i4.id, null);
// 10. lecteur : l interface ne propose pas l edition ; un client hub de lecteur est ignore sans erreur
await item(C, i1.id).dblclick({ position: { x: 20, y: 40 } }).catch(() => {}); await C.page.waitForTimeout(500);
const drawerC = await C.page.getByText("Modifier le contenu").count();
const hubUrl = (u) => `http://localhost:5080/hubs/board?userId=${u}`;
let hubPath = null; for (const p of ["/hubs/board", "/hub/board", "/boardHub", "/hubs/boards"]) { const r = await fetch(`http://localhost:5080${p}/negotiate?negotiateVersion=1&userId=3`, { method: "POST" }).catch(() => null); if (r && r.status === 200) { hubPath = p; break; } }
let ignored = null, err = null;
if (hubPath) {
  const conn = new signalr.HubConnectionBuilder().withUrl(`http://localhost:5080${hubPath}?userId=3`, { withCredentials: false }).build();
  const got = []; conn.on("EditingChanged", (l) => got.push(l)); await conn.start(); await conn.invoke("JoinBoard", board.id); await new Promise((r) => setTimeout(r, 400)); got.length = 0;
  try { await conn.invoke("StartEditing", board.id, i2.id); } catch (e) { err = String(e); }
  await B.page.waitForTimeout(800); ignored = (await txt(B, i2.id)) === null; await conn.stop();
}
chk("AC12.lecteur-ignore", drawerC === 0 && ignored === true && err === null, `lecteur : panneau ouvert=${drawerC} ; StartEditing via le hub : badge chez Bob=${ignored === true ? "aucun" : ignored} ; erreur=${err} (hub ${hubPath})`, C);
// 11. fermeture de la page d Alice (en editant) : badge disparait chez Bob
await dbl(A, i2.id); const r11a = await waitTxt(B, i2.id, /Alice/); await A.ctx.close();
const r11b = await waitTxt(B, i2.id, null, 8000);
chk("AC13.fermeture-page", r11a.ok && r11b.ok, `Alice ferme sa page : avant « ${r11a.t} », apres ${r11b.t}`, B);
// 12. rien d autre n a casse : pas de badge residuel nulle part
const left = await B.page.locator('[data-testid^="editing-badge-"]').count();
chk("AC14.aucun-badge-residuel", left === 0, `badges restants chez Bob : ${left}`, B);
await browser.close();
writeFileSync(E + `results-N18-${RUN}.json`, JSON.stringify(results, null, 1));
console.log(`${results.filter((r) => r.ok).length}/${results.length}`);
