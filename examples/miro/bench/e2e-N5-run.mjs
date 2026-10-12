// E2E N5 « Grille magnetique » (Playwright, front :5173 depuis le slot + back reel :5080) : vraies glisses a la souris,
// positions relues cote serveur. AC1-AC10 de spec.md + cas limites (stockage bloque, simple clic).
// Usage : TW_CSS=tw-N5.css node e2e-N5-run.mjs <run>   -> results-N5-<run>.json
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { watch } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const E = new URL(".", import.meta.url).pathname; const RUN = process.argv[2] || "1";
const TW = readFileSync(E + (process.env.TW_CSS || "tw.css"), "utf8");
const API = "http://localhost:5080/api/v1/boards/1";
const api = async (method, path, body) => { const r = await fetch(API + path, { method, headers: { "X-User-Id": "1", ...(body ? { "Content-Type": "application/json" } : {}) }, body: body && JSON.stringify(body) }); const t = await r.text(); return t ? JSON.parse(t) : null; };
const pos = async (id) => { const i = (await api("GET", "/items")).find((x) => x.id === id); return [i.x, i.y]; };
const reset = async () => { for (const [id, x, y] of [[1, 80, 60], [2, 300, 60], [3, 120, 280], [4, 420, 300]]) await api("PATCH", `/items/${id}`, { x, y, isLocked: false }); };
const results = []; const browser = await chromium.launch(); let cur;
const check = (id, ok, detail) => { const t = cur.w.take(); const bad = t.fiveXX.length || t.console.length; const v = ok && !bad; results.push({ id, ok: v, detail }); console.log(`${v ? "PASS" : "FAIL"} ${id} ${detail}${bad ? " | 5xx/console: " + JSON.stringify([t.fiveXX, t.console]).slice(0, 300) : ""}`); };
async function open({ init, members } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript((css) => { document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.prepend(s); }); }, TW);
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage(); const patches = [];
  page.on("request", (r) => { if (r.method() === "PATCH") patches.push(r.postDataJSON()); });
  if (members) await page.route("**/boards/1/members", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(members) }));
  const w = watch(page, { api: "http://localhost:5080", expectedConsole: [/negotiation/i, /signalr/i, /WebSocket/i, /Failed to load resource/i] });
  await page.goto("http://localhost:5173/"); await page.getByText("Sprint planning").first().click();
  await page.locator('[data-testid="canvas-item-1"]').waitFor({ timeout: 10000 }); await page.waitForTimeout(600);
  return { ctx, page, w, patches };
}
const reopen = async (p) => { await p.reload(); await p.getByText("Sprint planning").first().click(); await p.locator('[data-testid="canvas-item-1"]').waitFor({ timeout: 10000 }); await p.waitForTimeout(500); };
const SNAP = (p) => p.getByRole("button", { name: /Grille magnétique/ });
const drag = async (p, id, dx, dy) => { const b = await p.locator(`[data-testid="canvas-item-${id}"]`).boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2; await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + dx / 2, y + dy / 2, { steps: 6 }); await p.mouse.move(x + dx, y + dy, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(700); };
await reset();
cur = await open(); let { page, patches } = cur;
// AC1 / AC2
const p0 = await SNAP(page).getAttribute("aria-pressed");
await SNAP(page).click(); const p1 = await SNAP(page).getAttribute("aria-pressed"); await SNAP(page).click(); const p2 = await SNAP(page).getAttribute("aria-pressed");
check("#1.1/1.2", p0 === "false" && p1 === "true" && p2 === "false", `initial=${p0} apres clic=${p1} apres 2e clic=${p2}`);
// AC5 grille desactivee : (29,30) enregistre tel quel
await drag(page, 1, -51, -30); const a5 = await pos(1);
check("#1.5", a5[0] === 29 && a5[1] === 30, `grille off : position enregistree ${JSON.stringify(a5)} (attendu [29,30])`);
await reset(); await reopen(page);
// AC3 + AC7 : grille on, (29,30) -> (20,40), historique, annuler
await SNAP(page).click(); patches.length = 0;
await drag(page, 1, -51, -30); const a3 = await pos(1);
const undo = page.getByRole("button", { name: "Annuler" }).first(); const undoEnabled = await undo.isEnabled();
check("#1.3", a3[0] === 20 && a3[1] === 40 && undoEnabled && patches.length === 1, `grille on : (29,30) -> ${JSON.stringify(a3)} (attendu [20,40]) ; Annuler actif=${undoEnabled} ; PATCH=${JSON.stringify(patches)}`);
await undo.click(); await page.waitForTimeout(600); const a7 = await pos(1);
check("#1.7", a7[0] === 80 && a7[1] === 60, `Annuler -> ${JSON.stringify(a7)} (attendu [80,60])`);
// AC4 : (10,-10) -> (20,0), jamais -0
await drag(page, 2, -290, -70); const a4 = await pos(2);
check("#1.4", a4[0] === 20 && a4[1] === 0 && !Object.is(a4[1], -0), `(10,-10) -> ${JSON.stringify(a4)} (attendu [20,0])`);
// AC6 : (85,55) -> aligne (80,60) = origine : aucun envoi, aucune entree d historique
await reset(); await reopen(page);
patches.length = 0; const undoBefore = await page.getByRole("button", { name: "Annuler" }).first().isEnabled();
await drag(page, 1, 5, -5); const a6 = await pos(1); const undoAfter = await page.getByRole("button", { name: "Annuler" }).first().isEnabled();
check("#1.6", a6[0] === 80 && a6[1] === 60 && patches.length === 0 && undoBefore === undoAfter, `(85,55) -> serveur ${JSON.stringify(a6)}, PATCH=${patches.length}, Annuler avant/apres=${undoBefore}/${undoAfter}`);
// AC8 persistance : recharger puis ouvrir un autre tableau
const pressedAfterReload = await SNAP(page).getAttribute("aria-pressed");
await page.getByRole("button", { name: /Retour/ }).first().click(); await page.getByText("Retrospective").first().click(); await page.waitForTimeout(800);
const pressedOther = await SNAP(page).getAttribute("aria-pressed").catch(() => "absent");
check("#1.8", pressedAfterReload === "true" && pressedOther === "true", `apres rechargement=${pressedAfterReload} ; sur un autre tableau=${pressedOther}`);
await cur.ctx.close();
// AC10 element verrouille
await reset(); await api("PATCH", "/items/3", { isLocked: true });
cur = await open({ init: () => localStorage.getItem("snapToGrid") }); page = cur.page; patches = cur.patches;
if ((await SNAP(page).getAttribute("aria-pressed")) !== "true") await SNAP(page).click(); patches.length = 0;
await drag(page, 3, 30, 30); const a10 = await pos(3);
check("#1.10", a10[0] === 120 && a10[1] === 280 && patches.length === 0, `verrouille : position ${JSON.stringify(a10)}, PATCH=${patches.length}`);
await cur.ctx.close(); await reset();
// AC9 lecteur : bouton absent
cur = await open({ members: [{ userId: 1, displayName: "Alice", role: "Viewer" }] }); page = cur.page;
check("#1.9", (await SNAP(page).count()) === 0, `lecteur : bouton present=${await SNAP(page).count()}`);
await cur.ctx.close();
// edge : stockage bloque -> aucune erreur, bouton utilisable
cur = await open({ init: () => { const no = () => { throw new DOMException("refuse", "SecurityError"); }; Storage.prototype.getItem = no; Storage.prototype.setItem = no; } }); page = cur.page;
await SNAP(page).click(); const pe = await SNAP(page).getAttribute("aria-pressed");
check("#L.stockage", pe === "true", `stockage refuse : bouton enfonce=${pe}, aucune erreur`);
await cur.ctx.close();
// edge : simple clic sans glisser -> aucun deplacement
cur = await open(); page = cur.page; patches = cur.patches; if ((await SNAP(page).getAttribute("aria-pressed")) !== "true") await SNAP(page).click(); patches.length = 0;
await page.locator('[data-testid="canvas-item-1"]').click(); await page.waitForTimeout(500);
check("#L.clic", patches.length === 0 && (await pos(1)).join() === "80,60", `simple clic : PATCH=${patches.length}`);
await cur.ctx.close();
writeFileSync(E + `results-N5-${RUN}.json`, JSON.stringify(results, null, 1)); await browser.close();
