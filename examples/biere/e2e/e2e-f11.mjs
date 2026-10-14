// E2E F11 Lieux de degustation lies a la carte : API reelle (SEED_DEMO_ACTIVITY=true) + navigateur 390x844 puis 360 px.
// Front : instantane fige (Vite :5173). Alice (1) n'a aucune degustation de demo : elle part de zero.
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { watch, overflowing, unreachable, covered } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const URL0 = "http://localhost:5173"; const API = "http://localhost:5090/api/v1";
const results = []; const log = (id, ok, d) => { results.push({ id, ok: !!ok }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${d}`); };
const H = (u) => ({ "X-User-Id": String(u) }); const J = async (r) => { const x = await r.text(); try { return x ? JSON.parse(x) : null; } catch { return x; } };
const R = (p, u = 1) => fetch(API + p, { headers: H(u) }); const G = async (p, u = 1) => J(await R(p, u));
const post = (u, fields) => { const f = new FormData(); for (const [k, v] of Object.entries(fields)) f.append(k, String(v)); return fetch(API + "/checkins", { method: "POST", headers: H(u), body: f }); };
const base = (beerId, extra = {}) => ({ beerId, drankAt: new Date(Date.now() - 3600e3).toISOString(), place: "E2E", format: "bottle", ...extra });
const b = await chromium.launch(); const PARIS = { latitude: 48.8566, longitude: 2.3522 };
const mk = async (user, { vp = { width: 390, height: 844 } } = {}) => { const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, locale: "fr-FR", hasTouch: true, isMobile: true, geolocation: PARIS, permissions: ["geolocation"] }); await ctx.addInitScript((u) => localStorage.setItem("mousse.currentUserId", String(u)), user); const p = await ctx.newPage(); return { ctx, p, w: watch(p, { api: "http://localhost:5090", expectedConsole: [/Failed to load resource/, /tile\.openstreetmap/] }) }; };
const settle = async (p) => { await p.waitForLoadState("networkidle"); await p.waitForTimeout(900); };
const venues = await G("/venues"); const byName = (n) => venues.find((v) => v.name === n);
const cluny = byName("La Taverne de Cluny"); const academie = venues.find((v) => /Acad.mie de la Bi.re/.test(v.name)); const delirium = byName("Delirium Café");
log("0.lieux-de-reference", !!cluny && !!academie && !!delirium, `cluny=${cluny?.id} academie=${academie?.id} delirium=${delirium?.id}`);

// A. API : creation liee
let r = await post(1, base(3, { place: cluny.name, venueId: cluny.id })); let body = await J(r);
log("A.api-creation-liee", r.status === 201 && body.checkin.venueId === cluny.id && body.checkin.place === cluny.name, `${r.status} venueId=${body?.checkin?.venueId}`);
r = await post(1, base(4, { place: "Chez moi" })); body = await J(r); log("A.api-creation-libre-venueId-null", r.status === 201 && body.checkin.venueId === null && body.checkin.place === "Chez moi", `${r.status} venueId=${body?.checkin?.venueId}`);
r = await post(1, base(5, { venueId: 99999 })); body = await J(r); log("A.api-lieu-inconnu-404", r.status === 404 && body?.message === "Venue 99999 not found.", `${r.status} ${JSON.stringify(body)}`);
const nBefore = (await G("/checkins")).total; for (const bad of ["abc", "0", "-3"]) { r = await post(1, base(5, { venueId: bad })); log(`A.api-venueId-${bad}-400`, r.status === 400, `${r.status}`); }
log("A.api-rien-ecrit-si-refus", (await G("/checkins")).total === nBefore, `total ${nBefore} inchange`);
// B. API : passages
let v = await G(`/venues/${cluny.id}`); log("B.api-lieu-par-id", v.id === cluny.id && v.checkinCount === 1 && !!v.lastCheckinAt, `n=${v.checkinCount} derniere=${v.lastCheckinAt}`);
await post(1, base(6, { place: cluny.name, venueId: cluny.id })); v = await G(`/venues/${cluny.id}`); log("B.api-compteur-2", v.checkinCount === 2, `n=${v.checkinCount}`);
log("B.api-isolation", (await G(`/venues/${cluny.id}`, 2)).checkinCount === 0, "Bob ne voit pas les passages d'Alice");
log("B.api-texte-libre-identique-ne-compte-pas", (await (async () => { await post(1, base(7, { place: delirium.name })); return G(`/venues/${delirium.id}`); })()).checkinCount === 0, "texte libre = nom du lieu, sans venueId : 0 passage");
{ const s = (await R("/venues/99999")).status; log("B.api-lieu-inconnu-404", s === 404, s); const s2 = (await R("/venues/abc")).status; log("B.api-id-invalide-400", s2 === 400, s2); }
let vis = await G("/venues?visited=true"); log("B.api-visited", vis.length === 1 && vis[0].id === cluny.id, `${vis.map((x) => x.name)}`);
log("B.api-visited-isole", (await G("/venues?visited=true", 2)).every((x) => x.checkinCount >= 1), "Bob : lieux visites uniquement");
let s3 = (await R("/venues?visited=yes")).status; log("B.api-visited-yes-400", s3 === 400, s3); s3 = (await R("/venues?visited=1")).status; log("B.api-visited-1-400", s3 === 400, s3);
// C. Demo : degustations de Bob liees a des lieux
const bobCk = await G("/checkins", 2); const linked = (bobCk.items ?? []).filter((c) => c.venueId !== null); log("C.demo-bob-liee-a-des-lieux", linked.length >= 1, `${linked.length}/${(bobCk.items ?? []).length} degustations de Bob liees`);

// D. UI : formulaire « Je l'ai bue »
const { p, w } = await mk(1); const openForm = async (beer, page = p) => { await page.goto(URL0 + "/bieres/" + beer); await settle(page); await page.waitForTimeout(1500); await page.getByRole("button", { name: /Je l'ai bue/ }).click(); await page.waitForTimeout(700); return page.getByRole("dialog"); };
const fmt = async (dlg) => { await dlg.getByText(/^Bouteille/).click(); };
const save = async (dlg) => { const s = dlg.getByRole("button", { name: /Enregistrer/ }); await s.scrollIntoViewIfNeeded(); await s.click(); await p.waitForTimeout(1500); };
let dlg = await openForm(8); const place = dlg.getByRole("combobox", { name: /Lieu/ }).or(dlg.getByLabel(/Lieu/)).first();
await place.click(); await place.fill("taverne"); await p.waitForTimeout(1500); let opts = p.getByRole("option");
const optTexts = await opts.allInnerTexts(); log("D.suggestion-taverne", optTexts.some((t) => /La Taverne de Cluny/.test(t) && /Paris/.test(t)), optTexts.slice(0, 3).join(" || ").replace(/\n/g, " / ")); await p.screenshot({ path: "f11-suggestions.png" });
await opts.filter({ hasText: "La Taverne de Cluny" }).first().click(); await p.waitForTimeout(400);
log("D.champ-rempli-avec-nom-exact", (await place.inputValue()) === "La Taverne de Cluny", await place.inputValue()); await fmt(dlg); await p.screenshot({ path: "f11-lieu-choisi.png" }); await save(dlg);
let ck = (await G("/checkins?beerId=8")).items; log("D.lieu-lie-enregistre", ck.length === 1 && ck[0].venueId === cluny.id && ck[0].place === "La Taverne de Cluny", JSON.stringify(ck[0] && { venueId: ck[0].venueId, place: ck[0].place }));
dlg = await openForm(9); const pl2 = dlg.getByRole("combobox", { name: /Lieu/ }).or(dlg.getByLabel(/Lieu/)).first(); await pl2.click(); await pl2.fill("Chez moi"); await p.waitForTimeout(1200);
const hint = await p.getByRole("listbox").innerText().catch(() => ""); log("D.aucun-lieu-texte-garde", /Aucun lieu de la carte/.test(hint), hint.replace(/\n/g, " | ").slice(0, 100)); await p.screenshot({ path: "f11-aucun-lieu.png" });
await pl2.press("Tab"); await fmt(dlg); await save(dlg); ck = (await G("/checkins?beerId=9")).items; log("D.texte-libre-sans-lien", ck.length === 1 && ck[0].venueId === null && ck[0].place === "Chez moi", JSON.stringify(ck[0] && { venueId: ck[0].venueId, place: ck[0].place }));
dlg = await openForm(10); const pl3 = dlg.getByRole("combobox", { name: /Lieu/ }).or(dlg.getByLabel(/Lieu/)).first(); await pl3.click(); await pl3.fill("taverne"); await p.waitForTimeout(1300); await p.getByRole("option").filter({ hasText: "La Taverne de Cluny" }).first().click(); await p.waitForTimeout(300);
await pl3.click(); await pl3.press("End"); await pl3.pressSequentially(" (terrasse)"); await p.waitForTimeout(500); await pl3.press("Escape").catch(() => {}); await fmt(dlg); await save(dlg); ck = (await G("/checkins?beerId=10")).items;
log("D.modifier-le-texte-retire-le-lien", ck.length === 1 && ck[0].venueId === null && /terrasse/.test(ck[0].place), JSON.stringify(ck[0] && { venueId: ck[0].venueId, place: ck[0].place }));
dlg = await openForm(11); const pl4 = dlg.getByRole("combobox", { name: /Lieu/ }).or(dlg.getByLabel(/Lieu/)).first(); await pl4.click(); await pl4.fill("academie"); await p.waitForTimeout(1300);
log("D.accents-ignores", (await p.getByRole("option").allInnerTexts()).some((t) => /Acad.mie de la Bi.re/.test(t)), "academie -> Académie de la Bière"); await pl4.fill("Lyon"); await p.waitForTimeout(1300);
const lyon = await p.getByRole("option").allInnerTexts(); log("D.recherche-par-ville", lyon.length >= 2 && lyon.every((t) => /Lyon/i.test(t)), `${lyon.length} lieux de Lyon`);
await p.route("**/api/v1/venues**", (rt) => rt.abort()); await pl4.fill("paris"); await p.waitForTimeout(1800); const errL = await p.getByRole("listbox").innerText().catch(() => ""); log("D.panne-suggestions-indisponibles", /Suggestions indisponibles/.test(errL), errL.replace(/\n/g, " | ").slice(0, 80)); await p.unroute("**/api/v1/venues**");
await pl4.fill(""); await pl4.press("Escape").catch(() => {}); await fmt(dlg); await save(dlg); log("D.champ-vide-message-obligatoire", /Indiquez le lieu/.test(await p.getByRole("dialog").innerText()), "le formulaire reste ouvert avec l'erreur");
let t = w.take(); log("D.sans-erreur-5xx", !t.fiveXX.length, `5xx=${t.fiveXX.length} console=${t.console.length}`);

// E. UI : fiche du lieu
await p.goto(URL0 + `/carte?venue=${cluny.id}`); await settle(p); await p.waitForTimeout(2000); let sh = p.getByRole("dialog"); let stxt = await sh.innerText().catch(() => "");
log("E.fiche-ouverte-par-adresse", (await sh.count()) === 1 && stxt.includes("La Taverne de Cluny"), `dialogues ${await sh.count()}`);
log("E.vous-avez-bu-ici", /Vous avez bu ici 3 fois \(dernière fois le/.test(stxt), (stxt.match(/Vous avez bu ici[^\n]*/) || ["?"])[0]); await p.screenshot({ path: "f11-fiche-lieu.png" });
log("E.sans-debordement", (await overflowing(p)).length === 0, "390 px");
const h0 = await p.evaluate(() => history.length); await sh.getByRole("button", { name: /Fermer/ }).first().click().catch(() => p.keyboard.press("Escape")); await p.waitForTimeout(900); log("E.fermer-retire-le-lieu-de-l-adresse", !/venue=/.test(p.url()), p.url().replace(URL0, "")); const h1 = await p.evaluate(() => history.length); log("E.fermer-sans-entree-d-historique", h1 === h0, `history.length ${h0} -> ${h1}`);

await p.goto(URL0 + `/carte?venue=${delirium.id}`); await settle(p); await p.waitForTimeout(2000); stxt = await p.getByRole("dialog").innerText().catch(() => ""); log("E.texte-libre-identique-sans-passage", !/Vous avez bu ici/.test(stxt) && stxt.includes("Delirium"), "0 passage lie : aucune phrase");
await p.goto(URL0 + "/carte?venue=abc"); await settle(p); await p.waitForTimeout(1500); log("E.reference-invalide-ignoree", (await p.getByRole("dialog").count()) === 0, `dialogues ${await p.getByRole("dialog").count()} ; ${p.url().replace(URL0, "")}`);
await p.goto(URL0 + "/carte?venue=99999"); await settle(p); await p.waitForTimeout(1800); const gone = await p.getByText("Ce lieu n'est plus sur la carte.").count(); log("E.lieu-inconnu-message-une-fois", gone === 1 && (await p.getByRole("dialog").count()) === 0 && !/venue=/.test(p.url()), `message x${gone} ; ${p.url().replace(URL0, "")}`); await p.screenshot({ path: "f11-lieu-disparu.png" });

// F. UI : filtre « Lieux où j'ai bu »
await p.goto(URL0 + "/carte"); await settle(p); await p.waitForTimeout(1200); const cnt = async () => +((await p.getByRole("button", { name: /^Lieux \(\d+\)/ }).innerText()).match(/\((\d+)\)/)?.[1] ?? -1);
const n0 = await cnt(); await p.getByRole("button", { name: /^Filtres/ }).click(); await p.waitForTimeout(700); const fd = p.getByRole("dialog"); await fd.getByText(/Lieux où j'ai bu/).first().click(); await p.screenshot({ path: "f11-filtre-actif.png" }); await fd.getByRole("button", { name: /Appliquer/ }).click(); await settle(p); await p.waitForTimeout(1200);
const n1 = await cnt(); const visitedNow = (await G("/venues?visited=true")).length; log("F.filtre-visites", n1 === visitedNow && n1 < n0 && /visited=/.test(p.url()), `${n0} -> ${n1} (API ${visitedNow}) ; ${p.url().replace(URL0, "")}`);
const badge = await p.getByText(/1 filtre actif/).count(); log("F.compteur-filtres", badge >= 1, `badge « 1 filtre actif » x${badge}`);
await p.reload(); await settle(p); await p.waitForTimeout(1200); log("F.adresse-partageable", (await cnt()) === n1, `apres rechargement : ${await cnt()}`);
await p.getByRole("button", { name: /^Filtres/ }).click(); await p.waitForTimeout(600); await p.getByRole("dialog").getByRole("button", { name: /Réinitialiser/ }).click(); await p.getByRole("dialog").getByRole("button", { name: /Appliquer/ }).click(); await settle(p); await p.waitForTimeout(1200); log("F.reinitialiser", !/visited=/.test(p.url()) && (await cnt()) === n0, p.url().replace(URL0, ""));
await p.goto(URL0 + "/carte?visited=maybe"); await settle(p); await p.waitForTimeout(1200); log("F.valeur-inattendue-inactif", (await cnt()) === n0, `${await cnt()} lieux`);
// G. UI : Journal
await p.goto(URL0 + "/journal"); await settle(p); await p.waitForTimeout(1500); const link = p.getByRole("link", { name: "La Taverne de Cluny" }).first(); const nl = await p.getByRole("link", { name: "La Taverne de Cluny" }).count();
log("G.lieu-lie-est-un-lien", nl >= 1 && /\/carte\?.*venue=\d+/.test((await link.getAttribute("href")) ?? ""), `${nl} lien(s) ; href=${await link.getAttribute("href")}`);
log("G.texte-libre-sans-lien", (await p.getByRole("link", { name: "Chez moi" }).count()) === 0 && (await p.getByText("Chez moi").count()) >= 1, "« Chez moi » reste du texte"); await p.screenshot({ path: "f11-journal.png" });
const box = await link.boundingBox(); log("G.cible-44px", box && box.height >= 44 - 1, `hauteur ${box && Math.round(box.height)}`);
await link.focus(); await p.keyboard.press("Enter"); await p.waitForTimeout(2500); stxt = await p.getByRole("dialog").innerText().catch(() => ""); log("G.clavier-ouvre-la-carte-sur-le-lieu", /\/carte/.test(p.url()) && stxt.includes("La Taverne de Cluny"), p.url().replace(URL0, ""));
log("G.oracle-controles-accessibles", (await unreachable(p)).filter((c) => !/^[\d✓?✕–]+$/.test(c.text)).length === 0, "carte + fiche (repères de la carte hors écran exclus)");
// G2. lieu lie supprime : le texte reste, la carte le dit
await p.goto(URL0 + "/bieres/8"); await settle(p); await p.waitForTimeout(1500); log("G.fiche-biere-historique-lien", (await p.getByRole("link", { name: "La Taverne de Cluny" }).count()) >= 1, "meme composant dans l'historique de la fiche");
// H. 360 px
const sm = await mk(1, { vp: { width: 360, height: 740 } }); await sm.p.goto(URL0 + "/bieres/12"); await settle(sm.p); await sm.p.waitForTimeout(1500); await sm.p.getByRole("button", { name: /Je l'ai bue/ }).click(); await sm.p.waitForTimeout(700);
const dm = sm.p.getByRole("dialog"); const pm = dm.getByRole("combobox", { name: /Lieu/ }).or(dm.getByLabel(/Lieu/)).first(); await pm.click(); await pm.fill("bar"); await sm.p.waitForTimeout(1500);
const oh = await sm.p.getByRole("option").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height))); const hov = await sm.p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
log("H.360-suggestions-44px", oh.length >= 1 && oh.every((h) => h >= 44), `${oh.length} suggestions ; hauteurs ${[...new Set(oh)]}`); log("H.360-sans-debordement", hov <= 0 && (await overflowing(sm.p)).length === 0, `h-overflow ${hov}`); await sm.p.screenshot({ path: "f11-360-suggestions.png" });
await sm.p.goto(URL0 + `/carte?venue=${cluny.id}`); await settle(sm.p); await sm.p.waitForTimeout(2000); log("H.360-fiche-sans-debordement", (await overflowing(sm.p)).length === 0, "fiche du lieu"); await sm.p.screenshot({ path: "f11-360-fiche.png" });
t = w.take(); log("Z.sans-erreur-5xx", !t.fiveXX.length, `5xx=${t.fiveXX.length}`);
await b.close(); const ko = results.filter((x) => !x.ok); console.log(`\n${results.length - ko.length}/${results.length} PASS`); if (ko.length) { console.log("ECHECS :", ko.map((x) => x.id).join(", ")); process.exit(1); }
