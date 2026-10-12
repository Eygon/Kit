// E2E N4 « Epingler un tableau » (Playwright, front :5173 + back REEL :5080 construits depuis les slots I-n4f / I-n4b).
// Cahier tire de spec.md : US1 (API, AC1-13) cote reel, US2 (liste, AC1-10) dans le navigateur.
// Usage : node e2e-N4-run.mjs <run>   -> results-N4-<run>.json
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { watch, overflowing } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const E = new URL(".", import.meta.url).pathname;
const RUN = process.argv[2] || "1";
const TW = readFileSync(E + (process.env.TW_CSS || "tw.css"), "utf8");
const API = "http://localhost:5080/api/v1";
const api = async (user, method, path, body) => {
  const h = { ...(user ? { "X-User-Id": String(user) } : {}), ...(body ? { "Content-Type": "application/json" } : {}) };
  const r = await fetch(API + path, { method, headers: h, body: body && JSON.stringify(body) });
  const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch { j = t; }
  return { status: r.status, body: j, text: t };
};
const STAMP = String(Date.now()).slice(-6) + RUN;
const N = (x) => `N4${STAMP}-${x}`;
const results = [];
const log = (id, ok, detail) => { results.push({ id, ok: !!ok, detail }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${detail}`); };
const mine = async (u = 1) => (await api(u, "GET", "/boards")).body.filter((b) => b.name.startsWith(`N4${STAMP}-`));
const names = async (u = 1) => (await mine(u)).map((b) => b.name);
const unpinAll = async (u = 1) => { for (const b of (await api(u, "GET", "/boards")).body) if (b.isPinned) await api(u, "DELETE", `/boards/${b.id}/pin`); };
const mk = async (name) => (await api(1, "POST", "/boards", { name })).body;
await unpinAll();
const boards = {}; for (const k of ["A", "B", "C", "D", "E", "F"]) boards[k] = await mk(N(k));
const LONG = "N4" + STAMP + "-" + "x".repeat(100 - ("N4" + STAMP + "-").length);
boards.L = await mk(LONG);

// ---- US1 : API reelle
const order = async () => (await names()).join(",");
const sorted = (a) => [...a].sort((x, y) => x.localeCompare(y));
const base = (await names());
const e1 = await api(1, "POST", `/boards/${boards.C.id}/pin`);
const l1 = (await mine()).map((b) => [b.name, b.isPinned]);
log("API.AC1", e1.status === 204 && e1.text === "" && l1[0][0] === N("C") && l1[0][1] === true && l1.slice(1).every((x) => x[1] === false), `POST pin -> ${e1.status} ; liste ${JSON.stringify(l1.slice(0, 3))}`);
await api(1, "POST", `/boards/${boards.A.id}/pin`);
const l2 = (await names()).slice(0, 3);
log("API.AC2", JSON.stringify(l2) === JSON.stringify([N("A"), N("C"), N("B")]), `ordre ${JSON.stringify(l2)}`);
await api(1, "DELETE", `/boards/${boards.A.id}/pin`); const e3 = await api(1, "DELETE", `/boards/${boards.C.id}/pin`);
log("API.AC3", e3.status === 204 && (await mine()).every((b) => !b.isPinned) && JSON.stringify(await names()) === JSON.stringify(sorted(await names())), `desepingler -> ${e3.status}, plus aucun epingle, tri par nom`);
await api(1, "POST", `/boards/${boards.B.id}/pin`); const e4 = await api(1, "POST", `/boards/${boards.B.id}/pin`);
const e5 = await api(1, "DELETE", `/boards/${boards.D.id}/pin`);
log("API.AC4-5", e4.status === 204 && e5.status === 204 && (await mine()).filter((b) => b.isPinned).length === 1, `idempotent : ${e4.status}/${e5.status}`);
for (const k of ["A", "C", "D", "E"]) await api(1, "POST", `/boards/${boards[k].id}/pin`);
const e6 = await api(1, "POST", `/boards/${boards.F.id}/pin`);
const e7 = await api(1, "POST", `/boards/${boards.A.id}/pin`);
log("API.AC6-7", e6.status === 409 && e6.body?.message && !(await mine()).find((b) => b.name === N("F")).isPinned && e7.status === 204, `6e -> ${e6.status} ${JSON.stringify(e6.body).slice(0, 110)} ; deja epingle a 5 -> ${e7.status}`);
await api(1, "DELETE", `/boards/${boards.E.id}/pin`); const e8a = await api(1, "POST", `/boards/${boards.F.id}/pin`);
log("API.AC8", e8a.status === 204 && (await mine()).find((b) => b.name === N("F")).isPinned, `desepingler E puis epingler F -> ${e8a.status}`);
const e9 = await api(3, "POST", `/boards/${boards.A.id}/pin`); const e9b = await api(3, "DELETE", `/boards/${boards.A.id}/pin`);
const e10 = await api(1, "POST", "/boards/999999/pin"); const e11 = await api(null, "POST", `/boards/${boards.A.id}/pin`);
log("API.AC9-11", e9.status === 403 && e9b.status === 403 && e10.status === 404 && e11.status === 401, `non-membre ${e9.status}/${e9b.status} ; inconnu ${e10.status} ; sans identite ${e11.status}`);
const e12 = await api(3, "POST", "/boards/1/pin"); const l13 = (await api(2, "GET", "/boards")).body.find((b) => b.id === 1);
log("API.AC12-13", e12.status === 204 && l13.isPinned === false, `lecteur Carol epingle -> ${e12.status} ; Bob voit le tableau 1 epingle=${l13.isPinned}`);
await api(3, "DELETE", "/boards/1/pin");
await unpinAll();

// ---- US2 : navigateur
const browser = await chromium.launch();
let cur;
async function open(stub) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript((css) => { document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.prepend(s); }); }, TW);
  await ctx.addInitScript(() => { window.__toasts = []; window.addEventListener("septeo-toast", (e) => window.__toasts.push(e.detail)); });
  const page = await ctx.newPage(); const sent = [];
  await page.route("**/api/v1/boards/*/pin", async (route) => { sent.push(route.request().method() + " " + route.request().url().match(/boards\/(\d+)/)[1]); if (stub) return stub(route); return route.continue(); });
  const w = watch(page, { api: "http://localhost:5080", expectedConsole: [/negotiation/i, /signalr/i, /WebSocket/i, /Failed to load resource/i] });
  await page.goto("http://localhost:5173/"); await page.getByRole("listitem").filter({ hasText: N("A") }).first().waitFor({ timeout: 10000 });
  return { ctx, page, w, sent };
}
const card = (p, k) => p.getByRole("listitem").filter({ hasText: k === "L" ? LONG : N(k) });
const pin = (p, k, st) => card(p, k).getByRole("button", { name: new RegExp(`^${st ? "Désépingler" : "Épingler"} le tableau ${k === "L" ? LONG : N(k)}`) });
const listNames = async (p) => (await p.getByRole("listitem").allInnerTexts()).map((t) => t.match(new RegExp(`N4${STAMP}-\\S+`))?.[0]).filter(Boolean);
const chk = (id, ok, detail, opt = {}) => { const t = cur.w.take(); const bad = (!opt.allow5xx && t.fiveXX.length) || t.console.length; log(id, ok && !bad, detail + (bad ? " | 5xx/console: " + JSON.stringify([t.fiveXX, t.console]).slice(0, 250) : "")); };
const toasts = (p) => p.evaluate(() => window.__toasts);

cur = await open(); let { page } = cur;
// AC1 : nom et etat
const p1 = pin(page, "A", false); const press1 = await p1.getAttribute("aria-pressed");
chk("UI.AC1", (await p1.count()) === 1 && press1 === "false", `carte A : bouton « Épingler le tableau ${N("A")} » aria-pressed=${press1}`);
// pas de bouton imbrique
const nested = await page.evaluate(() => [...document.querySelectorAll("button button")].length);
chk("UI.imbrique", nested === 0, `boutons imbriques : ${nested}`);
// AC3 : optimiste, ordre, une seule demande (AC8 double clic), AC5 n ouvre pas
await cur.ctx.close();
cur = await open(async (route) => { await new Promise((r) => setTimeout(r, 700)); return route.continue(); }); page = cur.page;
await pin(page, "C", false).dblclick();
await page.waitForTimeout(150);
const pressedNow = await pin(page, "C", true).getAttribute("aria-pressed").catch(() => null);
const url0 = page.url();
await page.waitForTimeout(1500);
const ord3 = (await listNames(page)).slice(0, 3);
const reqs = cur.sent.filter((s) => s.startsWith("POST")).length;
chk("UI.AC3/AC8/AC5", pressedNow === "true" && reqs === 1 && ord3[0] === N("C") && url0 === page.url() && !/\/board\//.test(page.url()), `immediat pressed=${pressedNow} ; demandes=${reqs} ; ordre ${JSON.stringify(ord3)} ; url ${page.url()}`);
// AC4 : desepingler
await cur.ctx.close(); cur = await open(); page = cur.page;
await pin(page, "C", true).click(); await page.waitForTimeout(800);
const ord4 = await listNames(page); const pr4 = await pin(page, "C", false).getAttribute("aria-pressed");
chk("UI.AC4", pr4 === "false" && JSON.stringify(ord4) === JSON.stringify(sorted(ord4)), `desepingle : pressed=${pr4} ; ordre trie ${JSON.stringify(ord4.slice(0, 3))}`);
// clic sur la carte ouvre le tableau
await card(page, "A").getByRole("button", { name: new RegExp(N("A")) }).first().click().catch(() => {});
await page.waitForTimeout(600);
chk("UI.AC5b", /\/board\/|boards\/\d+/.test(page.url()), `clic sur la carte -> ${page.url()}`);
// AC6 : limite, message une seule fois, retour arriere ; AC9 rechargement
await cur.ctx.close();
for (const k of ["A", "B", "C", "D", "E"]) await api(1, "POST", `/boards/${boards[k].id}/pin`);
cur = await open(); page = cur.page;
const ord9 = (await listNames(page)).slice(0, 5);
chk("UI.AC9", JSON.stringify(ord9) === JSON.stringify([N("A"), N("B"), N("C"), N("D"), N("E")]) && (await pin(page, "A", true).getAttribute("aria-pressed")) === "true", `apres rechargement : ${JSON.stringify(ord9)}`);
await pin(page, "F", false).click(); await page.waitForTimeout(1000);
const t6 = (await toasts(page)).filter((t) => /5 tableaux/.test(t.message || ""));
const pr6 = await pin(page, "F", false).getAttribute("aria-pressed");
chk("UI.AC6", t6.length === 1 && /Désépinglez-en un/.test(t6[0].message) && pr6 === "false" && !/verrouill/i.test(JSON.stringify(await toasts(page))), `toast(s) limite=${t6.length} ${JSON.stringify(t6[0]?.message).slice(0, 90)} ; F pressed=${pr6} ; autres toasts=${(await toasts(page)).length - t6.length}`, { allow5xx: true });
// AC7 : autre erreur (500 simule) -> message generique une fois, retour arriere
await cur.ctx.close(); await unpinAll();
cur = await open((route) => route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ message: "x" }) })); page = cur.page;
await pin(page, "B", false).click(); await page.waitForTimeout(900);
const t7 = await toasts(page); const pr7 = await pin(page, "B", false).getAttribute("aria-pressed");
chk("UI.AC7", t7.length === 1 && !/5 tableaux/.test(t7[0].message || "") && pr7 === "false", `403 simule -> toasts=${JSON.stringify(t7).slice(0, 140)} ; pressed=${pr7}`);
// clavier
await cur.ctx.close(); cur = await open(); page = cur.page;
await pin(page, "D", false).focus(); await page.keyboard.press("Enter"); await page.waitForTimeout(800);
chk("UI.clavier", (await pin(page, "D", true).count()) === 1 && (await listNames(page))[0] === N("D"), `Entree sur l epingle -> D epingle et en tete : ${JSON.stringify((await listNames(page)).slice(0, 2))}`);
// debordement : nom de 100 car. sans espace
const ov = await overflowing(page);
chk("UI.debordement", ov.length === 0, `texte debordant : ${JSON.stringify(ov).slice(0, 200)}`);
const box = await pin(page, "L", false).boundingBox();
chk("UI.epingle-visible", box && box.width >= 20 && box.height >= 20, `epingle de la carte au nom de 100 car. : ${JSON.stringify(box)}`);
// liste d un autre membre inchangee (Bob via l API)
const bob = (await api(2, "GET", "/boards")).body.filter((b) => b.name.startsWith(`N4${STAMP}-`));
chk("UI.SC4", bob.length === 0 || bob.every((b) => !b.isPinned), "Bob ne voit aucune epingle d Alice");
await cur.ctx.close(); await browser.close(); await unpinAll();
writeFileSync(E + `results-N4-${RUN}.json`, JSON.stringify(results, null, 1));
console.log(`${results.filter((r) => r.ok).length}/${results.length}`);
