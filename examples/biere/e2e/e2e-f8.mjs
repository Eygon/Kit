// E2E F8 Regroupement des reperes : API reelle + navigateur 390x844 / 360x740. Leaflet reel (tuiles indisponibles).
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { watch, overflowing, unreachable, covered } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const URL0 = "http://localhost:5173";
const results = []; const log = (id, ok, d) => { results.push({ id, ok: !!ok }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${d}`); };
const b = await chromium.launch();
const mk = async (vp = { width: 390, height: 844 }) => { const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, locale: "fr-FR", hasTouch: true, isMobile: true, geolocation: { latitude: 48.8566, longitude: 2.3522 }, permissions: ["geolocation"] }); await ctx.addInitScript(() => localStorage.setItem("mousse.currentUserId", "1")); const p = await ctx.newPage(); return { ctx, p, w: watch(p, { api: "http://localhost:5090", expectedConsole: [/Failed to load resource/, /tile\.openstreetmap/] }) }; };
const { p, w } = await mk(); await p.goto(URL0 + "/carte"); await p.waitForLoadState("networkidle"); await p.waitForTimeout(2500);
const count = async () => ({ pins: await p.locator(".leaflet-marker-icon").count(), clusters: await p.getByRole("button", { name: /\d+ lieux?, zoomer/ }).count() });
const listN = async () => +((await p.getByRole("button", { name: /^Lieux \(\d+\)/ }).innerText()).match(/\((\d+)\)/)?.[1] ?? -1);
const s0 = await count(); const n0 = await listN(); log("A.pastilles-presentes-a-zoom-faible", s0.clusters >= 1, `${s0.clusters} pastille(s), ${s0.pins} icones au total, liste ${n0}`);
await p.screenshot({ path: "f8-map-clusters.png" });
const labels = await p.getByRole("button", { name: /\d+ lieux?, zoomer/ }).evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") || e.getAttribute("title") || e.innerText)); log("A.nom-accessible-N-lieux", labels.every((l) => /^\d+ lieux?, zoomer$/.test(l)), labels.slice(0, 4).join(" | "));
const sizes = await p.getByRole("button", { name: /\d+ lieux?, zoomer/ }).evaluateAll((els) => els.map((e) => Math.min(e.getBoundingClientRect().width, e.getBoundingClientRect().height))); log("A.pastille-44px", sizes.length > 0 && Math.min(...sizes) >= 43.5, `plus petite ${Math.round(Math.min(...sizes))} px`);
const total = (await p.getByRole("button", { name: /\d+ lieux?, zoomer/ }).evaluateAll((els) => els.map((e) => +((e.getAttribute("aria-label") || e.getAttribute("title") || "").match(/^(\d+)/)?.[1] ?? 0)))).reduce((a, x) => a + x, 0) + (await p.locator(".leaflet-marker-icon:not([aria-label*='zoomer'])").evaluateAll((els) => els.filter((e) => /✓|\?|✕|–/.test(e.textContent || "")).length));
log("A.aucun-lieu-perdu", total >= n0 - 1 && total <= n0 + 1, `pastilles + reperes = ${total}, liste = ${n0}`);
const cov = (await covered(p)).filter((c) => !/^[✓?✕–]$/.test(c.text) && !/^\d+$/.test(c.text)); log("A.oracle-recouvrement", cov.length === 0, JSON.stringify(cov).slice(0, 200));
// Chevauchement : plus aucun repere ne se superpose a un autre
const overlaps = await p.locator(".leaflet-marker-icon").evaluateAll((els) => { let n = 0; const r = els.map((e) => e.getBoundingClientRect()).filter((x) => x.width > 0); for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) { const dx = Math.abs(r[i].x + r[i].width / 2 - (r[j].x + r[j].width / 2)), dy = Math.abs(r[i].y + r[i].height / 2 - (r[j].y + r[j].height / 2)); if (dx < 40 && dy < 40) n++; } return n; });
log("A.plus-de-chevauchement-des-icones", overlaps === 0, `${overlaps} paires d'icones a moins de 40 px`);
// toucher une pastille zoome
const zBefore = await p.evaluate(() => { const c = document.querySelector(".leaflet-container"); return c ? c.querySelector(".leaflet-tile-pane")?.children.length : 0; });
const cl = p.getByRole("button", { name: /\d+ lieux?, zoomer/ }).first(); const lab = await cl.getAttribute("aria-label"); await cl.click(); await p.waitForTimeout(1500); const s1 = await count();
log("B.tap-pastille-zoome-et-eclate", s1.pins !== s0.pins || s1.clusters !== s0.clusters, `avant ${s0.clusters} pastilles/${s0.pins} icones, apres ${s1.clusters}/${s1.pins} (« ${lab} »)`); await p.screenshot({ path: "f8-map-after-tap.png" });
log("B.pas-de-fiche-ouverte", (await p.getByRole("dialog").count()) === 0, "toucher une pastille n'ouvre pas de fiche");
// zoom continu jusqu'a plus de pastille
for (let i = 0; i < 6; i++) { const c = p.getByRole("button", { name: /\d+ lieux?, zoomer/ }); if (!(await c.count())) break; await c.first().click(); await p.waitForTimeout(900); }
const s2 = await count(); log("B.zoom-fort-plus-que-des-reperes", s2.clusters === 0 || s2.pins > s0.pins, `${s2.clusters} pastilles restantes (lieux aux memes coordonnees possibles), ${s2.pins} icones`);
// un repere reste cliquable => fiche
const pin = p.locator(".leaflet-marker-icon").filter({ hasText: /✓|\?|✕|–/ }).first(); if (await pin.count()) { await pin.click({ force: true }).catch(() => {}); await p.waitForTimeout(1500); log("B.repere-isole-ouvre-la-fiche", (await p.getByRole("dialog").count()) === 1, "fiche du lieu"); await p.keyboard.press("Escape"); } else log("B.repere-isole-ouvre-la-fiche", false, "aucun repere isole");
// C. liste inchangee et recherche => zoom 16 => repere
await p.goto(URL0 + "/carte"); await p.waitForLoadState("networkidle"); await p.waitForTimeout(2000); log("C.liste-inchangee", (await listN()) === n0, `Lieux (${await listN()})`);
await p.getByRole("button", { name: /Rechercher un lieu/ }).first().click(); await p.waitForTimeout(700); const dlg = p.getByRole("dialog"); await dlg.getByRole("textbox").or(dlg.getByRole("searchbox")).first().fill("Smoking"); await p.waitForTimeout(1500); await dlg.getByRole("button").filter({ hasText: /Smoking/ }).first().click(); await p.waitForTimeout(2500);
log("C.recherche-ouvre-fiche-et-zoome", (await p.getByRole("dialog").count()) === 1 && /Smoking/.test(await p.getByRole("dialog").innerText()), "fiche du lieu recherche"); await p.keyboard.press("Escape"); await p.waitForTimeout(800);
const s3 = await count(); log("C.apres-recherche-reperes-individuels", s3.pins >= 1, `${s3.clusters} pastilles, ${s3.pins} icones`); await p.screenshot({ path: "f8-map-after-search.png" });
// D. filtre => recalcul
await p.goto(URL0 + "/carte?type=brewery"); await p.waitForLoadState("networkidle"); await p.waitForTimeout(2500); const sf = await count(); const nf = await listN(); log("D.filtre-type-recalcule", nf < n0 && (sf.pins + 0) <= s0.pins, `Lieux (${nf}), ${sf.clusters} pastilles/${sf.pins} icones`);
// E. mode proposer : toucher une pastille ne pose pas de point
await p.goto(URL0 + "/carte"); await p.waitForLoadState("networkidle"); await p.waitForTimeout(2000); await p.getByRole("button", { name: /Proposer un lieu/ }).first().click(); await p.waitForTimeout(800); const c0 = p.getByRole("button", { name: /\d+ lieux?, zoomer/ }); if (await c0.count()) { await c0.first().click(); await p.waitForTimeout(1200); log("E.proposer-pastille-zoome-sans-poser-de-point", (await p.getByRole("button", { name: /Confirmer le point/ }).isEnabled().catch(() => false)) === false, "pas de point pose"); } else log("E.proposer-pastille-zoome-sans-poser-de-point", true, "aucune pastille en vue (cas non applicable)");
let t = w.take(); log("E.sans-erreur", !t.fiveXX.length && !t.console.length, `5xx=${t.fiveXX.length} console=${t.console.length} ${t.console.slice(0, 2)}`);
// F. 360 px
const sm = await mk({ width: 360, height: 740 }); await sm.p.goto(URL0 + "/carte"); await sm.p.waitForLoadState("networkidle"); await sm.p.waitForTimeout(2500); log("F.360px", (await overflowing(sm.p)).length === 0 && (await unreachable(sm.p)).length === 0, "360x740"); await sm.p.screenshot({ path: "f8-map-360.png" });
await b.close(); const fails = results.filter((x) => !x.ok); console.log(`\n${results.length - fails.length}/${results.length} PASS`); process.exit(fails.length ? 1 : 0);
