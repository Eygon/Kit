// E2E N3 « Renommer un tableau » (Playwright, front :5173 + back REEL :5080 construits depuis les slots).
// Cahier tire des Acceptance Scenarios de spec.md : US2 (UI, AC1 a AC12) et le chemin reel du contrat (US1) de bout en bout.
// Usage : node e2e-N3-run.mjs <run>   -> results-N3-<run>.json
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { watch, overflowing } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const E = new URL(".", import.meta.url).pathname;
const RUN = process.argv[2] || "1";
const TW = readFileSync(E + (process.env.TW_CSS || "tw.css"), "utf8");
const API = "http://localhost:5080/api/v1";
const api = async (user, method, path, body) => {
  const r = await fetch(API + path, { method, headers: { "X-User-Id": String(user), ...(body ? { "Content-Type": "application/json" } : {}) }, body: body && JSON.stringify(body) });
  const t = await r.text(); return { status: r.status, body: t ? JSON.parse(t) : null };
};
const results = [];
const browser = await chromium.launch();
const OWNED = "Sprint planning", OTHER = "Retrospective";
const card = (p, name) => p.getByRole("listitem").filter({ hasText: name });
const field = (p) => p.getByRole("textbox", { name: /^Nouveau nom/ });
let cur;
async function open(stubPatch) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript((css) => { document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.prepend(s); }); }, TW);
  await ctx.addInitScript(() => { window.__toasts = []; window.addEventListener("septeo-toast", (e) => window.__toasts.push(e.detail)); });
  const page = await ctx.newPage();
  const sent = [];
  await page.route("**/api/v1/boards/*", async (route) => {
    const req = route.request();
    if (req.method() === "PATCH") { sent.push(req.postDataJSON()); if (stubPatch) return stubPatch(route); }
    return route.continue();
  });
  const w = watch(page, { api: "http://localhost:5080", expectedConsole: [/negotiation/i, /signalr/i, /WebSocket/i, /Failed to load resource/i] });
  await page.goto("http://localhost:5173/");
  await card(page, OWNED).first().waitFor({ timeout: 10000 });
  return { ctx, page, w, sent };
}
const check = (id, ok, detail, { allow5xx = false } = {}) => {
  const t = cur.w.take(); const bad = (!allow5xx && t.fiveXX.length) || t.console.length; const v = ok && !bad;
  results.push({ id, ok: v, detail });
  console.log(`${v ? "PASS" : "FAIL"} ${id} ${detail}${bad ? " | 5xx/console: " + JSON.stringify([t.fiveXX, t.console]).slice(0, 300) : ""}`);
};
const pencil = (p, name) => card(p, name).getByRole("button", { name: new RegExp(`^Renommer le tableau ${name}`) });
const restore = async () => { await api(1, "PATCH", "/boards/1", { name: OWNED }); };
await restore();


cur = await open(); let { page, sent } = cur;
// AC1 crayon -> champ prerempli et focalise
await pencil(page, OWNED).click();
const f1 = field(page);
check("#2.1", (await f1.inputValue()) === OWNED && (await f1.evaluate((e) => document.activeElement === e)), `crayon -> champ prerempli=${JSON.stringify(await f1.inputValue())} focalise=${await f1.evaluate((e) => document.activeElement === e)}`);
await page.keyboard.press("Escape");
// AC2 double-clic sur le nom : edition, tableau non ouvert ; clic simple n ouvre pas
await card(page, OWNED).getByText(OWNED, { exact: true }).click();
const openedBySingle = (await page.getByRole("button", { name: /Retour/ }).count()) > 0;
await card(page, OWNED).getByText(OWNED, { exact: true }).dblclick();
const dblOpen = (await field(page).count()) === 1; const notOpened = (await page.getByRole("button", { name: /Retour/ }).count()) === 0;
check("#2.2", !openedBySingle && dblOpen && notOpened, `clic simple ouvre=${openedBySingle} ; double-clic -> champ=${dblOpen}, tableau ouvert=${!notOpened}`);
// AC5 Echap sans envoi
await field(page).fill("Autre nom"); await page.keyboard.press("Escape");
check("#2.5", (await field(page).count()) === 0 && (await card(page, OWNED).count()) === 1 && sent.length === 0, `Echap : champ ferme, nom ${OWNED} conserve, requetes PATCH=${sent.length}`);
// AC6 perte de focus annule
await pencil(page, OWNED).click(); await field(page).fill("Autre nom"); await page.getByRole("heading").first().click();
await page.waitForTimeout(300);
check("#2.6", (await field(page).count()) === 0 && sent.length === 0, `blur : champ ferme=${(await field(page).count()) === 0}, requetes=${sent.length}`);
// AC7 vide / 101 caracteres : rien d envoye, erreur, champ ouvert
await pencil(page, OWNED).click(); await field(page).fill("   "); await page.keyboard.press("Enter");
const errReq = await page.getByText("Le nom est obligatoire.").count();
await field(page).fill("x".repeat(101)); await page.keyboard.press("Enter");
const errLen = await page.getByText(/ne doit pas dépasser 100 caractères/).count();
check("#2.7", errReq === 1 && errLen === 1 && (await field(page).count()) === 1 && sent.length === 0, `vide -> erreur=${errReq} ; 101 car. -> erreur=${errLen} ; champ ouvert ; requetes=${sent.length}`);
// AC8 Entree sans changement
await field(page).fill("  " + OWNED + "  "); await page.keyboard.press("Enter"); await page.waitForTimeout(300);
check("#2.8", (await field(page).count()) === 0 && sent.length === 0, `Entree sans changement : champ ferme, requetes=${sent.length}`);
// AC4 renommage reel de bout en bout (trim, succes, carte, serveur)
await pencil(page, OWNED).click(); await field(page).fill("  Rétro Q4  "); await page.keyboard.press("Enter");
await card(page, "Rétro Q4").first().waitFor({ timeout: 8000 });
const toast = (await page.evaluate(() => window.__toasts)).filter((t) => t.kind === "success" && /renomm/i.test(t.message)).length;
const server = (await api(1, "GET", "/boards/1")).body;
check("#2.4", sent.length === 1 && sent[0].name === "Rétro Q4" && toast === 1 && server.name === "Rétro Q4" && (await field(page).count()) === 0, `PATCH envoye=${JSON.stringify(sent)} ; toast=${toast} ; carte renommee ; serveur=${JSON.stringify(server.name)}`);
// AC3 clic ailleurs sur la carte (compteurs/date/avatar) : le tableau s ouvre ; page du tableau avec le nouveau nom
await card(page, "Rétro Q4").getByText(/élément|item/i).first().click();
await page.getByRole("button", { name: /Retour/ }).first().waitFor({ timeout: 10000 });
await page.getByText("Rétro Q4").first().waitFor({ timeout: 8000 }).catch(() => {});
const title = await page.locator("body").innerText();
check("#2.3", /Rétro Q4/.test(title), `clic sur les compteurs -> tableau ouvert ; nom affiche sur la page du tableau : ${/Rétro Q4/.test(title)}`);
await api(1, "PATCH", "/boards/1", { name: OWNED });
await cur.ctx.close();

// AC11 tableau d un autre : pas de crayon, double-clic sans edition, clic ouvre
cur = await open(); page = cur.page;
const noPencil = (await card(page, OTHER).getByRole("button", { name: /^Renommer/ }).count()) === 0;
await card(page, OTHER).getByText(OTHER, { exact: true }).dblclick().catch(() => {});
const noEdit = (await field(page).count()) === 0;
const opened = await page.getByRole("button", { name: /Retour/ }).first().waitFor({ timeout: 5000 }).then(() => true).catch(() => false);
check("#2.11", noPencil && noEdit && opened, `autre proprietaire : crayon absent=${noPencil}, pas d edition=${noEdit}, clic ouvre le tableau=${opened}`);
await cur.ctx.close();

// AC9 pas de second envoi pendant un envoi en cours
cur = await open((route) => new Promise((r) => setTimeout(r, 1500)).then(() => route.continue())); page = cur.page; sent = cur.sent;
await pencil(page, OWNED).click(); await field(page).fill("Double"); await page.keyboard.press("Enter"); await page.keyboard.press("Enter"); await page.waitForTimeout(2500);
check("#2.9", sent.length === 1, `Entree deux fois pendant l envoi : requetes PATCH=${sent.length}`);
await api(1, "PATCH", "/boards/1", { name: OWNED }); await cur.ctx.close();

// AC10 refus serveur (403 simule) : message habituel, champ ouvert avec la saisie, nom ancien
cur = await open((route) => route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ message: "Only the owner can rename this board." }) })); page = cur.page; sent = cur.sent;
await pencil(page, OWNED).click(); await field(page).fill("Refuse"); await page.keyboard.press("Enter"); await page.waitForTimeout(800);
const stillOpen = (await field(page).count()) === 1 && (await field(page).inputValue()) === "Refuse";
const srv = (await api(1, "GET", "/boards/1")).body.name;
check("#2.10", stillOpen && srv === OWNED, `403 : champ reste ouvert avec la saisie=${stillOpen} ; serveur inchange=${JSON.stringify(srv)}`, { allow5xx: true });
await cur.ctx.close();

// AC12 nom existant > 100 caracteres (cree avant la regle : limite de creation 120)
const stamp = String(Date.now()).slice(-6);
const long = "L".repeat(99) + stamp;
const lb = (await api(1, "POST", "/boards", { name: long })).body;
cur = await open(); page = cur.page; sent = cur.sent;
await page.reload(); await card(page, stamp).first().waitFor({ timeout: 10000 });
const overflow = await overflowing(page);
const penBox = await card(page, stamp).getByRole("button", { name: /^Renommer/ }).boundingBox();
check("#2.12b", overflow.length === 0 && penBox && penBox.width > 8, `nom de 105 car. sans espace : debordement=${JSON.stringify(overflow.slice(0, 2))}, crayon ${penBox ? Math.round(penBox.width) + " px de large" : "absent"}`);
await card(page, stamp).getByRole("button", { name: /^Renommer/ }).click({ force: true }); await page.keyboard.press("Enter");
check("#2.12", (await page.getByText(/ne doit pas dépasser 100 caractères/).count()) === 1 && sent.length === 0, `nom de 105 car. : erreur de longueur=${await page.getByText(/ne doit pas dépasser 100 caractères/).count()}, requetes=${sent.length}`);
await cur.ctx.close();
await api(1, "DELETE", `/boards/${lb.id}`).catch(() => {});
await restore();

// Contrat reel (US1) de bout en bout : 403 editeur, 404, 400
const e = await api(2, "PATCH", "/boards/1", { name: "Pirate" });
const nf = await api(1, "PATCH", "/boards/999999", { name: "X" });
const bad = await api(1, "PATCH", "/boards/1", { name: "   " });
cur = { w: { take: () => ({ fiveXX: [], console: [] }) } };
check("#C.contrat", e.status === 403 && nf.status === 404 && bad.status === 400 && (await api(1, "GET", "/boards/1")).body.name === OWNED, `membre non proprietaire=${e.status}, inexistant=${nf.status}, nom blanc=${bad.status}, nom intact`);
writeFileSync(E + `results-N3-${RUN}.json`, JSON.stringify(results, null, 1));
await browser.close();
