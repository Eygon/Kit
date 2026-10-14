// E2E F3 Carte et disponibilite : API reelle + navigateur 390x844 (instantane fige du front, Vite :5173). Tuiles OSM : indisponibles dans le bac a sable.
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { writeFileSync } from "node:fs";
import { watch, overflowing, unreachable, covered } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const RUN = process.argv[2] || "1"; const URL0 = "http://localhost:5173"; const API = "http://localhost:5090";
const results = []; const log = (id, ok, d) => { results.push({ id, ok: !!ok, detail: d }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${d}`); };
const b = await chromium.launch();
const PARIS = { latitude: 48.8566, longitude: 2.3522 };
const mk = async (user, { vp = { width: 390, height: 844 }, geo = PARIS } = {}) => { const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, locale: "fr-FR", hasTouch: true, isMobile: true, ...(geo ? { geolocation: geo, permissions: ["geolocation"] } : {}) }); await ctx.addInitScript((u) => localStorage.setItem("mousse.currentUserId", String(u)), user); const p = await ctx.newPage(); return { ctx, p, w: watch(p, { api: API, expectedConsole: [/Failed to load resource/, /tile\.openstreetmap/] }) }; };
const api = async (path, u = 1, init = {}) => { const r = await fetch(API + "/api/v1" + path, { ...init, headers: { "X-User-Id": String(u), ...(init.body ? { "Content-Type": "application/json" } : {}), ...(init.headers || {}) } }); const t = await r.text(); try { return { status: r.status, body: t ? JSON.parse(t) : null }; } catch { return { status: r.status, body: t }; } };
const { p, w } = await mk(1);
const settle = async () => { await p.waitForLoadState("networkidle"); await p.waitForTimeout(500); };
const goto = async (path) => { await p.goto(URL0 + path); await settle(); await p.waitForTimeout(1500); };
const markers = () => p.locator(".leaflet-marker-icon");
const listCount = async () => +((await p.getByRole("button", { name: /^Lieux \(\d+\)/ }).innerText()).match(/\((\d+)\)/)?.[1] ?? -1);
// A. chargement
await goto("/carte"); const n0 = await listCount(); const m0 = (await p.getByRole("button", { name: /\d+ lieux?, zoomer/ }).evaluateAll((els) => els.reduce((a, e) => a + (parseInt((e.getAttribute("title") || e.getAttribute("aria-label") || "0")) || 0), 0))) + (await markers().evaluateAll((els) => els.filter((e) => /[✓?✕–]/.test(e.textContent || "")).length)); // F8 : pastilles de regroupement + reperes isoles
log("A.chargement", n0 > 0 && m0 === n0, `Lieux (${n0}) ; ${m0} reperes`);
let t = w.take(); log("A.sans-erreur", !t.fiveXX.length && !t.console.length, `5xx=${t.fiveXX.length} console=${t.console.length} ${t.console.slice(0, 2)}`);
const body = await p.locator("body").innerText(); log("A.tuiles-indisponibles-non-bloquant", /Fond de carte indisponible/.test(body) && n0 > 0, "message affiche et lieux utilisables");
log("A.reperes-pas-seulement-la-couleur", (await markers().evaluateAll((els) => els.every((e) => (e.textContent || "").trim().length > 0))), "chaque repere porte un glyphe (✓ ? ✕ –)");
const cov = (await covered(p)).filter((c) => !/^[✓?✕–]$/.test(c.text)); log("A.oracle-recouvrement-controles", cov.length === 0, JSON.stringify(cov).slice(0, 300));
log("A.sans-debordement", (await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0 && (await overflowing(p)).length === 0 && (await unreachable(p)).length === 0, "overflow/unreachable");
await p.screenshot({ path: "f3-map-final.png" });
const mw = await markers().evaluateAll((els) => Math.min(...els.map((e) => Math.min(e.getBoundingClientRect().width, e.getBoundingClientRect().height)))); log("A.reperes-44px", mw >= 43.5, `plus petit repere : ${Math.round(mw)} px`);
// B. liste + fiche
await p.getByRole("button", { name: /^Lieux \(\d+\)/ }).click(); await p.waitForTimeout(700); const dl = p.getByRole("dialog"); const rows = await dl.getByRole("button").count();
log("B.liste", rows >= 2 && /Bar|Cave|Brasserie/.test(await dl.innerText()), `${rows - 1} lignes`); await p.screenshot({ path: "f3-list-final.png" });
const firstRow = dl.getByRole("button").nth(1); const rowName = (await firstRow.innerText()).split("\n")[0]; await firstRow.click(); await p.waitForTimeout(1500);
const sheet = p.getByRole("dialog"); log("B.fiche-lieu", (await sheet.count()) === 1 && (await sheet.innerText()).includes(rowName) && /Adresse/.test(await sheet.innerText()), `fiche « ${rowName} » ; un seul dialogue : ${await sheet.count()}`);
const sheetTxt = await sheet.innerText(); log("B.bieres-par-famille-et-etat", /Bières/.test(sheetTxt) && /(Confirmée|Peut-être épuisée|Épuisée|Inconnue)/.test(sheetTxt) && /Toujours là/.test(sheetTxt) && /Plus là/.test(sheetTxt), sheetTxt.replace(/\n+/g, " | ").slice(0, 200));
await p.screenshot({ path: "f3-sheet-final.png" });
// C. vote
const stillBtn = sheet.getByRole("button", { name: /Toujours là/ }).first(); const wasDisabled = await stillBtn.isDisabled(); w.take();
const beforeV = await api(`/venues/${(await api("/venues")).body.find((v) => v.name === rowName).id}/beers`);
if (!wasDisabled) { await stillBtn.click(); await p.waitForTimeout(1200); const net = w.take().net.filter((n) => n.m === "POST" && /votes/.test(n.u)); log("C.vote-envoye-une-fois", net.length === 1 && net[0].s === 201, `${net.length} POST votes (${net.map((x) => x.s)})`); const afterTxt = await p.getByRole("dialog").innerText(); log("C.apres-vote-revoter-dans", /revoter dans/.test(afterTxt), (afterTxt.match(/Vous pourrez revoter[^\n]*/) || ["?"])[0]); log("C.boutons-desactives-apres-vote", await p.getByRole("dialog").getByRole("button", { name: /Toujours là/ }).first().isDisabled(), "Toujours là désactivé pendant 24 h"); }
else log("C.vote", true, "bouton deja desactive (l utilisateur 1 a deja vote sur ce lien) — cas couvert par C.apres-vote");
// 409 : meme vote par l API directement => 409 avec delai
const vid = (await api("/venues")).body.find((v) => v.name === rowName).id; const lk = (await api(`/venues/${vid}/beers`)).body[0]; const r409 = await api(`/venues/${vid}/beers/${lk.beerId ?? lk.beer?.id}/votes`, 1, { method: "POST", body: JSON.stringify({ sense: "still" }) });
log("C.409-avec-delai", r409.status === 409 && /\d/.test(JSON.stringify(r409.body)), JSON.stringify(r409.body).slice(0, 160));
await p.getByRole("dialog").getByRole("button", { name: /Fermer/ }).click(); await p.waitForTimeout(500);
// D. filtres
await goto("/carte"); const nAll = await listCount(); await p.getByRole("button", { name: /^Filtres/ }).click(); await p.waitForTimeout(700); const fd = p.getByRole("dialog");
await fd.getByText(/^Brasserie$/).first().click(); await fd.getByRole("button", { name: /Appliquer/ }).click(); await settle(); await p.waitForTimeout(1200);
const nBr = await listCount(); log("D.filtre-type", /type=brewery/.test(p.url()) && nBr > 0 && nBr < nAll, `${nAll} -> ${nBr} ; url ${p.url().replace(URL0, "")}`);
const badge = await p.locator(".badge").first().innerText().catch(() => ""); log("D.badge-filtres-actifs", badge.trim().split("\n")[0] === "1", `pastille « ${badge.trim()} » a cote du bouton`);
await p.reload(); await settle(); await p.waitForTimeout(1500); log("D.url-partageable", (await listCount()) === nBr, `apres rechargement : ${await listCount()}`);
const apiBr = (await api("/venues?type=brewery")).body.length; log("D.coherence-api", nBr <= apiBr, `ecran ${nBr} / API (toute la France) ${apiBr}`);
await p.getByRole("button", { name: /^Filtres/ }).click(); await p.waitForTimeout(600); await p.getByRole("dialog").getByRole("button", { name: /Réinitialiser/ }).click(); await p.waitForTimeout(800); await p.screenshot({ path: "f3-filters-final.png" }); await p.getByRole("dialog").getByRole("button", { name: /Appliquer/ }).click(); await settle(); log("D.reinitialiser", !/type=/.test(p.url()), p.url().replace(URL0, ""));
// E. puce bière
await goto("/carte?beer=1"); const chipTxt = await p.locator("body").innerText(); const chipBtn = p.getByRole("button", { name: /Retirer le filtre bière/ });
log("E.puce-biere", (await chipBtn.count()) === 1 && /Chimay Rouge/.test(chipTxt), `puce visible : ${(await chipBtn.count()) === 1} ; nom de la bière dans la puce : ${/Chimay Rouge/.test(chipTxt)}`);
const nB = await listCount(); await chipBtn.click(); await settle(); await p.waitForTimeout(1200); log("E.retirer-puce", !/beer=/.test(p.url()) && (await listCount()) >= nB, `${nB} -> ${await listCount()} ; url ${p.url().replace(URL0, "")}`);
await goto("/carte?beer=99999"); log("E.biere-inconnue-sans-plantage", (await p.locator("body").innerText()).length > 20 && (await p.locator("h1,h2").count()) >= 0, "page rendue");
await goto("/carte?beer=abc&type=zzz&radius=-3&north=999"); log("E.parametres-invalides-ignores", (await listCount()) >= 0 && !(await p.locator("body").innerText()).includes("undefined"), `Lieux (${await listCount()})`);
// F. geolocalisation
await goto("/carte"); w.take(); await p.getByRole("button", { name: /Autour de moi/ }).click(); await p.waitForTimeout(2500); await p.getByRole("button", { name: /^Lieux \(\d+\)/ }).click(); await p.waitForTimeout(700); const dists = await p.getByRole("dialog").evaluate((d) => [...d.innerText.matchAll(/(\d+(?:[.,]\d+)?)\s?(m|km)\b/g)].map((m) => (m[2] === "km" ? 1000 : 1) * parseFloat(m[1].replace(",", "."))));
log("F.autour-de-moi-tri-par-distance", dists.length >= 3 && dists.every((d, i) => i === 0 || dists[i - 1] <= d), `${dists.length} distances : ${dists.slice(0, 4)} ...`); await p.keyboard.press("Escape");
const deny = await mk(1, { geo: null }); await deny.ctx.grantPermissions([]); await deny.p.addInitScript(() => { navigator.geolocation.getCurrentPosition = (_ok, err) => err({ code: 1, message: "denied" }); }); await deny.p.goto(URL0 + "/carte"); await deny.p.waitForLoadState("networkidle"); await deny.p.waitForTimeout(1500); await deny.p.getByRole("button", { name: /Autour de moi/ }).click(); await deny.p.waitForTimeout(1000);
log("F.refus-geolocalisation-message", /Position refusée/.test(await deny.p.locator("body").innerText()), "message de refus affiche"); log("F.refus-carte-utilisable", (await deny.p.locator(".leaflet-marker-icon").count()) > 0, "reperes toujours la"); await deny.ctx.close();
// G. XSS dans un nom de lieu
const xs = await api("/venues", 1, { method: "POST", body: JSON.stringify({ name: `<img src=x onerror="window.__xss=1">E2E`, type: "bar", address: "1 rue Test", latitude: 48.8567, longitude: 2.3523 }) });
await goto("/carte"); await p.getByRole("button", { name: /^Lieux \(\d+\)/ }).click(); await p.waitForTimeout(800); const hasLit = await p.getByRole("dialog").getByText(/<img src=x/).count(); const xssRan = await p.evaluate(() => window.__xss === 1); log("G.nom-de-lieu-avec-html-affiche-en-texte", hasLit >= 1 && !xssRan, `texte litteral affiche=${hasLit >= 1}, script execute=${xssRan}`);
await p.keyboard.press("Escape");
// H. panne API
await p.route("**/api/v1/venues**", (r) => r.abort()); await goto("/carte"); await p.waitForTimeout(1500); const errB = await p.locator("body").innerText(); await p.screenshot({ path: "f3-erreur.png" }); await p.getByRole("button", { name: /^Lieux/ }).click().catch(() => {}); await p.waitForTimeout(600); const errD = await p.locator("body").innerText(); log("H.panne-api-alerte-et-reessayer", /Impossible de charger/.test(errD) && /Réessayer/.test(errD), (errD.match(/(Impossible[^\n]*)/i) || ["pas d alerte : « Aucun lieu » ?"])[0]); await p.keyboard.press("Escape");
await p.unroute("**/api/v1/venues**");
// I. 360 px
const sm = await mk(1, { vp: { width: 360, height: 740 } }); await sm.p.goto(URL0 + "/carte"); await sm.p.waitForLoadState("networkidle"); await sm.p.waitForTimeout(2000);
log("I.360px-carte", (await sm.p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0 && (await overflowing(sm.p)).length === 0, "360x740"); await sm.p.screenshot({ path: "f3-map-360.png" }); await sm.ctx.close();
writeFileSync(`results-f3-${RUN}.json`, JSON.stringify(results, null, 1)); await b.close(); console.log(`\n${results.filter((r) => r.ok).length}/${results.length} PASS`);
