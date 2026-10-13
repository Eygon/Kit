// E2E N19 « Annuler la suppression d un element » : API reelle + navigateur (front :5173 depuis un instantane fige).
// Usage : TW_CSS=tw-N19.css node e2e-N19-run.mjs <run>   -> results-N19-<run>.json
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { watch, clippedOut, unreachable, unreadable } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const E = new URL(".", import.meta.url).pathname; const RUN = process.argv[2] || "1";
const TW = readFileSync(E + (process.env.TW_CSS || "tw.css"), "utf8");
const API = "http://localhost:5080/api/v1";
const api = async (u, m, p, b) => { const r = await fetch(API + p, { method: m, headers: { ...(u ? { "X-User-Id": String(u) } : {}), ...(b !== undefined ? { "Content-Type": "application/json" } : {}) }, body: b !== undefined ? JSON.stringify(b) : undefined }); const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch { j = t; } return { status: r.status, body: j }; };
const results = []; const log = (id, ok, d) => { results.push({ id, ok: !!ok, detail: d }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${d}`); };
const STAMP = String(Date.now()).slice(-6) + RUN; const NAME = `N19-${STAMP}`;
const board = (await api(1, "POST", "/boards", { name: NAME })).body; const BID = board.id;
const mk = async (extra) => (await api(1, "POST", `/boards/${BID}/items`, { type: "StickyNote", x: 100, y: 120, width: 150, height: 90, content: "A", color: "#bfdbfe", ...extra })).body;
const A1 = await mk({ x: 120, y: 140, content: "Alpha", color: "#bbf7d0", width: 170, height: 100 });
const A2 = await mk({ x: 380, y: 140, content: "Bravo" }); const A3 = await mk({ x: 640, y: 140, content: "Charlie", color: "#fecaca" });
const A4 = await mk({ x: 120, y: 360, content: "Delta" }); const A5 = await mk({ x: 380, y: 360, content: "Echo" });
const L1 = await mk({ x: 640, y: 360, content: "Verrouille" }); await api(1, "PATCH", `/boards/${BID}/items/${L1.id}`, { isLocked: true });
const list = async () => (await api(1, "GET", `/boards/${BID}/items`)).body;
const byContent = async (c) => (await list()).filter((i) => i.content === c);
const browser = await chromium.launch(); let cur;
async function open({ stubCreate } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" });
  await ctx.addInitScript((css) => { document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.prepend(s); }); }, TW);
  const page = await ctx.newPage(); const st = { posts: 0, stub: stubCreate };
  await page.route(new RegExp(`/boards/${BID}/items$`), async (r) => { if (r.request().method() === "POST") { st.posts++; if (st.stub) return st.stub(r); } return r.continue(); });
  const w = watch(page, { api: "http://localhost:5080", expectedConsole: [/negotiation/i, /signalr/i, /WebSocket/i, /Failed to load resource/i] });
  await page.goto("http://localhost:5173/"); await page.getByText(NAME, { exact: false }).first().click();
  await page.locator('[data-testid^="canvas-item-"]').first().waitFor({ timeout: 10000 }); await page.waitForTimeout(1200);
  return { ctx, page, w, st };
}
const chk = (id, ok, d, allow5xx) => { const t = cur.w.take(); const bad = (!allow5xx && t.fiveXX.length) || t.console.length; log(id, ok && !bad, d + (bad ? " | 5xx/console: " + JSON.stringify([t.fiveXX, t.console]).slice(0, 220) : "")); };
const cardOf = (p, text) => p.locator('[data-testid^="canvas-item-"]').filter({ hasText: text }).first();
const delItem = async (p, text) => { await cardOf(p, text).click({ position: { x: 8, y: 8 } }); await p.waitForTimeout(150); await p.evaluate(() => document.activeElement && document.activeElement !== document.body && document.activeElement.blur()); await p.keyboard.press("Delete"); await p.waitForTimeout(500); };
const TOAST = (p) => p.getByText(/Élément supprimé/);
const UNDO = (p) => p.getByRole("button", { name: /Annuler la suppression/ });
const onCanvas = async (p, text) => (await p.locator('[data-testid^="canvas-item-"]').filter({ hasText: text }).count());

cur = await open(); let { page } = cur;
// 1. suppression : toast + bouton
await delItem(page, "Alpha");
const gone = (await byContent("Alpha")).length === 0;
chk("US1.toast", gone && (await TOAST(page).count()) === 1 && (await UNDO(page).count()) === 1, `Alpha supprime=${gone} ; toast=${await TOAST(page).count()} ; bouton Annuler la suppression=${await UNDO(page).count()}`);
// 2. Annuler recree a l identique
const before = { x: 120, y: 140, w: 170, h: 100, color: "#bbf7d0", type: "StickyNote" };
await UNDO(page).first().click(); await page.waitForTimeout(1000);
const re = await byContent("Alpha"); const r0 = re[0];
chk("US1.annuler", re.length === 1 && r0.x === before.x && r0.y === before.y && r0.width === before.w && r0.height === before.h && r0.color === before.color && r0.type === before.type, `recree : ${JSON.stringify(r0 && { x: r0.x, y: r0.y, w: r0.width, h: r0.height, c: r0.color, t: r0.type, id: r0.id })} (ancien id ${A1.id}) ; sur le canevas=${await onCanvas(page, "Alpha")}`);
chk("US1.toast-ferme-succes", (await UNDO(page).count()) === 0 && (await page.getByText(/Élément restauré/).count()) >= 1, `bouton ferme=${(await UNDO(page).count()) === 0} ; message de reussite=${await page.getByText(/Élément restauré/).count()}`);
await page.waitForTimeout(5500);
// 3. expiration 6 s
await delItem(page, "Bravo"); const t0 = Date.now();
await page.waitForTimeout(4800); const still = (await UNDO(page).count()) === 1;
await page.waitForTimeout(2200); const expired = (await UNDO(page).count()) === 0;
chk("US1.expiration-6s", still && expired, `a ~5 s : toast present=${still} ; a ~7 s : disparu=${expired} (${Date.now() - t0} ms)`);
// 4. plusieurs suppressions : un toast chacune, chacune n annule que la sienne
await delItem(page, "Charlie"); await delItem(page, "Delta"); await delItem(page, "Echo");
const n3 = await UNDO(page).count();
const ov = await unreachable(page); const cl = await clippedOut(page, '[role="status"], [aria-live] *', {});
chk("US1.empilement", n3 === 3 && ov.length === 0, `3 suppressions : ${n3} boutons Annuler ; inatteignables=${JSON.stringify(ov)}`);
const pos = await UNDO(page).evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().bottom)));
await UNDO(page).nth(1).click(); await page.waitForTimeout(900);
const rest = [(await byContent("Charlie")).length, (await byContent("Delta")).length, (await byContent("Echo")).length];
chk("US1.chacun-le-sien", rest.filter((x) => x === 1).length === 1 && (await UNDO(page).count()) === 2, `apres clic sur le 2e toast : Charlie/Delta/Echo restaures = ${rest} ; toasts restants ${await UNDO(page).count()} (bas des boutons ${pos})`);
// 5. double clic = une seule recreation
const target = rest[1] === 1 ? "Echo" : rest[0] === 1 ? "Delta" : "Charlie";
const nth = 0; await UNDO(page).first().dblclick(); await page.waitForTimeout(1200);
const all = [(await byContent("Charlie")).length, (await byContent("Delta")).length, (await byContent("Echo")).length];
chk("US1.double-clic", all.every((x) => x <= 1), `apres double clic : Charlie/Delta/Echo = ${all} (jamais 2)`);
await page.waitForTimeout(6500);
// 6. Ctrl+Z restaure la derniere suppression et ferme son toast
for (const c of ["Charlie", "Delta", "Echo"]) if ((await byContent(c)).length === 0) await mk({ content: c });
await page.reload(); await page.locator('[data-testid^="canvas-item-"]').first().waitFor(); await page.waitForTimeout(1200);
await delItem(page, "Echo"); const toastBefore = await UNDO(page).count();
await page.evaluate(() => document.activeElement && document.activeElement.blur()); await page.keyboard.press("Control+z"); await page.waitForTimeout(1000);
chk("US2.ctrl-z", (await byContent("Echo")).length === 1 && toastBefore === 1 && (await UNDO(page).count()) === 0, `Ctrl+Z : Echo restaure=${(await byContent("Echo")).length} ; toast ferme=${(await UNDO(page).count()) === 0}`);
// 7. annuler par le toast puis Ctrl+Z : jamais deux recreations
await delItem(page, "Echo"); await UNDO(page).first().click(); await page.waitForTimeout(900);
await page.evaluate(() => document.activeElement && document.activeElement.blur()); await page.keyboard.press("Control+z"); await page.waitForTimeout(1000);
const nE = (await byContent("Echo")).length;
chk("US2.pas-de-double-recreation", nE <= 1, `Annuler (toast) puis Ctrl+Z : Echo = ${nE} (jamais 2)`);
// 8. focus dans un champ : Ctrl+Z ne restaure pas
for (const c of ["Echo"]) if ((await byContent(c)).length === 0) await mk({ content: c });
await page.reload(); await page.locator('[data-testid^="canvas-item-"]').first().waitFor(); await page.waitForTimeout(1200);
await delItem(page, "Echo");
await cardOf(page, "Bravo").dblclick({ position: { x: 20, y: 40 } }); await page.getByText("Modifier le contenu").first().waitFor({ timeout: 5000 });
await page.getByRole("textbox").first().click(); await page.keyboard.press("Control+z"); await page.waitForTimeout(900);
chk("US2.champ-de-saisie", (await byContent("Echo")).length === 0, `focus dans le champ : Ctrl+Z ne restaure pas Echo (restaures=${(await byContent("Echo")).length})`);
await page.keyboard.press("Escape"); await page.waitForTimeout(500);
await page.waitForTimeout(6500);
// 9. element verrouille : pas de suppression, pas de toast
await cardOf(page, "Verrouille").click({ position: { x: 8, y: 8 } }); await page.keyboard.press("Delete"); await page.waitForTimeout(500);
chk("H1.verrouille", (await byContent("Verrouille")).length === 1 && (await UNDO(page).count()) === 0, `verrouille supprime=${(await byContent("Verrouille")).length === 0} ; toast=${await UNDO(page).count()}`);
await cur.ctx.close();
// 10. echec de recreation : 500 -> un seul message, l element reste supprime ; 403 -> un seul message
for (const [code, label] of [[500, "500"], [403, "403"], [404, "404"]]) {
  if ((await byContent("Delta")).length === 0) await mk({ content: "Delta" });
  cur = await open({ stubCreate: (r) => r.fulfill({ status: code, contentType: "application/json", body: JSON.stringify({ title: "x" }) }) }); page = cur.page;
  await delItem(page, "Delta"); cur.w.take();
  await UNDO(page).first().click(); await page.waitForTimeout(1300);
  const errs = await page.locator('[role="alert"], [role="status"], [class*="toast" i]').filter({ hasText: /./ }).allInnerTexts();
  const errTexts = errs.map((t) => t.replace(/\s+/g, " ").trim()).filter((t) => t && !/Élément supprimé/.test(t));
  chk(`US1.echec-${label}`, (await byContent("Delta")).length === 0 && errTexts.length >= 1 && new Set(errTexts).size === 1, `recreation en ${label} : Delta toujours supprime=${(await byContent("Delta")).length === 0} ; messages=${JSON.stringify(errTexts)} ; POST=${cur.st.posts}`, true);
  await cur.ctx.close();
}
// 11. crayon actif : cliquer sur Annuler ne trace pas
if ((await byContent("Delta")).length === 0) await mk({ content: "Delta" });
cur = await open(); page = cur.page; await delItem(page, "Delta");
await page.getByRole("button", { name: /^Crayon/ }).first().click().catch(() => {}); const n0 = (await list()).length;
await UNDO(page).first().click(); await page.waitForTimeout(1200);
const n1 = (await list()).length;
chk("H4.crayon", n1 === n0 + 1, `crayon actif : elements ${n0} -> ${n1} (+1 = la restauration seule, aucun trait)`);
// 12. geometrie et lisibilite avec 8 toasts
await page.getByRole("button", { name: /^Sélectionner/ }).first().click().catch(() => {});
for (let i = 0; i < 8; i++) await mk({ x: 60 + (i % 4) * 190, y: 560 + Math.floor(i / 4) * 110, content: `Z${i}`, width: 120, height: 70 });
await page.reload(); await page.locator('[data-testid^="canvas-item-"]').first().waitFor(); await page.waitForTimeout(1500);
for (let i = 0; i < 8; i++) await delItem(page, `Z${i}`);
const unr = await unreachable(page); const unrd = await unreadable(page); const clp = await clippedOut(page, "[role=status] *, [aria-live] *");
const box = await UNDO(page).last().boundingBox();
chk("GEO.8-toasts", unr.length === 0 && clp.length === 0 && box && box.y > 0, `8 toasts : inatteignables=${unr.length} coupes=${JSON.stringify(clp).slice(0, 120)} ; dernier bouton y=${box && Math.round(box.y)} ; illisibles=${unrd.length}`);
chk("GEO.contraste", unrd.length === 0, `contraste : ${JSON.stringify(unrd).slice(0, 200)}`);
await cur.ctx.close(); await browser.close();
writeFileSync(E + `results-N19-${RUN}.json`, JSON.stringify(results, null, 1));
console.log(`${results.filter((r) => r.ok).length}/${results.length}`);
