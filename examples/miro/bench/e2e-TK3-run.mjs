// E2E TK-3 « Mode sombre » (passage /sk-notion, Playwright faute de Claude in Chrome sur le banc).
// Back :5080, front :5173 servi depuis le slot. Oracles : data-theme, couleurs CALCULEES (le rendu
// reel que jsdom ne voit pas), nom et etat accessibles de la bascule, stockage, preference systeme.
// Usage : node e2e-TK3-run.mjs <run> [<slot>]   -> results-TK3-<run>.json
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { watch, unreadable } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const E = new URL(".", import.meta.url).pathname;
const RUN = process.argv[2] || "1";
const SLOT = process.argv[3];
const TW = readFileSync(E + "tw.css", "utf8");
const API = "http://localhost:5080/api/v1/boards/1";
const api = async (path, method = "GET", body) => {
  const r = await fetch(API + path, { method, headers: { "X-User-Id": "1", "Content-Type": "application/json" }, body: body && JSON.stringify(body) });
  const t = await r.text(); return t ? JSON.parse(t) : null;
};
const results = [];
const base = new Set((await api("/items")).map((i) => i.id));
const red = await api("/items", "POST", { type: "Text", x: 640, y: 480, width: 200, height: 40, color: "#dc2626", content: "Texte rouge" });
const dflt = await api("/items", "POST", { type: "Text", x: 640, y: 540, width: 200, height: 40, color: "#111827", content: "Texte par défaut" });

const browser = await chromium.launch();
const ON = { DARK: "Passer en mode clair", LIGHT: "Passer en mode sombre" };
async function open({ scheme = "light", init } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme });
  await ctx.addInitScript((css) => { document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.prepend(s); }); }, TW);
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  const w = watch(page, { api: "http://localhost:5080", expectedConsole: [/negotiation/i, /signalr/i, /WebSocket/i] });
  await page.goto("http://localhost:5173/");
  await page.getByText("Sprint planning").first().waitFor({ timeout: 10000 });
  return { ctx, page, w };
}
const theme = (p) => p.evaluate(() => document.documentElement.dataset.theme || "");
// Luminance relative (WCAG) d une couleur CSS calculee rgb(a)
const lum = (rgb) => { const [r, g, b] = (rgb.match(/[\d.]+/g) || []).slice(0, 3).map(Number).map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
// Fond effectif : premier ancetre a fond non transparent
const bgOf = (loc) => loc.evaluate((el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; } return "rgb(255, 255, 255)"; });
const toggle = (p, state) => p.getByRole("button", { name: ON[state] });
let cur;
const check = (id, ok, detail) => {
  const t = cur.w.take(); const bad = t.fiveXX.length || t.console.length; const v = ok && !bad;
  results.push({ id, ok: v, detail, fiveXX: t.fiveXX, console: t.console });
  console.log(`${v ? "PASS" : "FAIL"} ${id} ${detail}${bad ? " | 5xx/console: " + JSON.stringify([t.fiveXX, t.console]).slice(0, 300) : ""}`);
};

// US1 — systeme clair, aucun choix memorise
cur = await open();
const { page } = cur;
await page.evaluate(() => { window.__noReload = 1; });
const bodyBg0 = await bgOf(page.getByText("Sprint planning").first());
await toggle(page, "LIGHT").click(); await page.waitForTimeout(300);
const bodyBg1 = await bgOf(page.getByText("Sprint planning").first());
const kept = await page.evaluate(() => window.__noReload === 1);
check("#1.1", (await theme(page)) === "dark" && kept && lum(bodyBg1) < 0.2 && lum(bodyBg0) > 0.5 && (await toggle(page, "DARK").count()) === 1,
  `theme=${await theme(page)} fond ${bodyBg0} -> ${bodyBg1} sansRechargement=${kept}`);

const pressed = await toggle(page, "DARK").getAttribute("aria-pressed");
await toggle(page, "DARK").click(); await page.waitForTimeout(300);
const pressedLight = await toggle(page, "LIGHT").getAttribute("aria-pressed");
check("#1.2", (await theme(page)) === "light" && lum(await bgOf(page.getByText("Sprint planning").first())) > 0.5 && (await toggle(page, "LIGHT").count()) === 1,
  `theme=${await theme(page)}`);

// #1.6 bouton, nom traduit (fr ici, en/es dans les locales), etat presse = sombre actif
let loc = "";
if (SLOT) for (const l of ["en", "es"]) { const j = JSON.parse(readFileSync(`${SLOT}/src/i18n/locales/${l}.json`, "utf8")); loc += ` ${l}=${JSON.stringify(j?.common?.theme)}`; }
check("#1.6", pressed === "true" && pressedLight === "false" && /switchToDark/.test(loc) && (loc.match(/switchTo/g) || []).length === 4,
  `aria-pressed sombre=${pressed} clair=${pressedLight}${loc}`);

// #1.3 tableau ouvert en sombre : bascule presente et utilisable ; le theme survit au changement d ecran
await toggle(page, "LIGHT").click();
await page.getByText("Sprint planning").first().click();
await page.locator(`[data-testid="canvas-item-${dflt.id}"]`).waitFor({ timeout: 10000 });
await page.waitForTimeout(500);
const onBoard = await theme(page);
const canvasBg = await bgOf(page.locator('[data-testid="board-viewport"]'));
await toggle(page, "DARK").click(); await page.waitForTimeout(200); const back = await theme(page);
await toggle(page, "LIGHT").click(); await page.waitForTimeout(200);
check("#1.3", onBoard === "dark" && back === "light" && (await theme(page)) === "dark" && lum(canvasBg) < 0.2, `sur le tableau theme=${onBoard}, canevas ${canvasBg}, bascule -> ${back} -> ${await theme(page)}`);

// #1.4 texte a la couleur par defaut : couleur du theme, lisible sur le canevas sombre
const tDef = page.locator(`[data-testid="canvas-item-${dflt.id}"]`).getByText("Texte par défaut");
const cDef = await tDef.evaluate((e) => getComputedStyle(e).color);
const ratio = contrast(cDef, await bgOf(tDef));
check("#1.4", ratio >= 4.5, `couleur=${cDef} fond=${await bgOf(tDef)} contraste=${ratio.toFixed(2)}`);

// #1.5 texte colore et post-it gardent leurs couleurs
const cRed = await page.locator(`[data-testid="canvas-item-${red.id}"]`).getByText("Texte rouge").evaluate((e) => getComputedStyle(e).color);
const sticky = page.locator('[data-testid="canvas-item-1"]').getByText("Define the goal");
const stickyBg = await bgOf(sticky);
check("#1.5", cRed === "rgb(220, 38, 38)" && stickyBg === "rgb(253, 230, 138)", `texte rouge=${cRed} post-it=${stickyBg}`);

// #E2 (bord « couleurs de contenu inchangees » + SC-003) : le texte d un post-it et d une forme
// reste lisible sur leur fond pastel (vu a la capture : texte clair sur jaune en sombre)
const readable = async (testid, txt) => { const t = page.locator(`[data-testid="${testid}"]`).getByText(txt); const c = await t.evaluate((e) => getComputedStyle(e).color); return { c, bg: await bgOf(t), r: contrast(c, await bgOf(t)) }; };
const rs = await readable("canvas-item-1", "Define the goal"), rf = await readable("canvas-item-3", "Backlog");
check("#E2", rs.r >= 4.5 && rf.r >= 4.5, `post-it ${rs.c} sur ${rs.bg} = ${rs.r.toFixed(2)} ; forme ${rf.c} sur ${rf.bg} = ${rf.r.toFixed(2)}`);

// #E3 oracle transverse « texte lisible » (sk-e2e.md) : tableau en sombre, puis liste en sombre
// Contraste attendu : couleur choisie gardee telle quelle (US1-5, reponse Q2 « les autres couleurs choisies restent telles quelles »)
const EXPECTED = { expected: [/^Texte rouge$/] };
const badBoard = await unreadable(page, EXPECTED);
await page.getByRole("button", { name: /Retour/ }).first().click(); await page.getByText("Sprint planning").first().waitFor(); await page.waitForTimeout(300);
const badList = await unreadable(page, EXPECTED);
check("#E3", !badBoard.length && !badList.length && (await theme(page)) === "dark", `tableau=${JSON.stringify(badBoard.map((x) => `${x.text}:${x.ratio}`))} liste=${JSON.stringify(badList.map((x) => `${x.text}:${x.ratio}`))} theme=${await theme(page)}`);

// US2-3 choix sombre memorise, rechargement avec systeme clair -> sombre
await page.reload(); await page.waitForTimeout(800);
check("#2.3", (await theme(page)) === "dark", `apres rechargement theme=${await theme(page)}`);
await cur.ctx.close();

// US2-1 / US2-2 sans choix memorise : preference systeme
cur = await open({ scheme: "dark" });
check("#2.1", (await theme(cur.page)) === "dark", `systeme sombre -> ${await theme(cur.page)}`);
await cur.ctx.close();
cur = await open({ scheme: "light" });
const tl = await theme(cur.page); await cur.ctx.close();
cur = await open({ scheme: "no-preference" });
check("#2.2", tl === "light" && (await theme(cur.page)) === "light", `systeme clair -> ${tl}, sans preference -> ${await theme(cur.page)}`);
await cur.ctx.close();

// US2-4 valeur memorisee illisible -> preference systeme, sans erreur
cur = await open({ scheme: "dark", init: () => { try { if (!sessionStorage.getItem("seeded")) { localStorage.setItem("colorTheme", "{pas-un-theme"); sessionStorage.setItem("seeded", "1"); } } catch {} } });
check("#2.4", (await theme(cur.page)) === "dark", `valeur illisible, systeme sombre -> ${await theme(cur.page)}`);
await cur.ctx.close();

// US2-5 stockage indisponible : la bascule marche, aucune erreur
cur = await open({ init: () => { const no = () => { throw new DOMException("refuse", "SecurityError"); }; Storage.prototype.getItem = no; Storage.prototype.setItem = no; } });
await toggle(cur.page, "LIGHT").click(); await cur.page.waitForTimeout(300);
check("#2.5", (await theme(cur.page)) === "dark", `stockage refuse, apres bascule theme=${await theme(cur.page)}`);
await cur.ctx.close();

writeFileSync(E + `results-TK3-${RUN}.json`, JSON.stringify(results, null, 1));
await browser.close();
for (const i of await api("/items")) if (!base.has(i.id)) await api(`/items/${i.id}`, "DELETE");
