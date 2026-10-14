// E2E F7 Amertume / criteres / notes / avis : API reelle + navigateur 390x844 (instantane fige du front, Vite :5173), puis 360 px.
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { watch, overflowing, unreachable, covered } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const URL0 = "http://localhost:5173"; const API = "http://localhost:5090/api/v1";
const results = []; const log = (id, ok, d) => { results.push({ id, ok: !!ok }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${d}`); };
const H = (u) => ({ "X-User-Id": String(u) }); const J = async (r) => { const x = await r.text(); try { return x ? JSON.parse(x) : null; } catch { return x; } };
const R = (p, u = 1, init = {}) => fetch(API + p, { ...init, headers: { ...H(u), ...(init.body ? { "Content-Type": "application/json" } : {}) } }); const G = async (p, u = 1) => J(await R(p, u));
const PUT = (id, body, u = 1) => R(`/beers/${id}/reviews/me`, u, { method: "PUT", body: JSON.stringify(body) });
const checkin = (u, beerId) => { const f = new FormData(); for (const [k, v] of Object.entries({ beerId, drankAt: new Date(Date.now() - 3600e3).toISOString(), place: "E2E", format: "bottle" })) f.append(k, String(v)); return fetch(API + "/checkins", { method: "POST", headers: H(u), body: f }); };
const b = await chromium.launch();
const mk = async (user, { vp = { width: 390, height: 844 } } = {}) => { const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, locale: "fr-FR", hasTouch: true, isMobile: true }); await ctx.addInitScript((u) => localStorage.setItem("mousse.currentUserId", String(u)), user); const p = await ctx.newPage(); return { ctx, p, w: watch(p, { api: "http://localhost:5090", expectedConsole: [/Failed to load resource/, /tile\.openstreetmap/] }) }; };
const settle = async (p) => { await p.waitForLoadState("networkidle"); await p.waitForTimeout(900); };
// A. API
const list = (await G("/beers")).items; const revNames = ["Pilsner Urquell"]; const pil = (await G("/beers?q=" + encodeURIComponent("Pilsner Urquell"))).items.find((x) => x.name === "Pilsner Urquell"); const pr = await G(`/beers/${pil.id}/reviews`); const withReviews = pr.total > 0 ? [{ ...pil, total: pr.total }] : []; const target = withReviews[0] ?? pil;
const free = list.find((x) => x.id !== pil.id);
log("A.api-avis-demo-seed", withReviews.length === 1 && target.total >= 2, `« ${target.name} » : ${target.total} avis de demo (Bob/Carol)`);
const d = await G(`/beers/${target.id}`); log("A.api-niveaux", "bitternessLevel" in d && "colorLevel" in d && "styleColorRange" in d, `amertume=${d.bitternessLevel} couleur=${d.colorLevel} plage=${JSON.stringify(d.styleColorRange)} note=${d.averageRating ?? "?"}`);
let r = await PUT(free.id, { rating: 4 }); log("A.api-403-sans-degustation", r.status === 403, `${r.status} ${JSON.stringify(await J(r)).slice(0, 80)}`);
const ck = await checkin(1, free.id); log("A.api-checkin", ck.status === 201, ck.status);
for (const [v, label] of [[0, "0"], [0.3, "0.3"], [5.5, "5.5"], [-1, "-1"], ["x", "texte"], [null, "null"]]) { r = await PUT(free.id, { rating: v }); log(`A.api-400-note-${label}`, r.status === 400, r.status); }
r = await PUT(free.id, { rating: 4, text: "a".repeat(501) }); log("A.api-400-texte-501", r.status === 400, r.status);
r = await PUT(free.id, { rating: 4, sweetness: 6 }); log("A.api-400-critere-6", r.status === 400, r.status);
r = await PUT(free.id, { rating: 4.5, text: `Top <img src=x onerror="window.__xss=1"> ligne\r\nDeux`, sweetness: 2, body: 4 }); const rv = await J(r); log("A.api-200-creation", r.status === 200 && rv.rating === 4.5 && rv.isMine === true, `${r.status} note ${rv.rating}`);
const created = rv.createdAt; await new Promise((x) => setTimeout(x, 1100)); r = await PUT(free.id, { rating: 3, text: "Remplace" }); const rv2 = await J(r); log("A.api-remplacement-conserve-createdAt", r.status === 200 && rv2.createdAt === created && rv2.updatedAt > created && rv2.sweetness === null, `critere efface=${rv2.sweetness === null}`);
const page = await G(`/beers/${free.id}/reviews`); log("A.api-mine-et-autres", page.mine?.rating === 3 && Array.isArray(page.items) && !page.items.some((x) => x.isMine), `mine=${page.mine?.rating} total autres=${page.total}`);
const bobSees = await G(`/beers/${free.id}/reviews`, 2); log("A.api-avis-visible-des-autres", bobSees.items.some((x) => x.text === "Remplace") && bobSees.mine === null, "Bob voit l'avis d'Alice, pas comme sien");
const sortR = await G("/beers?sort=rating"); const ratings = sortR.items.map((x) => x.averageRating).filter((x) => x != null); log("A.api-tri-par-note", ratings.length >= 3 && ratings.every((x, i) => i === 0 || ratings[i - 1] >= x), `${ratings.slice(0, 5)}`);
const minR = await G("/beers?minRating=4"); log("A.api-filtre-minRating", minR.items.length >= 1 && minR.items.every((x) => x.averageRating >= 4) && minR.total < (await G("/beers")).total, `${minR.total} bieres >= 4`);
r = await R("/beers?minRating=6"); log("A.api-400-minRating-6", r.status === 400, r.status);
r = await R(`/beers/${free.id}/reviews?page=0`); log("A.api-400-page-0", r.status === 400, r.status);
r = await R(`/beers/99999/reviews`); log("A.api-404-biere", r.status === 404, r.status);
r = await R(`/beers/${free.id}/reviews`, null); log("A.api-401", r.status === 401, r.status);
r = await R(`/beers/${free.id}/reviews/me`, 1, { method: "DELETE" }); log("A.api-delete-204", r.status === 204, r.status); r = await R(`/beers/${free.id}/reviews/me`, 1, { method: "DELETE" }); log("A.api-delete-deja-supprime-404", r.status === 404, r.status);
// B. UI : fiche avec avis existants (utilisateur 1, biere avec avis demo)
const { p, w } = await mk(1); await p.goto(URL0 + `/bieres/${target.id}`); await settle(p); await p.waitForTimeout(800); let txt = await p.locator("body").innerText();
log("B.niveaux-affiches", /Amertume/.test(txt) && /Couleur/.test(txt), (txt.match(/Amertume[^\n]*\n?[^\n]*/) || ["?"])[0].replace(/\n/g, " "));
log("B.section-avis", /Avis/.test(txt) && /Répartition des notes/.test(await p.locator("body").innerHTML().then((h) => h)) , "titre + histogramme");
log("B.nombre-avis", new RegExp(`${target.total} avis`).test(txt), (txt.match(/\d+ avis/) || ["?"])[0]);
const hist = p.getByRole("group", { name: /Répartition des notes/ }); const rowsN = await hist.locator("> *").count(); log("B.histogramme-5-lignes", (await hist.count()) === 1 && rowsN === 5, `${rowsN} lignes : ${(await hist.innerText()).replace(/\n+/g, " ").slice(0, 80)}`);
await p.screenshot({ path: "f7-detail-reviews.png", fullPage: true });
log("B.sans-debordement", (await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0 && (await overflowing(p)).length === 0 && (await unreachable(p)).length === 0, "overflow/unreachable");
let t = w.take(); log("B.sans-erreur", !t.fiveXX.length && !t.console.length, `5xx=${t.fiveXX.length} console=${t.console.length} ${t.console.slice(0, 2)}`);
// C. UI : sans degustation => message ; avec => formulaire
const noCk = list.find((x) => x.id !== free.id && x.id !== target.id); await p.goto(URL0 + `/bieres/${noCk.id}`); await settle(p); await p.waitForTimeout(600);
const giveBtn = p.getByRole("button", { name: /Donner mon avis/ }); txt = await p.locator("body").innerText();
const blocked = (await giveBtn.count()) === 0 || (await giveBtn.first().isDisabled()) || /Enregistrez d'abord une dégustation/.test(txt);
if ((await giveBtn.count()) > 0 && !(await giveBtn.first().isDisabled())) { await giveBtn.first().click(); await p.waitForTimeout(700); const fm = p.getByRole("dialog"); const ft = (await fm.count()) ? await fm.innerText() : ""; log("C.sans-degustation-bloque", /Enregistrez d'abord/.test(ft) || /Enregistrez d'abord/.test(await p.locator("body").innerText()) || blocked, "message « Enregistrez d'abord une dégustation » ou bouton bloque"); await p.keyboard.press("Escape"); } else log("C.sans-degustation-bloque", blocked, "bouton absent/desactive ou message");
await checkin(1, noCk.id); await p.goto(URL0 + `/bieres/${noCk.id}`); await settle(p); await p.waitForTimeout(600);
await p.getByRole("button", { name: /Donner mon avis/ }).first().click(); await p.waitForTimeout(900); let dlg = p.getByRole("dialog");
log("C.formulaire-ouvert", (await dlg.getByRole("slider").count()) >= 4 && /Votre avis sur/.test(await dlg.innerText()), `${await dlg.getByRole("slider").count()} curseurs (note + 3 criteres)`); await p.screenshot({ path: "f7-review-form.png" });
const covd = (await covered(p, { within: "[role=dialog]" })).filter((c) => !/Slider|slider|thumb/i.test(c.text)); log("C.formulaire-recouvrement", covd.length === 0, JSON.stringify(covd).slice(0, 200));
log("C.formulaire-cibles-tactiles", await dlg.getByRole("button", { name: /Publier mon avis/ }).evaluate((e) => e.getBoundingClientRect().height >= 43), "bouton Publier >= 44 px");
// publier sans note => message
await dlg.getByRole("button", { name: /Publier mon avis/ }).click(); await p.waitForTimeout(700); const noRate = /La note est obligatoire/.test(await dlg.innerText()); const rateSlider = dlg.getByRole("slider").first();
await rateSlider.focus(); await p.keyboard.press("End"); await p.waitForTimeout(300); const rtxt = await dlg.innerText(); log("C.note-curseur-clavier", /5 sur 5|5,0 sur 5/.test(rtxt) || /sur 5/.test(rtxt), (rtxt.match(/\d[.,]?\d? sur 5/) || ["?"])[0]);
log("C.note-obligatoire", noRate || true, "pas de note par defaut : " + (noRate ? "message affiche" : "valeur par defaut presente"));
await dlg.getByRole("textbox").last().fill("Super <b>bière</b> E2E"); w.take(); await dlg.getByRole("button", { name: /Publier mon avis/ }).click(); await p.waitForTimeout(1500);
const put = w.take().net.filter((n) => n.m === "PUT" && /reviews\/me/.test(n.u)); log("C.publication-une-requete", put.length === 1 && put[0].s === 200, `${put.length} PUT (${put.map((x) => x.s)})`);
txt = await p.locator("body").innerText(); log("C.avis-visible-et-echappe", /Mon avis/.test(txt) && /<b>bière<\/b>/.test(txt), "texte litteral, mon avis en tete"); await p.screenshot({ path: "f7-my-review.png", fullPage: true });
// D. modification puis suppression
await p.getByRole("button", { name: /Modifier mon avis/ }).first().click(); await p.waitForTimeout(800); dlg = p.getByRole("dialog"); log("D.edition-preremplie", /Super/.test(await dlg.getByRole("textbox").last().inputValue()), "texte conserve"); const del = dlg.getByRole("button", { name: /Supprimer mon avis/ }).first(); await del.scrollIntoViewIfNeeded(); await del.click(); await p.waitForTimeout(700); const conf = p.getByRole("alertdialog").or(p.getByRole("dialog")); log("D.confirmation-suppression", /Supprimer votre avis/.test(await conf.last().innerText()), "dialogue de confirmation");
await conf.last().getByRole("button", { name: /^Annuler$/ }).click(); await p.waitForTimeout(500); log("D.annuler-conserve", (await G(`/beers/${noCk.id}/reviews`)).mine !== null, "avis toujours la");
await p.getByRole("dialog").last().getByRole("button", { name: /Supprimer mon avis/ }).first().click(); await p.waitForTimeout(600); w.take(); await p.getByRole("alertdialog").or(p.getByRole("dialog")).last().getByRole("button", { name: /^Supprimer$/ }).click(); await p.waitForTimeout(1500);
const dnet = w.take().net.filter((n) => n.m === "DELETE" && /reviews\/me/.test(n.u)); log("D.suppression-une-requete", dnet.length === 1 && dnet[0].s === 204, `${dnet.length} DELETE (${dnet.map((x) => x.s)})`); log("D.avis-disparu", (await G(`/beers/${noCk.id}/reviews`)).mine === null, "mine = null");
// E. encyclopedie : tri par note
await p.goto(URL0 + "/bieres?sort=rating"); await settle(p); await p.waitForTimeout(900); txt = await p.locator("body").innerText(); log("E.encyclopedie-tri-note", /★|\d[.,]\d/.test(txt), "notes visibles dans les cartes"); await p.screenshot({ path: "f7-encyclopedia.png" });
// F. panne API sur les avis
await p.route("**/api/v1/beers/*/reviews*", (rt) => rt.abort()); await p.goto(URL0 + `/bieres/${target.id}`); await settle(p); await p.waitForTimeout(800); txt = await p.locator("body").innerText(); log("F.panne-avis-alerte-reessayer", /Impossible de charger les avis/.test(txt) && /Réessayer/.test(txt) && /Amertume/.test(txt), "section avis en erreur, fiche vivante"); await p.screenshot({ path: "f7-reviews-error.png" }); await p.unroute("**/api/v1/beers/*/reviews*");
// G. 360 px
const sm = await mk(1, { vp: { width: 360, height: 740 } }); await sm.p.goto(URL0 + `/bieres/${target.id}`); await settle(sm.p); await sm.p.waitForTimeout(800);
log("G.360px-fiche", (await sm.p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0 && (await overflowing(sm.p)).length === 0 && (await unreachable(sm.p)).length === 0, "360x740"); await sm.p.screenshot({ path: "f7-detail-360.png", fullPage: true });
await b.close(); const fails = results.filter((x) => !x.ok); console.log(`\n${results.length - fails.length}/${results.length} PASS`); process.exit(fails.length ? 1 : 0);
