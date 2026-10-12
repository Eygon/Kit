// E2E N8 « Bug : echec de chargement de la liste affiche l etat vide » (Playwright, front :5173 servi depuis I-n8 + back reel :5080).
// Usage : node e2e-N8-run.mjs <run>   -> results-N8-<run>.json
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { watch } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const E = new URL(".", import.meta.url).pathname; const RUN = process.argv[2] || "1";
const TW = readFileSync(E + (process.env.TW_CSS || "tw.css"), "utf8");
const results = []; const log = (id, ok, d) => { results.push({ id, ok: !!ok, detail: d }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${d}`); };
const browser = await chromium.launch();
const EMPTY = /Aucun tableau/i; const ERR = "Impossible de charger les tableaux.";
async function open(mode) { // mode: ok | 500 | abort | 204 | flaky (echec puis succes)
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript((css) => { document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.prepend(s); }); }, TW);
  await ctx.addInitScript(() => { window.__toasts = []; window.addEventListener("septeo-toast", (e) => window.__toasts.push(e.detail)); });
  const page = await ctx.newPage(); const st = { gets: 0, fail: mode === "500" || mode === "abort" || mode === "flaky" };
  await page.route(/\/api\/v1\/boards$/, async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    st.gets++;
    if (mode === "204") return route.fulfill({ status: 204, body: "" });
    if (st.fail && mode === "abort") return route.abort("connectionrefused");
    if (st.fail) return route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "boom" }) });
    return route.continue();
  });
  const w = watch(page, { api: "http://localhost:5080", expectedConsole: [/negotiation/i, /signalr/i, /WebSocket/i, /Failed to load resource/i, /ERR_CONNECTION/i] });
  await page.goto("http://localhost:5173/");
  return { ctx, page, w, st };
}
const toasts = (p) => p.evaluate(() => window.__toasts);
// AC1 erreur serveur -> bandeau + Reessayer, pas d etat vide ; un seul toast
let c = await open("500"); let { page } = c;
await page.getByRole("alert").waitFor({ timeout: 15000 });
let alertTxt = await page.getByRole("alert").innerText();
log("AC1", alertTxt.includes(ERR) && (await page.getByRole("button", { name: "Réessayer" }).count()) === 1 && (await page.getByText(EMPTY).count()) === 0, `erreur 500 -> bandeau « ${alertTxt.replace(/\n/g, " ")} » ; etat vide absent=${(await page.getByText(EMPTY).count()) === 0}`);
const t1 = await toasts(page);
log("AC5-toast", t1.length === 1, `toasts apres echec : ${JSON.stringify(t1).slice(0, 160)}`);
// AC3 : Reessayer apres retablissement -> liste
c.st.fail = false; await page.getByRole("button", { name: "Réessayer" }).click();
await page.getByRole("listitem").first().waitFor({ timeout: 10000 });
log("AC3", (await page.getByRole("alert").count()) === 0 && (await page.getByRole("listitem").count()) >= 1, `Reessayer -> liste (${await page.getByRole("listitem").count()} tableaux), bandeau disparu`);
await c.ctx.close();
// AC2 echec reseau
c = await open("abort"); page = c.page; await page.getByRole("alert").waitFor({ timeout: 15000 });
log("AC2", (await page.getByRole("alert").innerText()).includes(ERR) && (await page.getByText(EMPTY).count()) === 0, "connexion refusee -> bandeau, pas d etat vide");
// Reessayer qui echoue encore : le bandeau reste, pas d etat vide
await page.getByRole("button", { name: "Réessayer" }).click(); await page.waitForTimeout(2500);
log("AC-retry-echec", (await page.getByRole("alert").count()) === 1 && (await page.getByText(EMPTY).count()) === 0, `Reessayer qui echoue encore -> bandeau toujours la, tentatives=${c.st.gets}`);
await c.ctx.close();
// AC4 vraie liste vide (204) -> etat vide, pas de bandeau
c = await open("204"); page = c.page; await page.getByText(EMPTY).waitFor({ timeout: 10000 });
log("AC4", (await page.getByRole("alert").count()) === 0 && (await toasts(page)).length === 0, "204 -> etat vide, aucun bandeau, aucun toast");
await c.ctx.close();
// nominal : le back reel repond, liste normale, pas de bandeau
c = await open("ok"); page = c.page; await page.getByRole("listitem").first().waitFor({ timeout: 10000 });
const t = c.w.take();
log("nominal", (await page.getByRole("alert").count()) === 0 && (await toasts(page)).length === 0 && !t.console.length && !t.fiveXX.length, `back reel : ${await page.getByRole("listitem").count()} tableaux, aucun bandeau/toast/erreur console`);
await c.ctx.close(); await browser.close();
writeFileSync(E + `results-N8-${RUN}.json`, JSON.stringify(results, null, 1));
console.log(`${results.filter((r) => r.ok).length}/${results.length}`);
