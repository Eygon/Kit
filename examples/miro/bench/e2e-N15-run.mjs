// E2E N15 « Rechercher dans la liste » (Playwright, front :5173 depuis I-n15). Listes simulees (noms et comptes connus) + une liste reelle.
// Usage : TW_CSS=tw-N15.css node e2e-N15-run.mjs <run>   -> results-N15-<run>.json
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { watch, overflowing } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const E = new URL(".", import.meta.url).pathname; const RUN = process.argv[2] || "1";
const TW = readFileSync(E + (process.env.TW_CSS || "tw.css"), "utf8");
const results = []; const browser = await chromium.launch(); let cur;
const check = (id, ok, detail) => { const t = cur.w.take(); const bad = t.fiveXX.length || t.console.length; const v = ok && !bad; results.push({ id, ok: v, detail }); console.log(`${v ? "PASS" : "FAIL"} ${id} ${detail}${bad ? " | 5xx/console: " + JSON.stringify([t.fiveXX, t.console]).slice(0, 250) : ""}`); };
const mkB = (id, name) => ({ id, name, ownerId: 1, createdAt: "2026-01-01T00:00:00Z", memberCount: 1, itemCount: 1 });
const NAMES = ["Sprint planning", "Rétrospective", "Retro équipe", "Sprint review", ...Array.from({ length: 8 }, (_, i) => `Tableau ${i + 1}`)]; // 12
const LIST = NAMES.map((n, i) => mkB(i + 1, n));
async function open({ list = LIST, status = 200 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" });
  await ctx.addInitScript((css) => { document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.prepend(s); }); }, TW);
  const page = await ctx.newPage();
  if (list !== "real") await page.route(/\/api\/v1\/boards$/, (r) => r.request().method() !== "GET" ? r.continue() : status === 204 ? r.fulfill({ status: 204, body: "" }) : status !== 200 ? r.fulfill({ status, contentType: "application/json", body: "{}" }) : r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(list) }));
  const w = watch(page, { api: "http://localhost:5080", expectedConsole: [/negotiation/i, /signalr/i, /WebSocket/i, /Failed to load resource/i] });
  await page.goto("http://localhost:5173/"); await page.waitForTimeout(800);
  return { ctx, page, w };
}
const SEARCH = (p) => p.getByRole("searchbox").or(p.getByRole("textbox", { name: /Rechercher/i })).first();
const cards = async (p) => (await p.getByRole("listitem").allInnerTexts()).map((t) => t.split("\n")[0].trim()).filter(Boolean);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const type = async (p, v) => { await SEARCH(p).fill(v); await p.waitForTimeout(250); };
cur = await open(); let { page } = cur; await SEARCH(page).waitFor({ timeout: 10000 });
await type(page, "retro"); const c1 = await cards(page);
check("US1.AC1", eq(c1.sort(), ["Retro équipe", "Rétrospective"].sort()), `« retro » -> ${JSON.stringify(c1)} (accents ignores : Rétrospective ET Retro équipe)`);
await type(page, "RÉTRO"); check("US1.AC2", eq((await cards(page)).sort(), ["Retro équipe", "Rétrospective"].sort()), `« RÉTRO » -> ${JSON.stringify(await cards(page))}`);
await type(page, "  sprint  "); check("US1.AC3", eq((await cards(page)).sort(), ["Sprint planning", "Sprint review"].sort()), `« sprint » avec espaces -> ${JSON.stringify(await cards(page))}`);
await type(page, "Équipe"); check("US1.AC4", eq(await cards(page), ["Retro équipe"]), `« Équipe » -> ${JSON.stringify(await cards(page))}`);
await type(page, "   "); check("US1.AC5", (await cards(page)).length === 12, `espaces seuls -> ${(await cards(page)).length} cartes`);
// US2
await type(page, "sprint");
const count = page.getByText(/\d+ tableaux? sur \d+/).first(); const clear = page.getByRole("button", { name: /Effacer la recherche/ });
check("US2.AC1", /2 tableaux sur 12/.test(await count.innerText()) && (await clear.count()) === 1, `compteur « ${await count.innerText()} » ; bouton Effacer=${await clear.count()}`);
await type(page, "retro équipe"); check("US2.AC2", /1 tableau sur 12/.test(await count.innerText()), `pluriel : « ${await count.innerText()} »`);
await type(page, ""); check("US2.AC3", (await count.count()) === 0 && (await clear.count()) === 0, `sans recherche : compteur=${await count.count()} bouton=${await clear.count()}`);
await type(page, "  Zèbre  ");
const noMatch = page.getByText(/Aucun tableau ne correspond/); const nm = await noMatch.innerText().catch(() => "");
check("US2.AC4", /Aucun tableau ne correspond à\s*«\s*Zèbre\s*»/.test(nm) && /0 tableau sur 12/.test(await count.innerText()) && (await clear.count()) === 1 && (await cards(page)).length === 0, `message « ${nm} » ; compteur « ${await count.innerText()} » ; Effacer=${await clear.count()} ; cartes=${(await cards(page)).length}`);
await clear.click(); await page.waitForTimeout(250);
check("US2.AC5", (await SEARCH(page).inputValue()) === "" && (await cards(page)).length === 12 && (await count.count()) === 0 && (await noMatch.count()) === 0 && (await clear.count()) === 0, `Effacer -> champ vide, ${(await cards(page)).length} cartes, compteur/bouton/message absents`);
await type(page, "sprint");
const live = await page.evaluate(() => { const el = [...document.querySelectorAll("[aria-live]")].find((e) => /tableaux? sur/.test(e.textContent || "")); return el ? el.getAttribute("aria-live") : null; });
check("US2.AC6", live === "polite", `compteur annonce : aria-live=${live}`);
// bouton Effacer au clavier et focus apres effacement
await type(page, "retro"); await clear.focus(); await page.keyboard.press("Enter"); await page.waitForTimeout(250);
check("US2.clavier", (await SEARCH(page).inputValue()) === "" && (await cards(page)).length === 12, `Entree sur Effacer -> champ vide, ${(await cards(page)).length} cartes`);
// nom tres long : pas de debordement avec compteur et message
await cur.ctx.close();
const LONGN = "L".repeat(100);
cur = await open({ list: [mkB(1, LONGN), mkB(2, "Court")] }); page = cur.page; await SEARCH(page).waitFor();
await type(page, "L".repeat(30)); const ov = await overflowing(page);
check("US2.debordement", ov.length === 0 && (await cards(page)).length === 1, `nom de 100 car. filtre : debordements=${JSON.stringify(ov).slice(0, 150)} ; cartes=${(await cards(page)).length}`);
await type(page, "x".repeat(100)); const ov2 = await overflowing(page); const nm2 = await page.getByText(/Aucun tableau ne correspond/).innerText().catch(() => "");
check("US2.debordement-message", ov2.length === 0 && nm2.length > 0, `saisie de 100 car. sans espace -> message sans debordement=${ov2.length === 0} (« ${nm2.slice(0, 40)}… »)`);
await cur.ctx.close();
// AC6 US1 : chargement, erreur, vide -> pas de champ
for (const [id, o] of [["US1.AC6-vide", { status: 204 }], ["US1.AC6-erreur", { status: 500 }]]) { cur = await open(o); page = cur.page; await page.waitForTimeout(3200); cur.w.take(); check(id, (await SEARCH(page).count()) === 0, `${id} : champ absent=${(await SEARCH(page).count()) === 0}`); await cur.ctx.close(); }
// liste reelle : un nom reel se retrouve
cur = await open({ list: "real" }); page = cur.page; await SEARCH(page).waitFor({ timeout: 10000 }); await type(page, "sprint");
check("reel", (await cards(page)).some((c) => /Sprint planning/.test(c)), `liste reelle : « sprint » -> ${JSON.stringify((await cards(page)).slice(0, 3))}`);
await cur.ctx.close(); await browser.close();
writeFileSync(E + `results-N15-${RUN}.json`, JSON.stringify(results, null, 1));
console.log(`${results.filter((r) => r.ok).length}/${results.length}`);
