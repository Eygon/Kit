// E2E F11 verrou d item. Back :5080 (miro/back dev) et front :5173 (runs/m11/slot) lances, base fraiche.
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { watch } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const E = new URL(".", import.meta.url).pathname;
const TW = readFileSync(E + "tw.css", "utf8");
const API = "http://localhost:5080/api/v1";
const results = [];
const check = (id, ok, detail) => { results.push({ id, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${detail}`); };
const api = async (m, p, body, user = "1") => { const r = await fetch(API + p, { method: m, headers: { "X-User-Id": user, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch {} return { s: r.status, j }; };
const browser = await chromium.launch();
async function newPage(userId) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (userId !== "1") await ctx.route("**/src/config/apiConfig.ts*", async (route) => { const res = await route.fetch(); await route.fulfill({ response: res, body: (await res.text()).replace(/CURRENT_USER_ID = "1"/, `CURRENT_USER_ID = "${userId}"`) }); });
  await ctx.addInitScript((css) => { document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); }); }, TW);
  await ctx.addInitScript(() => { window.__toasts = []; window.addEventListener("septeo-toast", (e) => window.__toasts.push(e.detail)); });
  const page = await ctx.newPage();
  page._w = watch(page, { api: "http://localhost:5080", expectedConsole: [/negotiation/, /status of 409/] });
  page._net = [];
  page.on("request", (r) => { if (r.url().includes(":5080") && r.method() !== "GET" && r.method() !== "OPTIONS") page._net.push(r.method() + " " + r.url().replace(/.*:5080/, "")); });
  await page.goto("http://localhost:5173/");
  await page.getByText("Sprint planning").first().click();
  await page.locator('[data-testid^="canvas-item-"]').first().waitFor({ timeout: 8000 });
  await page.waitForTimeout(1500);
  return page;
}
const A = await newPage("1");
const C = await newPage("3");
const item = A.locator('[data-testid="canvas-item-1"]');
await item.click();
await A.getByRole("button", { name: "Verrouiller" }).click();
await A.waitForTimeout(800);
const locked = (await api("GET", "/boards/1/items")).j.find((i) => i.id === 1);
check("L1", locked?.isLocked === true && (await item.getByText("Élément verrouillé").count()) === 1, `verrouiller par l UI : isLocked=${locked?.isLocked}, icone sur l item`);
const live = await C.locator('[data-testid="canvas-item-1"]').getByText("Élément verrouillé").waitFor({ timeout: 5000 }).then(() => true).catch(() => false);
check("L2", live, "Carol voit le cadenas en direct (synchro F8)");
check("L3", (await C.getByRole("button", { name: "Verrouiller" }).count()) === 0 && (await C.getByRole("button", { name: "Déverrouiller" }).count()) === 0, "la lectrice n a pas le bouton");
// Glisser un item verrouille : rien ne bouge, aucun PATCH.
const b0 = await item.boundingBox(); const n0 = A._net.length;
await A.mouse.move(b0.x + b0.width / 2, b0.y + b0.height / 2); await A.mouse.down(); await A.mouse.move(b0.x + b0.width / 2 + 120, b0.y + b0.height / 2 + 60, { steps: 8 }); await A.mouse.up();
await A.waitForTimeout(800);
const b1 = await item.boundingBox();
check("L4", Math.abs(b1.x - b0.x) < 2 && A._net.slice(n0).every((r) => !r.startsWith("PATCH")), `glisser : deplacement ${Math.round(b1.x - b0.x)} px, requetes ${JSON.stringify(A._net.slice(n0))}`);
// API (Bob, editeur) : modifications refusees 409, connecteur et commentaire permis.
const mv = await api("PATCH", "/boards/1/items/1", { x: 999 }, "2");
const del = await api("DELETE", "/boards/1/items/1", null, "2");
const cn = await api("POST", "/boards/1/connectors", { fromItemId: 1, toItemId: 2, style: "Arrow" }, "2");
const cm = await api("POST", "/boards/1/items/1/comments", { body: "sur un item verrouille" }, "2");
check("L5", mv.s === 409 && del.s === 409 && cn.s === 201 && cm.s === 201, `Bob : PATCH ${mv.s}, DELETE ${del.s}, connecteur ${cn.s}, commentaire ${cm.s}`);
// Export / import (F9) : le verrou suit.
const exp = await api("GET", "/boards/1/export");
const ex1 = exp.j?.items?.find((i) => i.isLocked === true);
const imp = await api("POST", "/boards/import", exp.j);
const nb = imp.j?.id ? (await api("GET", `/boards/${imp.j.id}/items`)).j : [];
check("L6", !!ex1 && nb.filter((i) => i.isLocked).length === 1, `export isLocked=${!!ex1}, import ${imp.s} avec ${nb.filter((i) => i.isLocked).length} item verrouille`);
// Annuler (F3) : le verrouillage est annulable.
await A.getByRole("button", { name: "Annuler" }).first().click();
await A.waitForTimeout(800);
const after = (await api("GET", "/boards/1/items")).j.find((i) => i.id === 1);
check("L7", after?.isLocked === false && (await item.getByText("Élément verrouillé").count()) === 0, `annuler deverrouille : isLocked=${after?.isLocked}`);
const ta = A._w.take(); const tc = C._w.take();
check("G1", ta.fiveXX.length + tc.fiveXX.length === 0 && ta.console.length + tc.console.length === 0, `5xx ${ta.fiveXX.length + tc.fiveXX.length}, console ${JSON.stringify([...ta.console, ...tc.console].slice(0, 3))}`);
writeFileSync(E + "results.json", JSON.stringify(results, null, 2));
await browser.close();
