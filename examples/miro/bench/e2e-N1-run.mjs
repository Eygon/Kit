// Verification contre l API REELLE pour N1 « Supprimer un tableau » (US back, pas d ecran) :
// scenarios tires des Acceptance Scenarios de spec.md (AC1 a AC8) + edge cases. Back :5080.
// Usage : node e2e-N1-run.mjs <run>   -> results-N1-<run>.json
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire("/tmp/claude-0/-home-user-Kit/6d0ce183-8a0e-5e9b-8ccd-4301258ef079/scratchpad/nbench/front/package.json");
const signalR = require("@microsoft/signalr");
const E = new URL(".", import.meta.url).pathname;
const RUN = process.argv[2] || "1";
const API = "http://localhost:5080/api/v1";
const call = async (user, method, path, body, headers = {}) => {
  const r = await fetch(API + path, { method, headers: { ...(user ? { "X-User-Id": String(user) } : {}), ...(body ? { "Content-Type": "application/json" } : {}), ...headers }, body: body && JSON.stringify(body) });
  const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch { j = t; }
  return { status: r.status, body: j, text: t };
};
const results = [];
const check = (id, ok, detail) => { results.push({ id, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${detail}`); };
const names = async (u) => (await call(u, "GET", "/boards")).body.map((b) => b.name);

async function fullBoard(tag) {
  const b = (await call(1, "POST", "/boards", { name: `N1-${tag}-${Date.now()}` })).body;
  await call(1, "POST", `/boards/${b.id}/members`, { userId: 2, role: "Editor" });
  await call(1, "POST", `/boards/${b.id}/members`, { userId: 3, role: "Viewer" });
  const i1 = (await call(1, "POST", `/boards/${b.id}/items`, { type: "StickyNote", x: 10, y: 10, width: 100, height: 80, content: "a", color: "#fde68a" })).body;
  const i2 = (await call(1, "POST", `/boards/${b.id}/items`, { type: "Text", x: 200, y: 10, width: 100, height: 40, content: "b", color: "#111827" })).body;
  const c = await call(1, "POST", `/boards/${b.id}/connectors`, { fromItemId: i1.id, toItemId: i2.id, style: "Arrow" });
  const cm = await call(1, "POST", `/boards/${b.id}/items/${i1.id}/comments`, { body: "hello" });
  return { b, i1, i2, c, cm };
}

const neighbours = async () => ({ b1: (await call(1, "GET", "/boards/1/items")).body?.length, b2: (await call(2, "GET", "/boards/2/items")).body?.length });
const before = await neighbours();

// AC1 + AC2 + AC8 : proprietaire, contenu complet dont un element verrouille
const f = await fullBoard("own");
await call(1, "PATCH", `/boards/${f.b.id}/items/${f.i2.id}`, { isLocked: true });
const created = [f.c.status, f.cm.status];
const lockedNow = (await call(1, "GET", `/boards/${f.b.id}/items`)).body.find((x) => x.id === f.i2.id)?.isLocked;
const del = await call(1, "DELETE", `/boards/${f.b.id}`);
const list = await names(1);
const read = await call(1, "GET", `/boards/${f.b.id}`);
const items = await call(1, "GET", `/boards/${f.b.id}/items`);
check("#1.1", del.status === 204 && del.text === "" && !list.includes(f.b.name) && read.status === 204 && items.status === 404, `204 sans corps=${del.status === 204 && del.text === ""} ; liste sans le tableau=${!list.includes(f.b.name)} ; GET board=${read.status} ; GET items=${items.status} (contenu cree : connecteur ${created[0]}, commentaire ${created[1]})`);
const after = await neighbours();
check("#1.2", JSON.stringify(after) === JSON.stringify(before), `tableaux voisins : items avant ${JSON.stringify(before)} apres ${JSON.stringify(after)} ; membres de 1 : ${(await call(1, "GET", "/boards/1/members")).body.length}`);
check("#1.8", del.status === 204 && lockedNow === true && created.every((s) => s === 201 || s === 200), `element verrouille avant=${lockedNow}, connecteur/commentaire crees=${created} ; suppression du tableau : ${del.status}`);
// edge : seconde suppression
const del2 = await call(1, "DELETE", `/boards/${f.b.id}`);
check("#L.deja-supprime", del2.status === 404, `seconde suppression -> ${del2.status} ${del2.text.slice(0, 80)}`);

// AC3 : Editor et Viewer
const g = await fullBoard("role");
const dEd = await call(2, "DELETE", `/boards/${g.b.id}`), dVi = await call(3, "DELETE", `/boards/${g.b.id}`);
const still = (await call(1, "GET", `/boards/${g.b.id}`)).body;
check("#1.3", dEd.status === 403 && dVi.status === 403 && /message/i.test(dEd.text) && still?.id === g.b.id, `Editor=${dEd.status} Viewer=${dVi.status} corps=${dEd.text.slice(0, 80)} ; tableau intact=${still?.id === g.b.id}`);
// AC4 : non membre (utilisateur 3 sur le tableau 2 : Retrospective n a que 1 et 2)
const nm = await call(3, "DELETE", "/boards/2");
check("#1.4", nm.status === 403 && (await names(2)).includes("Retrospective"), `non-membre -> ${nm.status}, Retrospective intact`);
// AC5 : inexistant
const un = await call(1, "DELETE", "/boards/999999");
check("#1.5", un.status === 404 && /message/i.test(un.text), `inexistant -> ${un.status} ${un.text.slice(0, 80)}`);
// AC6 : sans identite
const noId = await call(null, "DELETE", `/boards/${g.b.id}`);
const stillG = (await call(1, "GET", `/boards/${g.b.id}`)).body;
check("#1.6", noId.status === 401 && noId.text.length > 0 && stillG?.id === g.b.id, `sans en-tete -> ${noId.status} ${JSON.stringify(noId.text.slice(0, 80))} ; rien supprime=${stillG?.id === g.b.id}`);

// AC7 : BoardChanged diffuse au groupe, avec l identifiant de connexion de l auteur
const h = await fullBoard("rt");
const conn = new signalR.HubConnectionBuilder().withUrl(`http://localhost:5080/hubs/board?userId=2`, { withCredentials: false }).build();
const got = []; conn.on("BoardChanged", (...a) => got.push(a));
await conn.start(); await conn.invoke("JoinBoard", h.b.id);
const d7 = await call(1, "DELETE", `/boards/${h.b.id}`, undefined, { "X-Connection-Id": "author-conn-1" });
await new Promise((r) => setTimeout(r, 800));
check("#1.7", d7.status === 204 && got.length >= 1, `suppression ${d7.status} ; evenements BoardChanged recus par le client joint : ${JSON.stringify(got).slice(0, 160)}`);
const reread = await call(2, "GET", `/boards/${h.b.id}`);
check("#L.relecture", [204, 404].includes(reread.status), `relecture apres l evenement -> ${reread.status}`);
await conn.stop();
// edge : tableau degenere
const z = (await call(1, "POST", "/boards", { name: "N1-vide-" + Date.now() })).body;
const dz = await call(1, "DELETE", `/boards/${z.id}`);
check("#L.degenere", dz.status === 204 && !(await names(1)).includes(z.name), `tableau sans element -> ${dz.status}`);
// nettoyage : les tableaux de test non supprimes
for (const id of [g.b.id]) await call(1, "DELETE", `/boards/${id}`);
writeFileSync(E + `results-N1-${RUN}.json`, JSON.stringify(results, null, 1));
