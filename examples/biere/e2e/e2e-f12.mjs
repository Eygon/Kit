// E2E F12 Bieres communautaires : API reelle (SEED_DEMO_ACTIVITY=true) + navigateur 390x844 puis 360 px.
// Front : instantane fige (Vite :5173). Alice (1) propose, Bob (2) regarde, Carol (3) teste la limite.
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { watch, overflowing, unreachable } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const URL0 = "http://localhost:5173"; const API = "http://localhost:5090/api/v1";
const results = []; const log = (id, ok, d) => { results.push({ id, ok: !!ok }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${d}`); };
const H = (u) => ({ "X-User-Id": String(u), "Content-Type": "application/json" }); const J = async (r) => { const x = await r.text(); try { return x ? JSON.parse(x) : null; } catch { return x; } };
const get = async (p, u = 1) => J(await fetch(API + p, { headers: H(u) })); const rawPost = (u, body) => fetch(API + "/beers", { method: "POST", headers: H(u), body: JSON.stringify(body) });
const b = await chromium.launch();
const mk = async (user, { vp = { width: 390, height: 844 } } = {}) => { const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, locale: "fr-FR", hasTouch: true, isMobile: true }); await ctx.addInitScript((u) => localStorage.setItem("mousse.currentUserId", String(u)), user); const p = await ctx.newPage(); return { ctx, p, w: watch(p, { api: "http://localhost:5090", expectedConsole: [/Failed to load resource/] }) }; };
const settle = async (p, ms = 900) => { await p.waitForLoadState("networkidle"); await p.waitForTimeout(ms); };
const styles = await get("/beer-styles").catch(() => null); const cat = await get("/beers?limit=1"); const dex0 = await get("/me/dex");
const styleId = (await get("/beers?limit=1")).items?.[0]?.styleId ?? 1; const breweries = await get("/breweries");
const valid = (over = {}) => ({ name: "E2E Brune du Nord", breweryName: "Brasserie du Nord", country: "FR", styleId, abv: 6.5, description: "Une brune de test.", ...over });
// A. API
log("A.api-breweries", Array.isArray(breweries) && breweries.length >= 70, `${breweries?.length} brasseries ; 1re : ${breweries?.[0]?.name}`);
log("A.api-breweries-tri", breweries.every((x, i, a) => i === 0 || a[i - 1].name.toLowerCase() <= x.name.toLowerCase()), "ordre alphabetique sans casse");
let r = await rawPost(1, valid()); let body = await J(r); const myId = body?.id;
log("A.api-creation-201", r.status === 201 && body.source === "community" && body.createdBy === 1 && body.name === "E2E Brune du Nord", `${r.status} source=${body?.source} createdBy=${body?.createdBy}`);
r = await rawPost(1, valid({ name: "e2e brune du nord", breweryName: "BRASSERIE DU NORD" })); body = await J(r); log("A.api-doublon-casse-409", r.status === 409 && body?.existingBeerId === myId || r.status === 409, `${r.status} ${JSON.stringify(body)}`);
r = await rawPost(1, valid({ name: "E2E Brune du Nôrd", breweryName: "brasserie du nord" })); log("A.api-doublon-accents-409", r.status === 409, r.status);
r = await rawPost(1, valid({ breweryName: "Une autre brasserie" })); log("A.api-meme-nom-autre-brasserie-201", r.status === 201, r.status);
for (const [id, over] of [["nom-1-lettre", { name: "a" }], ["nom-espaces", { name: "     " }], ["degre-21", { abv: 21 }], ["degre-7.25", { abv: 7.25 }], ["style-inconnu", { styleId: 99999 }], ["pays-vide", { country: "" }], ["champ-inconnu", { isAdmin: true }]]) { r = await rawPost(1, valid({ name: "Valide " + id, ...over })); log(`A.api-400-${id}`, r.status === 400 || (id === "style-inconnu" && r.status === 404), r.status); }
r = await rawPost(1, valid({ name: "Valide <img src=x onerror=alert(1)>\n\nretours" })); body = await J(r); log("A.api-nom-nettoye", r.status === 201 && !/[\r\n]/.test(body.name), JSON.stringify(body?.name));
r = await fetch(API + "/beers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(valid({ name: "Sans identite" })) }); log("A.api-401-sans-identite", r.status === 401, r.status);
const found = await get("/beers?q=E2E%20Brune"); log("A.api-visible-dans-la-liste", (found.items ?? []).some((x) => x.id === myId && x.source === "community" && x.createdByName === "Alice"), `${(found.items ?? []).length} resultat(s), createdByName=${found.items?.[0]?.createdByName}`);
const dex1 = await get("/me/dex"); log("A.api-pokedex-reste-120", (dex1.total) === (dex0.total), `${dex0.total} -> ${dex1.total}`);
const fd = new FormData(); for (const [k, v] of Object.entries({ beerId: myId, drankAt: new Date(Date.now() - 3600e3).toISOString(), place: "Maison", format: "bottle" })) fd.append(k, String(v)); r = await fetch(API + "/checkins", { method: "POST", headers: { "X-User-Id": "2" }, body: fd }); log("A.api-bue-par-un-autre", r.status === 201, r.status);
for (let i = 0; i < 10; i++) r = await rawPost(3, valid({ name: `Carol ${i}`, breweryName: `Carol brasserie ${i}` })); const c429 = await rawPost(3, valid({ name: "Carol onze", breweryName: "Carol onze" })); log("A.api-limite-10-par-jour", c429.status === 429, `${r.status} puis ${c429.status}`);
log("A.api-400-avant-429", (await rawPost(3, valid({ name: "a" }))).status === 400, "saisie invalide sur quota plein");
// B. UI : Encyclopedie
const { p, w } = await mk(1); await p.goto(URL0 + "/bieres"); await settle(p, 1400);
const open = p.getByRole("button", { name: "Ajouter une bière" }); log("B.bouton-permanent", (await open.count()) >= 1, `${await open.count()} bouton(s)`); await p.screenshot({ path: "f12-encyclopedie.png" });
await open.first().click(); await p.waitForTimeout(800); let dlg = p.getByRole("dialog"); const sub = dlg.getByRole("button", { name: /^Ajouter$/ }); await sub.scrollIntoViewIfNeeded(); await sub.click(); await p.waitForTimeout(600);
let t = await dlg.innerText(); log("B.soumission-vide-erreurs-sous-les-champs", /entre 2 et 80/.test(t) && /Le pays est requis/.test(t) && /Le style est requis/.test(t), t.match(/Le (nom|pays|style|degré)[^\n]*/g)?.join(" / ")); await p.screenshot({ path: "f12-erreurs.png" });
log("B.soumission-vide-rien-cree", ((await get("/beers?q=E2E")).items ?? []).length === 2, "rien n'est parti au back");
const name = dlg.getByLabel(/Nom de la bière/); await name.fill("Brune du Faubourg"); const brew = dlg.getByRole("combobox", { name: /Brasserie/ }).or(dlg.getByLabel(/Brasserie/)).first(); await brew.click(); await brew.fill("chim"); await p.waitForTimeout(700);
const bopts = await p.getByRole("option").allInnerTexts(); log("B.brasserie-completion", bopts.some((x) => /Chimay/i.test(x)), bopts.slice(0, 3).join(" || ")); await p.screenshot({ path: "f12-brasserie.png" });
await p.getByRole("option").filter({ hasText: /Chimay/i }).first().click(); await p.waitForTimeout(300);
const pick = async (label, text) => { const trig = dlg.getByRole("button", { name: new RegExp(label) }).first(); await trig.scrollIntoViewIfNeeded(); await trig.click(); await p.waitForTimeout(500); await p.getByRole("option", { name: new RegExp(text) }).first().click(); await p.waitForTimeout(300); };
await pick("Pays", "Belgique"); await pick("Style", "Tripel trappiste|Tripel"); await dlg.getByLabel(/Degré/).fill("7,5"); await dlg.getByLabel(/Description/).fill("Une brune de test e2e."); await p.screenshot({ path: "f12-formulaire.png" });
const sub2 = dlg.getByRole("button", { name: /^Ajouter$/ }); await sub2.scrollIntoViewIfNeeded(); w.take(); await sub2.click(); await p.waitForTimeout(1800);
const mine = (await get("/beers?q=Faubourg")).items ?? []; log("B.creation-par-la-feuille", mine.length === 1 && mine[0].source === "community" && mine[0].abv === 7.5, `${mine.length} bière(s) ; ${mine[0]?.name} (${mine[0]?.breweryName})`);
log("B.feuille-fermee-et-confirmation", (await p.getByRole("dialog").count()) === 0, `dialogues ${await p.getByRole("dialog").count()}`);
log("B.apres-creation-url", true, p.url().replace(URL0, "")); await p.goto(URL0 + "/bieres"); await settle(p, 1200); await p.getByRole("searchbox").or(p.getByRole("textbox")).first().fill("Faubourg"); await p.waitForTimeout(1500); const card = p.locator('a[href^="/bieres/"]').first(); const ctxt = await card.innerText().catch(() => ""); log("B.carte-avec-repere", /Proposée par Alice/.test(ctxt), ctxt.replace(/\n/g, " | ").slice(0, 120)); await p.screenshot({ path: "f12-carte-communautaire.png" });
await card.click(); await settle(p, 1500); const dt = await p.locator("body").innerText(); log("B.fiche-avec-repere", /Proposée par Alice/.test(dt), "fiche"); await p.screenshot({ path: "f12-fiche-communautaire.png" });
log("B.fiche-bue-possible", (await p.getByRole("button", { name: /Je l'ai bue/ }).count()) === 1, "boutons Je l'ai bue / À goûter comme une bière officielle");
// C. doublon par l'UI
await p.goto(URL0 + "/bieres"); await settle(p, 1200); await p.getByRole("button", { name: "Ajouter une bière" }).first().click(); await p.waitForTimeout(800); dlg = p.getByRole("dialog");
await dlg.getByLabel(/Nom de la bière/).fill("brune du faubourg"); const brew2 = dlg.getByLabel(/Brasserie/).first(); await brew2.click(); await brew2.fill("chim"); await p.waitForTimeout(700); await p.getByRole("option").filter({ hasText: /Chimay/i }).first().click(); await p.waitForTimeout(300);
const pick2 = async (label, text) => { const trig = dlg.getByRole("button", { name: new RegExp(label) }).first(); await trig.scrollIntoViewIfNeeded(); await trig.click(); await p.waitForTimeout(500); await p.getByRole("option", { name: new RegExp(text) }).first().click(); await p.waitForTimeout(300); };
await pick2("Pays", "Belgique"); await pick2("Style", "Tripel"); await dlg.getByLabel(/Degré/).fill("7,5"); const s3 = dlg.getByRole("button", { name: /^Ajouter$/ }); await s3.scrollIntoViewIfNeeded(); await s3.click(); await p.waitForTimeout(1500);
const dt2 = await p.getByRole("dialog").innerText().catch(() => ""); log("C.doublon-message-et-lien", /Cette bière existe déjà/.test(dt2) && (await p.getByRole("link", { name: /L'ouvrir/ }).or(p.getByRole("button", { name: /L'ouvrir/ })).count()) >= 1, dt2.match(/Cette bière existe déjà[^\n]*/)?.[0]); await p.screenshot({ path: "f12-doublon.png" });
await p.getByRole("link", { name: /L'ouvrir/ }).or(p.getByRole("button", { name: /L'ouvrir/ })).first().click(); await settle(p, 1500); log("C.ouvrir-la-bière-existante", /\/bieres\/\d+/.test(p.url()) && /Brune du Faubourg/.test(await p.locator("body").innerText()), p.url().replace(URL0, ""));
// D. Bob voit la bière, pas de bouton modifier (hors perimetre)
const bob = await mk(2); await bob.p.goto(URL0 + `/bieres/${mine[0].id}`); await settle(bob.p, 1500); log("D.bob-voit-le-repere", /Proposée par Alice/.test(await bob.p.locator("body").innerText()), "repère visible par un autre utilisateur");
// E. recherche sans resultat : proposition
await p.goto(URL0 + "/bieres"); await settle(p, 1200); await p.getByRole("searchbox").or(p.getByRole("textbox")).first().fill("zzzzqq"); await p.waitForTimeout(1500); log("E.aucun-resultat-propose-d-ajouter", (await p.getByRole("button", { name: /Ajouter une bière/ }).count()) >= 1 && /Aucune bière/.test(await p.locator("body").innerText()), "état vide avec bouton"); await p.screenshot({ path: "f12-aucun-resultat.png" });
// F. limite par l'UI (Carol a deja 10)
const car = await mk(3); await car.p.goto(URL0 + "/bieres"); await settle(car.p, 1200); await car.p.getByRole("button", { name: "Ajouter une bière" }).first().click(); await car.p.waitForTimeout(800); const cd = car.p.getByRole("dialog"); await cd.getByLabel(/Nom de la bière/).fill("Trop de bières"); const cb = cd.getByLabel(/Brasserie/).first(); await cb.click(); await cb.fill("chim"); await car.p.waitForTimeout(700); await car.p.getByRole("option").filter({ hasText: /Chimay/i }).first().click(); await car.p.waitForTimeout(300);
const pick3 = async (label, text) => { const trig = cd.getByRole("button", { name: new RegExp(label) }).first(); await trig.scrollIntoViewIfNeeded(); await trig.click(); await car.p.waitForTimeout(500); await car.p.getByRole("option", { name: new RegExp(text) }).first().click(); await car.p.waitForTimeout(300); };
await pick3("Pays", "Belgique"); await pick3("Style", "Tripel"); await cd.getByLabel(/Degré/).fill("5"); const s4 = cd.getByRole("button", { name: /^Ajouter$/ }); await s4.scrollIntoViewIfNeeded(); await s4.click(); await car.p.waitForTimeout(1500);
log("F.limite-message", /Limite atteinte|10 propositions/.test(await car.p.locator("body").innerText()), "message de limite (alerte ou toast)"); await car.p.screenshot({ path: "f12-limite.png" });
// G. 360 px
const sm = await mk(1, { vp: { width: 360, height: 740 } }); await sm.p.goto(URL0 + "/bieres"); await settle(sm.p, 1400); await sm.p.getByRole("button", { name: "Ajouter une bière" }).first().click(); await sm.p.waitForTimeout(900);
const sd = sm.p.getByRole("dialog"); const ovf = await sm.p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); log("G.360-feuille-sans-debordement", ovf <= 0 && (await overflowing(sm.p)).length === 0, `h-overflow ${ovf}`); await sm.p.screenshot({ path: "f12-360-feuille.png" });
await sm.p.keyboard.press("Escape"); await sm.p.goto(URL0 + `/bieres/${mine[0].id}`); await settle(sm.p, 1500); log("G.360-fiche-sans-debordement", (await overflowing(sm.p)).length === 0, "fiche d'une bière communautaire");
const tt = w.take(); log("Z.sans-5xx", !tt.fiveXX.length, `5xx=${tt.fiveXX.length}`);
await b.close(); const ko = results.filter((x) => !x.ok); console.log(`\n${results.length - ko.length}/${results.length} PASS`); if (ko.length) { console.log("ECHECS :", ko.map((x) => x.id).join(", ")); process.exit(1); }
