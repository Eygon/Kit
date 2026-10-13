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

// Oracle « debordement » : un texte qui sort de sa boite (carte, bouton, liste) ou une boite qui sort de l ecran.
// Banc N3 : un nom de 105 caracteres sans espace sortait de sa carte, passait sur les cartes voisines et ecrasait le
// bouton crayon a 0 px ; ni les tests unitaires (jsdom ne calcule aucune geometrie) ni les oracles 5xx / console / contraste ne le voient.
// Rend les boites (bordure ou fond) dont un texte depasse de plus de `tolerance` px, et les textes hors viewport.
// `expected` : regex sur le texte tolere (defaut connu de la base).
export async function overflowing(page, { tolerance = 2, limit = 20, expected = [] } = {}) {
  const found = await page.evaluate((tol) => {
    const out = [];
    const vw = document.documentElement.clientWidth;
    const hasBox = (el) => { const s = getComputedStyle(el); return parseFloat(s.borderTopWidth) > 0 || parseFloat(s.borderLeftWidth) > 0 || !/^rgba\(0, 0, 0, 0\)$|^transparent$/.test(s.backgroundColor); };
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const t = n.textContent.trim(); const el = n.parentElement;
      if (!t || !el || el.closest(".sr-only,[aria-hidden=true]")) continue;
      const range = document.createRange(); range.selectNodeContents(n);
      const tr = range.getBoundingClientRect();
      if (!tr.width || !tr.height) continue;
      if (tr.right > vw + tol) out.push({ text: t.slice(0, 40), kind: "hors ecran", by: Math.round(tr.right - vw) });
      for (let b = el; b && b !== document.body; b = b.parentElement) {
        if (!hasBox(b)) continue;
        const br = b.getBoundingClientRect();
        if (!br.width) continue;
        if (tr.right > br.right + tol || tr.left < br.left - tol) { out.push({ text: t.slice(0, 40), kind: "sort de sa boite", by: Math.round(Math.max(tr.right - br.right, br.left - tr.left)) }); }
        break;
      }
    }
    return out;
  }, tolerance);
  return found.filter((f) => !expected.some((rx) => rx.test(f.text))).slice(0, limit);
}

// Atteignabilite : un bouton, lien ou champ qui est HORS de l ecran sans qu aucun ancetre ne puisse defiler
// jusqu a lui (ni la page : un ancetre `position: fixed` ne defile pas avec elle) est inatteignable pour
// l utilisateur. Banc N17 : un panneau lateral (tiroir de la lib, fixe, overflow visible) de 20 entrees
// poussait « Voir plus » a 1858 px sur un ecran de 900 : ni test, ni revue, ni loupe ne le voient.
// Appelle-le avec le panneau ouvert et ses donnees maximales chargees.
export async function unreachable(page, { limit = 20, expected = [] } = {}) {
  const found = await page.evaluate(() => {
    const out = [];
    const vh = window.innerHeight, vw = document.documentElement.clientWidth;
    const canScroll = (el) => { const s = getComputedStyle(el); return /(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1; };
    for (const el of document.querySelectorAll("button, a[href], input, select, textarea, [role=button]")) {
      const s = getComputedStyle(el);
      if (s.visibility === "hidden" || s.display === "none" || el.disabled) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (r.top >= 0 && r.bottom <= vh + 1 && r.left >= 0 && r.right <= vw + 1) continue;
      let reachable = false, fixed = false;
      for (let a = el.parentElement; a; a = a.parentElement) {
        if (getComputedStyle(a).position === "fixed") fixed = true;
        if (canScroll(a) && a !== document.documentElement && a !== document.body) { reachable = true; break; }
      }
      if (!reachable && !fixed && document.documentElement.scrollHeight > vh) reachable = true;
      if (!reachable) out.push({ text: (el.innerText || el.getAttribute("aria-label") || el.placeholder || el.tagName).trim().slice(0, 40), top: Math.round(r.top), bottom: Math.round(r.bottom), vh });
    }
    return out;
  });
  return found.filter((f) => !expected.some((rx) => rx.test(f.text))).slice(0, limit);
}
