// E2E F10 curseurs en direct. Back :5080 (miro/back dev) et front :5173 (runs/m10/slot) lances.
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { readFileSync, writeFileSync } from "node:fs";
const E = new URL(".", import.meta.url).pathname;
const TW = readFileSync(E + "tw.css", "utf8");
const API = "http://localhost:5080/api/v1";
const results = [];
const check = (id, ok, detail) => { results.push({ id, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${detail}`); };
const browser = await chromium.launch();
const s5 = [];
async function newPage(userId) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (userId !== "1") await ctx.route("**/src/config/apiConfig.ts*", async (route) => { const res = await route.fetch(); await route.fulfill({ response: res, body: (await res.text()).replace(/CURRENT_USER_ID = "1"/, `CURRENT_USER_ID = "${userId}"`) }); });
  await ctx.addInitScript((css) => { document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); }); }, TW);
  const page = await ctx.newPage();
  page._console = []; page._frames = 0; page._net = [];
  page.on("console", (m) => { if (m.type() === "error" && !/negotiation/.test(m.text())) page._console.push(m.text()); });
  page.on("response", (r) => { if (r.url().includes(":5080")) { page._net.push({ m: r.request().method(), u: r.url().replace(/.*:5080/, ""), s: r.status(), b: r.request().postData() }); if (r.status() >= 500) s5.push(r.url()); } });
  page.on("websocket", (ws) => ws.on("framesent", (f) => { if (String(f.payload).includes("MoveCursor")) page._frames++; }));
  page._ctx = ctx;
  await page.goto("http://localhost:5173/");
  await page.getByText("Sprint planning").first().click();
  await page.locator('[data-testid^="canvas-item-"]').first().waitFor({ timeout: 8000 });
  await page.waitForTimeout(1500);
  return page;
}
const center = async (p, sel) => { const b = await p.locator(sel).first().boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };

const A = await newPage("1");
const C = await newPage("3");
await C.getByRole("button", { name: "Zoom avant" }).click();
await C.waitForTimeout(500);
// Carol pointe le centre de l item 1 (avec SON zoom a 125 %).
const target = await center(C, '[data-testid="canvas-item-1"]');
await C.mouse.move(target.x - 40, target.y - 40);
await C.mouse.move(target.x, target.y, { steps: 5 });
const seen = await A.locator('[data-testid="remote-cursor-3"]').waitFor({ timeout: 5000 }).then(() => true).catch(() => false);
await A.waitForTimeout(400);
const aItem = await center(A, '[data-testid="canvas-item-1"]');
const aCur = seen ? await A.locator('[data-testid="remote-cursor-3"]').boundingBox() : null;
const dist = aCur ? Math.hypot(aCur.x - aItem.x, aCur.y - aItem.y) : Infinity;
const label = seen ? await A.locator('[data-testid="remote-cursor-3"]').innerText() : "";
check("C1", seen && dist < 10 && /Carol/.test(label), `Alice voit le curseur de Carol (zoom 100 % contre 125 %) : ecart ${dist.toFixed(1)} px du centre de l item, libelle "${label}"`);
check("C2", (await A.locator('[data-testid="remote-cursor-1"]').count()) === 0 && (await C.locator('[data-testid="remote-cursor-3"]').count()) === 0, "personne ne voit son propre curseur");
// Debit : 1 s de mouvement continu (~60 deplacements) chez Carol.
const f0 = C._frames;
for (let i = 0; i < 60; i++) { await C.mouse.move(target.x + i * 3, target.y + (i % 10)); await C.waitForTimeout(16); }
const sent = C._frames - f0;
check("C3", sent > 3 && sent <= 30, `MoveCursor envoyes en ~1,1 s de mouvement continu : ${sent} (throttle ~20/s)`);
// Zone VIDE du tableau (pas d item sous le point) : Carol y pose son curseur.
const empty = await C.evaluate(() => { for (let y = 820; y > 300; y -= 40) for (let x = 120; x < 1300; x += 40) { const el = document.elementFromPoint(x, y); if (el && el.closest('[data-testid="board-viewport"]') && !el.closest('[data-testid^="canvas-item-"]') && !el.closest("button")) return { x, y }; } return null; });
await C.mouse.move(empty.x, empty.y, { steps: 3 });
await A.waitForTimeout(600);
const cur = await A.locator('[data-testid="remote-cursor-3"]').boundingBox();
const under = await A.evaluate(({ x, y }) => { const el = document.elementFromPoint(x, y); return el?.closest('[data-testid^="remote-cursor-"]') ? "curseur" : el?.closest('[data-testid^="canvas-item-"]') ? "item" : "vide"; }, { x: cur.x + 4, y: cur.y + 4 });
await A.getByRole("button", { name: "Crayon" }).click();
const draw = async (x0, y0) => { const n0 = A._net.filter((x) => x.m === "POST" && x.u.endsWith("/items")).length; await A.mouse.move(x0, y0); await A.mouse.down(); for (let i = 1; i <= 10; i++) await A.mouse.move(x0 + i * 8, y0 + i * 5); await A.mouse.up(); await A.waitForTimeout(800); return A._net.filter((x) => x.m === "POST" && x.u.endsWith("/items")).slice(n0); };
const ctl = await draw(cur.x + 4, cur.y + 120);
const posts = await draw(cur.x + 4, cur.y + 4);
check("C4", ctl.length === 1 && posts.length === 1 && posts[0].s === 201 && /Freehand/.test(posts[0].b || ""), `trace au Crayon : temoin hors curseur ${JSON.stringify(ctl.map((p) => p.s))}, en partant sur le curseur (elementFromPoint=${under}) ${JSON.stringify(posts.map((p) => p.s))}`);
// Inactivite : apres 5 s sans bouger, le curseur s estompe.
await A.waitForTimeout(6000);
const op = await A.locator('[data-testid="remote-cursor-3"]').evaluate((e) => getComputedStyle(e).opacity).catch(() => "absent");
check("C5", Math.abs(Number(op) - 0.3) < 0.05, `opacite apres 6 s d inactivite : ${op}`);
// Depart : Carol ferme, son curseur disparait.
await C._ctx.close();
const gone = await A.locator('[data-testid="remote-cursor-3"]').waitFor({ state: "detached", timeout: 5000 }).then(() => true).catch(() => false);
check("C6", gone, "Carol quitte : son curseur disparait chez Alice");
check("G1", s5.length === 0 && A._console.length === 0, `5xx ${s5.length}, console Alice ${JSON.stringify(A._console.slice(0, 3))}`);
writeFileSync(E + "results.json", JSON.stringify(results, null, 2));
await browser.close();
