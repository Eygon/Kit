// E2E N20 « Deplacer au clavier » : API reelle + navigateur (front :5173 depuis un instantane fige).
// Usage : TW_CSS=tw-N20.css node e2e-N20-run.mjs <run>   -> results-N20-<run>.json
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { watch } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const E = new URL(".", import.meta.url).pathname; const RUN = process.argv[2] || "1";
const TW = readFileSync(E + (process.env.TW_CSS || "tw.css"), "utf8");
const API = "http://localhost:5080/api/v1";
const api = async (u, m, p, b) => { const r = await fetch(API + p, { method: m, headers: { ...(u ? { "X-User-Id": String(u) } : {}), ...(b !== undefined ? { "Content-Type": "application/json" } : {}) }, body: b !== undefined ? JSON.stringify(b) : undefined }); const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch { j = t; } return { status: r.status, body: j }; };
const results = []; const log = (id, ok, d) => { results.push({ id, ok: !!ok, detail: d }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${d}`); };
const STAMP = String(Date.now()).slice(-6) + RUN; const NAME = `N20-${STAMP}`;
const board = (await api(1, "POST", "/boards", { name: NAME })).body; const BID = board.id;
await api(1, "POST", `/boards/${BID}/members`, { userId: 3, role: "Viewer" });
const mk = async (extra) => (await api(1, "POST", `/boards/${BID}/items`, { type: "StickyNote", x: 400, y: 300, width: 150, height: 90, content: "A", color: "#bfdbfe", ...extra })).body;
const P = await mk({ content: "Pivot", x: 400, y: 300 }); const Q = await mk({ content: "Autre", x: 700, y: 300 });
const K = await mk({ content: "Verrou", x: 400, y: 500 }); await api(1, "PATCH", `/boards/${BID}/items/${K.id}`, { isLocked: true });
const W = await mk({ content: "Bord", x: 5, y: 3 });
const get = async (id) => (await api(1, "GET", `/boards/${BID}/items`)).body.find((i) => i.id === id);
const browser = await chromium.launch(); let cur;
async function open({ viewer, stubPatch, zoom } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" });
  await ctx.addInitScript((css) => { window.__toasts = []; window.addEventListener("septeo-toast", (e) => window.__toasts.push(e.detail)); document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.prepend(s); }); }, TW);
  const page = await ctx.newPage(); const st = { patches: [], stub: stubPatch };
  await page.route(new RegExp(`/boards/${BID}/items/\\d+$`), async (r) => { if (r.request().method() === "PATCH") { st.patches.push({ t: Date.now(), body: r.request().postData() }); if (st.stub) return st.stub(r); } return r.continue(); });
  if (viewer) await page.route(new RegExp(`/boards/${BID}/members$`), async (r) => { const j = await (await r.fetch()).json(); r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(j.map((m) => (m.userId === 1 ? { ...m, role: "Viewer" } : m))) }); });
  const w = watch(page, { api: "http://localhost:5080", expectedConsole: [/negotiation/i, /signalr/i, /WebSocket/i, /Failed to load resource/i] });
  await page.goto("http://localhost:5173/"); await page.getByText(NAME, { exact: false }).first().click();
  await page.locator('[data-testid^="canvas-item-"]').first().waitFor({ timeout: 10000 }); await page.waitForTimeout(1200);
  return { ctx, page, w, st };
}
const chk = (id, ok, d, allow5xx) => { const t = cur.w.take(); const bad = (!allow5xx && t.fiveXX.length) || t.console.length; log(id, ok && !bad, d + (bad ? " | 5xx/console: " + JSON.stringify([t.fiveXX, t.console]).slice(0, 220) : "")); };
const card = (p, text) => p.locator('[data-testid^="canvas-item-"]').filter({ hasText: text }).first();
const sel = async (p, text) => { await card(p, text).click({ position: { x: 8, y: 8 } }); await p.waitForTimeout(150); await p.evaluate(() => document.activeElement && document.activeElement !== document.body && document.activeElement.blur()); };
const rect = async (p, text) => { const b = await card(p, text).boundingBox(); return b && { x: b.x, y: b.y }; };
const flush = (p) => p.waitForTimeout(900);

cur = await open(); let { page } = cur;
// 1. fleche : 10 px ; Maj + fleche : 50 px ; une seule demande apres la rafale
await sel(page, "Pivot"); const r0 = await rect(page, "Pivot");
await page.keyboard.press("ArrowRight"); await page.waitForTimeout(100);
const r1 = await rect(page, "Pivot"); await flush(page);
let it = await get(P.id);
chk("US1.fleche-10px", Math.round(r1.x - r0.x) === 10 && it.x === 410 && it.y === 300 && cur.st.patches.length === 1, `ecran +${Math.round(r1.x - r0.x)} px ; API (${it.x},${it.y}) ; PATCH=${cur.st.patches.length}`);
await page.keyboard.press("Shift+ArrowDown"); await flush(page); it = await get(P.id);
chk("US1.maj-50px", it.x === 410 && it.y === 350, `Maj+Bas : API (${it.x},${it.y}) (attendu 410,350)`);
// 2. rafale de 6 touches : une seule demande, 400 ms apres la derniere
cur.st.patches.length = 0; const tStart = Date.now();
for (let i = 0; i < 6; i++) { await page.keyboard.press("ArrowLeft"); await page.waitForTimeout(60); }
const tLast = Date.now(); await page.waitForTimeout(300); const early = cur.st.patches.length; await page.waitForTimeout(700);
it = await get(P.id);
chk("US1.rafale-un-patch", cur.st.patches.length === 1 && early === 0 && it.x === 350 && it.y === 350 && cur.st.patches[0].t - tLast >= 350 && cur.st.patches[0].t - tLast <= 900, `6 touches : PATCH=${cur.st.patches.length} (avant 300 ms : ${early}) delai apres la derniere touche=${cur.st.patches[0] && cur.st.patches[0].t - tLast} ms ; API (${it.x},${it.y})`);
// 3. un seul Ctrl+Z pour toute la rafale (apres enregistrement)
await page.keyboard.press("Control+z"); await flush(page); it = await get(P.id);
chk("US1.ctrl-z-rafale", it.x === 410 && it.y === 350, `Ctrl+Z : API (${it.x},${it.y}) (attendu 410,350 = avant la rafale de 6)`);
// 4. Ctrl+Z pendant une rafale non envoyee : annulation locale, aucun appel
cur.st.patches.length = 0; await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("Control+z"); await flush(page); it = await get(P.id);
chk("US1.ctrl-z-avant-envoi", it.x === 410 && it.y === 350 && cur.st.patches.length === 0, `rafale annulee avant envoi : PATCH=${cur.st.patches.length} ; API (${it.x},${it.y})`);
// 5. verrouille
await sel(page, "Verrou"); cur.st.patches.length = 0; const k0 = await rect(page, "Verrou"); await page.keyboard.press("ArrowRight"); await flush(page); const k1 = await rect(page, "Verrou"); const kk = await get(K.id);
chk("US1.verrouille", Math.abs(k1.x - k0.x) < 1 && kk.x === 400 && cur.st.patches.length === 0, `verrouille : ecran ${Math.round(k1.x - k0.x)} px ; API x=${kk.x} ; PATCH=${cur.st.patches.length}`);
// 6. bornes : (5,3) + gauche / haut
await sel(page, "Bord"); await page.keyboard.press("ArrowLeft"); await page.keyboard.press("ArrowUp"); await flush(page); const bd = await get(W.id);
chk("US1.bornes", bd.x === 0 && bd.y === 0, `(5,3) apres Gauche+Haut : (${bd.x},${bd.y}) (attendu 0,0)`);
// 7. defilement : les fleches ne deplacent ni la page ni le canevas
const vt = async () => page.evaluate(() => { const w = document.querySelector('[data-testid="board-viewport"] > div'); return { sy: window.scrollY, sx: window.scrollX, tr: w ? getComputedStyle(w).transform : null }; });
await sel(page, "Autre"); const v0 = await vt(); for (const k of ["ArrowDown", "ArrowDown", "ArrowRight", "ArrowUp"]) await page.keyboard.press(k); await page.waitForTimeout(200); const v1 = await vt();
chk("US1.pas-de-defilement", v0.sy === v1.sy && v0.sx === v1.sx, `defilement page ${JSON.stringify(v0)} -> ${JSON.stringify(v1)} (le canevas bouge avec l element deplace, pas par panoramique)`);
await flush(page);
// 8. champ de saisie : pas de deplacement
cur.st.patches.length = 0; const q0 = await get(Q.id);
await card(page, "Autre").dblclick({ position: { x: 20, y: 40 } }); await page.getByText("Modifier le contenu").first().waitFor({ timeout: 5000 });
await page.getByRole("textbox").first().click(); for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight"); await flush(page); const q1 = await get(Q.id);
chk("US1.champ-de-saisie", q1.x === q0.x && q1.y === q0.y && cur.st.patches.length === 0, `focus dans le champ : API (${q1.x},${q1.y}) = (${q0.x},${q0.y}) ; PATCH=${cur.st.patches.length}`);
await page.keyboard.press("Escape"); await page.waitForTimeout(400);
// 9. changer de selection pendant la rafale : la rafale est envoyee, pas perdue
await sel(page, "Pivot"); const pv0 = await get(P.id); await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowDown"); await sel(page, "Autre"); await flush(page); const pv1 = await get(P.id);
chk("US1.changement-selection", pv1.y === pv0.y + 20, `2 fleches puis clic sur un autre element : Pivot y ${pv0.y} -> ${pv1.y} (attendu +20)`);
// 10. zoom : 10 px du tableau
await page.getByRole("button", { name: "Zoom avant" }).click(); await page.waitForTimeout(300); await sel(page, "Pivot"); const z0 = await get(P.id); const zr0 = await rect(page, "Pivot");
await page.keyboard.press("ArrowRight"); await flush(page); const z1 = await get(P.id); const zr1 = await rect(page, "Pivot");
chk("US1.zoom", z1.x === z0.x + 10 && Math.round(zr1.x - zr0.x) !== 10, `zoom avant : API +${z1.x - z0.x} (attendu 10) ; ecran +${Math.round(zr1.x - zr0.x)} px`);
// 11. aide clavier
await page.keyboard.press("?"); await page.waitForTimeout(500);
const help = (await page.locator("body").innerText());
chk("US2.aide", /Déplacer la sélection/.test(help) && /50 px/.test(help), `aide clavier : « ${(help.match(/Déplacer[^\n]*/g) || []).join(" | ")} »`);
await page.keyboard.press("Escape"); await cur.ctx.close();
// 12. lecteur : aucun deplacement
cur = await open({ viewer: true }); page = cur.page; await sel(page, "Pivot"); cur.st.patches.length = 0; const l0 = await get(P.id); await page.keyboard.press("ArrowRight"); await page.keyboard.press("Shift+ArrowDown"); await flush(page); const l1 = await get(P.id);
chk("US1.lecteur", l1.x === l0.x && l1.y === l0.y && cur.st.patches.length === 0, `lecteur : API (${l1.x},${l1.y}) = (${l0.x},${l0.y}) ; PATCH=${cur.st.patches.length}`);
await cur.ctx.close();
// 13. echec : un seul message, retour a la position precedente
cur = await open({ stubPatch: (r) => r.fulfill({ status: 500, contentType: "application/json", body: "{}" }) }); page = cur.page; await sel(page, "Pivot"); const f0 = await rect(page, "Pivot"); await page.evaluate(() => { window.__toasts = []; });
await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); await page.waitForTimeout(150); const fm = await rect(page, "Pivot"); await page.waitForTimeout(1500);
const f1 = await rect(page, "Pivot"); const errs = (await page.evaluate(() => window.__toasts)).filter((t) => t.kind === "error");
chk("US1.echec", errs.length === 1 && Math.round(fm.x - f0.x) === 20 && Math.abs(f1.x - f0.x) < 1, `500 : messages d erreur=${errs.length} ; deplace (+${Math.round(fm.x - f0.x)}) puis revenu (${Math.round(f1.x - f0.x)} px d ecart)`, true);
await cur.ctx.close(); await browser.close();
writeFileSync(E + `results-N20-${RUN}.json`, JSON.stringify(results, null, 1));
console.log(`${results.filter((r) => r.ok).length}/${results.length}`);
