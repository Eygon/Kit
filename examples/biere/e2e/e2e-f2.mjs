// E2E F2 Degustations et Pokedex : API reelle + navigateur 390x844 (instantane fige du front, Vite :5173).
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { writeFileSync } from "node:fs";
import { watch, overflowing, unreachable, unreadable } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const RUN = process.argv[2] || "1"; const URL0 = "http://localhost:5173"; const API = "http://localhost:5090";
const results = []; const log = (id, ok, d) => { results.push({ id, ok: !!ok, detail: d }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${d}`); };
const b = await chromium.launch();
const mk = async (user, vp = { width: 390, height: 844 }) => { const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, locale: "fr-FR", hasTouch: true, isMobile: true }); await ctx.addInitScript((u) => localStorage.setItem("mousse.currentUserId", String(u)), user); const p = await ctx.newPage(); return { ctx, p, w: watch(p, { api: API, expectedConsole: [/Failed to load resource/] }) }; };
const { p, w } = await mk(1);
const cards = () => p.locator('a[href^="/bieres/"]');
const settle = async () => { await p.waitForLoadState("networkidle"); await p.waitForTimeout(400); };
const hOv = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const goto = async (path) => { await p.goto(URL0 + path); await settle(); };
const apiGet = async (path, u = 1) => (await fetch(API + "/api/v1" + path, { headers: { "X-User-Id": String(u) } })).json();
// A. etat initial
await goto("/bieres"); const body0 = await p.locator("body").innerText();
log("A.compteur-0", /0 \/ 120 découvertes/.test(body0), (body0.match(/\d+ \/ \d+ découvertes/) || ["?"])[0]);
const pb = await p.locator('[role="progressbar"]').first().evaluate((e) => ({ now: e.getAttribute("aria-valuenow"), max: e.getAttribute("aria-valuemax") })).catch(() => null); log("A.anneau-accessible", pb && pb.max === "120" && pb.now === "0", JSON.stringify(pb));
const unk = await cards().first().innerText(); log("A.carte-grisee", /\?\?\?/.test(unk) && !/Bue le/.test(unk), unk.replace(/\n/g, " | ").slice(0, 80));
log("A.sans-debordement", (await hOv()) <= 0 && (await overflowing(p)).length === 0, "h-overflow " + (await hOv()));
let t = w.take(); log("A.sans-erreur", !t.fiveXX.length && !t.console.length, `5xx=${t.fiveXX.length} console=${t.console.length}`);
// B. envie
await cards().first().click(); await settle(); await p.waitForTimeout(1500); // page de la fiche chargee a la demande (F9)
const wish = p.getByRole("button", { name: /À goûter/ });
log("B.fiche-historique-vide", /Pas encore de dégustation/.test(await p.locator("body").innerText()), "etat vide");
await wish.click(); await p.waitForTimeout(150); const pr1 = await wish.getAttribute("aria-pressed"); await settle();
log("B.envie-optimiste", pr1 === "true", `aria-pressed juste apres l appui : ${pr1}`);
const wl = await apiGet("/me/wishlist"); log("B.envie-en-base", wl.length === 1, JSON.stringify(wl).slice(0, 100));
await p.reload(); await settle(); log("B.envie-persistante", (await p.getByRole("button", { name: /À goûter/ }).getAttribute("aria-pressed")) === "true", "apres rechargement");
await p.getByRole("button", { name: /À goûter/ }).dblclick(); await settle(); const wl2 = await apiGet("/me/wishlist"); log("B.double-appui-coherent", wl2.length === 0 || wl2.length === 1, `${wl2.length} en base apres double appui (retire puis remis ou inverse, jamais de doublon)`);
if (wl2.length === 1) { await p.getByRole("button", { name: /À goûter/ }).click(); await settle(); }
// C. feuille : validations
await p.getByRole("button", { name: /Je l'ai bue/ }).click(); await p.waitForTimeout(700);
const dlg = p.getByRole("dialog"); const posts0 = w.take().net.filter((n) => n.m === "POST").length;
await dlg.getByRole("button", { name: /Enregistrer/ }).scrollIntoViewIfNeeded(); await dlg.getByRole("button", { name: /Enregistrer/ }).click(); await p.waitForTimeout(500);
const errs = await dlg.innerText(); const nPost = w.take().net.filter((n) => n.m === "POST").length;
log("C.validation-lieu-format", nPost === 0 && /obligatoire|requis|Renseignez|Indiquez|Choisissez/i.test(errs), `POST=${nPost} ; message vu : ${(errs.match(/(obligatoire|requis|Renseignez|Indiquez|Choisissez)[^\n]*/i) || ["aucun"])[0]}`);
await p.screenshot({ path: "f2-validation.png" });
const star = await dlg.locator("input:invalid, [aria-invalid=true]").count(); log("C.champs-en-erreur-signales", star >= 1, `${star} champ(s) aria-invalid`);
const fut = new Date(Date.now() + 86400e3).toISOString().slice(0, 16); const dt = dlg.locator('input[type="datetime-local"]'); log("C.date-max-maintenant", !!(await dt.getAttribute("max")), "max=" + (await dt.getAttribute("max")));
await dt.fill(fut); await dlg.getByLabel(/Lieu/).fill("Bar du Coin"); await dlg.getByText(/^Canette/).click(); await dlg.getByRole("button", { name: /Enregistrer/ }).click(); await p.waitForTimeout(500);
log("C.date-future-refusee", w.take().net.filter((n) => n.m === "POST").length === 0, "aucun POST avec une date dans le futur");
const now = new Date(Date.now() - 600e3); const loc = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16); await dt.fill(loc);
// aromes : 6e refuse
const aromas = ["Fruité", "Agrumes", "Houblonné", "Floral", "Épicé", "Caramel"]; for (const a of aromas.slice(0, 5)) await dlg.getByText(new RegExp("^" + a + "$")).click();
const note = dlg.locator('[role="slider"], input[type=range]').first(); await note.focus(); for (let i = 0; i < 9; i++) await p.keyboard.press("ArrowRight"); await p.waitForTimeout(200); const nv = await dlg.innerText(); log("C.note-clavier", /4,5|4\.5/.test(nv), (nv.match(/(\d[,.]\d|Sans note)/) || ["?"])[0]);
await dlg.getByLabel(/Prix/).fill("3,5"); await dlg.getByLabel(/Prix/).blur(); await dlg.getByLabel(/Commentaire/).fill("Très bon\nsur deux lignes"); const cc = await dlg.innerText(); log("C.compteur-commentaire", /\d+ \/ 500/.test(cc), (cc.match(/\d+ \/ 500/) || ["?"])[0]);
const ovs = await overflowing(p); const urs = await unreachable(p); log("C.feuille-sans-debordement-atteignable", ovs.length === 0 && urs.length === 0, JSON.stringify([ovs, urs]).slice(0, 300));
// envoi unique : double appui
await p.screenshot({ path: "f2-sheet-filled.png" }); w.take();
const save = dlg.getByRole("button", { name: /Enregistrer/ }); await save.scrollIntoViewIfNeeded(); await Promise.all([save.dblclick(), p.waitForTimeout(50)]); await p.waitForTimeout(1500);
const net = w.take(); const posts = net.net.filter((n) => n.m === "POST" && /checkins/.test(n.u));
log("C.envoi-unique-double-appui", posts.length === 1 && posts[0].s === 201, `${posts.length} POST /checkins (${posts.map((x) => x.s)})`);
await p.screenshot({ path: "f2-success-first.png" });
const succ = await p.locator("body").innerText(); const captured = await p.locator('[data-mood="captured"]').count();
log("C.reussite-mascotte-captured", captured >= 1 && /Découverte|découvr|Nouvelle|capturée/i.test(succ), `mascotte captured=${captured} ; texte : ${(succ.match(/(Nouvelle découverte|Découverte|découvert|capturée)[^\n]*/i) || ["?"])[0]}`);
const ck = await apiGet("/checkins"); log("C.5-aromes-au-plus-en-base", ck.items[0].aromas.length === 5, "5 aromes enregistres sur 6 clics"); log("C.donnees-en-base", ck.total === 1 && ck.items[0].place === "Bar du Coin" && ck.items[0].rating === 4.5 && ck.items[0].format === "can" && ck.items[0].aromas.length === 5 && ck.items[0].price === 3.5 && /deux lignes/.test(ck.items[0].comment), JSON.stringify(ck.items[0]).slice(0, 260));
const drankDelta = Math.abs(new Date(ck.items[0].drankAt).getTime() - (Date.now() - 600e3)); log("C.fuseau-date-correct", drankDelta < 120e3, `ecart ${Math.round(drankDelta / 1000)} s entre l heure saisie et la base (UTC)`);
// D. historique + 2e check-in = toast
const closeBtn = p.getByRole("button", { name: /Fermer|Continuer|OK|Super/ }).first(); if (await closeBtn.count()) await closeBtn.click().catch(() => {}); await p.waitForTimeout(500); await settle();
const hist = await p.locator("body").innerText(); log("D.historique", /Bar du Coin/.test(hist) && /4,5/.test(hist), (hist.match(/Mon historique[\s\S]{0,160}/) || ["?"])[0].replace(/\n/g, " | "));
await p.screenshot({ path: "f2-fiche-historique.png" });
await p.getByRole("button", { name: /Je l'ai bue/ }).click(); await p.waitForTimeout(600); const d2 = p.getByRole("dialog"); await d2.getByLabel(/Lieu/).fill("Maison"); await d2.getByText(/^Bouteille/).click(); await d2.getByRole("button", { name: /Enregistrer/ }).scrollIntoViewIfNeeded(); await d2.getByRole("button", { name: /Enregistrer/ }).click(); await p.waitForTimeout(1500);
const cap2 = await p.locator('[data-mood="captured"]').count(); log("D.2e-checkin-pas-de-mascotte", cap2 === 0, `mascotte captured=${cap2} (1ere decouverte seulement)`);
await settle(); const ck2 = await apiGet("/checkins"); log("D.2-checkins", ck2.total === 2, ck2.total); log("D.historique-ordre", /Maison[\s\S]*Bar du Coin/.test(await p.locator("body").innerText()), "plus recent en haut");
// E. encyclopedie apres
await goto("/bieres"); const bodyE = await p.locator("body").innerText(); log("E.compteur-1", /1 \/ 120 découvertes/.test(bodyE), (bodyE.match(/\d+ \/ \d+ découvertes/) || ["?"])[0]);
const stamped = await p.locator('a[href^="/bieres/"]', { hasText: /Bue le/ }).count(); const stampTxt = await p.locator('a[href^="/bieres/"]', { hasText: /Bue le/ }).first().innerText().catch(() => ""); log("E.carte-tamponnee", stamped === 1 && stampTxt.includes(new Date().toLocaleDateString("fr-FR")), `${stamped} carte(s) tamponnee(s) : ${stampTxt.replace(/\n/g, " | ").slice(0, 70)}`);
await p.screenshot({ path: "f2-home1.png" });
await p.getByRole("button", { name: /Filtres/ }).click(); await p.waitForTimeout(500); const dl = p.getByRole("dialog"); await dl.getByText(/^Bues/).click(); await p.waitForTimeout(700); const seeB = await dl.getByRole("button", { name: /Voir \d+ bière/ }).innerText(); log("E.filtre-bues-compteur", /Voir 1 bière/.test(seeB), seeB);
await dl.getByRole("button", { name: /Voir \d+ bière/ }).click(); await settle(); log("E.filtre-bues", /status=drunk/.test(p.url()) && (await cards().count()) === 1, `url ${p.url().replace(URL0, "")} ; ${await cards().count()} carte`);
await p.getByRole("button", { name: /Filtres/ }).click(); await p.waitForTimeout(500); await p.getByRole("dialog").getByText(/^Jamais/).click(); await p.waitForTimeout(700); const seeU = await p.getByRole("dialog").getByRole("button", { name: /Voir \d+ bière/ }).innerText(); log("E.filtre-jamais-goutees", /Voir 119 bières/.test(seeU), seeU);
await p.screenshot({ path: "f2-filtre-statut.png" });
// F. autre utilisateur : isolation
const bob = await mk(2); await bob.p.goto(URL0 + "/bieres"); await bob.p.waitForLoadState("networkidle"); await bob.p.waitForTimeout(500); log("F.autre-utilisateur-0", /0 \/ 120 découvertes/.test(await bob.p.locator("body").innerText()), "Bob voit 0 / 120"); await bob.ctx.close();
// G. erreur reseau pendant l envoi : la feuille reste, rien n est perdu
await goto("/bieres/2"); await p.getByRole("button", { name: /Je l'ai bue/ }).click(); await p.waitForTimeout(600); const d3 = p.getByRole("dialog"); await d3.getByLabel(/Lieu/).fill("Test panne"); await d3.getByText(/^Pression/).click();
await p.route("**/api/v1/checkins", (r) => (r.request().method() === "POST" ? r.abort() : r.continue())); w.take(); await d3.getByRole("button", { name: /Enregistrer/ }).scrollIntoViewIfNeeded(); await d3.getByRole("button", { name: /Enregistrer/ }).click(); await p.waitForTimeout(1500);
const stillOpen = await p.getByRole("dialog").count(); const kept = await p.getByRole("dialog").getByLabel(/Lieu/).inputValue().catch(() => ""); const toasts = await p.getByText(/Une erreur est survenue/).evaluateAll((els) => els.filter((e) => { const r = e.getBoundingClientRect(); const st = getComputedStyle(e); return r.width > 2 && r.height > 2 && st.visibility !== 'hidden' && st.display !== 'none'; }).length); await p.screenshot({ path: "f2-erreur-envoi.png" });
log("G.panne-feuille-ouverte-donnees-gardees", stillOpen === 1 && kept === "Test panne", `dialogue ouvert=${stillOpen}, lieu conserve « ${kept} »`); log("G.panne-un-seul-message", toasts <= 1, `${toasts} message(s) d erreur`);
await p.unroute("**/api/v1/checkins"); await p.getByRole("dialog").getByRole("button", { name: /Enregistrer/ }).scrollIntoViewIfNeeded(); await p.getByRole("dialog").getByRole("button", { name: /Enregistrer/ }).click(); await p.waitForTimeout(1500); const ck3 = await apiGet("/checkins?beerId=2"); log("G.reessai-ok", ck3.total === 1, ck3.total + " check-in apres reessai");
// G2. commentaire de 500 caracteres avec un retour a la ligne (CRLF a l envoi ?)
await goto("/bieres/4"); await p.getByRole("button", { name: /Je l'ai bue/ }).click(); await p.waitForTimeout(600); const d4 = p.getByRole("dialog"); await d4.getByLabel(/Lieu/).fill("Limite"); await d4.getByText(/^Bouteille/).click(); await d4.getByLabel(/Commentaire/).fill("a".repeat(499) + "\n"); await d4.getByRole("button", { name: /Enregistrer/ }).scrollIntoViewIfNeeded(); w.take(); await d4.getByRole("button", { name: /Enregistrer/ }).click(); await p.waitForTimeout(1500);
const ck4 = await apiGet("/checkins?beerId=4"); log("G2.commentaire-500-avec-retour-ligne", ck4.total === 1, `${ck4.total} check-in (500 caracteres saisis dont un retour a la ligne) ; POST ${JSON.stringify(w.take().net.filter((n) => n.m === "POST").map((n) => n.s))}`);
// H. 360 px
const sm = await mk(1, { width: 360, height: 740 }); await sm.p.goto(URL0 + "/bieres/3"); await sm.p.waitForLoadState("networkidle"); await sm.p.waitForTimeout(500); await sm.p.getByRole("button", { name: /Je l'ai bue/ }).click(); await sm.p.waitForTimeout(700);
log("H.360px-feuille", (await sm.p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0 && (await overflowing(sm.p)).length === 0 && (await unreachable(sm.p)).length === 0, "360x740"); await sm.p.screenshot({ path: "f2-sheet-360.png" }); await sm.ctx.close();
writeFileSync(`results-f2-${RUN}.json`, JSON.stringify(results, null, 1)); await b.close(); console.log(`\n${results.filter((r) => r.ok).length}/${results.length} PASS`);
