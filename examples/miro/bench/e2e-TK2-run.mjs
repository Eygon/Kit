// E2E TK-2 « Dupliquer avec Ctrl+D » (passage /sk-notion, Playwright faute de Claude in Chrome sur le banc).
// Back :5080, front :5173 servi depuis le slot. Fixtures creees par l API puis supprimees.
// Usage : node e2e-TK2-run.mjs <run> [<slot>]   -> results-TK2-<run>.json
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { watch } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const E = new URL(".", import.meta.url).pathname;
const RUN = process.argv[2] || "1";
const SLOT = process.argv[3];
const TW = readFileSync(E + "tw.css", "utf8");
const API = "http://localhost:5080/api/v1/boards/1";
const api = async (path, method = "GET", body, user = 1) => {
  const r = await fetch(API + path, { method, headers: { "X-User-Id": String(user), "Content-Type": "application/json" }, body: body && JSON.stringify(body) });
  return r.status === 204 ? null : r.json();
};
const items = () => api("/items");
const results = [];

// Fixtures (hors des elements d origine, x >= 900)
const base = new Set((await items()).map((i) => i.id));
const mk = (b) => api("/items", "POST", { content: "", ...b });
const sticky = await mk({ type: "StickyNote", x: 900, y: 50, width: 180, height: 140, color: "#fde68a", content: "Idée" });
const shape = await mk({ type: "Shape", x: 900, y: 330, width: 160, height: 100, color: "#bfdbfe", content: "Forme" });
const text = await mk({ type: "Text", x: 1120, y: 330, width: 160, height: 40, color: "#111827", content: "Texte e2e" });
const free = await mk({ type: "Freehand", x: 1120, y: 120, width: 120, height: 4, color: "#111827", points: [{ x: 0, y: 2 }, { x: 120, y: 2 }], strokeWidth: 4 });
const locked = await mk({ type: "Shape", x: 640, y: 500, width: 160, height: 100, color: "#bbf7d0", content: "Verrou" });
await api(`/items/${locked.id}`, "PATCH", { isLocked: true });
const conn = await api("/connectors", "POST", { fromItemId: sticky.id, toItemId: shape.id, style: 0 });

const browser = await chromium.launch();
async function open(user = 1) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript((css) => { document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); }); }, TW);
  // Identite du front = constante CURRENT_USER_ID de src/config/apiConfig.ts : on sert le module
  // reecrit (sinon le front se croit Alice/Owner et seul le back refuse).
  if (user !== 1) await ctx.route(/\/src\/config\/apiConfig\.ts/, async (route) => {
    const r = await route.fetch(); const body = (await r.text()).replace(/CURRENT_USER_ID = "1"/, `CURRENT_USER_ID = "${user}"`);
    route.fulfill({ response: r, body });
  });
  if (user !== 1) await ctx.route("http://localhost:5080/**", (route) => {
    const req = route.request();
    route.continue({ url: req.url().replace(/userId=1\b/, `userId=${user}`), headers: { ...req.headers(), "x-user-id": String(user) } });
  });
  const page = await ctx.newPage();
  const w = watch(page, { api: "http://localhost:5080", expectedConsole: [/negotiation/i, /signalr/i, /WebSocket/i] });
  await page.goto("http://localhost:5173/");
  await page.getByText("Sprint planning").first().click();
  await page.locator(`[data-testid="canvas-item-${sticky.id}"]`).waitFor({ timeout: 10000 });
  await page.waitForTimeout(600);
  return { ctx, page, w };
}
const { page, w } = await open();
const check = (id, ok, detail, watcher = w) => {
  const t = watcher.take(); const bad = t.fiveXX.length || t.console.length; const v = ok && !bad;
  results.push({ id, ok: v, detail, fiveXX: t.fiveXX, console: t.console });
  console.log(`${v ? "PASS" : "FAIL"} ${id} ${detail}${bad ? " | 5xx/console: " + JSON.stringify([t.fiveXX, t.console]).slice(0, 300) : ""}`);
};
// Coin haut-gauche : une copie (+20/+20) recouvre le reste de l original
const sel = (p, id) => p.locator(`[data-testid="canvas-item-${id}"]`).click({ position: { x: 5, y: 2 } });
const fresh = async (before) => (await items()).filter((i) => !before.has(i.id));
const ids = async () => new Set((await items()).map((i) => i.id));
// Clic sur une zone vide du canevas (bas-centre de la vue : ni element, ni mini-carte)
const blank = async () => { const b = await page.locator('[data-testid="board-viewport"]').boundingBox(); await page.mouse.click(b.x + b.width * 0.45, b.y + b.height - 30); };
const settle = (p = page) => p.waitForTimeout(700);
const same = (a, b, keys) => keys.every((k) => JSON.stringify(a[k]) === JSON.stringify(b[k]));
const isSel = async (p, id) => (await p.locator(`[data-testid="canvas-item-${id}"]`).getAttribute("aria-selected")) === "true";

// #1 post-it : copie +20/+20, memes taille/couleur/texte, la copie devient la selection
let before = await ids();
await sel(page, sticky.id);
await page.keyboard.press("Control+d"); await settle();
let n = await fresh(before);
const c1 = n[0];
check("#1", n.length === 1 && c1.x === sticky.x + 20 && c1.y === sticky.y + 20 && same(c1, sticky, ["width", "height", "color", "content", "type"]) && await isSel(page, c1.id),
  `copies=${n.length} ${c1 ? `(${c1.x},${c1.y}) ${c1.width}x${c1.height} ${c1.color} « ${c1.content} » selection=${await isSel(page, c1.id)}` : ""}`);

// #5 Ctrl+D a nouveau sur la copie selectionnee -> 3e element a +20 de la 2e
before = await ids(); await page.keyboard.press("Control+d"); await settle();
n = await fresh(before);
check("#5", n.length === 1 && c1 && n[0].x === c1.x + 20 && n[0].y === c1.y + 20, n[0] ? `(${n[0].x},${n[0].y})` : "aucune copie");

// #6 Ctrl+Z supprime la derniere copie, l original reste
const last = n[0];
await page.keyboard.press("Control+z"); await settle();
let now = await ids();
check("#6", last && !now.has(last.id) && now.has(sticky.id), `copie ${last?.id} ${now.has(last?.id) ? "toujours la" : "supprimee"}, original ${now.has(sticky.id) ? "present" : "ABSENT"}`);

// #2 Cmd+D (Mac) sur une forme
before = await ids(); await sel(page, shape.id); await page.keyboard.press("Meta+d"); await settle();
n = await fresh(before);
check("#2", n.length === 1 && n[0].type === "Shape" && n[0].x === shape.x + 20 && same(n[0], shape, ["width", "height", "color", "content"]), n[0] ? `${n[0].type} (${n[0].x},${n[0].y})` : "aucune copie");

// #3 texte
before = await ids(); await sel(page, text.id); await page.keyboard.press("Control+d"); await settle();
n = await fresh(before);
check("#3", n.length === 1 && n[0].x === text.x + 20 && n[0].y === text.y + 20 && same(n[0], text, ["type", "width", "height", "color", "content"]), n[0] ? `${n[0].type} « ${n[0].content} » (${n[0].x},${n[0].y})` : "aucune copie");

// #4 trace libre horizontal (hauteur = epaisseur) : memes points, meme epaisseur
before = await ids(); await sel(page, free.id); await page.keyboard.press("Control+d"); await settle();
n = await fresh(before);
check("#4", n.length === 1 && n[0].type === "Freehand" && n[0].x === free.x + 20 && same(n[0], free, ["points", "strokeWidth", "width", "height", "color"]), n[0] ? `${n[0].type} pts=${JSON.stringify(n[0].points)} sw=${n[0].strokeWidth}` : "aucune copie");

// #7 element verrouille : copie creee, non verrouillee
before = await ids(); await sel(page, locked.id); await page.keyboard.press("Control+d"); await settle();
n = await fresh(before);
check("#7", n.length === 1 && n[0].isLocked === false && n[0].x === locked.x + 20, n[0] ? `copie isLocked=${n[0].isLocked}` : "aucune copie");

// #9 aucune selection, puis connecteur selectionne -> rien
before = await ids();
await blank();
await page.keyboard.press("Control+d"); await settle();
const none1 = (await fresh(before)).length;
const hit = page.locator(`[data-testid="connector-hit-${conn.id}"]`);
let connSel = false;
if (await hit.count()) { await hit.click({ force: true }); connSel = true; await page.keyboard.press("Control+d"); await settle(); }
const none2 = (await fresh(before)).length;
check("#9", none1 === 0 && connSel && none2 === 0, `sans selection: ${none1} copie(s) ; connecteur ${connSel ? "selectionne" : "INTROUVABLE"}: ${none2 - none1} copie(s)`);

// #10 curseur dans un champ (commentaires) -> rien, le champ garde la saisie
before = await ids(); await sel(page, sticky.id);
const commentsBtn = page.getByRole("button", { name: /Commentaires/ }).first();
let typed = null;
if (await commentsBtn.count()) { await commentsBtn.click(); const ta = page.locator("textarea").first(); if (await ta.count()) { await ta.click(); await ta.type("abc"); await page.keyboard.press("Control+d"); await settle(); typed = await ta.inputValue(); } }
n = await fresh(before);
check("#10", typed !== null && typed.endsWith("abc") && n.length === 0, `champ=${JSON.stringify(typed)} copies=${n.length}`);
await page.keyboard.press("Escape");

// Bord : Ctrl+D hors champ -> action navigateur (favori) empechee
await blank();
const dp = await page.evaluate(() => new Promise((res) => {
  window.addEventListener("keydown", (e) => setTimeout(() => res(e.defaultPrevented), 0), { once: true, capture: true });
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "d", code: "KeyD", ctrlKey: true, bubbles: true, cancelable: true }));
}));
check("#E1", dp === true, `defaultPrevented=${dp}`);

// #11 aide des raccourcis : « Dupliquer la sélection » + Ctrl D dans Édition ; cle en/es
await blank();
const dialog = page.getByRole("dialog", { name: "Raccourcis clavier" });
await page.keyboard.press("Shift+Slash");
let open11 = await dialog.waitFor({ timeout: 3000 }).then(() => true).catch(() => false);
if (!open11) { await page.keyboard.type("?"); open11 = await dialog.waitFor({ timeout: 3000 }).then(() => true).catch(() => false); }
const help = open11 ? await dialog.innerText() : "";
const edition = help.split(/NAVIGATION/)[0];
let locOk = true, locDetail = "";
if (SLOT) for (const l of ["en", "es"]) {
  const j = JSON.parse(readFileSync(`${SLOT}/src/i18n/locales/${l}.json`, "utf8"));
  const v = j?.pages?.board?.shortcuts?.actions?.duplicateSelection; locDetail += ` ${l}=${JSON.stringify(v)}`; locOk &&= !!v;
}
check("#11", open11 && /Dupliquer la sélection/.test(edition) && /Ctrl\s*\n?\s*D\b/.test(edition) && locOk, `${JSON.stringify(edition.slice(0, 160))}${locDetail}`);
await page.keyboard.press("Escape");

// #8 lecteur (Carol, Viewer) : rien n est cree
const v = await open(3);
before = await ids();
await sel(v.page, sticky.id); await v.page.keyboard.press("Control+d"); await settle(v.page);
n = await fresh(before);
const vnet = v.w.take().net || [];
const posts = vnet.filter((x) => x.m === "POST" && /\/items$/.test(x.u));  // la negociation SignalR est aussi un POST
check("#8", n.length === 0 && posts.length === 0, `copies=${n.length} POST /items=${posts.length}`, v.w);

writeFileSync(E + `results-TK2-${RUN}.json`, JSON.stringify(results, null, 1));
await browser.close();
// Nettoyage : tout ce que le run a cree
await api(`/connectors/${conn.id}`, "DELETE").catch(() => {});
for (const i of await items()) if (!base.has(i.id)) { if (i.isLocked) await api(`/items/${i.id}`, "PATCH", { isLocked: false }); await api(`/items/${i.id}`, "DELETE"); }
