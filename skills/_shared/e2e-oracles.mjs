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
      // Texte volontairement coupe (`truncate`, `overflow: hidden` / `clip` sur un ancetre qui le borne) : pas un debordement
      // visible. Banc N22 : une description de 200 caracteres tronquee avec points de suspension sortait en « hors ecran ».
      const clippedByAncestor = () => { for (let a = el; a && a !== document.body; a = a.parentElement) { const cs = getComputedStyle(a); if (/^(hidden|clip)$/.test(cs.overflowX)) { const ar = a.getBoundingClientRect(); if (ar.right <= vw + tol && ar.width) return true; } } return false; };
      if (tr.right > vw + tol && !clippedByAncestor()) out.push({ text: t.slice(0, 40), kind: "hors ecran", by: Math.round(tr.right - vw) });
      for (let b = el; b && b !== document.body; b = b.parentElement) {
        if (!hasBox(b)) continue;
        const br = b.getBoundingClientRect();
        if (!br.width) continue;
        if ((tr.right > br.right + tol || tr.left < br.left - tol) && !clippedByAncestor()) { out.push({ text: t.slice(0, 40), kind: "sort de sa boite", by: Math.round(Math.max(tr.right - br.right, br.left - tr.left)) }); }
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
      if (r.width <= 2 && r.height <= 2) continue; // texte masque visuellement (sr-only, bouton « Rejeter » des tiroirs de la lib) : pas une cible
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

// clippedOut(page, selector) : elements dont le rectangle sort du conteneur qui les COUPE (un ancetre en
// overflow hidden/auto/scroll). Un badge, une infobulle ou une pastille posee AU-DESSUS ou A COTE d un element
// (translateY(-100%), left: 100%) disparait quand l element est au bord de la zone visible : invisible, sans erreur.
// Banc N18 : le badge « Alice edite… » d un element a y=0 etait 18 px au-dessus du conteneur coupant (y=63-81 pour un
// conteneur a 81) : jamais affiche, ni tests (jsdom), ni revues, ni loupe ne le voient. Appelle-le avec le cas limite
// (element colle au bord haut, bas, gauche, droit de la zone visible) et le badge affiche.
export async function clippedOut(page, selector, { tolerance = 0.5, limit = 20 } = {}) {
  return page.evaluate(({ selector, tolerance, limit }) => {
    const out = [];
    for (const el of document.querySelectorAll(selector)) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const s = getComputedStyle(a);
        if (s.overflow === "visible" && s.overflowX === "visible" && s.overflowY === "visible") continue;
        const c = a.getBoundingClientRect();
        if (r.top < c.top - tolerance || r.bottom > c.bottom + tolerance || r.left < c.left - tolerance || r.right > c.right + tolerance) {
          out.push({ text: (el.innerText || el.getAttribute("data-testid") || el.tagName).trim().slice(0, 40), rect: [r.left, r.top, r.right, r.bottom].map(Math.round), clipper: [c.left, c.top, c.right, c.bottom].map(Math.round) });
          break;
        }
      }
    }
    return out.slice(0, limit);
  }, { selector, tolerance, limit });
}

// sizeStable(page, selector, act, { tolerance }) : la boite de `selector` ne doit pas changer de taille quand `act` ajoute
// un etat (compteur, badge, message). Une barre de largeur fixe qui grandit au moment ou un texte y apparait decale tout
// ce qui l entoure a chaque selection. Banc N21 : le compteur « 12 elements selectionnes » faisait passer la barre
// d outils de 50 a 82 px (+64 %) a chaque selection ; ni jsdom ni les revues ne mesurent une largeur.
// Rend { before, after, grew } ; grew vrai si la largeur ou la hauteur depasse la tolerance (px).
export async function sizeStable(page, selector, act, { tolerance = 2 } = {}) {
  const box = async () => page.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; }, selector);
  const before = await box();
  await act();
  await page.waitForTimeout(250);
  const after = await box();
  const grew = !!before && !!after && (Math.abs(after.w - before.w) > tolerance || Math.abs(after.h - before.h) > tolerance);
  return { before, after, grew };
}

// covered(page, { within }) : controles (bouton, lien, champ) dont le CENTRE est recouvert par un autre element (la barre d outils
// qui passe sur le bouton de zoom de la carte, un en-tete collant, un badge). `unreachable` ne voit que le hors-ecran : un controle
// visible mais recouvert ne se touche pas. Banc Mousse F3 : les boutons + / - de Leaflet etaient sous la barre « Lieux / Filtres » ;
// banc Miro N20 : tiroir d edition recouvert par la barre. Appelle-le sans panneau modal ouvert (le fond d un dialogue est recouvert
// par definition), ou limite-le avec `within` (selecteur du panneau).
export async function covered(page, { within = "body", limit = 20, expected = [] } = {}) {
  const found = await page.evaluate(({ within }) => {
    const out = [];
    const root = document.querySelector(within) || document.body;
    const vh = window.innerHeight, vw = document.documentElement.clientWidth;
    for (const el of root.querySelectorAll("button, a[href], input, select, textarea, [role=button]")) {
      const s = getComputedStyle(el);
      if (s.visibility === "hidden" || s.display === "none" || el.disabled || s.pointerEvents === "none") continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 2 || r.height <= 2) continue;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cx < 0 || cy < 0 || cx > vw || cy > vh) continue;
      const top = document.elementFromPoint(cx, cy);
      if (!top || top === el || el.contains(top) || top.contains(el)) continue;
      const label = (e) => (e.innerText || e.getAttribute("aria-label") || e.title || e.className || e.tagName).toString().trim().slice(0, 40);
      out.push({ text: label(el), coveredBy: label(top), x: Math.round(cx), y: Math.round(cy) });
    }
    return out;
  }, { within });
  return found.filter((f) => !expected.some((rx) => rx.test(f.text))).slice(0, limit);
}
