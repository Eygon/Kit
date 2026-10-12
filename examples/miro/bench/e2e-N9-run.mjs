// E2E N9 « Echap deselectionne » (Playwright, front :5173 depuis I-n9 + back reel :5080). AC1-AC10 de spec.md.
// Usage : TW_CSS=tw-N9.css node e2e-N9-run.mjs <run>   -> results-N9-<run>.json
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { watch } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const E = new URL(".", import.meta.url).pathname; const RUN = process.argv[2] || "1";
const TW = readFileSync(E + (process.env.TW_CSS || "tw.css"), "utf8");
const results = []; const browser = await chromium.launch(); let cur;
const check = (id, ok, detail) => { const t = cur.w.take(); const bad = t.fiveXX.length || t.console.length; const v = ok && !bad; results.push({ id, ok: v, detail }); console.log(`${v ? "PASS" : "FAIL"} ${id} ${detail}${bad ? " | 5xx/console: " + JSON.stringify([t.fiveXX, t.console]).slice(0, 250) : ""}`); };
async function open({ members, locale } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: locale || "fr-FR" });
  await ctx.addInitScript((css) => { document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.prepend(s); }); }, TW);
  const page = await ctx.newPage();
  if (members) await page.route("**/boards/1/members", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(members) }));
  const w = watch(page, { api: "http://localhost:5080", expectedConsole: [/negotiation/i, /signalr/i, /WebSocket/i, /Failed to load resource/i] });
  await page.goto("http://localhost:5173/"); await page.getByText("Sprint planning").first().click();
  await page.locator('[data-testid="canvas-item-1"]').waitFor({ timeout: 10000 }); await page.waitForTimeout(600);
  return { ctx, page, w };
}
const item = (p, id) => p.locator(`[data-testid="canvas-item-${id}"]`);
const sel = async (p, id) => (await item(p, id).getAttribute("aria-selected")) === "true";
const anySel = async (p) => (await p.locator('[aria-selected="true"]').count()) > 0;
const SHARE = (p) => p.getByRole("button", { name: /^Partager/ }).first();
const helpBtn = (p) => p.getByRole("button", { name: /raccourcis/i }).first();
const bodyFocus = (p) => p.evaluate(() => { document.activeElement && document.activeElement !== document.body && document.activeElement.blur(); });
const selectItem = async (p, id) => { await item(p, id).click({ position: { x: 8, y: 8 } }); await p.waitForTimeout(200); };

cur = await open(); let { page } = cur;
// AC1 : element selectionne, Echap -> plus rien de selectionne
await selectItem(page, 1); const s0 = await sel(page, 1);
await bodyFocus(page); await page.keyboard.press("Escape"); await page.waitForTimeout(200);
check("AC1", s0 && !(await anySel(page)), `selection avant=${s0}, apres Echap : aucun element selectionne=${!(await anySel(page))}`);
// AC10 : rien de selectionne, Echap -> rien, aucune erreur
await page.keyboard.press("Escape"); await page.waitForTimeout(200);
check("AC10", !(await anySel(page)), "Echap sans selection : rien ne change, aucune erreur console");
// AC2 : connecteur selectionne
const conn = page.locator("svg line, svg path").filter({ has: page.locator("xpath=.") });
const sw = async () => page.evaluate(() => [...document.querySelectorAll("svg line, svg path")].filter((e) => (e.getAttribute("stroke") || "").includes("primary-60")).length);
const connEl = page.locator('svg [stroke="var(--neutral-60)"]').first();
if (await connEl.count()) { await connEl.click({ force: true }); await page.waitForTimeout(200); }
const selBefore = await sw(); await bodyFocus(page); await page.keyboard.press("Escape"); await page.waitForTimeout(200);
check("AC2", selBefore >= 1 && (await sw()) === 0, `connecteur selectionne avant=${selBefore} apres Echap=${await sw()}`);
// AC5 : aide ouverte -> se ferme, l element reste selectionne
await selectItem(page, 2); await helpBtn(page).click(); await page.waitForTimeout(300);
const helpTitle = page.getByRole("dialog").filter({ hasText: /raccourcis/i }).first();
const helpOpen = await helpTitle.isVisible().catch(() => false);
await page.keyboard.press("Escape"); await page.waitForTimeout(300);
check("AC5", helpOpen && !(await helpTitle.isVisible().catch(() => false)) && (await sel(page, 2)), `aide ouverte=${helpOpen}, fermee apres Echap, element 2 toujours selectionne=${await sel(page, 2)}`);
// AC8 : ligne dans l aide (groupe Edition, apres Supprimer la sélection)
await helpBtn(page).click(); await page.waitForTimeout(300);
const txt = await page.getByRole("dialog").filter({ hasText: /raccourcis/i }).first().innerText();
const iDel = txt.indexOf("Supprimer la sélection"), iDes = txt.indexOf("Désélectionner tout");
check("AC8", iDel >= 0 && iDes > iDel && /Échap/.test(txt), `fr : « Supprimer la sélection »@${iDel} puis « Désélectionner tout »@${iDes}, touche Échap=${/Échap/.test(txt)}`);
await page.keyboard.press("Escape"); await page.waitForTimeout(200);
// AC6 : Partage ouvert (focus hors champ) -> se ferme, element reste selectionne
await selectItem(page, 2); await SHARE(page).click(); await page.waitForTimeout(400);
const shareDlg = page.getByRole("dialog").filter({ hasText: /Partager le tableau/ }).first();
const shareOpen = await shareDlg.isVisible().catch(() => false);
await bodyFocus(page); await page.keyboard.press("Escape"); await page.waitForTimeout(300);
check("AC6", shareOpen && !(await shareDlg.isVisible().catch(() => false)) && (await sel(page, 2)), `Partage ouvert=${shareOpen}, ferme apres Echap, element 2 selectionne=${await sel(page, 2)}`);
// AC4 : focus dans un champ (Partage) -> rien ne change
await SHARE(page).click(); await page.waitForTimeout(400);
const field = shareDlg.locator("input, select, textarea").first(); await field.focus();
await page.keyboard.press("Escape"); await page.waitForTimeout(300);
check("AC4", (await shareDlg.isVisible().catch(() => false)) && (await sel(page, 2)), `Echap dans un champ de Partage : fenetre toujours ouverte=${await shareDlg.isVisible().catch(() => false)}, element 2 toujours selectionne=${await sel(page, 2)}`);
// fermer proprement
await bodyFocus(page); await page.keyboard.press("Escape"); await page.waitForTimeout(300);
// AC7 : panneau d edition ouvert (double clic), focus hors champ -> se ferme, element reste selectionne
await item(page, 2).dblclick({ position: { x: 8, y: 8 } }); await page.waitForTimeout(500);
const edit = page.getByText("Modifier le contenu").first(); const editOpen = await edit.isVisible().catch(() => false);
await bodyFocus(page); await page.keyboard.press("Escape"); await page.waitForTimeout(400);
check("AC7", editOpen && !(await edit.isVisible().catch(() => false)) && (await sel(page, 2)), `panneau Edition ouvert=${editOpen}, ferme apres Echap=${!(await edit.isVisible().catch(() => false))}, element 2 selectionne=${await sel(page, 2)}`);
await cur.ctx.close();
// AC9 : Lecteur, element verrouille selectionne -> deselectionne (et l element verrouille a ete verrouille cote serveur par ailleurs)
cur = await open({ members: [{ userId: 1, displayName: "Alice", role: "Viewer" }] }); page = cur.page;
await selectItem(page, 1); const v0 = await sel(page, 1); await bodyFocus(page); await page.keyboard.press("Escape"); await page.waitForTimeout(200);
check("AC9", v0 && !(await anySel(page)), `lecteur : selection avant=${v0}, apres Echap aucune selection=${!(await anySel(page))}`);
await cur.ctx.close(); await browser.close();
writeFileSync(E + `results-N9-${RUN}.json`, JSON.stringify(results, null, 1));
console.log(`${results.filter((r) => r.ok).length}/${results.length}`);
