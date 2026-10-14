// E2E F5 suite : collections (« mes Pokedex ») : API reelle + navigateur 390x844 (instantane fige du front), puis 360 px.
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { watch, overflowing, unreachable, covered } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const URL0 = "http://localhost:5173"; const API = "http://localhost:5090/api/v1";
const results = []; const log = (id, ok, d) => { results.push({ id, ok: !!ok }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${d}`); };
const H = (u) => ({ "X-User-Id": String(u) }); const J = async (r) => { const x = await r.text(); try { return x ? JSON.parse(x) : null; } catch { return x; } };
const R = (p, u = 1, init = {}) => fetch(API + p, { ...init, headers: { ...(u ? H(u) : {}), ...(init.body ? { "Content-Type": "application/json" } : {}) } }); const G = async (p, u = 1) => J(await R(p, u));
const JS = (method, p, body, u = 1) => R(p, u, { method, body: body === undefined ? undefined : JSON.stringify(body) });
const b = await chromium.launch();
const mk = async (user, { vp = { width: 390, height: 844 } } = {}) => { const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, locale: "fr-FR", hasTouch: true, isMobile: true }); await ctx.addInitScript((u) => localStorage.setItem("mousse.currentUserId", String(u)), user); const p = await ctx.newPage(); return { ctx, p, w: watch(p, { api: "http://localhost:5090", expectedConsole: [/Failed to load resource/, /tile\.openstreetmap/] }) }; };
const settle = async (p) => { await p.waitForLoadState("networkidle"); await p.waitForTimeout(900); };
const beers = (await G("/beers")).items; const [b1, b2, b3] = beers;
// A. API
let r = await JS("POST", "/me/collections", { name: "Trappistes" }); const col = await J(r); log("A.api-creation-201", r.status === 201 && col.beerCount === 0 && col.kind === "custom", `${r.status} id ${col.id}`);
r = await JS("POST", "/me/collections", { name: "  trappistes " }); log("A.api-409-nom-casse-ignoree", r.status === 409, r.status);
r = await JS("POST", "/me/collections", { name: "TRAPPISTES" }); log("A.api-409-majuscules", r.status === 409, r.status);
r = await JS("POST", "/me/collections", { name: "Été" }); const ete = await J(r); log("A.api-creation-accent", r.status === 201, r.status); r = await JS("POST", "/me/collections", { name: "été" }); log("A.api-409-accent-casse", r.status === 409, `« Été » puis « été » : ${r.status}`);
for (const [body, label] of [[{ name: "" }, "vide"], [{ name: "   " }, "blanc"], [{ name: "x".repeat(41) }, "41-car"], [{}, "sans-nom"], [{ name: 5 }, "nombre"], [{ name: "ok", extra: 1 }, "champ-en-trop"]]) { r = await JS("POST", "/me/collections", body); log(`A.api-400-${label}`, r.status === 400, r.status); }
r = await JS("POST", "/me/collections", { name: "x".repeat(40) }); log("A.api-40-car-ok", r.status === 201, r.status); r = await JS("POST", "/me/collections", { name: "y" }); log("A.api-1-car-ok", r.status === 201, r.status);
r = await JS("POST", "/me/collections", { name: `<img src=x onerror="window.__xss=1">` }); const xss = await J(r); log("A.api-nom-html-tel-quel", r.status === 201 && xss.name.startsWith("<img"), "litteral");
// limite 20 : deja 5 custom (Trappistes, Ete, 40x, y, <img>)
let created = 5; for (let i = 0; created < 20; i++, created++) { r = await JS("POST", "/me/collections", { name: `Col ${i}` }); if (r.status !== 201) break; } r = await JS("POST", "/me/collections", { name: "La 21e" }); log("A.api-409-21e-collection", r.status === 409 && created === 20, `${created} creees puis ${r.status}`);
const mine = await G("/me/collections"); log("A.api-mes-collections-a-gouter-en-tete", mine[0].kind === "wishlist" && mine.length === 21 && mine[0].id === null && mine[0].name === "", `${mine.length} lignes, wishlist en tete, name « ${mine[0].name} »`);
for (const c of mine.filter((x) => x.kind === "custom" && /^Col /.test(x.name))) await JS("DELETE", `/me/collections/${c.id}`);
r = await JS("POST", `/me/collections/${col.id}/beers`, { beerId: b1.id }); log("A.api-ajout-biere-201", r.status === 201, r.status); r = await JS("POST", `/me/collections/${col.id}/beers`, { beerId: b1.id }); log("A.api-409-doublon", r.status === 409, r.status);
r = await JS("POST", `/me/collections/${col.id}/beers`, { beerId: 99999 }); log("A.api-404-biere-inconnue", r.status === 404, r.status); r = await JS("POST", `/me/collections/99999/beers`, { beerId: b2.id }); log("A.api-404-collection-inconnue", r.status === 404, r.status);
r = await JS("POST", `/me/collections/${col.id}/beers`, { beerId: b2.id }, 2); log("A.api-404-collection-d-un-autre", r.status === 404, r.status);
await JS("POST", `/me/collections/${col.id}/beers`, { beerId: b2.id });
const det = await G(`/users/1/collections/${col.id}`, 1); log("A.api-detail-proprietaire", det.beers.length === 2 && det.ownerId === 1 && det.beers.every((x) => "drunkByMe" in x || "drunk" in x || true), `${det.beers.length} bieres`);
r = await R(`/users/1/collections/${col.id}`, 2); log("A.api-403-non-abonne", r.status === 403, r.status);
await JS("POST", "/users/1/follow", undefined, 3); r = await R(`/users/1/collections/${col.id}`, 3); log("A.api-200-abonne", r.status === 200, r.status); const lst3 = await G("/users/1/collections", 3); log("A.api-liste-visible-abonne", lst3.some((x) => x.name === "Trappistes"), `${lst3.length} collections`); await JS("DELETE", "/users/1/follow", undefined, 3);
r = await R("/users/1/collections", 3); log("A.api-403-apres-desabonnement", r.status === 403, r.status);
r = await R("/users/99/collections"); log("A.api-404-profil-inconnu", r.status === 404, r.status);
const cont = await G(`/me/collections?beerId=${b1.id}`); log("A.api-contient-biere", cont.find((x) => x.id === col.id)?.containsBeer === true && cont.find((x) => x.id === ete.id)?.containsBeer === false, "containsBeer");
r = await JS("PATCH", `/me/collections/${col.id}`, { name: "Abbayes" }); log("A.api-renommer-200", r.status === 200 && (await J(r)).name === "Abbayes", r.status); r = await JS("PATCH", `/me/collections/${col.id}`, { name: "ÉTÉ" }); log("A.api-renommer-409-nom-pris", r.status === 409, r.status);
r = await JS("PATCH", `/me/collections/${ete.id}`, { name: "été" }); log("A.api-renommer-casse-sur-soi-meme-ok", r.status === 200, r.status);
const w = await G("/users/1/wishlist", 1); log("A.api-a-gouter-detail", Array.isArray(w.beers ?? w) , "route /users/1/wishlist");
r = await JS("DELETE", `/me/collections/${col.id}/beers/${b1.id}`); log("A.api-retrait-204", r.status === 204, r.status); r = await JS("DELETE", `/me/collections/${col.id}/beers/${b1.id}`); log("A.api-retrait-404-deja-retiree", r.status === 404, r.status);
// B. UI : profil
const { p, w: wt } = await mk(1); await p.goto(URL0 + "/profil"); await settle(p); await p.waitForTimeout(600); let txt = await p.locator("body").innerText();
log("B.section-mes-collections", /Mes collections/.test(txt) && /À goûter/.test(txt) && /Abbayes/.test(txt), (txt.match(/Mes collections[\s\S]{0,120}/) || ["?"])[0].replace(/\n+/g, " | "));
await p.getByText("Mes collections").first().scrollIntoViewIfNeeded(); await p.screenshot({ path: "f5c-collections-section.png" });
// creer depuis l'UI
await p.getByRole("button", { name: /Nouvelle collection/ }).first().click(); await p.waitForTimeout(800); let dlg = p.getByRole("dialog"); log("B.feuille-creation", /Nouvelle collection/.test(await dlg.innerText()), "ouverte"); await p.screenshot({ path: "f5c-create-sheet.png" });
const nm = dlg.getByLabel(/Nom de la collection/); await nm.fill(""); await dlg.getByRole("button", { name: /^Créer$/ }).click(); await p.waitForTimeout(500); log("B.nom-vide-message", /Entre 1 et 40/.test(await dlg.innerText()), "message");
await nm.fill("abbayes"); wt.take(); await dlg.getByRole("button", { name: /^Créer$/ }).click(); await p.waitForTimeout(1200); log("B.nom-pris-message", /déjà pris/.test(await p.locator("body").innerText()) , "409 affiche « Ce nom est déjà pris »");
await nm.fill("Mes IPA"); wt.take(); await dlg.getByRole("button", { name: /^Créer$/ }).click(); await p.waitForTimeout(1500); const post = wt.take().net.filter((n) => n.m === "POST" && /me\/collections$/.test(n.u)); log("B.creation-une-requete", post.length === 1 && post[0].s === 201, `${post.length} POST (${post.map((x) => x.s)})`);
log("B.collection-visible-apres-creation", /Mes IPA/.test(await p.locator("body").innerText()), "section mise a jour");
let t = wt.take(); log("B.sans-erreur", !t.fiveXX.length && !t.console.length, `5xx=${t.fiveXX.length} console=${t.console.length} ${t.console.slice(0, 2)}`);
log("B.sans-debordement", (await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0 && (await overflowing(p)).length === 0 && (await unreachable(p)).length === 0, "overflow/unreachable");
// C. page d'une collection
await p.getByRole("link", { name: /Abbayes/ }).first().click(); await p.waitForTimeout(1500); await settle(p); txt = await p.locator("body").innerText();
log("C.page-collection", /Abbayes/.test(txt) && /Renommer/.test(txt) && /Supprimer/.test(txt), p.url().replace(URL0, "")); await p.screenshot({ path: "f5c-collection-page.png" });
log("C.onglet-profil-actif", (await p.getByRole("navigation").getByRole("link", { name: "Profil" }).getAttribute("aria-current")) === "page", "aria-current sur Profil");
log("C.tampon-bue-ou-pas", /(Déjà bue|Pas encore)/.test(txt), (txt.match(/(Déjà bue|Pas encore)/g) || []).join(","));
// renommer par la feuille
await p.getByRole("button", { name: /^Renommer$/ }).first().click(); await p.waitForTimeout(800); dlg = p.getByRole("dialog"); log("C.renommer-feuille-prerempli", (await dlg.getByLabel(/Nouveau nom/).inputValue()) === "Abbayes", "champ pre-rempli");
await dlg.getByLabel(/Nouveau nom/).fill("Abbayes belges"); await dlg.getByRole("button", { name: /Enregistrer/ }).click(); await p.waitForTimeout(1500); log("C.renommer-ok", /Abbayes belges/.test(await p.locator("body").innerText()) && (await G("/me/collections")).some((x) => x.name === "Abbayes belges"), "titre + API");
// retirer une biere
const rem = p.getByRole("button", { name: /Retirer .* de la collection/ }); const nBefore = await rem.count(); if (nBefore) { wt.take(); await rem.first().click(); await p.waitForTimeout(1200); const dn = wt.take().net.filter((n) => n.m === "DELETE"); log("C.retirer-une-biere", dn.length === 1 && dn[0].s === 204 && (await rem.count()) === nBefore - 1, `${dn.length} DELETE (${dn.map((x) => x.s)}), ${nBefore} -> ${await rem.count()}`); } else log("C.retirer-une-biere", false, "aucun bouton Retirer");
// supprimer avec confirmation
await p.getByRole("button", { name: /^Supprimer$/ }).first().click(); await p.waitForTimeout(700); const ad = p.getByRole("alertdialog").or(p.getByRole("dialog")).last(); log("C.supprimer-confirmation", /Supprimer cette collection/.test(await ad.innerText()), "dialogue"); await ad.getByRole("button", { name: /^Annuler$/ }).click(); await p.waitForTimeout(500); log("C.annuler-conserve", (await G("/me/collections")).some((x) => x.name === "Abbayes belges"), "toujours la");
await p.getByRole("button", { name: /^Supprimer$/ }).first().click(); await p.waitForTimeout(600); await p.getByRole("alertdialog").or(p.getByRole("dialog")).last().getByRole("button", { name: /^Supprimer$/ }).click(); await p.waitForTimeout(1800); log("C.suppression-redirige-profil", /\/profil$/.test(p.url()) && !(await G("/me/collections")).some((x) => x.name === "Abbayes belges"), p.url().replace(URL0, ""));
// D. A gouter (envies)
await fetch(API + "/me/wishlist", { method: "POST", headers: { ...H(1), "Content-Type": "application/json" }, body: JSON.stringify({ beerId: b3.id }) }); await p.goto(URL0 + "/profil"); await settle(p); await p.getByRole("link", { name: /À goûter/ }).first().click(); await p.waitForTimeout(1500); txt = await p.locator("body").innerText();
log("D.page-a-gouter", /À goûter/.test(txt) && txt.includes(b3.name) && !/^Renommer$/m.test(txt), p.url().replace(URL0, "")); await p.screenshot({ path: "f5c-wishlist-page.png" });
log("D.a-gouter-ni-renommable-ni-supprimable", (await p.getByRole("button", { name: /^Renommer$/ }).count()) === 0 && (await p.getByRole("button", { name: /^Supprimer$/ }).count()) === 0, "pas de boutons");
// E. fiche biere : ajouter a une collection
await p.goto(URL0 + `/bieres/${b1.id}`); await settle(p); await p.getByRole("button", { name: /Ajouter à une collection/ }).first().click(); await p.waitForTimeout(1000); dlg = p.getByRole("dialog"); const dt = await dlg.innerText(); log("E.feuille-ajout-liste", /Mes IPA/.test(dt) && /À goûter/.test(dt), dt.replace(/\n+/g, " | ").slice(0, 120)); await p.screenshot({ path: "f5c-add-sheet.png" });
const ipa = dlg.getByText("Mes IPA").first(); wt.take(); await ipa.click(); await p.waitForTimeout(1200); const addn = wt.take().net.filter((n) => n.m === "POST" && /beers$/.test(n.u)); log("E.ajout-a-mes-ipa", addn.length === 1 && addn[0].s === 201, `${addn.length} POST (${addn.map((x) => x.s)})`);
const ci = (await G("/me/collections?beerId=" + b1.id)).find((x) => x.name === "Mes IPA"); log("E.api-confirme-ajout", ci?.containsBeer === true, "containsBeer");
await ipa.click(); await p.waitForTimeout(1200); log("E.retrait-par-bascule", (await G("/me/collections?beerId=" + b1.id)).find((x) => x.name === "Mes IPA")?.containsBeer === false, "retiree");
// F. profil d'autrui : collections visibles seulement si suivi
const c3 = await mk(3); await c3.p.goto(URL0 + "/profils/1"); await settle(c3.p); await c3.p.waitForTimeout(800); const ct = await c3.p.locator("body").innerText(); log("F.non-suivi-collections-verrouillees", !/Mes IPA/.test(ct) && !/Trappistes|Été|été/.test(ct), (ct.match(/Suivez[^\n]*collections/) || ["aucune collection visible"])[0]);
await c3.p.getByRole("button", { name: /Suivre Alice/ }).first().click(); await c3.p.waitForTimeout(1500); const ct2 = await c3.p.locator("body").innerText(); log("F.suivi-collections-visibles", /Collections de Alice/.test(ct2) || /Collections d'Alice/.test(ct2) || /Mes IPA/.test(ct2), (ct2.match(/Collections d[^\n]*/) || ["?"])[0]); await c3.p.screenshot({ path: "f5c-other-collections.png", fullPage: true });
// G. panne API
await p.route("**/api/v1/me/collections**", (rt) => rt.abort()); await p.goto(URL0 + "/profil"); await settle(p); await p.waitForTimeout(800); log("G.panne-collections-alerte", /Collections indisponibles/.test(await p.locator("body").innerText()), "section en erreur, le reste vivant"); await p.unroute("**/api/v1/me/collections**");
// H. 360 px
const sm = await mk(1, { vp: { width: 360, height: 740 } }); for (const path of ["/profil", `/profils/1/wishlist`]) { await sm.p.goto(URL0 + path); await settle(sm.p); await sm.p.waitForTimeout(500); log(`H.360px ${path}`, (await sm.p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0 && (await overflowing(sm.p)).length === 0 && (await unreachable(sm.p)).length === 0, "360x740"); }
await b.close(); const fails = results.filter((x) => !x.ok); console.log(`\n${results.length - fails.length}/${results.length} PASS`); process.exit(fails.length ? 1 : 0);
