// E2E F13 Ergonomie (retours du « client chiant ») : API reelle (SEED_DEMO_ACTIVITY=true) + navigateur 390x844 puis 360 px.
// Front : instantane fige (Vite :5173). Alice (1).
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { watch, overflowing } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const URL0 = "http://localhost:5173"; const API = "http://localhost:5090/api/v1";
const results = []; const log = (id, ok, d) => { results.push({ id, ok: !!ok }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${d}`); };
const H = (u) => ({ "X-User-Id": String(u) }); const J = async (r) => { const x = await r.text(); try { return x ? JSON.parse(x) : null; } catch { return x; } };
const get = async (p, u = 1) => J(await fetch(API + p, { headers: H(u) }));
const post = async (u, fields) => { const f = new FormData(); for (const [k, v] of Object.entries(fields)) f.append(k, String(v)); const r = await fetch(API + "/checkins", { method: "POST", headers: H(u), body: f }); return J(r); };
const b = await chromium.launch(); const PARIS = { latitude: 48.8566, longitude: 2.3522 };
const mk = async (user, { vp = { width: 390, height: 844 } } = {}) => { const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, locale: "fr-FR", hasTouch: true, isMobile: true, geolocation: PARIS, permissions: ["geolocation"] }); await ctx.addInitScript((u) => localStorage.setItem("mousse.currentUserId", String(u)), user); const p = await ctx.newPage(); return { ctx, p, w: watch(p, { api: "http://localhost:5090", expectedConsole: [/Failed to load resource/, /tile\.openstreetmap/] }) }; };
const settle = async (p, ms = 900) => { await p.waitForLoadState("networkidle"); await p.waitForTimeout(ms); };
const body = async (p, n = 400) => (await p.locator("body").innerText()).replace(/\n+/g, " | ").slice(0, n);
const nav = async (p, path) => { await p.evaluate((x) => { window.history.pushState({}, "", x); window.dispatchEvent(new PopStateEvent("popstate")); }, path); await p.waitForTimeout(1500); };
const inView = (p, loc) => loc.evaluate((e) => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
const LONG = "Une soirée mémorable avec Marc : la bière était fraîche, le houblon bien présent, la mousse dense et persistante. ".repeat(4);
const first = await post(1, { beerId: 21, drankAt: new Date(Date.now() - 7200e3).toISOString(), place: "Chez Marc", format: "can", rating: 4, comment: LONG, price: 4.5 });
const { p, w } = await mk(1);
// A. Journal complet
await p.goto(URL0 + "/journal"); await settle(p, 1600); let t = await body(p, 1200);
log("A.journal-montre-commentaire", /Une soirée mémorable/.test(t), t.slice(0, 160));
log("A.journal-montre-format-et-prix", /Canette/.test(t) && /4,50/.test(t), (t.match(/Canette|4,50 €/g) || []).join(" "));
const more = p.getByRole("button", { name: "Voir plus" }); log("A.commentaire-long-voir-plus", (await more.count()) >= 1, `${await more.count()} bouton(s) « Voir plus »`); await p.screenshot({ path: "f13-journal.png" });
await more.first().click(); await p.waitForTimeout(300); log("A.voir-plus-deplie", (await p.getByRole("button", { name: "Voir moins" }).count()) >= 1, "bascule en « Voir moins »");
// B. Modifier
await p.getByRole("button", { name: /Modifier la dégustation/ }).first().click(); await p.waitForTimeout(900); let dlg = p.getByRole("dialog"); let dt = await dlg.innerText();
log("B.modifier-ouvre-la-feuille-preremplie", /Modifier : /.test(dt) && (await dlg.getByLabel(/Lieu/).inputValue()) === "Chez Marc" && (await dlg.getByLabel(/Commentaire/).inputValue()).startsWith("Une soirée"), `${dt.split("\n")[0]} | lieu=${await dlg.getByLabel(/Lieu/).inputValue()}`); await p.screenshot({ path: "f13-modifier.png" });
log("B.photo-non-modifiable", (await dlg.getByRole("button", { name: /Prendre une photo|Choisir dans la galerie/ }).count()) === 0, "pas de sélecteur de photo en modification");
log("B.mauvaise-biere-lien", (await dlg.getByRole("button", { name: /Mauvaise bière/ }).or(dlg.getByText(/Mauvaise bière/)).count()) >= 1, "lien « Mauvaise bière ? Supprimer et recréer »");
await dlg.getByLabel(/Commentaire/).fill("Commentaire corrigé"); w.take(); const sv = dlg.getByRole("button", { name: /^Enregistrer$/ }); await sv.scrollIntoViewIfNeeded(); await sv.click(); await p.waitForTimeout(1500);
const after = await get(`/checkins/${first.checkin.id}`); log("B.modification-enregistree", after.comment === "Commentaire corrigé" && after.rating === 4 && after.price === 4.5 && after.place === "Chez Marc", `${after.comment} / note ${after.rating} / prix ${after.price}`);
t = await body(p, 900); log("B.journal-mis-a-jour-et-confirmation", /Commentaire corrigé/.test(t) && !/Une soirée mémorable/.test(t), t.slice(0, 120)); log("B.feuille-fermee", (await p.getByRole("dialog").count()) === 0, "dialogues " + (await p.getByRole("dialog").count()));
// B2. mauvaise bière : confirmation puis suppression
await p.getByRole("button", { name: /Modifier la dégustation/ }).first().click(); await p.waitForTimeout(800); dlg = p.getByRole("dialog"); await dlg.getByText(/Mauvaise bière/).first().click(); await p.waitForTimeout(700);
const cd = await p.getByRole("alertdialog").or(p.getByRole("dialog")).last().innerText(); log("B2.confirmation-de-suppression", /Supprimer cette dégustation \?/.test(cd), cd.replace(/\n+/g, " | ").slice(0, 140)); await p.screenshot({ path: "f13-mauvaise-biere.png" });
await p.keyboard.press("Escape"); await p.waitForTimeout(500);
// C. Brouillon
await p.goto(URL0 + "/bieres/5"); await settle(p, 1600); await p.getByRole("button", { name: /Je l'ai bue/ }).click(); await p.waitForTimeout(800); dlg = p.getByRole("dialog");
await dlg.getByLabel(/Commentaire/).fill("Brouillon à ne pas perdre"); const pl = dlg.getByLabel(/Lieu/).first(); await pl.click(); await pl.fill("Chez Marc"); await p.keyboard.press("Escape"); await p.waitForTimeout(500);
if ((await p.getByRole("dialog").count()) > 0) await p.keyboard.press("Escape"); await p.waitForTimeout(600); log("C.feuille-fermee-par-escape", (await p.getByRole("dialog").count()) === 0, "dialogues " + (await p.getByRole("dialog").count()));
await p.getByRole("button", { name: /Je l'ai bue/ }).click(); await p.waitForTimeout(800); dlg = p.getByRole("dialog"); dt = await dlg.innerText();
log("C.brouillon-repris", /Brouillon repris/.test(dt) && (await dlg.getByLabel(/Commentaire/).inputValue()) === "Brouillon à ne pas perdre", `${(dt.match(/Brouillon repris/) || ["(pas de mention)"])[0]} | commentaire=${await dlg.getByLabel(/Commentaire/).inputValue()} | lieu=${await dlg.getByLabel(/Lieu/).first().inputValue()}`); await p.screenshot({ path: "f13-brouillon.png" });
log("C.effacer-le-brouillon-present", (await dlg.getByRole("button", { name: "Effacer le brouillon" }).count()) === 1, "bouton présent");
await p.keyboard.press("Escape"); await p.waitForTimeout(500); await nav(p, "/bieres/6"); await p.getByRole("button", { name: /Je l'ai bue/ }).click(); await p.waitForTimeout(800); dlg = p.getByRole("dialog");
log("C.brouillon-propre-a-chaque-biere", !/Brouillon repris/.test(await dlg.innerText()) && (await dlg.getByLabel(/Commentaire/).inputValue()) === "", "autre bière : formulaire vide"); await p.keyboard.press("Escape"); await p.waitForTimeout(400);
await nav(p, "/bieres/5"); await p.getByRole("button", { name: /Je l'ai bue/ }).click(); await p.waitForTimeout(800); dlg = p.getByRole("dialog"); await dlg.getByRole("button", { name: "Effacer le brouillon" }).click(); await p.waitForTimeout(400);
log("C.effacer-vide-les-champs", (await dlg.getByLabel(/Commentaire/).inputValue()) === "" && !/Brouillon repris/.test(await dlg.innerText()), "champs vidés, mention retirée");
await dlg.getByLabel(/Commentaire/).fill("Sera enregistré"); await dlg.getByLabel(/Lieu/).first().fill("Chez Marc"); await dlg.getByText(/^Bouteille/).click(); const s2 = dlg.getByRole("button", { name: /^Enregistrer$/ }); await s2.scrollIntoViewIfNeeded(); await s2.click(); await p.waitForTimeout(1500);
await p.getByRole("button", { name: /Fermer/ }).first().click().catch(() => {}); await p.waitForTimeout(500); await p.getByRole("button", { name: /Je l'ai bue/ }).click(); await p.waitForTimeout(800); log("C.pas-de-brouillon-apres-enregistrement", !/Brouillon repris/.test(await p.getByRole("dialog").innerText()), "formulaire vide après un enregistrement"); await p.keyboard.press("Escape"); await p.waitForTimeout(400);
// D. erreur visible : date future
await p.goto(URL0 + "/bieres/7"); await settle(p, 1500); await p.getByRole("button", { name: /Je l'ai bue/ }).click(); await p.waitForTimeout(800); dlg = p.getByRole("dialog");
await dlg.getByLabel(/Lieu/).first().fill("Test date"); await dlg.getByText(/^Bouteille/).click(); const dtf = dlg.getByLabel(/Date et heure/); await dtf.fill("2031-01-01T12:00");
const s3 = dlg.getByRole("button", { name: /^Enregistrer$/ }); await s3.scrollIntoViewIfNeeded(); await s3.click(); await p.waitForTimeout(900);
const act = await p.evaluate(() => ({ label: document.activeElement?.getAttribute("aria-label") || document.activeElement?.labels?.[0]?.innerText || document.activeElement?.tagName, type: document.activeElement?.type }));
log("D.focus-sur-le-champ-en-erreur", /Date/.test(act.label || "") || act.type === "datetime-local", JSON.stringify(act)); log("D.champ-en-erreur-visible", await inView(p, dtf), "le champ date est dans l'écran"); log("D.message-visible", await p.getByText("La date ne peut pas être dans le futur.").first().evaluate((e) => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }), "message sous la date, dans l'écran"); await p.screenshot({ path: "f13-erreur-visible.png" });
await p.keyboard.press("Escape"); await p.waitForTimeout(400);
// E. Enregistrement… pendant l'envoi
await p.route("**/api/v1/checkins", async (rt) => { if (rt.request().method() === "POST") await new Promise((x) => setTimeout(x, 2500)); await rt.continue(); });
await p.goto(URL0 + "/bieres/8"); await settle(p, 1500); await p.getByRole("button", { name: /Je l'ai bue/ }).click(); await p.waitForTimeout(800); dlg = p.getByRole("dialog"); await dlg.getByLabel(/Lieu/).first().fill("Lent"); await dlg.getByText(/^Bouteille/).click(); const s4 = dlg.getByRole("button", { name: /^Enregistrer$/ }); await s4.scrollIntoViewIfNeeded(); await s4.click(); await p.waitForTimeout(700);
const busy = dlg.getByRole("button", { name: /Enregistrement/ }); log("E.libelle-enregistrement", (await busy.count()) >= 1, `${await busy.count()} bouton(s) « Enregistrement… »`); log("E.aria-busy", (await busy.first().getAttribute("aria-busy").catch(() => null)) === "true" || (await busy.first().getAttribute("data-pending").catch(() => null)) !== null, `aria-busy=${await busy.first().getAttribute("aria-busy").catch(() => "?")}`); await p.screenshot({ path: "f13-enregistrement.png" });
await p.waitForTimeout(3200); await p.unroute("**/api/v1/checkins");
// F. recherche tolérante
await p.goto(URL0 + "/bieres"); await settle(p, 1400); const sb = p.getByRole("searchbox").or(p.getByRole("textbox")).first();
await sb.fill("cantilon"); await p.waitForTimeout(1500); t = await body(p, 500); log("F.cantilon-trouve-cantillon", /Aucun résultat exact : voici des bières proches/.test(t) && /Cantillon/.test(t), t.slice(0, 200)); await p.screenshot({ path: "f13-bieres-proches.png" });
await sb.fill("cantillon"); await p.waitForTimeout(1500); log("F.exact-sans-message", !/Aucun résultat exact/.test(await body(p, 800)) && /Cantillon/.test(await body(p, 800)), "pas de mention pour un résultat exact");
await sb.fill("zzzzqq"); await p.waitForTimeout(1500); t = await body(p, 500); log("F.aucun-resultat-sans-message-proche", /Aucune bière/.test(t) && !/voici des bières proches/.test(t), t.slice(0, 120));
await sb.fill("xyz"); await p.waitForTimeout(1500); log("F.mot-court-pas-de-repli", !/voici des bières proches/.test(await body(p, 600)), "mot de moins de 4 lettres : pas de tolérance");
await p.goto(URL0 + "/carte"); await settle(p, 2000); await p.getByRole("button", { name: /Rechercher un lieu/ }).first().click(); await p.waitForTimeout(700); const vd = p.getByRole("dialog"); await vd.getByRole("searchbox").or(vd.getByRole("textbox")).first().fill("clunny"); await p.waitForTimeout(1800);
t = await vd.innerText(); log("F.lieu-clunny-trouve-cluny", /Cluny/.test(t) && /Aucun résultat exact : voici des lieux proches/.test(t), t.replace(/\n+/g, " | ").slice(0, 160)); await p.screenshot({ path: "f13-lieux-proches.png" }); await p.keyboard.press("Escape");
// G. page introuvable
await p.goto(URL0 + "/nimportequoi"); await settle(p, 1200); t = await body(p, 400); log("G.page-introuvable", /Page introuvable|Cette page n'existe pas/.test(t) && /\/nimportequoi/.test(p.url()), `${p.url().replace(URL0, "")} | ${t.slice(0, 140)}`); await p.screenshot({ path: "f13-introuvable.png" });
await p.getByRole("link", { name: /Retour à l'accueil/ }).or(p.getByRole("button", { name: /Retour à l'accueil/ })).first().click(); await settle(p, 800); log("G.retour-accueil", p.url().replace(URL0, "") === "/", p.url().replace(URL0, ""));
await p.goto(URL0 + "/bieres/99999"); await settle(p, 1200); log("G.bière-inconnue-inchangee", /Bière inconnue/.test(await body(p, 300)), "la page « bière inconnue » existe toujours");
// H. 360 px
const sm = await mk(1, { vp: { width: 360, height: 740 } }); await sm.p.goto(URL0 + "/journal"); await settle(sm.p, 1500); await sm.p.getByRole("button", { name: /Modifier la dégustation/ }).first().click(); await sm.p.waitForTimeout(900);
log("H.360-modification-sans-debordement", (await overflowing(sm.p)).length === 0, "feuille de modification"); await sm.p.screenshot({ path: "f13-360-modifier.png" });
await sm.p.keyboard.press("Escape"); await sm.p.waitForTimeout(400); log("H.360-journal-sans-debordement", (await overflowing(sm.p)).length === 0, "journal"); await sm.p.goto(URL0 + "/nimportequoi"); await settle(sm.p, 1000); log("H.360-introuvable-sans-debordement", (await overflowing(sm.p)).length === 0, "page introuvable");
const tt = w.take(); log("Z.sans-5xx", !tt.fiveXX.length, `5xx=${tt.fiveXX.length}`);
await b.close(); const ko = results.filter((x) => !x.ok); console.log(`\n${results.length - ko.length}/${results.length} PASS`); if (ko.length) { console.log("ECHECS :", ko.map((x) => x.id).join(", ")); process.exit(1); }
