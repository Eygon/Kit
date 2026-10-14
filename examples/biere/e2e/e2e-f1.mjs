// E2E F1 Catalogue Mousse : API reelle (NestJS :5090, SQLite memoire) + navigateur 390x844 (instantane fige du front, Vite :5173).
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { writeFileSync } from "node:fs";
import { watch, overflowing, unreachable, unreadable } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const RUN = process.argv[2] || "1"; const URL0 = "http://localhost:5173"; const API = "http://localhost:5090";
const results = []; const log = (id, ok, d) => { results.push({ id, ok: !!ok, detail: d }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${d}`); };
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "fr-FR", hasTouch: true, isMobile: true });
const p = await ctx.newPage(); const w = watch(p, { api: API, expectedConsole: [/Failed to load resource/] });
const cards = () => p.locator('a[href^="/bieres/"]');
const settle = async () => { await p.waitForLoadState("networkidle"); await p.waitForTimeout(350); };
const hOverflow = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const goto = async (path) => { await p.goto(URL0 + path); await settle(); };
// 1. chargement
await goto("/bieres");
const head = await p.locator("h1").innerText(); const sub = await p.getByText(/\d+ (\/ \d+ découvertes|bières?)/).first().innerText().catch(() => "");
log("1.chargement", (await cards().count()) === 20 && /120/.test(sub), `${await cards().count()} cartes, en-tete « ${head} / ${sub} »`);
let t = w.take(); log("1.sans-erreur", !t.fiveXX.length && !t.console.length, `5xx=${t.fiveXX.length} console=${t.console.length} ${t.console.slice(0,2)}`);
log("1.pas-de-debordement-horizontal", (await hOverflow()) <= 0, `debordement ${await hOverflow()} px`);
const ov = await overflowing(p); log("1.oracle-debordement", ov.length === 0, JSON.stringify(ov).slice(0, 300));
const ur = await unreachable(p); log("1.oracle-atteignable", ur.length === 0, JSON.stringify(ur).slice(0, 300));
const un = await unreadable(p); log("1.oracle-contraste", un.length === 0, JSON.stringify(un).slice(0, 300));
const place = await p.locator("input").first().evaluate((i) => ({ ph: i.placeholder, clipped: i.scrollWidth > i.clientWidth }));
log("1.placeholder-lisible", !place.clipped, `placeholder « ${place.ph} » ${place.clipped ? "COUPE" : "entier"}`);
// 2. Voir plus : 120 bieres en 5 appuis
let taps = 0; while (await p.getByRole("button", { name: "Voir plus" }).count() && taps < 8) { await p.getByRole("button", { name: "Voir plus" }).click(); taps++; await settle(); }
log("2.voir-plus", (await cards().count()) === 120 && taps <= 5, `${await cards().count()} cartes en ${taps} appuis (SC-001 : 5 au plus)`);
const ids = await cards().evaluateAll((a) => a.map((x) => x.getAttribute("href"))); log("2.pas-de-doublon", new Set(ids).size === ids.length, `${new Set(ids).size} ids distincts`);
t = w.take(); log("2.sans-erreur", !t.fiveXX.length && !t.console.length, `5xx=${t.fiveXX.length} console=${t.console.length}`);
// 3. recherche
await goto("/bieres"); const search = p.getByRole("searchbox", { name: /Rechercher une bière/ });
await search.fill("weissbrau"); await p.waitForTimeout(900); await settle();
log("3.recherche-sans-accent", (await cards().count()) === 3 && /q=weissbrau/.test(p.url()), `${await cards().count()} cartes ; url ${p.url().replace(URL0, "")}`);
const cnt = await p.getByText(/\d+ résultats?/).first().innerText().catch(() => ""); log("3.compteur-resultats", /3/.test(cnt), `« ${cnt} »`);
await p.reload(); await settle(); log("3.url-partageable", (await cards().count()) === 3 && (await search.inputValue()) === "weissbrau", `apres rechargement : ${await cards().count()} cartes, champ « ${await search.inputValue()} »`);
await search.fill("zzzzqq"); await p.waitForTimeout(900); await settle();
const emptyOk = (await cards().count()) === 0 && (await p.getByText(/Aucune bière ne correspond/).count()) > 0; await p.screenshot({ path: "f1-vide.png" });
log("3.etat-vide", emptyOk, `${await cards().count()} cartes ; message vide ${await p.getByText(/Aucune bière ne correspond/).count()}`);
await search.fill("%"); await p.waitForTimeout(900); await settle(); log("3.pourcent-litteral", (await cards().count()) === 3, `q=% -> ${await cards().count()} carte(s) (les 3 Cantillon « 100 % »)`);
await search.fill("'; DROP TABLE beers;--"); await p.waitForTimeout(900); await settle(); log("3.injection-sql", (await cards().count()) === 0 && (await p.getByText(/Aucune bière/).count()) > 0, `${await cards().count()} cartes, pas d erreur`);
await search.fill(""); await p.waitForTimeout(900); await settle();
// 4. puces famille
await goto("/bieres"); const chip = p.getByText(/^Stout \(\d+\)$/).first(); const chipTxt = await chip.innerText().catch(() => "");
await chip.click(); await settle(); const nStout = +(chipTxt.match(/\((\d+)\)/)?.[1] ?? -1);
log("4.puce-famille", /family=stout/.test(p.url()) && (await cards().count()) === Math.min(20, nStout), `${chipTxt} -> ${await cards().count()} cartes ; url ${p.url().replace(URL0, "")}`);
await p.goBack(); await settle(); log("4.historique-retour", !/family=/.test(p.url()) && /Toutes/.test(await p.locator("body").innerText()), `retour : ${p.url().replace(URL0, "")}`);
const rowW = await p.evaluate(() => { const el = [...document.querySelectorAll("*")].find((e) => e.textContent?.trim() === "Toutes" && e.children.length === 0); let n = el; while (n && n.scrollWidth <= n.clientWidth + 1 && n !== document.body) n = n.parentElement; return n && n !== document.body ? { scrolls: true, cw: n.clientWidth, sw: n.scrollWidth } : { scrolls: false }; });
log("4.rangee-puces-defilante", rowW.scrolls && (await hOverflow()) <= 0, JSON.stringify(rowW));
// 5. tiroir
await goto("/bieres"); await p.getByRole("button", { name: "Filtres" }).click(); await p.waitForTimeout(500); await p.screenshot({ path: "f1-tiroir.png" });
const dlg = p.getByRole("dialog"); const dlgBox = await dlg.boundingBox();
log("5.tiroir-dans-ecran", dlgBox && dlgBox.x >= -1 && dlgBox.x + dlgBox.width <= 391 && dlgBox.y + dlgBox.height <= 845, JSON.stringify(dlgBox));
const radios = await p.evaluate(() => [...document.querySelectorAll("[role=dialog] input[type=radio]")].map((i) => { const l = i.closest("label"); const r = l?.getBoundingClientRect(); const t = l?.querySelector("span:not([class*=control])")?.getBoundingClientRect(); return { label: l?.textContent?.trim(), w: Math.round(r?.width ?? 0), h: Math.round(r?.height ?? 0) }; }));
const tooSmall = radios.filter((r) => r.h < 40); log("5.cibles-tactiles-radios", tooSmall.length === 0, `${radios.length} choix, ${tooSmall.length} sous 40 px de haut : ${tooSmall.slice(0, 3).map((r) => r.label + ":" + r.h)}`);
const ovd = await overflowing(p); log("5.tiroir-debordement", ovd.length === 0, JSON.stringify(ovd).slice(0, 300));
// pays : cocher un pays, voir le compteur, appliquer
const body = await dlg.innerText(); log("5.sections-tiroir", /Degré/.test(body) && /Pays/.test(body) && /Format/.test(body) && /Tri|Trier/.test(body), `sections vues : ${["Famille", "Style", "Degré", "Pays", "Format", "Tri"].filter((s) => new RegExp(s).test(body)).join(",")}`);
const seeBtn = dlg.getByRole("button", { name: /Voir \d+ bière/ }); const before = await seeBtn.innerText();
await dlg.getByText(/^Belgique/).first().click().catch(() => {}); await p.waitForTimeout(700);
const after = await seeBtn.innerText(); log("5.compteur-live", before !== after, `« ${before} » -> « ${after} »`);
await seeBtn.click(); await settle();
log("5.appliquer", /country=BE/.test(p.url()) && (await cards().count()) > 0, `url ${p.url().replace(URL0, "")} ; ${await cards().count()} cartes`);
const nBE = +(await p.getByText(/\d+ résultats?/).first().innerText().catch(() => "0")).match(/\d+/)?.[0];
const api = await (await fetch(`${API}/api/v1/beers?country=BE&size=1`, { headers: { "X-User-Id": "1" } })).json(); log("5.coherence-api", nBE === api.total, `ecran ${nBE} / API ${api.total}`);
await p.getByRole("button", { name: "Filtres" }).click(); await p.waitForTimeout(400); await p.getByRole("button", { name: "Réinitialiser" }).click(); await p.waitForTimeout(500);
await p.getByRole("button", { name: /Voir \d+ bière/ }).click(); await settle(); log("5.reinitialiser", !/country=/.test(p.url()), `url ${p.url().replace(URL0, "")}`);
// 6. fiche
await goto("/bieres"); await cards().first().click(); await settle(); await p.screenshot({ path: "f1-fiche.png" });
const fiche = await p.locator("body").innerText(); log("6.fiche", /\/bieres\/\d+/.test(p.url()) && /3 Monts/.test(fiche) && /Saint-Sylvestre/.test(fiche), `url ${p.url().replace(URL0, "")} ; contient nom+brasserie`);
log("6.fiche-debordement", (await hOverflow()) <= 0 && (await overflowing(p)).length === 0, `h-overflow ${await hOverflow()}`);
log("6.fiche-onglet-courant", (await p.locator('nav a[aria-current="page"]').innerText().catch(() => "")).includes("Bières"), `onglet courant « ${await p.locator('nav a[aria-current="page"]').innerText().catch(() => "?")} »`);
await goto("/bieres/abc"); const n0 = w.take().net.length; log("6.id-invalide", /inconnue/i.test(await p.locator("body").innerText()), `« ${(await p.locator("main").innerText().catch(() => "")).slice(0, 80).replace(/\n/g, " | ")} »`);
await goto("/bieres/99999"); log("6.biere-inconnue", /inconnue/i.test(await p.locator("body").innerText()), "404 -> etat biere inconnue");
t = w.take(); log("6.sans-erreur", !t.fiveXX.length, `5xx=${t.fiveXX.length}`);
// 7. erreur reseau + Reessayer
await p.route("**/api/v1/beers?**", (r) => r.abort()); await p.route("**/api/v1/beers", (r) => r.abort());
await goto("/bieres"); await p.waitForTimeout(1500); const errTxt = await p.locator("body").innerText(); await p.screenshot({ path: "f1-erreur.png" });
log("7.etat-erreur", /Réessayer/.test(errTxt) && (await cards().count()) === 0, `bouton Réessayer ${/Réessayer/.test(errTxt)} ; cartes ${await cards().count()}`);
await p.unroute("**/api/v1/beers?**"); await p.unroute("**/api/v1/beers"); await p.getByRole("button", { name: "Réessayer" }).click(); await settle();
log("7.reessayer", (await cards().count()) === 20, `${await cards().count()} cartes apres Reessayer`);
// 8. anglais + petit ecran
const ctxEn = await b.newContext({ viewport: { width: 360, height: 740 }, locale: "en-US", hasTouch: true, isMobile: true }); const pe = await ctxEn.newPage(); await pe.goto(URL0 + "/bieres"); await pe.waitForLoadState("networkidle"); await pe.waitForTimeout(400);
const en = await pe.locator("body").innerText(); log("8.anglais-detection-navigateur (levee par F4 : langue detectee + selecteur)", /Encyclopedia/.test(en) && /discovered/.test(en) && /Filters/.test(en), `« ${en.slice(0, 80).replace(/\n/g, " | ")} »`);
log("8.360px-sans-debordement", (await pe.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0 && (await overflowing(pe)).length === 0, "360x740");
await pe.screenshot({ path: "f1-en-360.png" });
writeFileSync(`results-f1-${RUN}.json`, JSON.stringify(results, null, 1)); await b.close();
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} PASS`);
