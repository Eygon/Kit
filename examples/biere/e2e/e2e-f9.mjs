// E2E F9 Pages a la demande : etat d'attente, echec de chargement + Reessayer, aucune regression de routes. Vite dev (snapshot) + API reelle.
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { watch, overflowing, unreachable } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const URL0 = "http://localhost:5173";
const results = []; const log = (id, ok, d) => { results.push({ id, ok: !!ok }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${d}`); };
const b = await chromium.launch();
const mk = async (vp = { width: 390, height: 844 }) => { const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, locale: "fr-FR", hasTouch: true, isMobile: true, geolocation: { latitude: 48.8566, longitude: 2.3522 }, permissions: ["geolocation"] }); await ctx.addInitScript(() => localStorage.setItem("mousse.currentUserId", "1")); const p = await ctx.newPage(); return { ctx, p, w: watch(p, { api: "http://localhost:5090", expectedConsole: [/Failed to load resource/, /tile\.openstreetmap/, /net::ERR/] }) }; };
const { p, w, ctx } = await mk();
// A. etat d'attente sur la carte (chunk ralenti)
await p.goto(URL0 + "/"); await p.waitForLoadState("networkidle"); await p.waitForTimeout(800);
await p.route("**/src/pages/map/map.tsx*", async (route) => { await new Promise((r) => setTimeout(r, 1800)); await route.continue(); });
await p.getByRole("navigation").getByRole("link", { name: "Carte" }).click(); await p.waitForTimeout(500);
const st = p.getByRole("status"); log("A.etat-attente-visible", (await st.count()) >= 1 && /Chargement/.test(await st.first().innerText()), (await st.count()) ? (await st.first().innerText()).replace(/\n/g, " ") : "aucun role=status"); await p.screenshot({ path: "f9-loading.png" });
log("A.barre-onglets-visible-pendant-attente", (await p.getByRole("navigation").getByRole("link", { name: "Carte" }).getAttribute("aria-current")) === "page", "onglet Carte courant");
await p.waitForTimeout(3000); log("A.carte-arrive", (await p.getByRole("button", { name: /^Lieux \(\d+\)/ }).count()) === 1, "carte affichee apres le chargement"); await p.unroute("**/src/pages/map/map.tsx*");
// B. echec de chargement (hors ligne) puis Reessayer
const p2 = await ctx.newPage(); await p2.goto(URL0 + "/"); await p2.waitForLoadState("networkidle"); await p2.waitForTimeout(800);
await p2.route("**/src/pages/beerDetail/beerDetail.tsx*", (route) => route.abort("internetdisconnected")); await p2.getByRole("navigation").getByRole("link", { name: "Bières" }).click(); await p2.waitForTimeout(1200);
const first = p2.getByRole("link").filter({ hasText: /./ }); await p2.waitForTimeout(500);
const card = p2.locator("a[href^='/bieres/']").first(); await card.click(); await p2.waitForTimeout(2000);
const alert = p2.getByRole("alert"); log("B.echec-alerte", (await alert.count()) >= 1, (await alert.count()) ? (await alert.first().innerText()).replace(/\n/g, " ") : "pas d'alerte (ecran blanc ?)"); await p2.screenshot({ path: "f9-chunk-error.png" });
log("B.barre-onglets-visible-en-echec", (await p2.getByRole("navigation").getByRole("link", { name: "Accueil" }).count()) === 1, "navigation toujours la");
await p2.unroute("**/src/pages/beerDetail/beerDetail.tsx*"); await p2.getByRole("button", { name: /Réessayer/ }).click(); await p2.waitForTimeout(2500);
log("B.reessayer-recharge-la-page", (await p2.getByRole("button", { name: /Je l'ai bue/ }).count()) >= 1 && (await alert.count()) === 0, "fiche affichee, alerte disparue");
// C. toutes les routes se chargent a la demande sans erreur
const routes = ["/", "/bieres", "/bieres/1", "/carte", "/journal", "/profil", "/profils", "/profils/2", "/profils/1/wishlist"]; for (const r of routes) { const q = await ctx.newPage(); const ww = watch(q, { api: "http://localhost:5090", expectedConsole: [/Failed to load resource/, /tile\.openstreetmap/] }); await q.goto(URL0 + r); await q.waitForLoadState("networkidle"); await q.waitForTimeout(1200); const t = ww.take(); const body = (await q.locator("body").innerText()).length; log(`C.route ${r}`, body > 40 && !t.fiveXX.length && !t.console.length && (await q.getByRole("alert").count()) === 0, `texte ${body} car., console=${t.console.length} ${t.console.slice(0, 1)}`); await q.close(); }
// D. 360 px pendant l'attente
const sm = await mk({ width: 360, height: 740 }); await sm.p.goto(URL0 + "/"); await sm.p.waitForLoadState("networkidle"); await sm.p.route("**/src/pages/journal/journal.tsx*", async (route) => { await new Promise((r) => setTimeout(r, 1500)); await route.continue(); }); await sm.p.getByRole("navigation").getByRole("link", { name: "Journal" }).click(); await sm.p.waitForTimeout(500);
log("D.360px-attente-sans-debordement", (await overflowing(sm.p)).length === 0 && (await unreachable(sm.p)).length === 0, "360x740"); await sm.p.screenshot({ path: "f9-loading-360.png" });
await b.close(); const fails = results.filter((x) => !x.ok); console.log(`\n${results.length - fails.length}/${results.length} PASS`); process.exit(fails.length ? 1 : 0);
