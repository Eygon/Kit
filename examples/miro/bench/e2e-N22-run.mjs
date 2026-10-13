// E2E N22 « Modeles de tableau » : API reelle (US1) + navigateur sur l API reelle (US2, US3).
// Usage : TW_CSS=tw-N22.css node e2e-N22-run.mjs <run>   -> results-N22-<run>.json
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { watch, overflowing, unreachable, clippedOut, unreadable } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const E = new URL(".", import.meta.url).pathname; const RUN = process.argv[2] || "1";
const TW = readFileSync(E + (process.env.TW_CSS || "tw.css"), "utf8");
const API = "http://localhost:5080/api/v1";
const api = async (u, m, p, b) => { const r = await fetch(API + p, { method: m, headers: { ...(u ? { "X-User-Id": String(u) } : {}), ...(b !== undefined ? { "Content-Type": "application/json" } : {}) }, body: b !== undefined ? JSON.stringify(b) : undefined }); const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch { j = t; } return { status: r.status, body: j }; };
const results = []; const log = (id, ok, d) => { results.push({ id, ok: !!ok, detail: d }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${d}`); };
const STAMP = String(Date.now()).slice(-6) + RUN; const NAME = `N22-${STAMP}`;
const mkBoard = async (u, name) => (await api(u, "POST", "/boards", { name })).body;
const item = (u, b, extra = {}) => api(u, "POST", `/boards/${b}/items`, { type: "StickyNote", x: 40, y: 40, width: 120, height: 80, content: "c", color: "#fde68a", ...extra });
// ---------------- US1 : API
const SRC = await mkBoard(1, NAME);
await api(1, "POST", `/boards/${SRC.id}/members`, { userId: 2, role: "Editor" }); await api(1, "POST", `/boards/${SRC.id}/members`, { userId: 3, role: "Viewer" });
const a = (await item(1, SRC.id, { content: "Alpha", x: 100, y: 100 })).body; const b = (await item(1, SRC.id, { content: "Bravo", x: 400, y: 100, color: "#fecaca" })).body; const lk = (await item(1, SRC.id, { content: "Verrou", x: 100, y: 300 })).body;
await api(1, "PATCH", `/boards/${SRC.id}/items/${lk.id}`, { isLocked: true });
await api(1, "POST", `/boards/${SRC.id}/connectors`, { fromItemId: a.id, toItemId: b.id, style: "Arrow" }); await api(1, "POST", `/boards/${SRC.id}/items/${a.id}/comments`, { body: "secret" });
const save = (u, id, body) => api(u, "POST", `/boards/${id}/template`, body);
const bad = [await save(1, SRC.id, { name: "" }), await save(1, SRC.id, { name: "   " }), await save(1, SRC.id, { name: "x".repeat(61) }), await save(1, SRC.id, { name: "ok", description: "d".repeat(201) })];
const ord = [await save(null, SRC.id, { name: "" }), await save(null, SRC.id, { name: "ok" }), await save(1, 999999, { name: "" }), await save(3, 999999, { name: "ok" }), await save(2, SRC.id, { name: "ok" }), await save(3, SRC.id, { name: "ok" }), await save(4, SRC.id, { name: "ok" })];
log("US1.validation", bad.every((r) => r.status === 400), `nom vide / blanc / 61 car., description 201 -> ${bad.map((r) => r.status)}`);
log("US1.ordre-controles", JSON.stringify(ord.map((r) => r.status)) === JSON.stringify([401, 401, 400, 404, 403, 403, 403]), `sans identite+invalide, sans identite, inconnu+invalide, inconnu non-membre, editeur, lecteur, non-membre -> ${ord.map((r) => r.status)} (attendu 401,401,400,404,403,403,403 : 401 -> 400 -> 404 -> 403 -> 409)`);
const t1 = await save(1, SRC.id, { name: "  Retro sprint  ", description: "  Colonnes standard  " });
log("US1.enregistrement", t1.status === 201 && t1.body.name === "Retro sprint" && t1.body.description === "Colonnes standard" && t1.body.itemCount === 3, `201 ${JSON.stringify(t1.body)}`);
const emptyDesc = await save(1, SRC.id, { name: "Sans description", description: "   " });
const t3 = await save(1, SRC.id, { name: "N".repeat(60), description: "d".repeat(200) });
const lst = await api(1, "GET", "/templates");
log("US1.liste", lst.status === 200 && lst.body.length === 3 && lst.body[0].id === t3.body.id && lst.body[2].id === t1.body.id && emptyDesc.body.description == null, `liste ${lst.body.map((t) => t.name.slice(0, 12)).join(" | ")} (plus recent d abord) ; description blanche -> ${JSON.stringify(emptyDesc.body.description)}`);
const other = await api(2, "GET", "/templates"); const delOther = await api(2, "DELETE", `/templates/${t1.body.id}`); const fromOther = await api(2, "POST", `/templates/${t1.body.id}/boards`, {});
log("US1.personnels", other.status === 204 && delOther.status === 404 && fromOther.status === 404, `autre utilisateur : liste ${other.status}, suppression ${delOther.status}, creation ${fromOther.status} (404 pour un modele d autrui)`);
// instantane : le tableau d origine change puis disparait
await api(1, "PATCH", `/boards/${SRC.id}/items/${a.id}`, { content: "Alpha modifie" });
const mk1 = await api(1, "POST", `/templates/${t1.body.id}/boards`, {});
const itemsOf = async (id) => (await api(1, "GET", `/boards/${id}/items`)).body; const connsOf = async (id) => (await api(1, "GET", `/boards/${id}/connectors`)).body;
const ni = await itemsOf(mk1.body.id); const nc = await connsOf(mk1.body.id);
const idsNew = new Set(ni.map((i) => i.id)); const mem = (await api(1, "GET", `/boards/${mk1.body.id}/members`)).body;
log("US1.creation", mk1.status === 201 && mk1.body.name === "Retro sprint (copie)" && ni.length === 3 && ni.some((i) => i.content === "Alpha") && !ni.some((i) => i.content === "Alpha modifie") && ni.every((i) => !i.isLocked) && nc.length === 1 && idsNew.has(nc[0].fromItemId) && idsNew.has(nc[0].toItemId) && ![a.id, b.id, lk.id].some((x) => idsNew.has(x)) && mem.length === 1 && mem[0].role === "Owner", `creation ${mk1.status} « ${mk1.body.name} » : ${ni.length} elements (instantane : « Alpha »), verrous retires=${ni.every((i) => !i.isLocked)}, connecteur remappe=${nc.length === 1 && idsNew.has(nc[0].fromItemId)}, membres=${mem.length}`);
const cmts = await api(1, "GET", `/boards/${mk1.body.id}/items/${ni.find((i) => i.content === "Alpha").id}/comments`);
await api(1, "DELETE", `/boards/${SRC.id}`);
const mk2 = await api(1, "POST", `/templates/${t1.body.id}/boards`, { name: "Nom perso" }); const mk3 = await api(1, "POST", `/templates/${t1.body.id}/boards`, { name: "x".repeat(101) }); const mk4 = await api(1, "POST", `/templates/${t1.body.id}/boards`, { name: "   " }); const mk0 = await api(null, "POST", `/templates/${t1.body.id}/boards`, { name: "x".repeat(101) });
log("US1.creation-nom-et-source-supprimee", mk2.status === 201 && mk2.body.name === "Nom perso" && mk3.status === 400 && mk4.status === 201 && mk4.body.name === "Retro sprint (copie)" && mk0.status === 401 && (Array.isArray(cmts.body) ? cmts.body.length === 0 : cmts.status === 204), `source supprimee : creation ${mk2.status} « ${mk2.body && mk2.body.name} » ; nom 101 -> ${mk3.status} ; nom blanc -> ${mk4.status} « ${mk4.body && mk4.body.name} » ; sans identite+nom invalide -> ${mk0.status} ; commentaires copies=${Array.isArray(cmts.body) ? cmts.body.length : cmts.status}`);
const del = await api(1, "DELETE", `/templates/${t3.body.id}`); const del2 = await api(1, "DELETE", `/templates/${t3.body.id}`);
log("US1.suppression", del.status === 204 && del2.status === 404, `suppression ${del.status} puis ${del2.status}`);
// quota : 20 modeles
const Q = await mkBoard(2, `Q-${STAMP}`); await item(2, Q.id, { content: "q" }); const qs = [];
for (let i = 0; i < 20; i++) qs.push((await save(2, Q.id, { name: `Quota ${i}` })).status);
const q21 = await save(2, Q.id, { name: "21e" }); const q21bad = await save(2, Q.id, { name: "" });
log("US1.quota", qs.every((s) => s === 201) && q21.status === 409 && q21bad.status === 400, `20 modeles -> 201 x${qs.filter((s) => s === 201).length} ; 21e -> ${q21.status} ; 21e invalide -> ${q21bad.status} (400 avant 409)`);
// ---------------- UI
const browser = await chromium.launch(); let cur;
async function open({ viewerOf, stubTemplates, user = 1, locale = "fr-FR" } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale });
  await ctx.addInitScript((css) => { window.__toasts = []; window.addEventListener("septeo-toast", (e) => window.__toasts.push(e.detail)); document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.prepend(s); }); }, TW);
  const page = await ctx.newPage(); const st = { stub: stubTemplates, tpl: [] };
  await page.route(/\/api\/v1\/templates(\/.*)?$/, async (r) => { st.tpl.push(r.request().method() + " " + r.request().url().replace(/.*\/templates/, "/templates")); if (st.stub) return st.stub(r); return r.continue(); });
  const w = watch(page, { api: "http://localhost:5080", expectedConsole: [/negotiation/i, /signalr/i, /WebSocket/i, /Failed to load resource/i] });
  await page.goto("http://localhost:5173/"); await page.waitForTimeout(1200);
  return { ctx, page, w, st };
}
const chk = (id, ok, d, allow5xx) => { const t = cur.w.take(); const bad = (!allow5xx && t.fiveXX.length) || t.console.length; log(id, ok && !bad, d + (bad ? " | 5xx/console: " + JSON.stringify([t.fiveXX, t.console]).slice(0, 220) : "")); };
const toasts = (p) => p.evaluate(() => window.__toasts);
const openBoard = async (p, name) => { await p.getByText(name, { exact: false }).first().dispatchEvent("click"); await p.locator('[data-testid^="canvas-item-"]').first().waitFor({ timeout: 10000 }); await p.waitForTimeout(800); };
// un tableau source pour l UI (l API repart a zero : les tableaux de l US1 sont supprimes)
const UIB = await mkBoard(1, `UI-${STAMP}`); await item(1, UIB.id, { content: "Un", x: 100, y: 100 }); await item(1, UIB.id, { content: "Deux", x: 400, y: 100 });
await api(1, "POST", `/boards/${UIB.id}/members`, { userId: 2, role: "Editor" });
// US2 : bouton reserve au proprietaire
cur = await open(); let { page } = cur; await openBoard(page, `UI-${STAMP}`);
const BTN = (p) => p.getByRole("button", { name: /Enregistrer comme modèle/ });
const ownerSees = (await BTN(page).count()) === 1; await cur.ctx.close();
cur = await open({}); // editeur : on simule le role par la liste des membres
await cur.page.route(new RegExp(`/boards/${UIB.id}/members$`), async (r) => { const j = await (await r.fetch()).json(); r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(j.map((m) => (m.userId === 1 ? { ...m, role: "Editor" } : m))) }); });
await openBoard(cur.page, `UI-${STAMP}`); const editorSees = await BTN(cur.page).count(); await cur.ctx.close();
cur = await open(); page = cur.page; await openBoard(page, `UI-${STAMP}`);
chk("US2.bouton-proprietaire", ownerSees && editorSees === 0, `proprietaire voit le bouton=${ownerSees} ; editeur=${editorSees}`);
// fenetre : champs, compteurs, erreurs
await BTN(page).dispatchEvent("click"); await page.waitForTimeout(400);
const dlg = page.getByRole("dialog").first(); const nameIn = page.getByLabel(/Nom du modèle/); const descIn = page.getByLabel(/Description/);
await page.getByRole("button", { name: /^Enregistrer$/ }).dispatchEvent("click"); await page.waitForTimeout(250); const errEmpty = await page.getByText("Le nom est obligatoire.").count();
await nameIn.fill("x".repeat(61)); await page.waitForTimeout(200); const err61 = await page.getByText(/60 caractères au plus/).count(); const cnt = await page.getByText(/\d+\/60/).first().innerText().catch(() => "");
await descIn.fill("d".repeat(201)); await page.waitForTimeout(200); const errDesc = await page.getByText(/200 caractères au plus/).count();
const ov1 = await overflowing(page); const unr1 = await unreachable(page);
chk("US2.erreurs-de-champ", errEmpty >= 1 && err61 >= 1 && errDesc >= 1 && /61\/60/.test(cnt) && ov1.length === 0 && unr1.length === 0, `vide=${errEmpty} ; 61 car.=${err61} compteur « ${cnt} » ; description 201=${errDesc} ; debordements=${ov1.length} inatteignables=${unr1.length}`);
await nameIn.fill("Mon modèle"); await descIn.fill("Une description"); const before = (await api(1, "GET", "/templates")).body.length;
await page.getByRole("button", { name: /^Enregistrer$/ }).dispatchEvent("click"); await page.waitForTimeout(1200); const after = (await api(1, "GET", "/templates")).body;
const ts = (await toasts(page)).filter((t) => /Modèle enregistré/.test(t.message || ""));
chk("US2.enregistrement", after.length === (before === 0 ? 1 : before + 1) && after.some((t) => t.name === "Mon modèle" && t.itemCount === 2) && ts.length === 1 && (await page.getByRole("dialog").count()) === 0, `modeles ${before} -> ${after.length} ; toast succes=${ts.length} ; fenetre fermee=${(await page.getByRole("dialog").count()) === 0}`);
await cur.ctx.close();
// ---- liste des tableaux : nouveau depuis un modele
const OPEN = (p) => p.getByRole("button", { name: /Nouveau depuis un modèle/ });
cur = await open(); page = cur.page; await OPEN(page).dispatchEvent("click"); await page.waitForTimeout(900);
const rows = await page.getByRole("dialog").first().innerText();
chk("US3.liste", /Mon modèle/.test(rows) && /2 éléments/.test(rows) && /Une description/.test(rows), `fenetre : ${rows.replace(/\s+/g, " ").slice(0, 160)}`);
await cur.ctx.close();
// 20 modeles + noms et descriptions longs : atteignabilite, debordement
for (let i = 0; i < 19; i++) await save(1, UIB.id, { name: i === 0 ? "Z".repeat(60) : `Modele ${i} avec un nom un peu long pour la ligne`, description: i === 1 ? "D".repeat(200) : "Description du modele " + i });
cur = await open(); page = cur.page; await OPEN(page).dispatchEvent("click"); await page.waitForTimeout(1200);
const unr2 = await unreachable(page); const ov2 = await overflowing(page); const cl2 = await clippedOut(page, '[role="dialog"] *'); const unrd = await unreadable(page, { expected: [/Retrouvez et créez vos tableaux/] });
const list = page.getByRole("dialog").first();
chk("GEO.20-modeles", unr2.length === 0 && ov2.length === 0 && unrd.length === 0, `20 modeles : inatteignables=${JSON.stringify(unr2).slice(0, 200)} debordements=${JSON.stringify(ov2).slice(0, 200)} coupes=${cl2.length} illisibles=${JSON.stringify(unrd).slice(0, 200)}`);
await page.screenshot({ path: "/tmp/n22-list.png" });
// choisir un modele -> nom propose -> creer -> ouverture du tableau copie
await page.getByText("Mon modèle").first().dispatchEvent("click"); await page.waitForTimeout(500);
const nm = page.getByLabel(/Nom du nouveau tableau/); const proposed = await nm.inputValue();
await nm.fill(""); await page.getByRole("button", { name: /^Créer$/ }).dispatchEvent("click"); await page.waitForTimeout(300); const errNm = await page.getByText("Le nom est obligatoire.").count();
await nm.fill("Copie E2E " + STAMP); await page.getByRole("button", { name: /^Créer$/ }).dispatchEvent("click"); await page.waitForTimeout(1800);
const created = (await api(1, "GET", "/boards")).body.find((x) => x.name === "Copie E2E " + STAMP); const onBoard = await page.locator('[data-testid^="canvas-item-"]').count();
chk("US3.creation", proposed === "Mon modèle (copie)" && errNm >= 1 && !!created && onBoard === 2, `nom propose « ${proposed} » ; nom vide -> erreur=${errNm} ; tableau cree=${!!created} ; ouvert avec ${onBoard} elements`);
await cur.ctx.close();
// suppression avec confirmation
cur = await open(); page = cur.page; await OPEN(page).dispatchEvent("click"); await page.waitForTimeout(900); const n0 = (await api(1, "GET", "/templates")).body.length;
await page.getByRole("button", { name: /^Supprimer$/ }).first().dispatchEvent("click"); await page.waitForTimeout(300); const n1 = (await api(1, "GET", "/templates")).body.length; const confirmShown = await page.getByRole("button", { name: /^Confirmer$/ }).count();
await page.getByRole("button", { name: /^Annuler$/ }).first().dispatchEvent("click"); await page.waitForTimeout(300); const n2 = (await api(1, "GET", "/templates")).body.length;
await page.getByRole("button", { name: /^Supprimer$/ }).first().dispatchEvent("click"); await page.getByRole("button", { name: /^Confirmer$/ }).first().dispatchEvent("click"); await page.waitForTimeout(1200); const n3 = (await api(1, "GET", "/templates")).body.length;
chk("US3.suppression", n1 === n0 && confirmShown >= 1 && n2 === n0 && n3 === n0 - 1, `modeles ${n0} ; apres Supprimer ${n1} (confirmation=${confirmShown}) ; apres Annuler ${n2} ; apres Confirmer ${n3}`);
await cur.ctx.close();
// quota atteint dans l interface : message dedie, fenetre laissee ouverte
cur = await open(); page = cur.page; await openBoard(page, `UI-${STAMP}`); const cntT = (await api(1, "GET", "/templates")).body.length;
for (let i = cntT; i < 20; i++) await save(1, UIB.id, { name: `Remplissage ${i}` });
await BTN(page).dispatchEvent("click"); await page.waitForTimeout(300); await page.getByLabel(/Nom du modèle/).fill("Le 21e"); await page.evaluate(() => { window.__toasts = []; }); await page.getByRole("button", { name: /^Enregistrer$/ }).dispatchEvent("click"); await page.waitForTimeout(1200);
const q409 = (await toasts(page)).filter((t) => t.kind === "error"); const dlgOpen = await page.getByRole("dialog").count();
chk("US2.quota-409", q409.length === 1 && /limite de 20 modèles/.test(q409[0].message || "") && dlgOpen === 1, `21e modele : messages=${JSON.stringify(q409.map((t) => t.message))} ; fenetre ouverte=${dlgOpen}`, true);
await cur.ctx.close();
// etats : erreur + Reessayer ; vide
cur = await open({ stubTemplates: (r) => r.request().method() === "GET" ? r.fulfill({ status: 500, contentType: "application/json", body: "{}" }) : r.continue() }); page = cur.page; await OPEN(page).dispatchEvent("click"); await page.waitForTimeout(1500);
const errShown = (await page.getByText("Impossible de charger les modèles.").count()) >= 1; const retry = page.getByRole("button", { name: /Réessayer/ });
const retryN = await retry.count(); cur.st.stub = null; if (retryN) await retry.first().dispatchEvent("click"); await page.waitForTimeout(1200); const recovered = /Mon modèle|Modele|Z{10}/.test(await page.getByRole("dialog").first().innerText());
const errToasts = (await toasts(page)).filter((t) => t.kind === "error").length;
chk("US3.erreur-reessayer", errShown && retryN >= 1 && recovered, `erreur=${errShown} Reessayer=${retryN} apres Reessayer liste=${recovered} ; toasts d erreur=${errToasts}`, true);
log("US3.un-seul-message-d-erreur", errToasts === 1, `un echec de lecture = ${errToasts} toast(s) d erreur`);
await cur.ctx.close();
cur = await open({ stubTemplates: (r) => r.request().method() === "GET" ? r.fulfill({ status: 204, body: "" }) : r.continue() }); page = cur.page; await OPEN(page).dispatchEvent("click"); await page.waitForTimeout(1000);
chk("US3.vide", (await page.getByText("Aucun modèle pour le moment.").count()) >= 1, `etat vide=${await page.getByText("Aucun modèle pour le moment.").count()}`);
await cur.ctx.close(); await browser.close();
writeFileSync(E + `results-N22-${RUN}.json`, JSON.stringify(results, null, 1));
console.log(`${results.filter((r) => r.ok).length}/${results.length}`);
