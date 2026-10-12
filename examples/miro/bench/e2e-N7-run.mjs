// Verification contre l API REELLE pour N7 « Concurrence optimiste sur PATCH element » (US back) : AC1 a AC8 + edge cases.
// Usage : node e2e-N7-run.mjs <run>   -> results-N7-<run>.json
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire("/tmp/claude-0/-home-user-Kit/6d0ce183-8a0e-5e9b-8ccd-4301258ef079/scratchpad/nbench/front/package.json");
const signalR = require("@microsoft/signalr");
const E = new URL(".", import.meta.url).pathname; const RUN = process.argv[2] || "1";
const API = "http://localhost:5080/api/v1";
const call = async (u, m, p, b) => { const r = await fetch(API + p, { method: m, headers: { ...(u ? { "X-User-Id": String(u) } : {}), ...(b ? { "Content-Type": "application/json" } : {}) }, body: b && JSON.stringify(b) }); const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch { j = t; } return { status: r.status, body: j, text: t }; };
const results = []; const check = (id, ok, d) => { results.push({ id, ok: !!ok, detail: d }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${d}`); };
const nz = (d) => d && d.replace(/Z$/, "");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nb = (await call(1, "POST", "/boards", { name: "N7-" + Date.now() })).body;
const mk = async (extra = {}) => (await call(1, "POST", `/boards/${nb.id}/items`, { type: "StickyNote", x: 10, y: 10, width: 100, height: 60, content: "c0", color: "#fde68a", ...extra })).body;
const P = (id, b, u = 1, board = nb.id) => call(u, "PATCH", `/boards/${board}/items/${id}`, b);
const get = async (id) => (await call(1, "GET", `/boards/${nb.id}/items`)).body.find((x) => x.id === id);
// AC1 date a jour -> 200 + nouvelle date
const a = await mk(); await sleep(20);
const r1 = await P(a.id, { content: "c1", expectedUpdatedAt: a.updatedAt });
check("#1.1", r1.status === 200 && r1.body.content === "c1" && r1.body.updatedAt !== a.updatedAt, `a jour -> ${r1.status}, date ${a.updatedAt} -> ${r1.body?.updatedAt}`);
// AC2 date perimee -> 409 + current, element inchange
await sleep(20);
const r2 = await P(a.id, { content: "c2", expectedUpdatedAt: a.updatedAt });
const after = await get(a.id);
check("#1.2", r2.status === 409 && r2.body.message && r2.body.current?.id === a.id && r2.body.current.content === "c1" && nz(r2.body.current.updatedAt) === nz(r1.body.updatedAt) && r2.body.current.type === "StickyNote" && after.content === "c1" && nz(after.updatedAt) === nz(r1.body.updatedAt), `perime -> ${r2.status} ${r2.text.slice(0, 200)} ; relu content=${after.content}`);
// AC3 sans champ -> 200 quelle que soit la date
const r3 = await P(a.id, { content: "c3" });
check("#1.3", r3.status === 200 && r3.body.content === "c3", `sans expectedUpdatedAt -> ${r3.status}`);
// AC4 autres ecritures du meme instant (variantes recalculees sur la date courante a chaque tour)
const variantsOf = (d) => { const b = d.replace(/Z$/, ""), fr = (b.split(".")[1] || ""), t = new Date(b + "Z"); return { Z: b + "Z", sansSuffixe: b, decalageUTC: b + "+00:00", plus02: new Date(t.getTime() + 2 * 3600e3).toISOString().slice(0, 19) + (fr ? "." + fr : "") + "+02:00" }; };
let ok4 = true; const det4 = [];
for (const k of ["Z", "sansSuffixe", "decalageUTC", "plus02"]) { const v = variantsOf((await get(a.id)).updatedAt)[k]; const r = await P(a.id, { color: "#aabbcc", expectedUpdatedAt: v }); det4.push(`${k}:${r.status}`); if (r.status !== 200) ok4 = false; await sleep(5); }
check("#1.4", ok4, det4.join(" "));
// AC5 verrouille + perime -> 409 perime avec current montrant le verrou
const l = await mk(); const l0 = l.updatedAt; await sleep(20);
await P(l.id, { isLocked: true }); await sleep(20);
const r5 = await P(l.id, { content: "x", expectedUpdatedAt: l0 });
const r5b = await P(l.id, { content: "x", expectedUpdatedAt: (await get(l.id)).updatedAt });
check("#1.5/E3", r5.status === 409 && r5.body.current?.isLocked === true && "current" in r5.body && r5b.status === 409 && !("current" in (r5b.body || {})), `verrouille+perime -> ${r5.status} current.isLocked=${r5.body?.current?.isLocked} ; verrouille+a jour -> ${r5b.status} ${r5b.text.slice(0, 80)}`);
// AC6 expectedUpdatedAt seul -> 400 identique a PATCH vide
const e0 = await P(a.id, {}); const r6 = await P(a.id, { expectedUpdatedAt: (await get(a.id)).updatedAt });
check("#1.6", r6.status === 400 && e0.status === 400 && r6.text === e0.text, `seul -> ${r6.status} ${r6.text.slice(0, 80)} ; vide -> ${e0.status}`);
// AC7 temps reel : perime n emet rien, a jour emet
const conn = new signalR.HubConnectionBuilder().withUrl(`http://localhost:5080/hubs/board?userId=1`, { withCredentials: false }).build();
const got = []; conn.on("BoardChanged", (...x) => got.push(x)); await conn.start(); await conn.invoke("JoinBoard", nb.id);
const t = await mk(); await sleep(300); got.length = 0; const t0 = t.updatedAt; await sleep(20);
await P(t.id, { content: "n" }); await sleep(500); const n1 = got.length; got.length = 0;
const r7 = await P(t.id, { content: "z", expectedUpdatedAt: t0 }); await sleep(800);
check("#1.7", r7.status === 409 && n1 >= 1 && got.length === 0, `modif ok -> ${n1} evenement(s) ; perimee ${r7.status} -> ${got.length} evenement(s)`);
await conn.stop();
// AC8 droits : 403 avant fraicheur, 404 absent, 401
const r8a = await P(a.id, { content: "q", expectedUpdatedAt: "2000-01-01T00:00:00Z" }, 3);
const r8b = await P(999999, { content: "q", expectedUpdatedAt: "2000-01-01T00:00:00Z" });
const r8c = await call(null, "PATCH", `/boards/${nb.id}/items/${a.id}`, { content: "q", expectedUpdatedAt: "2000-01-01T00:00:00Z" });
check("#1.8", r8a.status === 403 && r8b.status === 404 && r8c.status === 401, `non-membre perime -> ${r8a.status} ; absent -> ${r8b.status} ; sans identite -> ${r8c.status}`);
// E : tick (ms egale, tick different) -> 409 ; valeur invalide -> 400 ; null explicite -> comme absent
const k = await mk(); const kd = k.updatedAt; const [h, fr] = kd.replace(/Z$/, "").split(".");
const trunc = h + "." + (fr || "0000000").slice(0, 3) + "Z";
const rt = await P(k.id, { content: "t", expectedUpdatedAt: trunc });
const rn = await P(k.id, { content: "t", expectedUpdatedAt: null });
const rinv = await P(k.id, { content: "t", expectedUpdatedAt: "pas-une-date" });
check("#E.tick/null/invalide", (fr && fr.length > 3 && /[1-9]/.test(fr.slice(3)) ? rt.status === 409 : true) && rn.status === 200 && rinv.status === 400, `tronque ms (${trunc}) -> ${rt.status} (ticks=${fr}) ; null -> ${rn.status} ; invalide -> ${rinv.status} ${rinv.text.slice(0, 60)}`);
// FR-006 : validation 400 avant fraicheur (points sur un element non trace, date perimee)
const v = await mk(); const v0 = v.updatedAt; await sleep(20); await P(v.id, { content: "v1" });
const rv = await P(v.id, { points: [{ x: 1, y: 1 }], expectedUpdatedAt: v0 });
check("#FR006", rv.status === 400, `perime + points sur un post-it -> ${rv.status} ${rv.text.slice(0, 80)}`);
// E : perime ne bouge pas la date, et verrou seul reste 409 verrouille
const kk = await mk(); const kdate = kk.updatedAt; await sleep(20); await P(kk.id, { content: "y" }); const d1 = (await get(kk.id)).updatedAt;
await P(kk.id, { content: "bad", expectedUpdatedAt: kdate }); const d2 = (await get(kk.id)).updatedAt;
check("#E.date-inchangee", d1 === d2, `date avant refus ${d1}, apres ${d2}`);
writeFileSync(E + `results-N7-${RUN}.json`, JSON.stringify(results, null, 1));
