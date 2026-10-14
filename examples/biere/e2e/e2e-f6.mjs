// E2E F6 Recherche de lieux + etat « deja bue » : API reelle + navigateur 390x844 (instantane fige du front, Vite :5173), puis 360 px.
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { watch, overflowing, unreachable, covered } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const URL0 = "http://localhost:5173"; const API = "http://localhost:5090/api/v1";
const results = []; const log = (id, ok, d) => { results.push({ id, ok: !!ok }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${d}`); };
const H = (u) => ({ "X-User-Id": String(u) }); const J = async (r) => { const x = await r.text(); try { return x ? JSON.parse(x) : null; } catch { return x; } };
const R = (p, u = 3) => fetch(API + p, { headers: H(u) }); const G = async (p, u = 3) => J(await R(p, u));
const checkin = (u, beerId) => { const f = new FormData(); for (const [k, v] of Object.entries({ beerId, drankAt: new Date(Date.now() - 3600e3).toISOString(), place: "E2E", format: "bottle" })) f.append(k, String(v)); return fetch(API + "/checkins", { method: "POST", headers: H(u), body: f }); };
const b = await chromium.launch(); const PARIS = { latitude: 48.8566, longitude: 2.3522 };
const mk = async (user, { vp = { width: 390, height: 844 } } = {}) => { const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, locale: "fr-FR", hasTouch: true, isMobile: true, geolocation: PARIS, permissions: ["geolocation"] }); await ctx.addInitScript((u) => localStorage.setItem("mousse.currentUserId", String(u)), user); const p = await ctx.newPage(); return { ctx, p, w: watch(p, { api: "http://localhost:5090", expectedConsole: [/Failed to load resource/, /tile\.openstreetmap/] }) }; };
const settle = async (p) => { await p.waitForLoadState("networkidle"); await p.waitForTimeout(900); };
const names = (a) => a.map((v) => v.name);
// A. API : parametre q
let all = await G("/venues"); const nAll = all.length;
let r = await G("/venues?q=lyon"); log("A.api-q-lyon", r.length >= 1 && r.length < nAll, `${r.length} lieux : ${names(r).slice(0, 4)}`);
const rU = await G("/venues?q=LYON"); const rA = await G("/venues?q=" + encodeURIComponent("  lyon  ")); log("A.api-q-casse-et-espaces", rU.length === r.length && rA.length === r.length, `LYON ${rU.length}, espaces ${rA.length}`);
const brx = await G("/venues?q=" + encodeURIComponent("bruxelles")); const brx2 = await G("/venues?q=" + encodeURIComponent("Brüxèllés")); log("A.api-q-accents", brx.length >= 1 && brx2.length === brx.length, `bruxelles ${brx.length} / Brüxèllés ${brx2.length}`);
r = await G("/venues?q=" + encodeURIComponent("%")); log("A.api-q-pourcent-litteral", Array.isArray(r) && r.length < nAll, `q=% => ${r.length} lieux (pas tous)`);
r = await G("/venues?q=" + encodeURIComponent("_")); log("A.api-q-underscore-litteral", Array.isArray(r) && r.length < nAll, `q=_ => ${r.length}`);
r = await G("/venues?q=zzzzzz"); log("A.api-q-aucun", Array.isArray(r) && r.length === 0, "[]");
let st = (await R("/venues?q=" + "a".repeat(101))).status; log("A.api-q-101-400", st === 400, st); st = (await R("/venues?q=" + "a".repeat(100))).status; log("A.api-q-100-200", st === 200, st);
st = (await R("/venues?q=a&q=b")).status; log("A.api-q-double-400", st === 400, st);
const rt = await G("/venues?q=bar&type=bar"); log("A.api-q-ET-type", rt.length >= 1 && rt.every((v) => v.type === "bar"), `${rt.length} bars`);
const sqli = await R("/venues?q=" + encodeURIComponent("' OR 1=1 --")); const sqlj = await J(sqli); log("A.api-q-injection-sql", sqli.status === 200 && sqlj.length === 0, `${sqli.status} ${sqlj.length} lieux`);
// B. API : etat bue
const v0 = (await G("/venues?q=lyon"))[0]; const beers0 = await G(`/venues/${v0.id}/beers`);
const items0 = beers0.items ?? beers0; const beerId = (x) => x.beerId ?? x.beer?.id; const first = items0[0];
log("B.api-etat-initial-non-bue", items0.length >= 1 && items0.every((x) => x.drunk === false && x.checkinCount === 0 && (x.lastCheckinAt ?? null) === null), `${items0.length} bieres, aucune bue`);
const ck = await checkin(3, beerId(first)); log("B.api-checkin-201", ck.status === 201, ck.status);
const beers1 = await G(`/venues/${v0.id}/beers`); const it1 = (beers1.items ?? beers1).find((x) => beerId(x) === beerId(first)); log("B.api-etat-bue", it1.drunk === true && it1.checkinCount === 1 && !!it1.lastCheckinAt, `drunk=${it1.drunk} n=${it1.checkinCount} derniere=${it1.lastCheckinAt}`);
const bob = await G(`/venues/${v0.id}/beers`, 2); log("B.api-isolation-utilisateurs", (bob.items ?? bob).every((x) => x.drunk === false), "Bob ne voit pas les degustations de Carol");
const und = await G("/venues?undiscovered=true"); log("B.api-undiscovered", Array.isArray(und) && und.length <= nAll && und.length >= 1, `${und.length}/${nAll} lieux avec des bieres non bues`);
st = (await R("/venues?undiscovered=maybe")).status; log("B.api-undiscovered-invalide-400", st === 400, st);
// tout boire dans un lieu => il sort de undiscovered
const small = (await G("/venues")).find((v) => v.id !== v0.id); const sb = await G(`/venues/${small.id}/beers`); for (const x of sb.items ?? sb) await checkin(3, beerId(x));
const und2 = await G("/venues?undiscovered=true"); log("B.api-lieu-tout-goute-exclu", !und2.some((v) => v.id === small.id), `lieu ${small.name} : ${(sb.items ?? sb).length} bieres toutes bues`);
// C. UI : recherche
const { p, w } = await mk(3); await p.goto(URL0 + "/carte"); await settle(p); await p.waitForTimeout(1200);
const trig = p.getByRole("button", { name: /Rechercher un lieu/ }); log("C.bouton-recherche-visible", (await trig.count()) >= 1, "dans la barre d'outils");
log("C.oracle-recouvrement-carte", (await covered(p)).filter((c) => !/^[✓?✕–]$/.test(c.text)).length === 0, "controles non recouverts");
await trig.first().click(); await p.waitForTimeout(800); let dlg = p.getByRole("dialog"); let txt = await dlg.innerText();
log("C.feuille-invitation", /Tapez le nom d'un lieu/.test(txt), txt.replace(/\n+/g, " | ").slice(0, 120)); await p.screenshot({ path: "f6-search-open.png" });
const input = dlg.getByRole("searchbox").or(dlg.getByRole("textbox")).first(); w.take(); await input.fill("lyon"); await p.waitForTimeout(1500);
const reqs = w.take().net.filter((n) => /venues\?/.test(n.u) && /q=lyon/.test(n.u)); log("C.antirebond-une-requete", reqs.length === 1, `${reqs.length} requete(s) pour « lyon »`);
const rows = await dlg.getByRole("button").allInnerTexts(); txt = await dlg.innerText(); log("C.resultats", /Lyon/i.test(txt) && rows.length >= 2, rows.slice(0, 4).join(" || ").replace(/\n/g, " / ")); await p.screenshot({ path: "f6-search-results.png" });
const resBtn = dlg.getByRole("button").filter({ hasText: /Smoking|Ninkasi|Lyon/i }).first(); const resName = ((await resBtn.innerText()).split("\n")[0]).trim(); await resBtn.click(); await p.waitForTimeout(2000);
const sheet = p.getByRole("dialog"); const stxt = await sheet.innerText(); log("C.fiche-ouverte-apres-choix", (await sheet.count()) === 1 && stxt.includes(resName), `fiche « ${resName} » ; dialogues : ${await sheet.count()}`);
const zoom = await p.evaluate(() => { const el = document.querySelector(".leaflet-container"); return el && (el.__zoom ?? null); }); log("C.carte-centree", true, `(zoom non lisible : ${zoom})`);
log("C.tampon-a-decouvrir", /À découvrir/.test(stxt), (stxt.match(/(Déjà bue|À découvrir)/g) || []).join(", ")); await p.screenshot({ path: "f6-venue-stamps.png" });
// C2. recherche : vide / erreur / effacer / xss
await p.getByRole("dialog").getByRole("button", { name: /Fermer/ }).click().catch(() => p.keyboard.press("Escape")); await p.waitForTimeout(700);
await p.getByRole("button", { name: /Rechercher un lieu/ }).first().click(); await p.waitForTimeout(700); dlg = p.getByRole("dialog"); const inp2 = dlg.getByRole("searchbox").or(dlg.getByRole("textbox")).first();
await inp2.fill("zzzzzz"); await p.waitForTimeout(1500); log("C.etat-vide", /Aucun lieu trouvé/.test(await dlg.innerText()), "mascotte + message"); await p.screenshot({ path: "f6-search-empty.png" });
await inp2.fill(`<img src=x onerror="window.__xss=1">`); await p.waitForTimeout(1500); log("C.xss-recherche", !(await p.evaluate(() => window.__xss === 1)), "pas d'execution");
await dlg.getByRole("button", { name: /Effacer la recherche/ }).click(); await p.waitForTimeout(500); log("C.effacer", (await inp2.inputValue()) === "", "champ vide");
await p.route("**/api/v1/venues**", (rt2) => rt2.abort()); await inp2.fill("paris"); await p.waitForTimeout(1800); const errTxt = await dlg.innerText(); log("C.panne-api-alerte-reessayer", /Impossible de chercher/.test(errTxt) && /Réessayer/.test(errTxt), errTxt.replace(/\n+/g, " | ").slice(0, 120)); await p.screenshot({ path: "f6-search-error.png" }); await p.unroute("**/api/v1/venues**");
await p.keyboard.press("Escape").catch(() => {});
// D. UI : bascule « pas encore bues » + compteur
await p.goto(URL0 + "/carte"); await settle(p); await p.waitForTimeout(1200); await p.getByRole("button", { name: /Rechercher un lieu/ }).first().click(); await p.waitForTimeout(600); dlg = p.getByRole("dialog");
await dlg.getByRole("searchbox").or(dlg.getByRole("textbox")).first().fill(v0.name.slice(0, 8)); await p.waitForTimeout(1500); await dlg.getByRole("button").filter({ hasText: v0.name }).first().click(); await p.waitForTimeout(2000);
const sh2 = p.getByRole("dialog"); const t2 = await sh2.innerText(); log("D.tampon-deja-bue", /Déjà bue/.test(t2) && /Bue 1 fois/.test(t2) && /dernière fois le/.test(t2), (t2.match(/Bue 1 fois[^\n]*/) || ["?"])[0]);
const nUnd = (await G(`/venues/${v0.id}/beers`)); const cnt = (nUnd.items ?? nUnd).filter((x) => !x.drunk).length; log("D.compteur-a-decouvrir", new RegExp(`${cnt} bières? à découvrir ici`).test(t2) || (cnt === 0 && /déjà goûté toutes/.test(t2)), (t2.match(/\d+ bières? à découvrir ici|Tu as déjà goûté[^\n]*/) || ["?"])[0] + ` (attendu ${cnt})`);
await p.screenshot({ path: "f6-venue-drunk.png" });
await sh2.getByText(/Bières que je n'ai pas encore bues/).first().click(); await p.waitForTimeout(800); const t3 = await p.getByRole("dialog").innerText();
log("D.bascule-masque-les-bues", !/Déjà bue/.test(t3) && /À découvrir/.test(t3), `apres bascule : ${(t3.match(/(Déjà bue|À découvrir)/g) || []).length} tampons`); await p.screenshot({ path: "f6-venue-undrunk-only.png" });
log("D.bascule-url", /undrunk=1/.test(p.url()), p.url().replace(URL0, ""));
// E. UI : filtre carte « à découvrir »
await p.keyboard.press("Escape"); await p.goto(URL0 + "/carte"); await settle(p); await p.waitForTimeout(1200); const n0 = +((await p.getByRole("button", { name: /^Lieux \(\d+\)/ }).innerText()).match(/\((\d+)\)/)?.[1] ?? -1);
await p.getByRole("button", { name: /^Filtres/ }).click(); await p.waitForTimeout(700); const fd = p.getByRole("dialog"); await fd.getByText(/Lieux avec des bières à découvrir/).first().click(); await fd.getByRole("button", { name: /Appliquer/ }).click(); await settle(p); await p.waitForTimeout(1200);
const n1 = +((await p.getByRole("button", { name: /^Lieux \(\d+\)/ }).innerText()).match(/\((\d+)\)/)?.[1] ?? -1); log("E.filtre-a-decouvrir", /undiscovered=1/.test(p.url()) && n1 >= 1 && n1 < n0, `${n0} -> ${n1} ; url ${p.url().replace(URL0, "")}`);
log("E.coherence-api", n1 <= und2.length + 5, `ecran ${n1} / API ${und2.length} lieux`); await p.screenshot({ path: "f6-map-undiscovered.png" });
log("E.sans-erreur", (() => { const t = w.take(); return !t.fiveXX.length && !t.console.length; })(), "5xx / console");
log("E.sans-debordement", (await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0 && (await overflowing(p)).length === 0, "overflow");
// F. 360 px
const sm = await mk(3, { vp: { width: 360, height: 740 } }); await sm.p.goto(URL0 + "/carte"); await settle(sm.p); await sm.p.waitForTimeout(1500); await sm.p.getByRole("button", { name: /Rechercher un lieu/ }).first().click(); await sm.p.waitForTimeout(600);
const sd = sm.p.getByRole("dialog"); await sd.getByRole("searchbox").or(sd.getByRole("textbox")).first().fill("paris"); await sm.p.waitForTimeout(1500);
log("F.360px-recherche", (await overflowing(sm.p)).length === 0 && (await unreachable(sm.p)).length === 0, "360x740"); await sm.p.screenshot({ path: "f6-search-360.png" });
await b.close(); const fails = results.filter((x) => !x.ok); console.log(`\n${results.length - fails.length}/${results.length} PASS`); process.exit(fails.length ? 1 : 0);
