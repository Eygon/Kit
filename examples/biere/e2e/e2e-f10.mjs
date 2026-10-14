// E2E F10 PWA : build de production + vite preview (:5174), API reelle (:5090). Navigateur 390x844, hors ligne via context.setOffline.
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { watch, overflowing, unreachable, a11y } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const URL0 = "http://localhost:5174", API = "http://localhost:5090";
const results = []; const log = (id, ok, d) => { results.push({ id, ok: !!ok }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${d}`); };
const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: "fr-FR", hasTouch: true, isMobile: true, serviceWorkers: "allow" });
await ctx.addInitScript(() => { try { if (!localStorage.getItem("mousse.currentUserId")) localStorage.setItem("mousse.currentUserId", "1"); } catch {} });
const p = await ctx.newPage(); const w = watch(p, { api: API, expectedConsole: [/Failed to load resource/, /tile\.openstreetmap/, /net::ERR/] });
// A. installable
const m = await (await fetch(URL0 + "/manifest.webmanifest")).json(); log("A.manifeste", m.name === "Mousse" && m.display === "standalone" && m.start_url === "/" && /2d6a4f/i.test(m.theme_color) , `${m.name} ${m.display} ${m.start_url} theme ${m.theme_color} fond ${m.background_color}`);
const icons = m.icons || []; const ok512 = icons.some((i) => /512/.test(i.sizes) && (i.purpose || "any").includes("any")), ok192 = icons.some((i) => /192/.test(i.sizes)), mask = icons.some((i) => (i.purpose || "").includes("maskable")); log("A.icones-192-512-maskable", ok512 && ok192 && mask, icons.map((i) => `${i.sizes}${i.purpose ? "/" + i.purpose : ""}`).join(" "));
let allOk = true; for (const i of icons) { const r = await fetch(URL0 + (i.src.startsWith("/") ? i.src : "/" + i.src)); if (!(r.status === 200 && /image\/png/.test(r.headers.get("content-type") || ""))) allOk = false; } log("A.icones-servies-en-png", allOk, "200 image/png");
await p.goto(URL0 + "/"); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1500);
const html = await p.content(); log("A.index-lie-le-manifeste", /rel="manifest"/.test(html) && /apple-touch-icon/.test(html), "link manifest + apple-touch-icon");
// B. service worker
const reg = await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return r ? { scope: r.scope, active: !!r.active, waiting: !!r.waiting } : null; }); log("B.service-worker-enregistre", !!reg && reg.active, JSON.stringify(reg));
await p.reload(); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1500); log("B.page-controlee", await p.evaluate(() => !!navigator.serviceWorker.controller), "controller present apres rechargement");
// parcourir pour remplir les caches (coquille + lectures API)
for (const path of ["/", "/bieres", "/bieres/58", "/profil", "/journal"]) { await p.goto(URL0 + path); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1200); }
const caches1 = await p.evaluate(async () => { const out = {}; for (const k of await caches.keys()) { const c = await caches.open(k); out[k] = (await c.keys()).map((r) => new URL(r.url).pathname + new URL(r.url).search); } return out; });
const apiKeys = Object.entries(caches1).filter(([k]) => /api/i.test(k)).flatMap(([, v]) => v); const allKeys = Object.values(caches1).flat();
log("B.precache-coquille", allKeys.some((u) => /\.js$/.test(u)) && allKeys.some((u) => /\.css$/.test(u)) && allKeys.some((u) => /woff2$/.test(u)), `${allKeys.length} entrees ; js/css/woff2 presents`);
log("B.cache-api-lectures", apiKeys.length >= 2, `${apiKeys.length} lectures en cache : ${apiKeys.slice(0, 3).join(", ")}`);
log("B.jamais-de-photos-ni-ecritures-en-cache", !allKeys.some((u) => /\/photos\//.test(u)), "aucun /photos/ dans les caches");
// C. hors ligne
await ctx.setOffline(true); await p.goto(URL0 + "/bieres"); await p.waitForTimeout(2500); let txt = await p.locator("body").innerText();
log("C.hors-ligne-la-coquille-charge", txt.length > 200 && /Filtres|Bières/.test(txt), `${txt.length} car.`);
log("C.hors-ligne-lecture-depuis-le-cache", /3 Monts|Orval|Chimay|Paulaner/.test(txt) || (await p.locator("a[href^='/bieres/']").count()) > 3, `${await p.locator("a[href^='/bieres/']").count()} cartes de bieres`);
const st = p.getByRole("status").filter({ hasText: /hors ligne/i }); log("C.bandeau-hors-ligne", (await st.count()) >= 1, (await st.count()) ? (await st.first().innerText()).replace(/\n/g, " ") : "aucun bandeau"); await p.screenshot({ path: "f10-offline-beers.png" });
log("C.bandeau-sans-debordement", (await overflowing(p)).length === 0 && (await unreachable(p)).length === 0, "overflow/unreachable");
await p.goto(URL0 + "/bieres/58"); await p.waitForTimeout(2500); log("C.fiche-hors-ligne", /3 Monts/.test(await p.locator("body").innerText()), "fiche lue depuis le cache");
// ecriture hors ligne : echec visible, rien en file d'attente
await p.goto(URL0 + "/bieres/58"); await p.waitForTimeout(1500); const wl = p.getByRole("button", { name: /À goûter/ }).first(); if (await wl.count()) { await wl.click(); await p.waitForTimeout(1500); const body = await p.locator("body").innerText(); log("C.ecriture-hors-ligne-echec-visible", /impossible|erreur|connexion|réseau/i.test(body), (body.match(/(Impossible[^\n]*|Erreur[^\n]*|[^\n]*connexion[^\n]*)/i) || ["aucun message"])[0].slice(0, 100)); } else log("C.ecriture-hors-ligne-echec-visible", false, "bouton À goûter absent");
await ctx.setOffline(false); await p.waitForTimeout(1500); log("C.retour-en-ligne-bandeau-disparait", (await p.getByRole("status").filter({ hasText: /hors ligne/i }).count()) === 0, "bandeau retire");
// D. changement d'utilisateur purge le cache API
const before = await p.evaluate(async () => { let n = 0; for (const k of await caches.keys()) if (/api/i.test(k)) n += (await (await caches.open(k)).keys()).length; return n; });
await p.goto(URL0 + "/profil"); await p.waitForLoadState("networkidle"); await p.waitForTimeout(1000); await p.getByRole("button", { name: /Utilisateur courant|Current user/ }).click().catch(() => {}); await p.waitForTimeout(500); await p.getByRole("option", { name: /Bob/ }).click().catch(() => {}); await p.waitForTimeout(1500);
const after = await p.evaluate(async () => { const urls = []; for (const k of await caches.keys()) if (/api/i.test(k)) for (const r of await (await caches.open(k)).keys()) urls.push(new URL(r.url).pathname); return urls; });
log("D.purge-cache-au-changement-d-utilisateur", before > 0 && after.length < before , `avant ${before} lectures, apres ${after.length} (les /me/* d'Alice ne doivent plus y etre : ${after.filter((u) => /\/me\//.test(u)).length} /me/* restants, reconstitues pour Bob)`);
// E. axe + 360
log("E.axe-0-violation", (await a11y(p, { axePath: "/tmp/axe/node_modules/axe-core/axe.min.js" })).length === 0, "page profil en ligne");
let t = w.take(); log("E.sans-erreur-5xx", !t.fiveXX.length, `5xx=${t.fiveXX.length}`);
await b.close(); const fails = results.filter((x) => !x.ok); console.log(`\n${results.length - fails.length}/${results.length} PASS`); process.exit(fails.length ? 1 : 0);
