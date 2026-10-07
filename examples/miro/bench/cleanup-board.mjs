// Banc : remet le tableau 1 a ses elements d origine (ids <= 4) et sans connecteur cree par un E2E.
const API = "http://localhost:5080/api/v1/boards/1";
const h = { "X-User-Id": "1", "Content-Type": "application/json" };
const keep = Number(process.argv[2] || 4);
const list = async (u) => { const t = await (await fetch(API + u, { headers: h })).text(); return t ? JSON.parse(t) : []; };
for (const c of await list("/connectors")) await fetch(`${API}/connectors/${c.id}`, { method: "DELETE", headers: h });
for (const i of await list("/items")) if (i.id > keep) {
  if (i.isLocked) await fetch(`${API}/items/${i.id}`, { method: "PATCH", headers: h, body: JSON.stringify({ isLocked: false }) });
  await fetch(`${API}/items/${i.id}`, { method: "DELETE", headers: h });
}
console.log((await (await fetch(API + "/items", { headers: h })).json()).map((i) => i.id).join(","));
