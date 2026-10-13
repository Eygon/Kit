// E2E N13 « Dupliquer un tableau » (Playwright, front :5173 depuis I-n13f + back REEL :5080 depuis I-n13b) : US2 AC1-AC5 + chemin reel de bout en bout (US1 via l ecran).
// Usage : TW_CSS=tw-N13.css node e2e-N13-run.mjs <run>   -> results-N13-<run>.json
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { watch, overflowing } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const E = new URL(".", import.meta.url).pathname; const RUN = process.argv[2] || "1";
const TW = readFileSync(E + (process.env.TW_CSS || "tw.css"), "utf8");
const API = "http://localhost:5080/api/v1";
const api = async (u, m, p, b) => { const r = await fetch(API + p, { method: m, headers: { ...(u ? { "X-User-Id": String(u) } : {}), ...(b ? { "Content-Type": "application/json" } : {}) }, body: b && JSON.stringify(b) }); const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch { j = t; } return { status: r.status, body: j }; };
const STAMP = String(Date.now()).slice(-6) + RUN; const NAME = `N13-${STAMP}`; const LONG = "N13" + STAMP + "x".repeat(100 - ("N13" + STAMP).length);
const results = []; const browser = await chromium.launch(); let cur;
const check = (id, ok, detail, allow5xx) => { const t = cur.w.take(); const bad = (!allow5xx && t.fiveXX.length) || t.console.length; const v = ok && !bad; results.push({ id, ok: v, detail }); console.log(`${v ? "PASS" : "FAIL"} ${id} ${detail}${bad ? " | 5xx/console: " + JSON.stringify([t.fiveXX, t.console]).slice(0, 250) : ""}`); };
// source reelle : elements, trait a main levee, verrou, connecteur, commentaire
const src = (await api(1, "POST", "/boards", { name: NAME })).body;
const mk = async (b) => (await api(1, "POST", `/boards/${src.id}/items`, b)).body;
const A = await mk({ type: "StickyNote", x: 10, y: 20, width: 140, height: 90, content: "mk-A", color: "#fde68a" });
const Bm = await mk({ type: "Shape", x: 300, y: 40, width: 120, height: 80, content: "mk-B", color: "#a5d8ff" });
const D = await mk({ type: "Freehand", x: 400, y: 300, width: 60, height: 60, content: "", color: "#ff0000", points: [{ x: 0, y: 0 }, { x: 10, y: 20 }], strokeWidth: 4 });
await api(1, "PATCH", `/boards/${src.id}/items/${Bm.id}`, { isLocked: true });
await api(1, "POST", `/boards/${src.id}/connectors`, { fromItemId: A.id, toItemId: Bm.id, style: "Arrow" });
await api(1, "POST", `/boards/${src.id}/items/${A.id}/comments`, { body: "c" });
await api(1, "POST", "/boards", { name: LONG });
const snap = async () => JSON.stringify([(await api(1, "GET", `/boards/${src.id}/items`)).body, (await api(1, "GET", `/boards/${src.id}/connectors`)).body, (await api(1, "GET", `/boards/${src.id}/members`)).body]);
const before = await snap();
async function open({ stub } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "fr-FR" });
  await ctx.addInitScript((css) => { document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.prepend(s); }); }, TW);
  await ctx.addInitScript(() => { window.__toasts = []; window.addEventListener("septeo-toast", (e) => window.__toasts.push(e.detail)); });
  const page = await ctx.newPage(); const sent = [];
  await page.route(/\/api\/v1\/boards\/\d+\/duplicate$/, async (route) => { sent.push(route.request().method()); if (stub) return stub(route); return route.continue(); });
  const w = watch(page, { api: "http://localhost:5080", expectedConsole: [/negotiation/i, /signalr/i, /WebSocket/i, /Failed to load resource/i] });
  await page.goto("http://localhost:5173/"); await page.getByRole("listitem").filter({ hasText: NAME }).first().waitFor({ timeout: 10000 });
  return { ctx, page, w, sent };
}
const card = (p, n) => p.getByRole("listitem").filter({ hasText: n }).first();
const dup = (p, n) => card(p, n).getByRole("button", { name: /Dupliquer/ });
const toasts = (p) => p.evaluate(() => window.__toasts);
const names = async () => (await api(1, "GET", "/boards")).body.map((b) => b.name);
// AC1 : un bouton Dupliquer distinct, pas de bouton imbrique
cur = await open(); let { page } = cur;
const nest = await page.evaluate(() => document.querySelectorAll("button button").length);
check("US2.AC1", (await dup(page, NAME).count()) === 1 && nest === 0, `bouton Dupliquer sur la carte=${await dup(page, NAME).count()} ; boutons imbriques=${nest}`);
await cur.ctx.close();
// AC2/AC3/AC5 : demande lente, bouton desactive pendant l envoi, un seul toast de succes, copie dans la liste, on reste sur la liste
cur = await open({ stub: async (r) => { await new Promise((x) => setTimeout(x, 800)); return r.continue(); } }); page = cur.page;
await dup(page, NAME).click(); await page.waitForTimeout(250);
const disabledNow = await dup(page, NAME).isDisabled(); const otherEnabled = !(await dup(page, LONG).isDisabled());
await page.waitForTimeout(1800);
const t3 = (await toasts(page)).filter((t) => /dupliqu/i.test(t.message || "")); const listed = await names();
const copyName = `${NAME} (copie)`; const stillList = (await card(page, NAME).count()) > 0;
check("US2.AC2/3/5", disabledNow && otherEnabled && t3.length === 1 && t3[0].kind === "success" && listed.includes(copyName) && stillList && (await card(page, copyName).count()) >= 1, `desactive pendant l envoi=${disabledNow} ; autres actifs=${otherEnabled} ; toast succes=${JSON.stringify(t3).slice(0, 80)} ; copie dans l API=${listed.includes(copyName)} ; copie visible dans la liste=${(await card(page, copyName).count()) >= 1} ; liste toujours affichee=${stillList}`);
// la copie est fidele, l original inchange (US1 par l ecran)
const copy = (await api(1, "GET", "/boards")).body.find((b) => b.name === copyName);
const ci = (await api(1, "GET", `/boards/${copy.id}/items`)).body; const ck = (await api(1, "GET", `/boards/${copy.id}/connectors`)).body; const cm = (await api(1, "GET", `/boards/${copy.id}/members`)).body;
const cB = ci.find((i) => i.content === "mk-B"), cD = ci.find((i) => i.type === "Freehand"), cA = ci.find((i) => i.content === "mk-A");
const cc = (await api(1, "GET", `/boards/${copy.id}/items/${cA.id}/comments`)).body;
check("US1.reel", ci.length === 3 && cB.isLocked === true && cD.points.length === 2 && cD.strokeWidth === 4 && ck.length === 1 && ck[0].fromItemId === cA.id && ck[0].toItemId === cB.id && cm.length === 1 && cm[0].role === "Owner" && (!Array.isArray(cc) || cc.length === 0) && copy.ownerId === 1, `elements=${ci.length} verrou=${cB.isLocked} trait=${cD.points.length}pts/${cD.strokeWidth} connecteur remappe=${ck[0]?.fromItemId === cA.id && ck[0]?.toItemId === cB.id} membres=${JSON.stringify(cm.map((m) => m.role))} commentaires=${JSON.stringify(cc)}`);
check("US1.original", (await snap()) === before, "original strictement inchange");
await cur.ctx.close();
// AC2 bis : double clic instantane -> une seule demande
cur = await open({ stub: async (r) => { await new Promise((x) => setTimeout(x, 700)); return r.continue(); } }); page = cur.page;
const nBefore = (await names()).filter((n) => n === copyName).length;
await dup(page, NAME).dblclick(); await page.waitForTimeout(2200);
const nAfter = (await names()).filter((n) => n === copyName).length;
check("US2.dblclic", cur.sent.length === 1 && nAfter === nBefore + 1, `double clic instantane -> demandes=${cur.sent.length}, copies creees=${nAfter - nBefore}`);
await cur.ctx.close();
// deux duplications en vol sur deux cartes : les deux boutons restent desactives jusqu a leur propre reponse (trou revele par la loupe)
cur = await open({ stub: async (r) => { await new Promise((x) => setTimeout(x, 1500)); return r.continue(); } }); page = cur.page;
await dup(page, NAME).click(); await page.waitForTimeout(200); await dup(page, LONG).click(); await page.waitForTimeout(600);
const both = (await dup(page, NAME).isDisabled()) && (await dup(page, LONG).isDisabled());
await page.waitForTimeout(2600);
const bothBack = !(await dup(page, NAME).isDisabled()) && !(await dup(page, LONG).isDisabled());
check("US2.deux-en-vol", both && bothBack && cur.sent.length === 2, `deux cartes en vol : boutons desactives=${both} ; reactives apres reponse=${bothBack} ; demandes=${cur.sent.length}`);
await cur.ctx.close();
// AC4 : echec 500 puis 403 puis reseau : un seul message generique, aucun succes, rien cree
for (const [label, stub] of [["500", (r) => r.fulfill({ status: 500, contentType: "application/json", body: "{}" })], ["403", (r) => r.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ message: "x" }) })], ["reseau", (r) => r.abort("connectionrefused")]]) {
  cur = await open({ stub }); page = cur.page; const nb = (await names()).length;
  await dup(page, NAME).click(); await page.waitForTimeout(1200);
  const ts = await toasts(page); cur.w.take();
  check(`US2.AC4-${label}`, ts.length === 1 && ts[0].kind === "error" && /Une erreur est survenue/.test(ts[0].message) && (await names()).length === nb, `${label} -> toasts=${JSON.stringify(ts).slice(0, 120)} ; tableaux avant/apres=${nb}/${(await names()).length}`, true);
  await cur.ctx.close();
}
// AC2 : clic sur la zone d ouverture ouvre toujours le tableau ; nom de 100 car. : pas de debordement, bouton visible
cur = await open(); page = cur.page;
const ov = await overflowing(page); const box = await dup(page, LONG).boundingBox();
check("US2.debordement", ov.filter((o) => !/N13\d+x{10}/.test(o.text) || true).length === 0 && box && box.width >= 20 && box.height >= 20, `debordements=${JSON.stringify(ov).slice(0, 160)} ; bouton Dupliquer de la carte au nom de 100 car. = ${JSON.stringify(box)}`);
await card(page, NAME).getByRole("button").first().click(); await page.waitForTimeout(1200);
check("US2.ouverture", (await page.getByRole("listitem").filter({ hasText: NAME }).count()) === 0, "clic sur la zone d ouverture : le tableau s ouvre (la liste est remplacee)");
await cur.ctx.close(); await browser.close();
writeFileSync(E + `results-N13-${RUN}.json`, JSON.stringify(results, null, 1));
console.log(`${results.filter((r) => r.ok).length}/${results.length}`);
