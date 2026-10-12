// Verification contre l API REELLE pour N6 « Statistiques d un tableau » (US back, lecture seule) : AC1 a AC8 + cas limites E1 a E6.
// Usage : node e2e-N6-run.mjs <run>   -> results-N6-<run>.json
import { writeFileSync } from "node:fs";
const E = new URL(".", import.meta.url).pathname; const RUN = process.argv[2] || "1";
const API = "http://localhost:5080/api/v1";
const call = async (u, m, p, b) => { const r = await fetch(API + p, { method: m, headers: { ...(u ? { "X-User-Id": String(u) } : {}), ...(b ? { "Content-Type": "application/json" } : {}) }, body: b && JSON.stringify(b) }); const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch { j = t; } return { status: r.status, body: j, text: t }; };
const results = []; const check = (id, ok, d) => { results.push({ id, ok, detail: d }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${d}`); };
const byType = (s) => Object.fromEntries(s.itemCounts.map((x) => [x.type, x.count]));
const item = (b, type, extra = {}) => call(1, "POST", `/boards/${b}/items`, { type, x: 10, y: 10, width: 100, height: 60, content: "c", color: "#fde68a", ...extra });
// AC1 seed : tableau 1
const s1 = await call(1, "GET", "/boards/1/stats");
check("#1.1", s1.status === 200 && JSON.stringify(s1.body.itemCounts.map((x) => x.type)) === JSON.stringify(["StickyNote", "Shape", "Text", "Freehand"]) && s1.body.itemCounts.reduce((a, x) => a + x.count, 0) === 4 && s1.body.lastItemUpdatedAt, `tableau 1 : ${s1.text.slice(0, 220)}`);
// AC2 lecteur
const s1v = await call(3, "GET", "/boards/1/stats");
check("#1.2", s1v.status === 200 && JSON.stringify(s1v.body) === JSON.stringify(s1.body), `lecteur Carol -> ${s1v.status}, meme reponse que le proprietaire=${JSON.stringify(s1v.body) === JSON.stringify(s1.body)}`);
// AC3/AC4/E2/E3 : tableau neuf avec connecteurs, commentaires (dont un resolu), element etranger
const nb = (await call(1, "POST", "/boards", { name: "N6-" + Date.now() })).body;
const i1 = (await item(nb.id, "StickyNote")).body, i2 = (await item(nb.id, "Text")).body, i3 = (await item(nb.id, "Text")).body;
const c1 = await call(1, "POST", `/boards/${nb.id}/connectors`, { fromItemId: i1.id, toItemId: i2.id, style: "Arrow" });
const c2 = await call(1, "POST", `/boards/${nb.id}/connectors`, { fromItemId: i2.id, toItemId: i3.id, style: "Line" });
const k1 = (await call(1, "POST", `/boards/${nb.id}/items/${i1.id}/comments`, { body: "a" })).body;
await call(1, "POST", `/boards/${nb.id}/items/${i1.id}/comments`, { body: "b" });
await call(1, "POST", `/boards/${nb.id}/items/${i2.id}/comments`, { body: "c" });
const resolved = await call(1, "PATCH", `/boards/${nb.id}/items/${i1.id}/comments/${k1.id}`, { isResolved: true });
const other = (await item(2, "StickyNote")); // element etranger, plus recent
const s = await call(1, "GET", `/boards/${nb.id}/stats`);
const dates = (await call(1, "GET", `/boards/${nb.id}/items`)).body.map((x) => x.updatedAt).sort();
check("#1.3", s.status === 200 && s.body.connectorCount === 2 && s.body.unresolvedCommentCount === 2 && byType(s.body).StickyNote === 1 && byType(s.body).Text === 2, `connecteurs=${s.body.connectorCount} (crees ${c1.status}/${c2.status}) ; non resolus=${s.body.unresolvedCommentCount} (resolu : ${resolved.status}) ; types=${JSON.stringify(byType(s.body))}`);
check("#1.4/E3", s.body.lastItemUpdatedAt && s.body.lastItemUpdatedAt.slice(0, 19) === dates[dates.length - 1].slice(0, 19) && other.status === 201, `date=${s.body.lastItemUpdatedAt} = max des elements du tableau=${dates[dates.length - 1]} ; element etranger plus recent cree (${other.status}) non compte`);
// E5 element supprime, E6 verrouille
await call(1, "PATCH", `/boards/${nb.id}/items/${i3.id}`, { isLocked: true });
const s3 = await call(1, "GET", `/boards/${nb.id}/stats`);
const del = await call(1, "DELETE", `/boards/${nb.id}/items/${i2.id}`);
const s4 = await call(1, "GET", `/boards/${nb.id}/stats`);
check("#E5/E6", byType(s3.body).Text === 2 && byType(s4.body).Text === 1 && del.status === 204 && s4.body.connectorCount < s.body.connectorCount + 1, `verrouille compte (Text=${byType(s3.body).Text}) ; apres suppression d un element Text=${byType(s4.body)?.Text}, connecteurs ${s.body.connectorCount} -> ${s4.body.connectorCount}`);
// AC5/E1/E4 tableau vide
const eb = (await call(1, "POST", "/boards", { name: "N6-vide-" + Date.now() })).body;
const se = await call(1, "GET", `/boards/${eb.id}/stats`);
check("#1.5/E1/E4", se.status === 200 && se.body.itemCounts.length === 4 && se.body.itemCounts.every((x) => x.count === 0) && se.body.lastItemUpdatedAt === null && se.body.connectorCount === 0 && se.body.unresolvedCommentCount === 0, `tableau vide : ${se.text.slice(0, 200)}`);
// AC6 non membre, AC7 inexistant, AC8 sans identite
const nm = await call(3, "GET", "/boards/2/stats");
check("#1.6", nm.status === 403, `non-membre (Carol sur le tableau 2) -> ${nm.status}`);
const un = await call(1, "GET", "/boards/999999/stats");
check("#1.7", un.status === 204, `tableau inexistant -> ${un.status} (convention du depot : 204)`);
const ni = await call(null, "GET", "/boards/1/stats");
check("#1.8", ni.status === 401, `sans X-User-Id -> ${ni.status}`);
// lecture seule : GET deux fois, rien ne change
const a = (await call(1, "GET", `/boards/${nb.id}/stats`)).text, b = (await call(1, "GET", `/boards/${nb.id}/stats`)).text;
check("#L.lecture-seule", a === b, "deux lectures successives identiques");
writeFileSync(E + `results-N6-${RUN}.json`, JSON.stringify(results, null, 1));
