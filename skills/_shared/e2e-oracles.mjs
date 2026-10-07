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
