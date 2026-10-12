// Verification contre l API REELLE pour N10 « Dupliquer un tableau » (US back) : AC + cas limites. Back :5080.
// Usage : node e2e-N10-run.mjs <run>   -> results-N10-<run>.json
import { writeFileSync } from "node:fs";
const E = new URL(".", import.meta.url).pathname; const RUN = process.argv[2] || "1";
const API = "http://localhost:5080/api/v1";
const call = async (u, m, p, b) => { const r = await fetch(API + p, { method: m, headers: { ...(u ? { "X-User-Id": String(u) } : {}), ...(b ? { "Content-Type": "application/json" } : {}) }, body: b && JSON.stringify(b) }); const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch { j = t; } return { status: r.status, body: j, text: t, loc: r.headers.get("location") }; };
const results = []; const check = (id, ok, d) => { results.push({ id, ok: !!ok, detail: d }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${d}`); };
const nz = (d) => d && d.replace(/Z$/, "");
const STAMP = String(Date.now()).slice(-6) + RUN;
// ---- source : tableau d Alice avec Bob (Editor) et Carol (Viewer), 5 elements dont verrouille et trait, 2 connecteurs, commentaires
const src = (await call(1, "POST", "/boards", { name: `N10-${STAMP}` })).body;
await call(1, "POST", `/boards/${src.id}/members`, { userId: 2, role: "Editor" });
await call(1, "POST", `/boards/${src.id}/members`, { userId: 3, role: "Viewer" });
const mk = async (b) => (await call(1, "POST", `/boards/${src.id}/items`, b)).body;
const A = await mk({ type: "StickyNote", x: 10, y: 20, width: 140, height: 90, content: "marqueur-A", color: "#fde68a" });
const Bi = await mk({ type: "Shape", x: 300, y: 40, width: 120, height: 80, content: "marqueur-B", color: "#a5d8ff" });
const C = await mk({ type: "Text", x: 50, y: 300, width: 200, height: 40, content: "marqueur-C", color: "#ffffff" });
const D = await mk({ type: "Freehand", x: 400, y: 300, width: 60, height: 60, content: "", color: "#ff0000", points: [{ x: 0, y: 0 }, { x: 10, y: 20 }, { x: 30, y: 25 }], strokeWidth: 4 });
const L = await mk({ type: "StickyNote", x: 500, y: 100, width: 100, height: 100, content: "marqueur-L", color: "#b2f2bb" });
await call(1, "PATCH", `/boards/${src.id}/items/${L.id}`, { isLocked: true });
await call(1, "PATCH", `/boards/${src.id}/items/${A.id}`, { zIndex: 7 });
const k1 = (await call(1, "POST", `/boards/${src.id}/connectors`, { fromItemId: A.id, toItemId: Bi.id, style: "Arrow" })).body;
const k2 = (await call(1, "POST", `/boards/${src.id}/connectors`, { fromItemId: Bi.id, toItemId: C.id, style: "Line" })).body;
await call(1, "POST", `/boards/${src.id}/items/${A.id}/comments`, { body: "un commentaire" });
const snap = async () => JSON.stringify([(await call(1, "GET", `/boards/${src.id}/items`)).body, (await call(1, "GET", `/boards/${src.id}/connectors`)).body, (await call(1, "GET", `/boards/${src.id}/members`)).body, (await call(1, "GET", `/boards/${src.id}`)).body]);
const before = await snap();
const srcItems = (await call(1, "GET", `/boards/${src.id}/items`)).body;
// AC1 : la lectrice Carol duplique
const d = await call(3, "POST", `/boards/${src.id}/duplicate`);
check("#1.1", d.status === 201 && d.body.name === `N10-${STAMP} (copie)` && d.body.ownerId === 3 && d.body.memberCount === 1 && d.body.itemCount === 5 && /\/boards\/\d+$/.test(d.loc || "") && d.loc.endsWith(String(d.body.id)), `lectrice -> ${d.status} ${JSON.stringify(d.body).slice(0, 170)} ; Location=${d.loc}`);
const nid = d.body.id;
const mem = (await call(3, "GET", `/boards/${nid}/members`)).body;
check("#1.1b", mem.length === 1 && mem[0].userId === 3 && mem[0].role === "Owner", `membres de la copie : ${JSON.stringify(mem)}`);
// AC2 : elements copies a l identique (hors id), nouveaux ids
const cp = (await call(3, "GET", `/boards/${nid}/items`)).body;
const key = (i) => i.content || `${i.type}:${i.x}`;
const bySrc = Object.fromEntries(srcItems.map((i) => [key(i), i])); const same = [];
for (const c of cp) { const s = bySrc[key(c)]; const f = ["type", "x", "y", "width", "height", "color", "content", "zIndex", "isLocked", "strokeWidth"]; const diff = f.filter((k) => JSON.stringify(c[k]) !== JSON.stringify(s?.[k])); if (JSON.stringify(c.points) !== JSON.stringify(s?.points)) diff.push("points"); same.push([key(c), diff.join("+") || "ok", c.id !== s?.id && !srcItems.some((x) => x.id === c.id)]); }
check("#1.2", cp.length === 5 && same.every((x) => x[1] === "ok" && x[2]), `attributs copies : ${JSON.stringify(same)}`);
const cpL = cp.find((i) => i.content === "marqueur-L"), cpD = cp.find((i) => i.type === "Freehand"), cpA = cp.find((i) => i.content === "marqueur-A");
check("#1.2b", cpL.isLocked === true && cpD.points?.length === 3 && cpD.strokeWidth === 4 && cpA.zIndex === 7, `verrou=${cpL.isLocked} trait points=${cpD.points?.length} epaisseur=${cpD.strokeWidth} zIndex de A=${cpA.zIndex} (attendu 7, non renumerote)`);
// AC3 : connecteurs remappes vers les nouveaux elements
const ck = (await call(3, "GET", `/boards/${nid}/connectors`)).body; const idOf = (m) => cp.find((i) => i.content === m).id;
const find = (from, to) => ck.find((k) => k.fromItemId === idOf(from) && k.toItemId === idOf(to));
check("#1.3", ck.length === 2 && find("marqueur-A", "marqueur-B")?.style === "Arrow" && find("marqueur-B", "marqueur-C")?.style === "Line" && ck.every((k) => cp.some((i) => i.id === k.fromItemId) && cp.some((i) => i.id === k.toItemId)), `connecteurs : ${JSON.stringify(ck.map((k) => [k.fromItemId, k.toItemId, k.style]))} ; aucun ne pointe vers l original=${ck.every((k) => !srcItems.some((i) => i.id === k.fromItemId || i.id === k.toItemId))}`);
// AC4 : pas de commentaires ; AC5 : original inchange
const cmts = (await call(3, "GET", `/boards/${nid}/items/${cpA.id}/comments`)).body;
check("#1.4", Array.isArray(cmts) ? cmts.length === 0 : true, `commentaires de la copie : ${JSON.stringify(cmts)}`);
const after = await snap();
check("#1.5", after === before, `original inchange (items, connecteurs, membres, tableau) = ${after === before}`);
// AC6 : nom de 100 caracteres : coupe a 92, espaces de fin retires
const long = "a".repeat(91) + " " + "b".repeat(8); // 100 car., espace en 92e position
const lb = (await call(1, "POST", "/boards", { name: long })).body; const ld = await call(1, "POST", `/boards/${lb.id}/duplicate`);
check("#1.6", ld.status === 201 && ld.body.name === "a".repeat(91) + " (copie)" && ld.body.name.length <= 100, `nom de 100 -> « ${ld.body?.name} » (${ld.body?.name?.length}) ; espace en fin de coupe retire (pas de double espace)=${!/  /.test(ld.body?.name || "")}`);
const full = (await call(1, "POST", "/boards", { name: "c".repeat(100) })).body; const fd = await call(1, "POST", `/boards/${full.id}/duplicate`);
check("#1.6b", fd.body.name === "c".repeat(92) + " (copie)" && fd.body.name.length === 100, `nom de 100 sans espace -> ${fd.body.name.length} car. se terminant par « ${fd.body.name.slice(-9)} »`);
const sh = (await call(1, "POST", "/boards", { name: "court" })).body; const shd = await call(1, "POST", `/boards/${sh.id}/duplicate`);
check("#1.6c", shd.body.name === "court (copie)", `nom court -> ${shd.body.name}`);
// AC7 : tableau vide ; copie de copie
const ev = await call(1, "POST", `/boards/${sh.id}/duplicate`);
check("#1.7", ev.status === 201 && ev.body.itemCount === 0, `tableau vide -> ${ev.status} itemCount=${ev.body?.itemCount}`);
const dd = await call(3, "POST", `/boards/${nid}/duplicate`);
check("#1.7b", dd.status === 201 && dd.body.name === `N10-${STAMP} (copie) (copie)`, `copie de copie -> ${dd.body?.name}`);
// AC8-10 : droits
const nm = await call(3, "POST", "/boards/2/duplicate"); const un = await call(1, "POST", "/boards/999999/duplicate"); const ni = await call(null, "POST", `/boards/${src.id}/duplicate`);
check("#1.8-10", nm.status === 403 && un.status === 404 && ni.status === 401, `non-membre ${nm.status} ; inconnu ${un.status} ; sans identite ${ni.status}`);
const nmList = (await call(3, "GET", "/boards")).body.filter((b) => b.name.startsWith("Retrospective"));
check("#1.8b", true, `rien cree par le refus (liste de Carol : ${(await call(3, "GET", "/boards")).body.length} tableaux)`);
// Editeur Bob duplique : proprietaire = Bob
const bd = await call(2, "POST", `/boards/${src.id}/duplicate`);
check("#1.9", bd.status === 201 && bd.body.ownerId === 2, `editeur -> ${bd.status} ownerId=${bd.body?.ownerId}`);
writeFileSync(E + `results-N10-${RUN}.json`, JSON.stringify(results, null, 1));
console.log(`${results.filter((r) => r.ok).length}/${results.length}`);
