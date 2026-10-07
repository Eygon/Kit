// E2E F12 aide des raccourcis. Back :5080 et front :5173 (runs/m12/slot) lances.
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { readFileSync, writeFileSync } from "node:fs";
import { watch } from "/home/user/Kit/skills/_shared/e2e-oracles.mjs";
const E = new URL(".", import.meta.url).pathname;
const TW = readFileSync(E + "tw.css", "utf8");
const results = [];
const check = (id, ok, detail) => { results.push({ id, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"} ${id} ${detail}`); };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript((css) => { document.addEventListener("DOMContentLoaded", () => { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); }); }, TW);
const page = await ctx.newPage();
const w = watch(page, { api: "http://localhost:5080", expectedConsole: [/negotiation/] });
await page.goto("http://localhost:5173/");
await page.getByText("Sprint planning").first().click();
await page.locator('[data-testid^="canvas-item-"]').first().waitFor({ timeout: 8000 });
await page.waitForTimeout(1200);
const dialog = page.getByRole("dialog", { name: "Raccourcis clavier" });
await page.keyboard.press("Shift+Slash"); // « ? » sur clavier US
let open = await dialog.waitFor({ timeout: 3000 }).then(() => true).catch(() => false);
if (!open) { await page.keyboard.type("?"); open = await dialog.waitFor({ timeout: 3000 }).then(() => true).catch(() => false); }
const text = open ? await dialog.innerText() : "";
check("H1", open && /Annuler/.test(text) && /Rétablir/.test(text) && /Supprimer/.test(text), `touche ? ouvre l aide : ${JSON.stringify(text.slice(0, 160))}`);
check("H2", open && !/Dupliquer/.test(text) && !/Ctrl\s*\+?\s*D\b/.test(text) && !/Zoom avant/.test(text), "ni Dupliquer ni raccourcis de zoom (inexistants dans l app)");
check("H3", open && /Ctrl/.test(text) && /Maj/.test(text) && /Suppr/.test(text), "noms de touches francais (Ctrl, Maj, Suppr)");
await page.keyboard.press("Escape");
const closedEsc = await dialog.waitFor({ state: "detached", timeout: 3000 }).then(() => true).catch(() => false);
check("H4", closedEsc, "Echap ferme");
await page.getByRole("button", { name: "Afficher les raccourcis clavier" }).click();
const openBtn = await dialog.waitFor({ timeout: 3000 }).then(() => true).catch(() => false);
await page.mouse.click(30, 870);
const closedOut = await dialog.waitFor({ state: "detached", timeout: 3000 }).then(() => true).catch(() => false);
check("H5", openBtn && closedOut, `bouton ouvre (${openBtn}), clic hors fenetre ferme (${closedOut})`);
// « ? » tape dans un champ de saisie : pas d aide.
await page.locator('[data-testid="canvas-item-1"]').click();
const commentsBtn = page.getByRole("button", { name: /Commentaires/ }).first();
let typed = false;
if (await commentsBtn.count()) { await commentsBtn.click(); const ta = page.locator("textarea").first(); if (await ta.count()) { await ta.click(); await page.keyboard.type("Pourquoi ?"); typed = true; } }
await page.waitForTimeout(500);
check("H6", typed && (await dialog.count()) === 0, `? tape dans un champ (${typed ? "zone de commentaire" : "champ introuvable"}) : aide ouverte = ${(await dialog.count()) > 0}`);
const t = w.take();
check("G1", t.fiveXX.length === 0 && t.console.length === 0, `5xx ${t.fiveXX.length}, console ${JSON.stringify(t.console.slice(0, 3))}`);
writeFileSync(E + "results.json", JSON.stringify(results, null, 2));
await browser.close();
