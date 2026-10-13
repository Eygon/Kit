// Verification contre l API REELLE pour N14 « Archiver un tableau » (back, 4 US) : archivage, lecture seule, ordre des controles, liste filtree. Back :5080.
// Usage : node e2e-N14-run.mjs <run>   -> results-N14-<run>.json
import { writeFileSync } from "node:fs";
const E = new URL(".", import.meta.url).pathname; const RUN = process.argv[2] || "1";
const API = "http://localhost:5080/api/v1";
const call = async (u, m, p, b) => { const r = await fetch(API + p, { method: m, headers: { ...(u ? { "X-User-Id": String(u) } : {}), ...(b ? { "Content-Type": "application/json" } : {}) }, body: b && JSON.stringify(b) }); const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch { j = t; } return { status: r.status, body: j, text: t }; };
const results = []; const check = (id, ok, d) => { results.push({ id, ok: !!ok, detail: d }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${d}`); };
const STAMP = String(Date.now()).slice(-6) + RUN;
const mkBoard = async (name) => { const b = (await call(1, "POST", "/boards", { name })).body; await call(1, "POST", `/boards/${b.id}/members`, { userId: 2, role: "Editor" }); await call(1, "POST", `/boards/${b.id}/members`, { userId: 3, role: "Viewer" }); return b; };
const B = await mkBoard(`N14-${STAMP}`); const id = B.id;
const it = (await call(1, "POST", `/boards/${id}/items`, { type: "StickyNote", x: 1, y: 1, width: 100, height: 60, content: "a", color: "#fff" })).body;
const it2 = (await call(1, "POST", `/boards/${id}/items`, { type: "StickyNote", x: 200, y: 1, width: 100, height: 60, content: "b", color: "#fff" })).body;
const cn = (await call(1, "POST", `/boards/${id}/connectors`, { fromItemId: it.id, toItemId: it2.id, style: "Arrow" })).body;
const cm = (await call(1, "POST", `/boards/${id}/items/${it.id}/comments`, { body: "c1" })).body;
const snapRead = async () => JSON.stringify([(await call(1, "GET", `/boards/${id}/items`)).body, (await call(1, "GET", `/boards/${id}/connectors`)).body, (await call(1, "GET", `/boards/${id}/members`)).body]);
// US1
const a1 = await call(1, "POST", `/boards/${id}/archive`); const a2 = await call(1, "POST", `/boards/${id}/archive`);
check("US1.archive+idempotent", a1.status === 204 && a2.status === 204 && a1.text === "", `proprietaire : ${a1.status} puis ${a2.status}`);
const r403 = [await call(2, "POST", `/boards/${id}/archive`), await call(3, "POST", `/boards/${id}/archive`), await call(2, "DELETE", `/boards/${id}/archive`)].map((r) => r.status);
const other = (await call(3, "POST", "/boards/2/archive")).status; const unk = (await call(1, "POST", "/boards/999999/archive")).status; const noid = (await call(null, "POST", `/boards/${id}/archive`)).status;
check("US1.droits", r403.every((s) => s === 403) && other === 403 && unk === 404 && noid === 401, `editeur/lecteur/editeur-desarchive ${r403} ; non-membre ${other} ; inconnu ${unk} ; sans identite ${noid}`);
// US2 : elements et connecteurs figes
const m = (r) => r.status === 409 && r.body?.message === "Board is archived";
const rI = [await call(1, "POST", `/boards/${id}/items`, { type: "StickyNote", x: 1, y: 1, width: 10, height: 10, content: "z", color: "#fff" }), await call(1, "PATCH", `/boards/${id}/items/${it.id}`, { x: 5 }), await call(1, "PATCH", `/boards/${id}/items/${it.id}`, { isLocked: true }), await call(1, "DELETE", `/boards/${id}/items/${it.id}`)];
check("US2.elements", rI.every(m), `creer/modifier/verrouiller/supprimer : ${rI.map((r) => r.status)} ; message=${rI[0].body?.message}`);
const rC = [await call(1, "POST", `/boards/${id}/connectors`, { fromItemId: it.id, toItemId: it2.id, style: "Line" }), await call(1, "PATCH", `/boards/${id}/connectors/${cn.id}`, { style: "Line" }), await call(1, "DELETE", `/boards/${id}/connectors/${cn.id}`)];
check("US2.connecteurs", rC.every(m), `creer/modifier/supprimer : ${rC.map((r) => r.status)}`);
// US3 : commentaires et membres figes ; ordre des controles
const rK = [await call(1, "POST", `/boards/${id}/items/${it.id}/comments`, { body: "x" }), await call(1, "PATCH", `/boards/${id}/items/${it.id}/comments/${cm.id}`, { isResolved: true }), await call(1, "DELETE", `/boards/${id}/items/${it.id}/comments/${cm.id}`), await call(3, "POST", `/boards/${id}/items/${it.id}/comments`, { body: "lecteur" })];
check("US3.commentaires", rK.every(m), `creer/resoudre/supprimer/lecteur : ${rK.map((r) => r.status)}`);
const rM = [await call(1, "POST", `/boards/${id}/members`, { userId: 2, role: "Viewer" }), await call(1, "PATCH", `/boards/${id}/members/2`, { role: "Viewer" }), await call(1, "DELETE", `/boards/${id}/members/3`)];
check("US3.membres", rM.every(m), `ajouter/changer role/retirer : ${rM.map((r) => r.status)}`);
const ord = [await call(3, "POST", `/boards/${id}/items`, { type: "StickyNote", x: 1, y: 1, width: 10, height: 10, content: "z", color: "#fff" }), await call(2, "POST", `/boards/${id}/members`, { userId: 3, role: "Viewer" }), await call(3, "PATCH", `/boards/${id}/items/${it.id}`, { x: 1 })];
check("US3.ordre-controles", ord.every((r) => r.status === 403), `lecteur cree un element ${ord[0].status}, editeur ajoute un membre ${ord[1].status}, lecteur modifie ${ord[2].status} (403 avant 409)`);
const later = ((await call(1, "POST", "/boards/999999/items", { type: "StickyNote", x: 1, y: 1, width: 10, height: 10, content: "z", color: "#fff" })).status);
check("US3.404-avant", later === 404, `tableau inexistant -> ${later}`);
// lecture seule : tout se lit, rien n a bouge
const reads = [await call(1, "GET", `/boards/${id}`), await call(3, "GET", `/boards/${id}/items`), await call(2, "GET", `/boards/${id}/connectors`), await call(1, "GET", `/boards/${id}/items/${it.id}/comments`), await call(1, "GET", `/boards/${id}/members`)].map((r) => r.status);
check("US2.lecture-ok", reads.every((s) => s === 200), `lectures : ${reads}`);
// US4 : liste
const ls = (await call(1, "GET", "/boards")).body; const lsA = await call(1, "GET", "/boards?archived=true"); const lsF = (await call(1, "GET", "/boards?archived=false")).body;
check("US4.liste", !ls.some((b) => b.id === id) && ls.every((b) => b.isArchived === false) && lsA.body.some((b) => b.id === id && b.isArchived === true) && lsA.body.every((b) => b.isArchived === true) && JSON.stringify(lsF) === JSON.stringify(ls), `defaut : ${ls.length} tableaux sans l archive ; archived=true : ${lsA.body.length} (tous isArchived) ; archived=false = defaut`);
const bob = (await call(2, "GET", "/boards?archived=true")).body; const bad = await call(1, "GET", "/boards?archived=peutetre");
check("US4.membres-et-400", bob.some((b) => b.id === id) && bad.status === 400, `l editeur voit l archive (${bob.some((b) => b.id === id)}) ; valeur non booleenne -> ${bad.status}`);
const one = (await call(1, "GET", `/boards/${id}`)).body; const created = (await call(1, "POST", "/boards", { name: `N14c-${STAMP}` })).body;
check("US4.isArchived", one.isArchived === true && created.isArchived === false, `GET /boards/{id} isArchived=${one.isArchived} ; creation isArchived=${created.isArchived}`);
// desarchivage : tout redevient possible, lecture inchangee
const before = await snapRead();
const d1 = await call(1, "DELETE", `/boards/${id}/archive`); const d2 = await call(1, "DELETE", `/boards/${id}/archive`);
const back = await call(1, "POST", `/boards/${id}/items`, { type: "StickyNote", x: 9, y: 9, width: 10, height: 10, content: "apres", color: "#fff" });
const inList = (await call(1, "GET", "/boards")).body.some((b) => b.id === id);
check("US1.desarchiver", d1.status === 204 && d2.status === 204 && back.status === 201 && inList, `desarchive ${d1.status}/${d2.status} ; creation d element ${back.status} ; de retour dans la liste=${inList}`);
check("US2.rien-bouge", before.includes(`"content":"a"`) && !before.includes("apres"), "aucune ecriture pendant l archivage (elements, connecteurs, membres relus)");
writeFileSync(E + `results-N14-${RUN}.json`, JSON.stringify(results, null, 1));
console.log(`${results.filter((r) => r.ok).length}/${results.length}`);
