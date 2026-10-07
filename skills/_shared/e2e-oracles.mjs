// Oracles transverses et verdict multi-runs d un passage E2E scripte (contrat sk-e2e.md).
// Banc Miro : chaque passage (5 cette nuit) reecrivait la capture des 5xx, le filtre de console et
// la regle « PASS seulement si PASS a chaque run ». Ce module les donne une fois.
//
//   import { watch, verdict } from "<SK_SHARED>/e2e-oracles.mjs";
//   const w = watch(page, { api: "http://localhost:5080", expectedConsole: [/negotiation/] });
//   ... scenario ...
//   const t = w.take();   // { fiveXX: [...], console: [...], net: [...] } depuis le dernier take()
//   check("#1.1", oracleOk && !t.fiveXX.length && !t.console.length, ...)
//
//   verdict([["PASS","PASS","FAIL"], ...]) -> ["FAIL", ...]

// Branche les ecouteurs sur une page Playwright. `expectedConsole` = la section « Console attendue »
// du cahier (bruit dev connu, erreurs provoquees par le scenario) ; tout le reste remonte.
export function watch(page, { api = "", expectedConsole = [] } = {}) {
  let buf = { fiveXX: [], console: [], net: [] };
  const fromApi = (url) => !api || url.startsWith(api);
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = m.text();
    if (!expectedConsole.some((rx) => rx.test(text))) buf.console.push(text);
  });
  page.on("pageerror", (e) => buf.console.push("pageerror: " + e.message));
  page.on("response", (r) => {
    if (!fromApi(r.url())) return;
    const x = { m: r.request().method(), u: r.url().slice(api.length), s: r.status() };
    buf.net.push(x);
    if (r.status() >= 500) buf.fiveXX.push(x);
  });
  page.on("requestfailed", (r) => {
    if (fromApi(r.url())) buf.net.push({ m: r.method(), u: r.url().slice(api.length), s: "FAILED " + (r.failure()?.errorText || "") });
  });
  return {
    take() {
      const out = buf;
      buf = { fiveXX: [], console: [], net: [] };
      return out;
    },
  };
}

// Verdict final par scenario a partir de ses verdicts par run (sk-e2e.md, Mode lot) :
// PASS seulement si PASS a chaque run ; un FAIL sur un run = FAIL (2 sur 3 n est pas un flake) ;
// sinon (BLOQUE ou run manquant) = BLOQUE.
export function verdict(rows, runs = Math.max(0, ...rows.map((r) => r.length))) {
  return rows.map((v) => (v.length === runs && v.every((x) => x === "PASS") ? "PASS" : v.includes("FAIL") ? "FAIL" : "BLOQUE"));
}

// Contraste WCAG (texte normal >= 4.5, grand texte >= 3) entre deux couleurs CSS calculees.
export function luminance(rgb) {
  const [r, g, b] = (String(rgb).match(/[\d.]+/g) || []).slice(0, 3).map(Number)
    .map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

// Oracle transverse « texte lisible » : chaque texte visible de l ecran contre son fond effectif
// (premier ancetre au fond opaque). Banc TK-3 (mode sombre) : 11/11 scenarios PASS, mais le texte
// des post-it etait clair sur jaune (1,02:1) — vu seulement a la capture. A jouer sur chaque ecran
// d une feature qui touche couleurs, theme ou jetons. Rend les textes sous le seuil.
// `expected` = la section « ## Contraste attendu » du cahier : textes dont la spec ACCEPTE la couleur
// (couleur de contenu choisie par l utilisateur, gardee telle quelle) — comme « Console attendue ».
//   const bad = await unreadable(page, { expected: [/Texte rouge/] });   // [{ text, color, bg, ratio }]
export async function unreadable(page, { min = 4.5, minLarge = 3, limit = 20, expected = [] } = {}) {
  const found = await page.evaluate(() => {
    const out = [];
    const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = getComputedStyle(e).backgroundColor; if (c && !/^rgba\(0, 0, 0, 0\)$|^transparent$/.test(c)) return c; } return "rgb(255, 255, 255)"; };
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const t = n.textContent.trim(); const el = n.parentElement;
      if (!t || !el) continue;
      const s = getComputedStyle(el); const r = el.getBoundingClientRect();
      if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) === 0 || !r.width || !r.height || el.closest(".sr-only,[aria-hidden=true]")) continue;
      out.push({ text: t.slice(0, 40), color: s.color, bg: bgOf(el), size: parseFloat(s.fontSize), bold: Number(s.fontWeight) >= 700 });
    }
    return out;
  });
  return found.map((f) => ({ ...f, ratio: Number(contrast(f.color, f.bg).toFixed(2)) }))
    .filter((f) => f.ratio < (f.size >= 24 || (f.bold && f.size >= 18.66) ? minLarge : min))
    .filter((f) => !expected.some((rx) => rx.test(f.text))).slice(0, limit);
}
