// E2E F5 Profil social (profils, niveaux, avatars, suivre, fil d'actualite) : API reelle (SEED_DEMO_ACTIVITY actif) + navigateur 390x844, puis 360 px.
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { watch, overflowing, unreachable, covered } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const URL0 = "http://localhost:5173"; const API = "http://localhost:5090/api/v1";
const results = []; const log = (id, ok, d) => { results.push({ id, ok: !!ok }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${d}`); };
const H = (u) => ({ "X-User-Id": String(u) }); const J = async (r) => { const x = await r.text(); try { return x ? JSON.parse(x) : null; } catch { return x; } };
const R = (p, u = 1, init = {}) => fetch(API + p, { ...init, headers: { ...(u ? H(u) : {}), ...(init.body ? { "Content-Type": "application/json" } : {}) } }); const G = async (p, u = 1) => J(await R(p, u));
const PUTP = (body, u = 1) => R("/me/profile", u, { method: "PUT", body: JSON.stringify(body) });
const checkin = (u, beerId) => { const f = new FormData(); for (const [k, v] of Object.entries({ beerId, drankAt: new Date(Date.now() - 600e3).toISOString(), place: "E2E", format: "bottle", rating: 4 })) f.append(k, String(v)); return fetch(API + "/checkins", { method: "POST", headers: H(u), body: f }); };
const b = await chromium.launch();
const mk = async (user, { vp = { width: 390, height: 844 } } = {}) => { const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, locale: "fr-FR", hasTouch: true, isMobile: true }); await ctx.addInitScript((u) => localStorage.setItem("mousse.currentUserId", String(u)), user); const p = await ctx.newPage(); return { ctx, p, w: watch(p, { api: "http://localhost:5090", expectedConsole: [/Failed to load resource/, /tile\.openstreetmap/] }) }; };
const settle = async (p) => { await p.waitForLoadState("networkidle"); await p.waitForTimeout(900); };
// A. API : profils
const users = await G("/users"); log("A.api-liste-profils", Array.isArray(users) && users.length >= 3 && users.every((u) => u.avatar && u.level >= 1), `${users.length} profils : ${users.map((u) => `${u.displayName}(niv ${u.level})`)}`);
const names = users.map((u) => u.displayName); log("A.api-tri-par-nom", names.every((n, i) => i === 0 || names[i - 1].localeCompare(n) <= 0), names.join(","));
const alice = await G("/users/1/profile", 1); log("A.api-profil-alice", alice.isMe === true && alice.followingCount >= 2 && alice.title && "nextThreshold" in alice, `niv ${alice.level} « ${alice.title} » ${alice.discoveredCount} decouvertes, suit ${alice.followingCount}`);
const bobView = await G("/users/2/profile", 1); log("A.api-profil-bob-vu-par-alice", bobView.isFollowed === true && bobView.isMe === false && bobView.discoveredCount >= 5, `Bob niv ${bobView.level}, suivi=${bobView.isFollowed}, ${bobView.discoveredCount} decouvertes`);
let r = await R("/users/99/profile"); log("A.api-404-profil-inconnu", r.status === 404, r.status); r = await R("/users/abc/profile"); log("A.api-400-id-invalide", r.status === 400, r.status); r = await R("/users/1/profile", null); log("A.api-401", r.status === 401, r.status);
// niveaux : bornes
const pal = [[0, 1], [4, 1], [5, 2], [14, 2], [15, 3]]; log("A.api-paliers-lisibles", [alice, bobView].every((u) => [0, 5, 15, 30, 60, 100].includes(u.currentThreshold)), `paliers ${alice.currentThreshold}/${alice.nextThreshold}`);
// B. API : edition profil
r = await PUTP({ displayName: "  Alicia  ", avatar: "wheat" }); const up = await J(r); log("B.api-edition-200-trim", r.status === 200 && up.displayName === "Alicia" && up.avatar === "wheat", `${r.status} ${up.displayName}/${up.avatar}`);
for (const [body, label] of [[{ displayName: "A", avatar: "hop" }, "nom-1-car"], [{ displayName: "x".repeat(25), avatar: "hop" }, "nom-25-car"], [{ displayName: "Alicia", avatar: "dragon" }, "avatar-inconnu"], [{ displayName: "   ", avatar: "hop" }, "nom-blanc"], [{ displayName: "Alicia", avatar: "hop", extra: 1 }, "champ-en-trop"], [{ avatar: "hop" }, "sans-nom"]]) { r = await PUTP(body); log(`B.api-400-${label}`, r.status === 400, r.status); }
r = await PUTP({ displayName: "ab", avatar: "hop" }); log("B.api-nom-2-car-ok", r.status === 200, r.status); r = await PUTP({ displayName: "x".repeat(24), avatar: "pretzel" }); log("B.api-nom-24-car-ok", r.status === 200, r.status);
r = await PUTP({ displayName: "<b>x</b><i>", avatar: "hop" }); const xs = await J(r); log("B.api-nom-html-stocke-tel-quel", r.status === 200 && xs.displayName === "<b>x</b><i>", "litteral");
await PUTP({ displayName: "Alice", avatar: "hop" });
// C. API : suivre
r = await R("/users/1/follow", 1, { method: "POST" }); log("C.api-400-se-suivre", r.status === 400, r.status); r = await R("/users/99/follow", 1, { method: "POST" }); log("C.api-404-inconnu", r.status === 404, r.status);
r = await R("/users/2/follow", 1, { method: "POST" }); log("C.api-409-deja-suivi", r.status === 409, r.status);
r = await R("/users/3/follow", 3, { method: "POST" }); log("C.api-400-carol-se-suit", r.status === 400, r.status);
r = await R("/users/1/follow", 3, { method: "POST" }); log("C.api-carol-suit-alice-201", r.status === 201 || r.status === 200, r.status);
const fol = await G("/users/1/followers", 1); log("C.api-abonnes-alice", Array.isArray(fol) && fol.some((u) => u.id === 3), `${fol.length} abonnes`);
const fing = await G("/users/3/following", 1); log("C.api-abonnements-carol", fing.some((u) => u.id === 1), `${fing.map((u) => u.displayName)}`);
r = await R("/users/1/follow", 3, { method: "DELETE" }); log("C.api-unfollow-204", r.status === 204, r.status); r = await R("/users/1/follow", 3, { method: "DELETE" }); log("C.api-unfollow-deja-fait", [204, 404].includes(r.status), r.status);
// D. API : fil
const feed = await G("/me/feed", 1); const kinds = new Set(feed.items.map((i) => i.kind)); log("D.api-fil-alice", feed.items.length >= 5 && feed.total >= feed.items.length && feed.size === 20, `${feed.items.length}/${feed.total}, types ${[...kinds]}`);
const dates = feed.items.map((i) => new Date(i.occurredAt).getTime()); log("D.api-fil-recent-dabord", dates.every((d, i) => i === 0 || dates[i - 1] >= d), "ordre decroissant");
log("D.api-fil-que-les-suivis", feed.items.every((i) => [2, 3].includes(i.actor.id)), `acteurs ${[...new Set(feed.items.map((i) => i.actor.displayName))]}`);
const carolFeed = await G("/me/feed", 3); log("D.api-fil-vide-si-personne-suivi", carolFeed.items.length === 0 && carolFeed.total === 0, `${carolFeed.total}`);
r = await R("/me/feed?page=0"); log("D.api-400-page-0", r.status === 400, r.status); r = await R("/me/feed", null); log("D.api-401-fil", r.status === 401, r.status);
const ids = feed.items.map((i) => i.id); log("D.api-ids-uniques", new Set(ids).size === ids.length, "ids de cartes uniques");
// Alice boit une biere => Bob (qui la suit ? non) ; Carol suit Alice => carte dans le fil de Carol
await R("/users/1/follow", 3, { method: "POST" }); const beerIds = (await G("/beers")).items.map((x) => x.id); const ck = await checkin(1, beerIds[0]); const cf = await G("/me/feed", 3); log("D.api-nouvelle-degustation-dans-le-fil-des-abonnes", ck.status === 201 && cf.items.some((i) => i.actor.id === 1 && i.kind === "checkin" && i.beerId === beerIds[0]), `${cf.items.length} cartes pour Carol`);
const ckList = (await G("/checkins", 1)).items; await R("/checkins/" + ckList[0].id, 1, { method: "DELETE" }); const cf2 = await G("/me/feed", 3); log("D.api-suppression-retire-la-carte", !cf2.items.some((i) => i.actor.id === 1 && i.beerId === beerIds[0]), "carte retiree");
await R("/users/1/follow", 3, { method: "DELETE" });
// E. UI : accueil
const { p, w } = await mk(1); await p.goto(URL0 + "/"); await settle(p); await p.waitForTimeout(800); let txt = await p.locator("body").innerText();
log("E.accueil-titre-et-fil", /Accueil/.test(txt) && /(a bu|Nouvelle découverte|a découvert|passe niveau|a donné son avis)/.test(txt), (txt.match(/(a bu|Nouvelle découverte|a découvert \d+ bières|passe niveau[^\n]*|a donné son avis)/) || ["?"])[0]);
const tabs = await p.getByRole("navigation", { name: /Navigation principale/ }).getByRole("link").allInnerTexts(); log("E.cinq-onglets", tabs.length === 5 && /Accueil/.test(tabs[0]) && /Bières/.test(tabs[1]), tabs.map((t2) => t2.trim()).join(" | "));
await p.screenshot({ path: "f5-home-feed.png" });
log("E.accueil-sans-debordement", (await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0 && (await overflowing(p)).length === 0 && (await unreachable(p)).length === 0, "overflow/unreachable");
log("E.oracle-recouvrement-accueil", (await covered(p)).length === 0, "controles non recouverts");
let t = w.take(); log("E.accueil-sans-erreur", !t.fiveXX.length && !t.console.length, `5xx=${t.fiveXX.length} console=${t.console.length} ${t.console.slice(0, 2)}`);
const more = p.getByRole("button", { name: /Voir plus/ }); log("E.voir-plus-si-plus-de-20", (feed.total > 20) === ((await more.count()) > 0), `total ${feed.total}, bouton ${await more.count()}`);
// anciens liens
await p.goto(URL0 + "/bieres"); await settle(p); log("E.encyclopedie-sur-bieres", /Encyclopédie|Filtres/.test(await p.locator("body").innerText()), "/bieres");
await p.goto(URL0 + "/?q=lager"); await settle(p); log("E.ancien-lien-q-ouvre-accueil", /Accueil/.test(await p.locator("body").innerText()), "/?q=lager => Accueil");
await p.goto(URL0 + "/zzz"); await settle(p); log("E.url-inconnue-page-introuvable", p.url() === URL0 + "/zzz" && /Page introuvable/.test(await p.locator("body").innerText()), p.url().replace(URL0, ""));
// F. UI : fil vide (Carol) + trouver des profils
const c = await mk(3); await c.p.goto(URL0 + "/"); await settle(c.p); await c.p.waitForTimeout(600); const ctxt = await c.p.locator("body").innerText();
log("F.fil-vide-invite-a-suivre", /Suivez des profils/.test(ctxt) && /Trouver des profils/.test(ctxt), "mascotte + action"); await c.p.screenshot({ path: "f5-home-empty.png" });
await c.p.getByRole("link", { name: /Trouver des profils/ }).or(c.p.getByRole("button", { name: /Trouver des profils/ })).first().click(); await c.p.waitForTimeout(1000); await settle(c.p); log("F.vers-liste-profils", /\/profils$/.test(c.p.url()), c.p.url().replace(URL0, ""));
txt = await c.p.locator("body").innerText(); log("F.liste-profils", /Alice/.test(txt) && /Bob/.test(txt) && /Vous/.test(txt), "trois profils dont « Vous »"); await c.p.screenshot({ path: "f5-people.png" });
// suivre Alice depuis la liste
w.take(); const fbtn = c.p.getByRole("button", { name: /Suivre Alice/ }); await fbtn.click(); await c.p.waitForTimeout(1200); const fnet = w.take(); const post = (await G("/users/3/following", 3)).some((u) => u.id === 1); log("F.suivre-depuis-la-liste", post, `Carol suit Alice : ${post}`);
log("F.bouton-passe-a-suivi", (await c.p.getByRole("button", { name: /Suivi/ }).count()) >= 1 || /Suivi/.test(await c.p.locator("body").innerText()), "libelle « Suivi »");
await c.p.goto(URL0 + "/"); await settle(c.p); await c.p.waitForTimeout(600); log("F.fil-se-remplit-apres-suivi", !/Suivez des profils/.test(await c.p.locator("body").innerText()) || (await G("/me/feed", 3)).items.length === 0, "fil de Carol");
// G. UI : profil d'autrui
await p.goto(URL0 + "/profils/2"); await settle(p); await p.waitForTimeout(600); txt = await p.locator("body").innerText();
log("G.profil-bob", /Bob/.test(txt) && /Niv\./.test(txt) && /abonn/.test(txt), (txt.match(/Niv\.[^\n]*/) || ["?"])[0]); await p.screenshot({ path: "f5-user-profile.png", fullPage: true });
await p.getByText(/abonnés$|abonné$/).first().click().catch(() => {}); await p.waitForTimeout(900); const fl = p.getByRole("dialog"); log("G.liste-abonnes", (await fl.count()) === 1 && /Abonnés de/.test(await fl.innerText()), (await fl.count()) ? (await fl.innerText()).replace(/\n+/g, " | ").slice(0, 100) : "pas de feuille"); await p.keyboard.press("Escape"); await p.waitForTimeout(500);
await p.goto(URL0 + "/profils/99"); await settle(p); log("G.profil-inconnu", /Profil introuvable/.test(await p.locator("body").innerText()), "page 404 douce"); await p.goto(URL0 + "/profils/abc"); await settle(p); log("G.id-invalide-sans-plantage", (await p.locator("body").innerText()).length > 20, "page rendue");
// H. UI : mon profil + edition
await p.goto(URL0 + "/profil"); await settle(p); await p.waitForTimeout(600); txt = await p.locator("body").innerText(); log("H.mon-profil-social", /Niv\./.test(txt) && /abonn/.test(txt) && /Modifier/.test(txt), (txt.match(/Niv\.[^\n]*/) || ["?"])[0]);
await p.getByRole("button", { name: /^Modifier$/ }).first().click(); await p.waitForTimeout(900); let dlg = p.getByRole("dialog"); log("H.feuille-edition", /Modifier mon profil/.test(await dlg.innerText()), "ouverte"); await p.screenshot({ path: "f5-edit-profile.png" });
const radios = await dlg.getByRole("radio").count(); log("H.douze-avatars", radios === 12, `${radios} avatars`);
const covd = (await covered(p, { within: "[role=dialog]" })); log("H.edition-recouvrement", covd.length === 0, JSON.stringify(covd).slice(0, 160));
const small = await dlg.getByRole("radio").evaluateAll((els) => els.map((e) => { const r2 = (e.closest("label") ?? e).getBoundingClientRect(); return Math.min(r2.width, r2.height); })); log("H.avatars-cibles-44px", Math.min(...small) >= 43.5, `plus petite cible ${Math.round(Math.min(...small))} px`);
const nm = dlg.getByLabel(/Nom d'affichage/); await nm.fill("A"); await dlg.getByRole("button", { name: /Enregistrer/ }).click(); await p.waitForTimeout(600); log("H.nom-trop-court-message", /Entre 2 et 24/.test(await dlg.innerText()), "message d'erreur");
await nm.fill("Alicia E2E"); await dlg.getByRole("radio").nth(5).click({ force: true }).catch(() => {}); w.take(); await dlg.getByRole("button", { name: /Enregistrer/ }).click(); await p.waitForTimeout(1500);
const put = w.take().net.filter((n) => n.m === "PUT" && /me\/profile/.test(n.u)); log("H.enregistrement-une-requete", put.length === 1 && put[0].s === 200, `${put.length} PUT (${put.map((x) => x.s)})`);
log("H.nom-mis-a-jour-partout", /Alicia E2E/.test(await p.locator("body").innerText()) && (await G("/users/1/profile")).displayName === "Alicia E2E", "ecran + API");
await p.screenshot({ path: "f5-my-profile.png", fullPage: true });
// I. panne API du fil
await p.route("**/api/v1/me/feed**", (rt) => rt.abort()); await p.goto(URL0 + "/"); await settle(p); await p.waitForTimeout(800); txt = await p.locator("body").innerText(); log("I.panne-fil-alerte-reessayer", /Impossible de charger le fil/.test(txt) && /Réessayer/.test(txt), "alerte + bouton"); await p.screenshot({ path: "f5-feed-error.png" }); await p.unroute("**/api/v1/me/feed**");
// J. 360 px
const sm = await mk(1, { vp: { width: 360, height: 740 } }); for (const path of ["/", "/profils", "/profils/2", "/profil"]) { await sm.p.goto(URL0 + path); await settle(sm.p); await sm.p.waitForTimeout(500); log(`J.360px ${path}`, (await sm.p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0 && (await overflowing(sm.p)).length === 0 && (await unreachable(sm.p)).length === 0, "360x740"); if (path === "/") await sm.p.screenshot({ path: "f5-home-360.png" }); }
await b.close(); const fails = results.filter((x) => !x.ok); console.log(`\n${results.length - fails.length}/${results.length} PASS`); process.exit(fails.length ? 1 : 0);
