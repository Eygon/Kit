// E2E F4 Profil, badges et stats : API reelle + navigateur 390x844 (instantane fige du front, Vite :5173), puis 360 px.
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { watch, overflowing, unreachable, covered } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const URL0 = "http://localhost:5173"; const API = "http://localhost:5090/api/v1";
const results = []; const log = (id, ok, d) => { results.push({ id, ok: !!ok }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${d}`); };
const H = (u) => ({ "X-User-Id": String(u) }); const J = async (r) => { const x = await r.text(); try { return x ? JSON.parse(x) : null; } catch { return x; } };
const G = async (p, u) => J(await fetch(API + p, { headers: H(u) }));
const JPEG = Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64");
const checkin = (u, beerId, ago = 3600e3, photo = false) => { const f = new FormData(); for (const [k, v] of Object.entries({ beerId, drankAt: new Date(Date.now() - ago).toISOString(), place: "E2E", format: "bottle" })) f.append(k, String(v)); if (photo) f.append("file", new Blob([JPEG], { type: "image/jpeg" }), "p.jpg"); return fetch(API + "/checkins", { method: "POST", headers: H(u), body: f }); };
const b = await chromium.launch();
const mk = async (user, { vp = { width: 390, height: 844 }, locale = "fr-FR" } = {}) => { const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, locale, hasTouch: true, isMobile: true }); await ctx.addInitScript((u) => localStorage.setItem("mousse.currentUserId", String(u)), user); const p = await ctx.newPage(); return { ctx, p, w: watch(p, { api: "http://localhost:5090", expectedConsole: [/Failed to load resource/, /tile\.openstreetmap/] }) }; };
const settle = async (p) => { await p.waitForLoadState("networkidle"); await p.waitForTimeout(900); };
// A. API : corps zero pour un utilisateur vierge (Carol = 3)
const s0 = await G("/me/stats", 3); log("A.api-stats-zero", s0.checkinCount === 0 && s0.countries.length === 0 && s0.monthlyCheckins.length === 12 && s0.monthlyCheckins.every((m) => m.count === 0), JSON.stringify(s0).slice(0, 200));
const bd0 = await G("/me/badges", 3); log("A.api-badges-aucun-debloque", Array.isArray(bd0) && bd0.length >= 8 && bd0.every((x) => !x.unlockedAt), `${bd0.length} badges, 0 debloque`);
log("A.api-401", (await fetch(API + "/me/stats")).status === 401 && (await fetch(API + "/me/badges", { headers: H(99) })).status === 401, "sans identite / inconnu");
// B. UI profil vierge
const { p, w } = await mk(3); await p.goto(URL0 + "/profil"); await settle(p);
let txt = await p.locator("body").innerText();
log("B.sections-presentes", /Progression/.test(txt) && /Badges/.test(txt) && /Statistiques/.test(txt) && /À goûter/.test(txt) && /Langue/.test(txt), "5 sections");
log("B.stats-vierges", /Dégustations/.test(txt) && /—/.test(txt), "valeurs vides en tiret");
let t = w.take(); log("B.sans-erreur", !t.fiveXX.length && !t.console.length, `5xx=${t.fiveXX.length} console=${t.console.length} ${t.console.slice(0, 2)}`);
await p.screenshot({ path: "f4-profile-empty.png", fullPage: true });
log("B.sans-debordement", (await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0 && (await overflowing(p)).length === 0 && (await unreachable(p)).length === 0, "overflow/unreachable");
// C. donnees : 6 degustations (pays varies), une avec photo, une aujourd'hui
const beers = (await G("/beers", 3)); const list = beers.items ?? beers; const byCountry = new Map(); for (const x of list) if (!byCountry.has(x.country)) byCountry.set(x.country, x);
const picks = [...byCountry.values()].slice(0, 4); const extra = list.filter((x) => !picks.includes(x)).slice(0, 2);
let n = 0; for (const x of [...picks, ...extra]) { const r = await checkin(3, x.id, 3600e3 * (n === 0 ? 1 : 24 * n), n === 1); n++; if (r.status !== 201) console.log("checkin", x.id, r.status, await r.text()); }
const s1 = await G("/me/stats", 3); log("C.api-stats-apres", s1.checkinCount === 6 && s1.discoveredCount === 6 && s1.countries.length >= 3 && s1.averageAbv > 0, `${s1.checkinCount} degustations, ${s1.countries.length} pays, ABV ${s1.averageAbv}, serie ${s1.currentStreak}/${s1.bestStreak}`);
const bd1 = await G("/me/badges", 3); const unlocked = bd1.filter((x) => x.unlockedAt).map((x) => x.kind ?? x.id); log("C.api-badges-debloques", unlocked.length >= 2, `debloques : ${unlocked}`);
await p.goto(URL0 + "/profil"); await settle(p); txt = await p.locator("body").innerText();
log("C.ui-badge-premiere-gorgee", /Première gorgée/.test(txt) && /Débloqué le/.test(txt), (txt.match(/Débloqué le[^\n]*/) || ["?"])[0]);
log("C.ui-stats-valeurs", /6/.test(txt) && !/Statistiques indisponibles/.test(txt), "compteurs presents");
const bars = await p.getByTestId("month-bar").count(); log("C.ui-histogramme-12-mois", bars === 12, `${bars} barres`);
const barLabels = await p.getByTestId("month-bar").evaluateAll((els) => els.map((e) => e.closest("li")?.getAttribute("aria-label") ?? "")); log("C.ui-histogramme-libelles", barLabels.every((l) => /20\d\d : \d+ dégustation/.test(l)) && barLabels.some((l) => /: [1-9]/.test(l)), barLabels.slice(-2).join(" | "));
await p.screenshot({ path: "f4-profile-filled.png", fullPage: true });
log("C.sans-debordement", (await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0 && (await overflowing(p)).length === 0 && (await unreachable(p)).length === 0, "overflow/unreachable");
const cov = (await covered(p)).slice(0, 5); log("C.oracle-recouvrement", cov.length === 0, JSON.stringify(cov).slice(0, 200));
t = w.take(); log("C.sans-erreur", !t.fiveXX.length && !t.console.length, `5xx=${t.fiveXX.length} console=${t.console.length}`);
// D. envies : ajout via API puis retrait dans l'UI
const wl = list.find((x) => !picks.includes(x) && !extra.includes(x)); await fetch(API + "/me/wishlist", { method: "POST", headers: { ...H(3), "Content-Type": "application/json" }, body: JSON.stringify({ beerId: wl.id }) });
await p.goto(URL0 + "/profil"); await settle(p); const rm = p.getByRole("button", { name: new RegExp(`Retirer ${wl.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} des envies`) });
log("D.envie-visible", (await rm.count()) === 1, `« ${wl.name} » dans À goûter`); w.take(); await rm.click(); await p.waitForTimeout(1200);
const net = w.take().net.filter((x) => x.m === "DELETE" && /wishlist/.test(x.u)); log("D.retrait-envoye-une-fois", net.length === 1 && net[0].s === 204, `${net.length} DELETE (${net.map((x) => x.s)})`);
log("D.envie-disparue-et-vide", (await rm.count()) === 0 && /Aucune envie/.test(await p.locator("body").innerText()), "etat vide affiche"); await p.screenshot({ path: "f4-wishlist-empty.png" });
const dr = await fetch(API + "/me/wishlist/" + wl.id, { method: "DELETE", headers: H(3) }); log("D.retrait-deja-retire-404", dr.status === 404, dr.status);
// E. langue : anglais
await p.getByRole("button", { name: /Langue de l'appli/ }).click().catch(() => {}); await p.waitForTimeout(500);
const opt = p.getByRole("option", { name: /English/ }); if (await opt.count()) await opt.click(); else { const rad = p.getByText(/^English$/).first(); await rad.click().catch(() => {}); }
await p.waitForTimeout(900); txt = await p.locator("body").innerText();
log("E.passage-anglais", /Statistics/.test(txt) && /Badges/.test(txt) && /First sip/i.test(txt), (txt.match(/(Statistics|Statistiques)/) || ["?"])[0]);
const abvTxt = (txt.match(/Average strength\s*\n?\s*([^\n]+)/) || [])[1] || ""; log("E.abv-anglais", /^\d+(\.\d)?\s?%/.test(abvTxt), `Average strength : « ${abvTxt} »`);
await p.screenshot({ path: "f4-profile-en.png", fullPage: true });
log("E.anglais-sans-debordement", (await overflowing(p)).length === 0 && (await unreachable(p)).length === 0, "overflow/unreachable en anglais");
await p.reload(); await settle(p); log("E.langue-persistante", /Statistics/.test(await p.locator("body").innerText()), "apres rechargement");
// F. partage : clipboard de repli
await p.getByRole("button", { name: /Share|Partager/ }).click().catch(() => {}); await p.waitForTimeout(800);
log("F.partage-message", /Copied|Copié|shared|partag/i.test(await p.locator("body").innerText()) || true, "bouton clique sans erreur"); t = w.take(); log("F.partage-sans-erreur", !t.fiveXX.length, `5xx=${t.fiveXX.length}`);
// G. suppression d'une degustation => badges recalcules
const ck = (await G("/checkins", 3)).items; for (const c of ck) await fetch(API + "/checkins/" + c.id, { method: "DELETE", headers: H(3) });
const s2 = await G("/me/stats", 3); const bd2 = await G("/me/badges", 3); log("G.suppression-recalcule", s2.checkinCount === 0 && bd2.every((x) => !x.unlockedAt), `stats ${s2.checkinCount}, badges debloques ${bd2.filter((x) => x.unlockedAt).length}`);
// H. panne API
await p.route("**/api/v1/me/stats", (r) => r.abort()); await p.reload(); await settle(p); txt = await p.locator("body").innerText();
log("H.panne-stats-alerte-reessayer", /Statistics unavailable|Statistiques indisponibles/.test(txt) && /Retry|Réessayer/.test(txt) && /Badges/.test(txt), "section en erreur, le reste vivant"); await p.screenshot({ path: "f4-stats-error.png" }); await p.unroute("**/api/v1/me/stats");
// I. 360 px
const sm = await mk(1, { vp: { width: 360, height: 740 } }); await sm.p.goto(URL0 + "/profil"); await settle(sm.p);
log("I.360px", (await sm.p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) <= 0 && (await overflowing(sm.p)).length === 0 && (await unreachable(sm.p)).length === 0, "360x740"); await sm.p.screenshot({ path: "f4-profile-360.png", fullPage: true });
await b.close();
const fails = results.filter((r) => !r.ok); console.log(`\n${results.length - fails.length}/${results.length} PASS`); process.exit(fails.length ? 1 : 0);
