// E2E N12 « Trier la liste + memoriser le tri » (Playwright, front :5173 depuis I-n12 + back reel :5080).
// US1 AC1-AC7 et US2 AC1-AC4 de spec.md, sur des donnees de liste simulees (ordres connus) + liste reelle pour l ouverture d une carte.
// Usage : TW_CSS=tw-N12.css node e2e-N12-run.mjs <run>   -> results-N12-<run>.json
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { watch } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const E = new URL(".", import.meta.url).pathname; const RUN = process.argv[2] || "1";
const TW = readFileSync(E + (process.env.TW_CSS || "tw.css"), "utf8");
const results = []; const browser = await chromium.launch(); let cur;
const check = (id, ok, detail) => { const t = cur.w.take(); const bad = t.fiveXX.length || t.console.length; const v = ok && !bad; results.push({ id, ok: v, detail }); console.log(`${v ? "PASS" : "FAIL"} ${id} ${detail}${bad ? " | 5xx/console: " + JSON.stringify([t.fiveXX, t.console]).slice(0, 250) : ""}`); };
const mkB = (id, name, createdAt, itemCount) => ({ id, name, ownerId: 1, createdAt, memberCount: 1, itemCount });
const FIX = [mkB(1, "Zeta", "2026-03-05T10:00:00Z", 5), mkB(2, "alpha", "2026-01-10T10:00:00Z", 2), mkB(3, "Écran", "2026-02-01T10:00:00Z", 9)];
async function open({ list = FIX, status = 200, init } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" });
  await ctx.addInitScript((css) => { document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.prepend(s); }); }, TW);
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  if (list !== "real") await page.route(/\/api\/v1\/boards$/, (r) => r.request().method() !== "GET" ? r.continue() : status === 204 ? r.fulfill({ status: 204, body: "" }) : status !== 200 ? r.fulfill({ status, contentType: "application/json", body: "{}" }) : r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(list) }));
  const w = watch(page, { api: "http://localhost:5080", expectedConsole: [/negotiation/i, /signalr/i, /WebSocket/i, /Failed to load resource/i] });
  await page.goto("http://localhost:5173/"); await page.waitForTimeout(700);
  return { ctx, page, w };
}
const SEL = (p) => p.getByRole("combobox", { name: /Trier par/ });
const order = async (p) => { for (let i = 0; i < 4; i++) { try { return (await p.getByRole("listitem").allInnerTexts()).map((t) => t.split("\n")[0].trim()).filter(Boolean); } catch (e) { await p.waitForTimeout(400); } } return []; };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// US1
cur = await open(); let { page } = cur; await SEL(page).waitFor({ timeout: 10000 });
check("US1.AC1", (await SEL(page).inputValue()).length > 0 && /Nom/.test(await SEL(page).locator("option:checked").innerText()) && eq(await order(page), ["alpha", "Écran", "Zeta"]), `defaut : ${await SEL(page).locator("option:checked").innerText()} ; ordre ${JSON.stringify(await order(page))}`);
await SEL(page).selectOption({ label: "Plus récents" }); await page.waitForTimeout(250);
check("US1.AC2", eq(await order(page), ["Zeta", "Écran", "alpha"]), `Plus recents : ${JSON.stringify(await order(page))}`);
await SEL(page).selectOption({ label: "Nombre d’éléments" }).catch(async () => SEL(page).selectOption({ index: 2 })); await page.waitForTimeout(250);
check("US1.AC3", eq(await order(page), ["Écran", "Zeta", "alpha"]), `Nombre d elements : ${JSON.stringify(await order(page))} (option « ${await SEL(page).locator("option:checked").innerText()} »)`);
await cur.ctx.close();
cur = await open({ list: [mkB(1, "Beta", "2026-01-01T00:00:00Z", 3), mkB(2, "Alpha", "2026-01-02T00:00:00Z", 3)] }); page = cur.page; await SEL(page).waitFor();
await SEL(page).selectOption({ index: 2 }); await page.waitForTimeout(250);
check("US1.AC4", eq(await order(page), ["Alpha", "Beta"]), `egalite nombre : ${JSON.stringify(await order(page))}`);
await cur.ctx.close();
cur = await open({ list: [mkB(1, "SansDate", "", 1), mkB(2, "Daté", "2026-01-10T10:00:00Z", 1)] }); page = cur.page; await SEL(page).waitFor();
await SEL(page).selectOption({ label: "Plus récents" }); await page.waitForTimeout(250);
check("US1.AC5", eq(await order(page), ["Daté", "SansDate"]), `date vide en dernier : ${JSON.stringify(await order(page))}`);
await cur.ctx.close();
for (const [id, o, what] of [["US1.AC6-erreur", { status: 500 }, "erreur"], ["US1.AC6-vide", { status: 204 }, "vide"]]) {
  cur = await open(o); page = cur.page; await page.waitForTimeout(3500);
  cur.w.take(); // le 500 est simule par le scenario : pas un defaut du produit
  check(id, (await SEL(page).count()) === 0, `liste ${what} : sélecteur absent=${(await SEL(page).count()) === 0}`);
  await cur.ctx.close();
}
// AC7 : clic sur une carte d une liste triee ouvre bien CE tableau (donnees reelles)
cur = await open({ list: "real" }); page = cur.page; await SEL(page).waitFor({ timeout: 10000 });
await SEL(page).selectOption({ index: 2 }); await page.waitForTimeout(300);
const real = await page.getByRole("listitem").first().innerText(); const topName = real.split("\n")[0].trim();
await page.getByRole("listitem").first().getByRole("button").first().click(); await page.waitForTimeout(1200);
check("US1.AC7", (await page.getByText(topName, { exact: false }).count()) > 0 && (await SEL(page).count()) === 0, `1re carte (tri par elements) = « ${topName} » ; apres clic le tableau s ouvre (liste remplacee)=${(await SEL(page).count()) === 0}`);
await cur.ctx.close();
// US2
cur = await open(); page = cur.page; await SEL(page).waitFor();
await SEL(page).selectOption({ label: "Plus récents" }); await page.waitForTimeout(200);
await page.reload(); await SEL(page).waitFor({ timeout: 10000 });
check("US2.AC1", eq(await order(page), ["Zeta", "Écran", "alpha"]) && /récents/i.test(await SEL(page).locator("option:checked").innerText()), `apres rechargement : ${await SEL(page).locator("option:checked").innerText()} ; ${JSON.stringify(await order(page))}`);
// nouvel onglet du meme navigateur : meme contexte
const p2 = await cur.ctx.newPage(); await p2.route(/\/api\/v1\/boards$/, (r) => r.request().method() !== "GET" ? r.continue() : r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(FIX) })); await p2.goto("http://localhost:5173/"); await SEL(p2).waitFor({ timeout: 10000 });
check("US2.AC1b", /récents/i.test(await SEL(p2).locator("option:checked").innerText()), `nouvel onglet : ${await SEL(p2).locator("option:checked").innerText()}`);
await cur.ctx.close();
cur = await open(); page = cur.page; await SEL(page).waitFor();
check("US2.AC2", /Nom/.test(await SEL(page).locator("option:checked").innerText()), `aucun choix retenu -> ${await SEL(page).locator("option:checked").innerText()}`);
await cur.ctx.close();
// AC3 valeur corrompue : on cherche la cle dans le stockage apres un choix, puis on la corrompt
cur = await open(); page = cur.page; await SEL(page).waitFor();
await SEL(page).selectOption({ label: "Plus récents" }); await page.waitForTimeout(200);
const keys = await page.evaluate(() => Object.keys(localStorage)); const k = keys.find((x) => /sort/i.test(x));
await page.evaluate((key) => localStorage.setItem(key, "{pas-valide"), k); await page.reload(); await SEL(page).waitFor({ timeout: 10000 });
check("US2.AC3", !!k && /Nom/.test(await SEL(page).locator("option:checked").innerText()) && (await page.getByRole("alert").count()) === 0, `cle ${k} corrompue -> ${await SEL(page).locator("option:checked").innerText()} ; aucune alerte=${(await page.getByRole("alert").count()) === 0}`);
await cur.ctx.close();
// AC4 stockage bloque
cur = await open({ init: () => { Object.defineProperty(window, "localStorage", { get() { throw new DOMException("blocked", "SecurityError"); } }); } }); page = cur.page; await SEL(page).waitFor({ timeout: 10000 });
await SEL(page).selectOption({ label: "Plus récents" }); await page.waitForTimeout(250);
const during = eq(await order(page), ["Zeta", "Écran", "alpha"]);
await page.reload(); await SEL(page).waitFor({ timeout: 10000 });
check("US2.AC4", during && /Nom/.test(await SEL(page).locator("option:checked").innerText()) && (await page.getByRole("alert").count()) === 0, `stockage bloque : tri pendant la visite=${during} ; apres rechargement ${await SEL(page).locator("option:checked").innerText()} ; aucune alerte=${(await page.getByRole("alert").count()) === 0}`);
await cur.ctx.close(); await browser.close();
writeFileSync(E + `results-N12-${RUN}.json`, JSON.stringify(results, null, 1));
console.log(`${results.filter((r) => r.ok).length}/${results.length}`);
