// E2E N2 « Filtrer la liste des tableaux » (Playwright). Back :5080, front :5173 servi depuis le slot.
// Cahier tire des Acceptance Scenarios de spec.md (US1 AC1 a AC6) + edge cases.
// Usage : node e2e-N2-run.mjs <run>   -> results-N2-<run>.json
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { watch, unreadable } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const E = new URL(".", import.meta.url).pathname;
const RUN = process.argv[2] || "1";
const TW = readFileSync(E + (process.env.TW_CSS || "tw.css"), "utf8");
const results = [];
const browser = await chromium.launch();
const SEARCH = (p) => p.getByRole("textbox", { name: "Rechercher un tableau" });
const cards = (p) => p.getByRole("listitem");
const titles = async (p) => (await cards(p).allInnerTexts()).map((t) => t.split("\n")[0].trim());
async function open({ stub } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript((css) => { document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.prepend(s); }); }, TW);
  const page = await ctx.newPage();
  if (stub) await page.route("**/api/v1/boards", stub);
  const w = watch(page, { api: "http://localhost:5080", expectedConsole: [/negotiation/i, /signalr/i, /WebSocket/i, /Failed to load resource/i] });
  await page.goto("http://localhost:5173/");
  return { ctx, page, w };
}
let cur;
const check = (id, ok, detail, { allow5xx = false } = {}) => {
  const t = cur.w.take(); const bad = (!allow5xx && t.fiveXX.length) || t.console.length; const v = ok && !bad;
  results.push({ id, ok: v, detail });
  console.log(`${v ? "PASS" : "FAIL"} ${id} ${detail}${bad ? " | 5xx/console: " + JSON.stringify([t.fiveXX, t.console]).slice(0, 300) : ""}`);
};

cur = await open();
let { page } = cur;
await page.getByText("Sprint planning").first().waitFor({ timeout: 10000 });
const all = await titles(page);
await SEARCH(page).fill("retro");
check("#1.1", JSON.stringify(await titles(page)) === JSON.stringify(["Retrospective"]) , `retro -> ${JSON.stringify(await titles(page))} (liste complete ${JSON.stringify(all)})`);
await SEARCH(page).fill("SPRINT");
check("#1.2", JSON.stringify(await titles(page)) === JSON.stringify(["Sprint planning"]), `SPRINT -> ${JSON.stringify(await titles(page))}`);
await SEARCH(page).fill("RÉTRO");
const a = await titles(page);
await SEARCH(page).fill("plan");
const b = await titles(page);
check("#1.3", a.length === 1 && /Retro/.test(a[0]) && b.length === 1 && /planning/.test(b[0]), `RÉTRO -> ${JSON.stringify(a)} ; plan -> ${JSON.stringify(b)}`);
await SEARCH(page).fill("zzz");
const msg = "Aucun tableau ne correspond à « zzz »";
const visible = await page.locator("strong", { hasText: msg }).count();
const live = await page.getByRole("status").filter({ hasText: msg }).count();
const lr = await page.getByRole("status").filter({ hasText: msg }).first().getAttribute("aria-live").catch(() => null);
check("#1.4", (await cards(page).count()) === 0 && visible === 1 && live === 1 && lr === "polite", `cartes=${await cards(page).count()} message visible=${visible} annonce=${live} aria-live=${lr}`);
const bad = await unreadable(page, { expected: [/^Retrouvez et créez/, /^Aucun tableau ne correspond/] });
check("#E.lisible", !bad.length, `texte illisible hors baseline : ${JSON.stringify(bad.map((x) => `${x.text}:${x.ratio}`))} (baseline lib : sous-titre et EmptyState a 4,44 contre 4,5 AA, voir #1.6c)`);
await SEARCH(page).fill("   ");
check("#1.5a", JSON.stringify(await titles(page)) === JSON.stringify(all) && (await page.locator("strong", { hasText: "Aucun tableau ne correspond" }).count()) === 0, `espaces -> ${JSON.stringify(await titles(page))}`);
await SEARCH(page).fill("zzz"); await SEARCH(page).fill("");
check("#1.5b", JSON.stringify(await titles(page)) === JSON.stringify(all) && (await page.getByRole("status").filter({ hasText: "Aucun tableau" }).count()) === 0, `vide -> ${JSON.stringify(await titles(page))}`);
await SEARCH(page).fill("  retro  ");
check("#L.espaces", JSON.stringify(await titles(page)) === JSON.stringify(["Retrospective"]), `'  retro  ' -> ${JSON.stringify(await titles(page))}`);
await SEARCH(page).fill("oe");
check("#L.ligature", (await titles(page)).length === 0, `oe -> ${JSON.stringify(await titles(page))} (aucun nom a ligature : pas de correspondance attendue)`);
// quitter l ecran : ouvrir un tableau puis revenir -> filtre vide
await SEARCH(page).fill("retro");
await cards(page).first().getByRole("button").first().click();
await page.getByRole("button", { name: /Retour/ }).first().waitFor({ timeout: 10000 });
await page.getByRole("button", { name: /Retour/ }).first().click();
await SEARCH(page).waitFor({ timeout: 10000 });
check("#L.quitter", (await SEARCH(page).inputValue()) === "" && (await cards(page).count()) === all.length, `filtre apres retour = ${JSON.stringify(await SEARCH(page).inputValue())}, cartes=${await cards(page).count()}`);
// rechargement de la liste pendant un filtre : la fenetre perd/regagne le focus (refetch on focus)
await SEARCH(page).fill("retro");
await page.evaluate(() => { window.dispatchEvent(new Event("focus")); document.dispatchEvent(new Event("visibilitychange")); });
await page.waitForTimeout(600);
check("#L.refetch", (await SEARCH(page).inputValue()) === "retro" && JSON.stringify(await titles(page)) === JSON.stringify(["Retrospective"]), `apres refetch : champ=${JSON.stringify(await SEARCH(page).inputValue())} cartes=${JSON.stringify(await titles(page))}`);
await cur.ctx.close();

// AC6 : chargement / erreur / liste vide -> pas de champ
cur = await open({ stub: async (route) => { if (route.request().method() === "GET") await new Promise((r) => setTimeout(r, 2500)); route.continue(); } });
page = cur.page; await page.waitForTimeout(600);
const loadingNoField = (await SEARCH(page).count()) === 0;
await page.getByText("Sprint planning").first().waitFor({ timeout: 10000 });
check("#1.6a", loadingNoField && (await SEARCH(page).count()) === 1, `chargement : champ absent=${loadingNoField}, puis present`);
await cur.ctx.close();
cur = await open({ stub: (route) => (route.request().method() === "GET" ? route.fulfill({ status: 500, contentType: "application/json", body: "{}" }) : route.continue()) });
page = cur.page; await page.getByText(/Aucun tableau pour le moment|Réessayer/).first().waitFor({ timeout: 15000 });
const errScreen = (await page.getByRole("button", { name: "Réessayer" }).count()) ? "bandeau Réessayer" : "message liste vide (BoardService.getAll avale l erreur : le bandeau d erreur de la liste est inatteignable, constat de base, pas lie a N2)";
check("#1.6b", (await SEARCH(page).count()) === 0, `erreur serveur : champ=${await SEARCH(page).count()}, ecran = ${errScreen}`, { allow5xx: true });
await cur.ctx.close();
cur = await open({ stub: (route) => (route.request().method() === "GET" ? route.fulfill({ status: 200, contentType: "application/json", body: "[]" }) : route.continue()) });
page = cur.page; await page.getByText("Aucun tableau pour le moment.").waitFor({ timeout: 10000 });
const base = await unreadable(page, {});
check("#1.6c", (await SEARCH(page).count()) === 0, `liste vide : champ=${await SEARCH(page).count()} message existant present ; contraste de base de l ecran existant : ${JSON.stringify(base.map((x) => `${x.text}:${x.ratio}`))}`);
await cur.ctx.close();

writeFileSync(E + `results-N2-${RUN}.json`, JSON.stringify(results, null, 1));
await browser.close();
