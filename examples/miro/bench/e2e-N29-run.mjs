// E2E N29 « Fluidite du canevas » : API reelle + navigateur. Mesure objective (CDP) du cout d un glisser a 200 elements,
// comparee a la base (dev) servie sur :5174 ; zoom sous le curseur ; creation optimiste.
// Usage : TW_CSS=tw-N29.css node e2e-N29-run.mjs <run>   -> results-N29-<run>.json
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { watch } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const E = new URL(".", import.meta.url).pathname; const RUN = process.argv[2] || "1";
const TW = readFileSync(E + (process.env.TW_CSS || "tw.css"), "utf8");
const API = "http://localhost:5080/api/v1";
const api = async (u, m, p, b) => { const r = await fetch(API + p, { method: m, headers: { ...(u ? { "X-User-Id": String(u) } : {}), ...(b !== undefined ? { "Content-Type": "application/json" } : {}) }, body: b !== undefined ? JSON.stringify(b) : undefined }); const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch { j = t; } return { status: r.status, body: j }; };
const results = []; const log = (id, ok, d) => { results.push({ id, ok: !!ok, detail: d }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${d}`); };
const STAMP = String(Date.now()).slice(-6) + RUN; const NAME = `N29-${STAMP}`;
const board = (await api(1, "POST", "/boards", { name: NAME })).body; const BID = board.id;
for (let i = 0; i < 200; i++) await api(1, "POST", `/boards/${BID}/items`, { type: "StickyNote", x: 60 + (i % 20) * 170, y: 60 + Math.floor(i / 20) * 110, width: 150, height: 90, content: `E${i}`, color: "#fde68a" });
const list = async () => (await api(1, "GET", `/boards/${BID}/items`)).body;
const browser = await chromium.launch(); let cur;
async function open(port, { delayPost, failPost, board: boardNo } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" });
  await ctx.addInitScript((css) => { window.__toasts = []; window.addEventListener("septeo-toast", (e) => window.__toasts.push(e.detail)); document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.prepend(s); }); }, TW);
  const page = await ctx.newPage(); const st = { posts: 0, delay: delayPost, fail: failPost };
  await page.route(new RegExp(`/boards/${boardNo === 3 ? BID3 : BID}/items$`), async (r) => { if (r.request().method() === "POST") { st.posts++; if (st.delay) await new Promise((x) => setTimeout(x, st.delay)); if (st.fail) return r.fulfill({ status: 500, contentType: "application/json", body: "{}" }); } return r.continue(); });
  const w = watch(page, { api: "http://localhost:5080", expectedConsole: [/negotiation/i, /signalr/i, /WebSocket/i, /Failed to load resource/i] });
  await page.goto(`http://localhost:${port}/`); await page.getByText(boardNo === 3 ? `${NAME}-vide` : NAME, { exact: true }).first().click();
  await page.locator('[data-testid^="canvas-item-"]').first().waitFor({ timeout: 15000 }); await page.waitForTimeout(2000);
  return { ctx, page, w, st };
}
const chk = (id, ok, d, allow5xx) => { const t = cur.w.take(); const bad = (!allow5xx && t.fiveXX.length) || t.console.length; log(id, ok && !bad, d + (bad ? " | 5xx/console: " + JSON.stringify([t.fiveXX, t.console]).slice(0, 220) : "")); };
const metrics = async (page, cdp) => Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
async function dragCost(port) {
  const c = await open(port); const cdp = await c.ctx.newCDPSession(c.page); await cdp.send("Performance.enable");
  const before = (await list()).find((i) => i.content === "E45"); const card = c.page.locator('[data-testid^="canvas-item-"]').filter({ hasText: "E45" }).first(); const b = await card.boundingBox();
  await c.page.evaluate(() => { window.__frames = []; let last = performance.now(); const tick = (t) => { window.__frames.push(t - last); last = t; window.__raf = requestAnimationFrame(tick); }; window.__raf = requestAnimationFrame(tick); });
  const m0 = await metrics(c.page, cdp);
  await c.page.mouse.move(b.x + 20, b.y + 20); await c.page.mouse.down();
  for (let i = 1; i <= 80; i++) { await c.page.mouse.move(b.x + 20 + i * 4, b.y + 20 + i * 2); }
  await c.page.mouse.up(); await c.page.waitForTimeout(300);
  const m1 = await metrics(c.page, cdp); const frames = await c.page.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__frames; });
  await c.page.waitForTimeout(600); const after = (await list()).find((i) => i.content === "E45"); await api(1, "PATCH", `/boards/${BID}/items/${before.id}`, { x: before.x, y: before.y });
  await c.ctx.close(); const slow = frames.filter((f) => f > 50).length;
  return { moved: after.x !== before.x || after.y !== before.y, dx: after.x - before.x, script: m1.ScriptDuration - m0.ScriptDuration, task: m1.TaskDuration - m0.TaskDuration, slow, max: Math.max(...frames) };
}
// ---- US1 : cout d un glisser a 200 elements (base = dev sur :5174, nouveau sur :5173)
const base = await dragCost(5174); const next = await dragCost(5173);
cur = { w: { take: () => ({ fiveXX: [], console: [] }) } };
chk("US1.cout-du-glisser", base.moved && next.moved && next.script < base.script * 0.6, `200 elements, 80 deplacements (element deplace : base ${base.moved} dx=${base.dx}, nouveau ${next.moved} dx=${next.dx}) : script ${base.script.toFixed(2)} s -> ${next.script.toFixed(2)} s (x${(next.script / base.script).toFixed(2)}) ; taches ${base.task.toFixed(2)} -> ${next.task.toFixed(2)} s ; images > 50 ms : ${base.slow} -> ${next.slow} ; pire image ${Math.round(base.max)} -> ${Math.round(next.max)} ms`);
// ---- US2 : zoom sous le curseur
cur = await open(5173); let { page } = cur;
const world = () => page.evaluate(() => { const t = getComputedStyle(document.querySelector('[data-testid="board-world"]')).transform; const m = t.match(/matrix\(([^)]+)\)/); if (!m) return null; const [a, , , , e, f] = m[1].split(",").map(Number); return { s: a, x: e, y: f }; });
const vp = await page.locator('[data-testid="board-viewport"]').boundingBox(); const cx = 700, cy = 450;
const w0 = await world(); const pt = (w, px, py) => ({ x: (px - vp.x - w.x) / w.s, y: (py - vp.y - w.y) / w.s });
await page.mouse.move(cx, cy); for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(60); } await page.waitForTimeout(300);
const w1 = await world(); const p0 = pt(w0, cx, cy), p1 = pt(w1, cx, cy);
chk("US2.zoom-sous-le-curseur", w1.s > w0.s && Math.hypot(p1.x - p0.x, p1.y - p0.y) < 1.5, `molette x4 : echelle ${w0.s.toFixed(2)} -> ${w1.s.toFixed(2)} ; point du tableau sous le curseur (${p0.x.toFixed(1)}, ${p0.y.toFixed(1)}) -> (${p1.x.toFixed(1)}, ${p1.y.toFixed(1)})`);
// pincement trackpad = ctrl + molette : zoome le canevas, pas la page
const vv0 = await page.evaluate(() => window.visualViewport.scale); await page.keyboard.down("Control"); await page.mouse.move(cx, cy); await page.mouse.wheel(0, 240); await page.keyboard.up("Control"); await page.waitForTimeout(300);
const w2 = await world(); const vv1 = await page.evaluate(() => window.visualViewport.scale); const p2 = pt(w2, cx, cy);
chk("US2.pincement", w2.s < w1.s && vv0 === vv1 && Math.hypot(p2.x - p1.x, p2.y - p1.y) < 1.5, `ctrl+molette : echelle ${w1.s.toFixed(2)} -> ${w2.s.toFixed(2)} ; zoom de la page ${vv0} -> ${vv1} ; point sous le curseur stable=${Math.hypot(p2.x - p1.x, p2.y - p1.y) < 1.5}`);
// + / - centres sur la vue ; bornes
await page.getByRole("button", { name: "Réinitialiser le zoom" }).click().catch(() => {}); await page.waitForTimeout(300); const w3 = await world();
await page.getByRole("button", { name: "Zoom avant" }).click(); await page.waitForTimeout(300); const w4 = await world();
const ctr = { x: vp.x + vp.width / 2, y: vp.y + vp.height / 2 }; const c3 = pt(w3, ctr.x, ctr.y), c4 = pt(w4, ctr.x, ctr.y);
chk("US2.boutons-centres", w4.s > w3.s && Math.hypot(c4.x - c3.x, c4.y - c3.y) < 1.5, `Zoom avant : echelle ${w3.s.toFixed(2)} -> ${w4.s.toFixed(2)} ; centre de la vue stable=${Math.hypot(c4.x - c3.x, c4.y - c3.y) < 1.5}`);
for (let i = 0; i < 40; i++) { await page.mouse.move(cx, cy); await page.mouse.wheel(0, -300); } await page.waitForTimeout(300); const wmax = await world();
for (let i = 0; i < 80; i++) { await page.mouse.wheel(0, 300); } await page.waitForTimeout(300); const wmin = await world();
chk("US2.bornes", wmax.s <= 3.0001 && wmin.s >= 0.2499, `bornes d echelle : max ${wmax.s.toFixed(3)} (<= 3), min ${wmin.s.toFixed(3)} (>= 0.25)`);
await cur.ctx.close();
// ---- US3 : creation optimiste (tableau vide pour que le clic tombe sur le fond)
let BID3;
const B3 = (await api(1, "POST", "/boards", { name: `${NAME}-vide` })).body; await api(1, "POST", `/boards/${B3.id}/items`, { type: "StickyNote", x: 40, y: 40, width: 100, height: 60, content: "Seul", color: "#fde68a" });
BID3 = B3.id; await api(1, "POST", `/boards/${BID3}/members`, { userId: 2, role: "Editor" }); const list3 = async () => (await api(1, "GET", `/boards/${BID3}/items`)).body;
cur = await open(5173, { board: 3, delayPost: 1800 }); page = cur.page; await page.getByRole("button", { name: /^Post-it/ }).click(); const n0 = (await page.locator('[data-testid^="canvas-item-"]').count());
await page.mouse.click(900, 700); const tClick = Date.now(); await page.waitForFunction((n) => document.querySelectorAll('[data-testid^="canvas-item-"]').length > n, n0, { timeout: 600 }).catch(() => {}); const tShown = Date.now() - tClick; const n1 = await page.locator('[data-testid^="canvas-item-"]').count();
const pend = page.locator('[data-testid^="canvas-item--"]'); const pendN = await pend.count();
let pendSel = null; if (pendN) { await pend.first().click({ position: { x: 8, y: 8 } }).catch(() => {}); pendSel = await pend.first().getAttribute("aria-selected"); }
const nBeforeResp = await page.locator('[data-testid^="canvas-item-"]').count();
chk("US3.apparait-tout-de-suite", n1 === n0 + 1 && tShown < 500 && pendN === 1 && pendSel !== "true" && nBeforeResp === n1, `element visible apres ${tShown} ms (reponse du serveur a 1800 ms) ; en attente=${pendN} ; selectionnable pendant l attente=${pendSel === "true"} ; nombre d elements ${n0} -> ${n1}`);
await page.waitForTimeout(2600); const n2 = await page.locator('[data-testid^="canvas-item-"]').count(); const pend2 = await page.locator('[data-testid^="canvas-item--"]').count(); const apiN = (await list3()).length;
chk("US3.remplace-sans-doublon", n2 === n0 + 1 && pend2 === 0 && apiN === 2, `apres la reponse : ${n2} elements affiches (attendu ${n0 + 1}), en attente=${pend2}, API=${apiN} (attendu 2)`);
await cur.ctx.close();
// rafraichissement du hub pendant l attente : l element reel arrive avant la reponse
cur = await open(5173, { board: 3, delayPost: 2200 }); page = cur.page; const m0 = await page.locator('[data-testid^="canvas-item-"]').count(); await page.getByRole("button", { name: /^Post-it/ }).click(); await page.mouse.click(1150, 250); await page.waitForTimeout(300);
await api(2, "POST", `/boards/${BID3}/items`, { type: "StickyNote", x: 700, y: 60, width: 100, height: 60, content: "Autre utilisateur", color: "#bfdbfe" }); await page.waitForTimeout(2800);
const m1 = await page.locator('[data-testid^="canvas-item-"]').count(); const apiM = (await list3()).length; const dupes = await page.locator('[data-testid^="canvas-item-"]').filter({ hasText: "Autre utilisateur" }).count();
chk("US3.refresh-pendant-attente", m1 === apiM && dupes === 1 && (await page.locator('[data-testid^="canvas-item--"]').count()) === 0, `un autre utilisateur cree un element pendant l attente : affiches ${m1}, API ${apiM}, copies de l element de l autre=${dupes}, en attente restants=${await page.locator('[data-testid^="canvas-item--"]').count()}`);
await cur.ctx.close();
// echec : l element disparait, un seul message
cur = await open(5173, { board: 3, delayPost: 600, failPost: true }); page = cur.page; const f0 = await page.locator('[data-testid^="canvas-item-"]').count(); await page.getByRole("button", { name: /^Post-it/ }).click(); await page.mouse.click(1250, 550); await page.waitForTimeout(250); const fMid = await page.locator('[data-testid^="canvas-item-"]').count(); await page.waitForTimeout(1500);
const f1 = await page.locator('[data-testid^="canvas-item-"]').count(); const errs = (await page.evaluate(() => window.__toasts)).filter((t) => t.kind === "error");
chk("US3.echec", fMid === f0 + 1 && f1 === f0 && errs.length === 1, `echec 500 : ${f0} -> ${fMid} (optimiste) -> ${f1} (retire) ; messages d erreur=${errs.length}`, true);
await cur.ctx.close(); await browser.close();
writeFileSync(E + `results-N29-${RUN}.json`, JSON.stringify(results, null, 1));
console.log(`${results.filter((r) => r.ok).length}/${results.length}`);
