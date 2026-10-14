// Test différentiel : mock-api.js (dans un faux window) contre le vrai back NestJS de Mousse.
// Usage : /opt/node22/bin/node diff-test.mjs
//   BACK_DIR (défaut /home/user/biere/back), BACK_PORT (défaut 5095), BACK_URL (si fourni, pas de lancement du back ;
//   il doit être fraîchement démarré avec DATABASE_PATH=:memory: SEED_DEMO_ACTIVITY=true).
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { isDeepStrictEqual } from "node:util";

const here = dirname(fileURLToPath(import.meta.url));
const BACK_DIR = process.env.BACK_DIR ?? "/home/user/biere/back";
const PORT = Number(process.env.BACK_PORT ?? 5095);
const DAY = 86_400_000;
const HOUR = 3_600_000;
const MOCK_BASE = "https://mousse.mock/api/v1";

// ------------------------------------------------------------------ back
let backProcess = null;
const startBack = async () => {
  if (process.env.BACK_URL) return process.env.BACK_URL;
  backProcess = spawn(process.execPath, ["dist/main.js"], {
    cwd: BACK_DIR,
    env: { ...process.env, PORT: String(PORT), DATABASE_PATH: ":memory:", SEED_DEMO_ACTIVITY: "true" },
    stdio: ["ignore", "ignore", "inherit"],
  });
  const url = `http://localhost:${PORT}/api/v1`;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`${url}/beer-styles`, { headers: { "X-User-Id": "1" } });
      if (response.status === 200) return url;
    } catch {
      /* pas encore prêt */
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Le back ne démarre pas.");
};
const stopBack = () => backProcess?.kill();

// ------------------------------------------------------------------ mock dans un contexte vm
const makeStorage = (store) => ({
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
});
const loadMock = (store, mockOptions) => {
  const context = {
    console, setTimeout, clearTimeout, URL, URLSearchParams, Headers, Request, Response, FormData, Blob, File,
    DOMException, AbortSignal, AbortController, Intl, crypto, btoa, atob, TextEncoder, TextDecoder,
    fetch: () => Promise.reject(new Error("réseau interdit dans le mock")),
    localStorage: makeStorage(store),
    __MOUSSE_MOCK_OPTIONS__: mockOptions,
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(readFileSync(join(here, "seed-data.js"), "utf8"), context, { filename: "seed-data.js" });
  vm.runInContext(readFileSync(join(here, "mock-api.js"), "utf8"), context, { filename: "mock-api.js" });
  return context;
};

// ------------------------------------------------------------------ requêtes
const send = async (fetchFn, base, { method = "GET", path, user, json, form }) => {
  const headers = {};
  if (user !== undefined && user !== null) headers["X-User-Id"] = String(user);
  let body;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  }
  if (form !== undefined) body = form();
  const response = await fetchFn(`${base}${path}`, { method, headers, body });
  const text = await response.text();
  let parsed = text;
  try {
    parsed = text === "" ? null : JSON.parse(text);
  } catch {
    /* corps non JSON */
  }
  return { status: response.status, body: parsed };
};

const ISO_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
let testStart = 0;
const normalize = (value) => {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, normalize(value[key])]));
  }
  if (typeof value === "string" && ISO_PATTERN.test(value)) {
    const time = Date.parse(value);
    return time >= testStart - 2000 ? `<RECENT+${Math.round((time - testStart) / HOUR)}h>` : value;
  }
  if (typeof value === "string" && UUID_PATTERN.test(value)) return "<UUID>";
  return value;
};

let compared = 0;
const statuses = new Map();
const differences = [];
const summarize = (value) => {
  const text = JSON.stringify(value);
  return text.length > 600 ? `${text.slice(0, 600)}…` : text;
};
const firstDifference = (a, b, path = "") => {
  if (isDeepStrictEqual(a, b)) return null;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return `${path}: longueur ${a.length} (back) / ${b.length} (mock)`;
    for (let i = 0; i < a.length; i += 1) {
      const d = firstDifference(a[i], b[i], `${path}[${i}]`);
      if (d) return d;
    }
  }
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      const d = firstDifference(a[key], b[key], `${path}.${key}`);
      if (d) return d;
    }
  }
  return `${path}: ${summarize(a)} (back) / ${summarize(b)} (mock)`;
};

// Les scénarios F11-F13 désignent des ressources créées pendant le test (ids pris dans la réponse du back) :
// `path` et `json` peuvent être des fonctions de `captured`, et `capture` y range l'id de la réponse.
const captured = {};
const resolveRequest = (request) => ({
  ...request,
  path: typeof request.path === "function" ? request.path(captured) : request.path,
  json: typeof request.json === "function" ? request.json(captured) : request.json,
});
const makeComparer = (backUrl, mockFetch, label) => async (pending) => {
  const request = resolveRequest(pending);
  const [real, fake] = [await send(fetch, backUrl, request), await send(mockFetch, MOCK_BASE, request)];
  if (request.capture && real.body && typeof real.body === "object") {
    const id = real.body.id ?? real.body.checkin?.id;
    if (id !== undefined) captured[request.capture] = id;
  }
  compared += 1;
  statuses.set(real.status, (statuses.get(real.status) ?? 0) + 1);
  const a = { status: real.status, body: normalize(real.body) };
  const b = { status: fake.status, body: normalize(fake.body) };
  if (!isDeepStrictEqual(a, b)) {
    differences.push({ label: request.name ? `${label} / ${request.name}` : label,
      request: `${request.method ?? "GET"} ${request.path} (user ${request.user})`,
      detail: firstDifference(a, b) });
  }
  return real;
};

// ------------------------------------------------------------------ jeux de requêtes
const seed = (() => {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(readFileSync(join(here, "seed-data.js"), "utf8"), context);
  return context.window.__MOUSSE_SEED__;
})();
const beerId = (name) => seed.beers.findIndex((b) => b.name === name) + 1;
const venueId = (name) => seed.venues.findIndex((v) => v.name === name) + 1;

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 1, 2, 3]);
const GIF = Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 2, 3, 4]);
const checkinForm = (fields, photo) => () => {
  const form = new FormData();
  if (photo) form.append("file", new Blob([photo], { type: "image/png" }), "photo.png");
  Object.entries(fields).forEach(([key, value]) => form.append(key, String(value)));
  return form;
};

const readGets = () => {
  const list = [];
  const users = [1, 2, 3];
  const get = (path, user = 1) => list.push({ path, user });
  // catalogue
  const beerQueries = [
    "", "?page=2", "?page=3&size=10", "?page=7", "?size=5", "?size=50", "?size=50&page=3", "?size=51", "?page=0",
    "?page=abc", "?size=1.5", "?q=chimay", "?q=CHIMAY", "?q=bière", "?q=biere", "?q=Brasserie", "?q=ORVAL",
    "?q=%20%20saison%20%20", "?q=br%C3%BC", "?q=wei%C3%9F", "?q=weiss", "?q=%25", "?q=_", "?q=a&sort=abv", "?q=",
    "?q=d%C3%A9lirium", "?q=la%20chouffe", "?q=zzzz", `?q=${"x".repeat(101)}`, "?q=a&q=b",
    "?country=BE", "?country=FR", "?country=BE&country=US", "?country=be", "?country=BEL",
    "?format=bottle", "?format=can", "?format=draft", "?format=bottle&format=can", "?format=keg",
    "?abvMin=5", "?abvMax=6", "?abvMin=5&abvMax=6.5", "?abvMin=6&abvMax=5", "?abvMin=15", "?abvMin=-1", "?abvMax=0",
    "?abvMin=abc", "?minRating=1", "?minRating=3", "?minRating=3.5", "?minRating=4", "?minRating=4.5", "?minRating=5",
    "?minRating=3.3", "?minRating=0.5", "?sort=name", "?sort=abv", "?sort=brewery", "?sort=rating", "?sort=bogus",
    "?sort=rating&page=2", "?sort=brewery&size=50", "?style=1", "?style=1&style=2", "?style=999", "?style=0",
    "?style=x", "?style=3&family=ipa", "?foo=1", "?family=bogus", "?family=ipa&sort=rating", "?q=ipa&format=can",
    "?country=US&minRating=4&sort=rating", "?family=trappist&country=BE&format=bottle", "?abvMax=5&sort=abv&page=2",
    "?q=brew&family=stout&sort=brewery", "?country=DE&format=draft&abvMin=4.5",
  ];
  beerQueries.forEach((q, i) => get(`/beers${q}`, users[i % 3]));
  seed.styles.forEach((_, i) => { if (i < 4) get(`/beers?style=${i + 1}`, 2); });
  ["lager", "pilsner", "paleAle", "ipa", "blonde", "amber", "brown", "stout", "porter", "witbier", "weizen", "saison",
    "trappist", "abbey", "belgianStrong", "sourLambic", "fruit", "nonAlcoholic"].forEach((f, i) => get(`/beers?family=${f}`, users[i % 3]));
  users.forEach((u) => ["drunk", "wishlist", "untasted"].forEach((s) => get(`/beers?status=${s}`, u)));
  users.forEach((u) => get(`/beers?status=drunk&family=ipa&sort=rating`, u));
  get("/beers?status=nope", 1);
  get("/beer-styles", 1);
  get("/beer-styles", 3);
  [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 100, 119, 120, beerId("Pilsner Urquell"), beerId("Orval"), beerId("La Chouffe"),
    beerId("Punk IPA"), beerId("Duvel")].forEach((id, i) => get(`/beers/${id}`, users[i % 3]));
  ["/beers/121", "/beers/9999", "/beers/abc", "/beers/-1", "/beers/0", "/beers/1.5"].forEach((p) => get(p, 1));
  // avis
  ["Pilsner Urquell", "Sierra Nevada Pale Ale", "Torpedo Extra IPA", "Jupiler", "Delirium Tremens", "Chimay Rouge"]
    .forEach((name) => users.forEach((u) => get(`/beers/${beerId(name)}/reviews`, u)));
  get(`/beers/${beerId("Pilsner Urquell")}/reviews?page=2`, 1);
  get(`/beers/${beerId("Pilsner Urquell")}/reviews?page=0`, 1);
  get("/beers/9999/reviews", 1);
  get(`/beers/1/reviews?page=1&x=2`, 1);
  // où boire
  [beerId("Saison Dupont"), beerId("Taras Boulba"), beerId("Orval"), beerId("Westmalle Tripel"), beerId("Torpedo Extra IPA"),
    1, 50, 100].forEach((id, i) => {
    get(`/beers/${id}/venues`, users[i % 3]);
    get(`/beers/${id}/venues?latitude=48.8566&longitude=2.3522`, 1);
  });
  get(`/beers/${beerId("Orval")}/venues?latitude=50.85`, 1);
  get(`/beers/${beerId("Orval")}/venues?latitude=95&longitude=2`, 1);
  get("/beers/9999/venues", 1);
  // dex, stats, badges, dégustations, liste d'envies
  users.forEach((u) => {
    ["/me/dex", "/me/stats", "/me/badges", "/me/wishlist", "/checkins", "/checkins?page=2", "/me/feed", "/me/feed?page=2",
      "/me/collections", `/me/collections?beerId=${beerId("Orval")}`, "/users", "/users/1/profile", "/users/2/profile",
      "/users/3/profile", "/users/1/followers", "/users/2/followers", "/users/1/following", "/users/3/following",
      "/users/1/collections", "/users/2/collections", "/users/3/wishlist", "/users/1/collections/1"].forEach((p) => get(p, u));
  });
  get(`/checkins?beerId=${beerId("Orval")}`, 2);
  get(`/checkins?beerId=${beerId("Stella Artois")}`, 3);
  get("/checkins?page=0", 2);
  get("/checkins?beerId=abc", 2);
  get("/me/feed?page=0", 1);
  get("/me/feed?page=3", 1);
  get("/users/4/profile", 1);
  get("/users/4/followers", 1);
  get("/users/abc/profile", 1);
  get("/users/9/collections", 1);
  get("/me/collections?beerId=9999", 1);
  get("/me/collections?beerId=0", 1);
  // lieux
  const venueQueries = [
    "", "?north=48.9&south=48.8&east=2.4&west=2.3", "?north=49&south=48&east=3&west=2", "?north=51&south=50.8&east=4.5&west=4.2",
    "?north=48.8&south=48.9&east=2.4&west=2.3", "?north=48.9&south=48.8&east=2.3&west=2.4", "?north=48.9", "?north=91&south=0&east=0&west=0",
    "?type=bar", "?type=shop", "?type=brewery", "?type=bar&type=shop", "?type=pub", "?q=caf%C3%A9", "?q=cafe", "?q=paris",
    "?q=LYON", "?q=%20bi%C3%A8re%20", "?q=la", "?q=brasserie", "?q=zz", "?q=berthom", "?undiscovered=true", "?confirmedOnly=true",
    "?confirmedOnly=false", "?confirmedOnly=yes", `?beer=${beerId("Orval")}`, `?beer=${beerId("Saison Dupont")}&confirmedOnly=true`,
    "?family=ipa", "?family=trappist&undiscovered=true", "?style=1", "?style=5&style=6", "?latitude=48.8566&longitude=2.3522",
    "?latitude=48.8566&longitude=2.3522&radiusKm=5", "?latitude=50.85&longitude=4.35&radiusKm=50", "?radiusKm=5",
    "?latitude=48.85&longitude=2.35&radiusKm=51", "?latitude=48.85&longitude=2.35&radiusKm=0", "?latitude=48.85",
    "?latitude=48.85&longitude=2.35&q=bar", "?q=la&type=bar&north=49&south=48&east=3&west=2", "?beer=0",
    "?latitude=45.76&longitude=4.83&family=ipa", "?undiscovered=true&confirmedOnly=true&type=bar", "?foo=bar",
  ];
  venueQueries.forEach((q, i) => get(`/venues${q}`, users[i % 3]));
  users.forEach((u) => get("/venues?undiscovered=true&latitude=48.86&longitude=2.36", u));
  for (let id = 1; id <= 36; id += 3) get(`/venues/${id}/beers`, users[id % 3]);
  get(`/venues/${venueId("La Fine Mousse")}/beers?family=ipa`, 1);
  get(`/venues/${venueId("La Fine Mousse")}/beers?family=nope`, 1);
  get("/venues/999/beers", 1);
  get("/venues/abc/beers", 1);
  // identité
  [undefined, 4, "abc", "0", " 2 ", "-1", "1.0"].forEach((user) => {
    list.push({ path: "/beers", user });
    list.push({ path: "/me/dex", user });
  });
  list.push({ path: "/nope", user: 1 });
  list.push({ path: "/nope?x=1", user: undefined });
  list.push({ path: "/BEERS?size=2", user: 1 });
  list.push({ path: "/beers/", user: 2 });
  list.push({ method: "PUT", path: "/beers", user: 1 });
  return list;
};

const rereads = (u) => [
  "/me/dex", "/me/stats", "/me/badges", "/checkins", "/checkins?page=2", "/me/feed", "/me/feed?page=2", "/users",
  "/users/1/profile", "/users/2/profile", "/users/3/profile", "/me/wishlist", "/me/collections", "/beers?status=drunk",
  "/beers?status=untasted&size=5", "/beers?status=wishlist", "/users/1/collections", "/users/1/wishlist", "/users/2/collections",
  `/me/collections?beerId=${beerId("Orval")}`, "/users/1/followers", "/users/2/following",
  "/venues?visited=true", `/venues/${venueId("La Fine Mousse")}`, "/breweries", "/beers?q=cantilon",
].map((path) => ({ path, user: u }));

// ------------------------------------------------------------------ scénarios d'écriture
const scenarios = (now) => {
  const ago = (ms) => new Date(now - ms).toISOString();
  const B = { orval: beerId("Orval"), punk: beerId("Punk IPA"), duvel: beerId("Duvel"), chimay: beerId("Chimay Rouge"),
    saison: beerId("Saison Dupont"), taras: beerId("Taras Boulba"), pils: beerId("Pilsner Urquell"),
    westmalle: beerId("Westmalle Tripel"), torpedo: beerId("Torpedo Extra IPA"), guinness: beerId("Guinness Draught") };
  const fineMousse = venueId("La Fine Mousse");
  const academie = venueId("Académie de la Bière");
  const steps = [];
  const step = (name, request) => steps.push({ name, ...request });
  const reread = (name, users = [1, 2, 3]) => users.forEach((u) => rereads(u).forEach((r) => step(name, r)));
  // dégustations
  const checkin = (user, fields, photo) =>
    step("dégustations", { method: "POST", path: "/checkins", user, form: checkinForm(fields, photo) });
  checkin(1, { beerId: B.orval, drankAt: ago(3 * DAY + 2 * HOUR), place: "  La Fine Mousse ", format: "bottle", rating: 4.5,
    aromas: "fruity,hoppy", price: "6.5", comment: "Top\r\nvraiment" });
  checkin(1, { beerId: B.punk, drankAt: ago(2 * DAY + 3 * HOUR), place: "Chez moi", format: "can", rating: 3 }, PNG);
  checkin(1, { beerId: B.duvel, drankAt: ago(1 * DAY + HOUR), place: "Le Supercoin", format: "draft" });
  checkin(1, { beerId: B.chimay, drankAt: ago(1 * DAY + 2 * HOUR), place: "Bar", format: "bottle", aromas: "" });
  checkin(1, { beerId: B.saison, drankAt: ago(5 * HOUR), place: "Bar", format: "bottle", rating: 5, price: "0" });
  checkin(1, { beerId: B.orval, drankAt: ago(4 * HOUR), place: "Bar", format: "bottle", rating: 4 });
  checkin(1, { beerId: B.taras, drankAt: ago(3 * HOUR), place: "Bar", format: "bottle" }, PNG);
  checkin(1, { beerId: B.pils, drankAt: ago(40 * DAY), place: "Prague", format: "draft", rating: 4 });
  checkin(1, { beerId: B.orval, drankAt: ago(HOUR), place: "Bar", format: "bottle" }, GIF);
  checkin(1, { beerId: B.orval, drankAt: new Date(now + 2 * HOUR).toISOString(), place: "Bar", format: "bottle" });
  checkin(1, { beerId: 9999, drankAt: ago(HOUR), place: "Bar", format: "bottle" });
  checkin(1, { beerId: "x", drankAt: "2026-02-30", place: " ", format: "keg", rating: 0, aromas: "fruity,fruity,zz", price: "1.234", extra: 1 });
  checkin(1, { beerId: B.orval, drankAt: ago(HOUR), place: "x".repeat(81), format: "bottle", rating: 5.5, aromas: "fruity,hoppy,floral,spicy,caramel,malty", price: "1001" });
  checkin(1, { beerId: B.orval, drankAt: "2026-10-01T10:00:00+02:00", place: "Bar", format: "bottle", rating: "4.3", comment: "a".repeat(501) });
  checkin(2, { beerId: B.westmalle, drankAt: ago(6 * HOUR), place: "Brussels", format: "bottle", rating: 3.5 });
  checkin(3, { beerId: B.torpedo, drankAt: ago(7 * HOUR), place: "Lyon", format: "can" });
  step("dégustations", { method: "POST", path: "/checkins", user: undefined, form: checkinForm({ beerId: 1 }) });
  const multipart = (build) => step("dégustations", { method: "POST", path: "/checkins", user: 1, form: build });
  multipart(() => {
    const form = checkinForm({ beerId: B.orval, drankAt: ago(HOUR), place: "Bar", format: "bottle" })();
    form.append("file", new Blob([new Uint8Array(6 * 1024 * 1024)]), "big.png");
    return form;
  });
  multipart(() => {
    const form = checkinForm({ beerId: B.orval, drankAt: ago(HOUR), place: "Bar", format: "bottle" }, PNG)();
    form.append("file", new Blob([PNG]), "second.png");
    return form;
  });
  multipart(() => {
    const form = checkinForm({ beerId: B.orval, drankAt: ago(HOUR), place: "Bar", format: "bottle" })();
    form.append("photo", new Blob([PNG]), "photo.png");
    return form;
  });
  multipart(checkinForm({ beerId: B.orval, drankAt: ago(HOUR), place: "Bar", format: "bottle", rating: "" }));
  multipart(checkinForm({ beerId: B.orval, drankAt: ago(HOUR), place: "Bar", format: "bottle", price: "abc" }));
  reread("après dégustations");
  step("suppression", { method: "DELETE", path: "/checkins/2", user: 1 });
  step("suppression", { method: "DELETE", path: "/checkins/23", user: 1 });
  step("suppression", { method: "DELETE", path: "/checkins/9999", user: 1 });
  step("suppression", { method: "DELETE", path: "/checkins/abc", user: 1 });
  step("suppression", { method: "DELETE", path: "/checkins/25", user: 1 });
  reread("après suppression", [1]);
  // suivre / ne plus suivre
  step("suivre", { method: "POST", path: "/users/1/follow", user: 2 });
  step("suivre", { method: "POST", path: "/users/1/follow", user: 2 });
  step("suivre", { method: "POST", path: "/users/2/follow", user: 2 });
  step("suivre", { method: "POST", path: "/users/9/follow", user: 2 });
  step("suivre", { method: "POST", path: "/users/2/follow", user: 3 });
  step("suivre", { method: "DELETE", path: "/users/2/follow", user: 3 });
  step("suivre", { method: "DELETE", path: "/users/2/follow", user: 3 });
  step("suivre", { method: "DELETE", path: "/users/3/follow", user: 3 });
  step("suivre", { method: "DELETE", path: "/users/7/follow", user: 3 });
  step("suivre", { method: "POST", path: "/users/1/follow", user: 3 });
  reread("après abonnements");
  // votes de disponibilité
  const voteOn = (user, venue, beer, sense) =>
    step("votes", { method: "POST", path: `/venues/${venue}/beers/${beer}/votes`, user, json: { sense } });
  voteOn(1, fineMousse, B.saison, "still");
  voteOn(1, fineMousse, B.saison, "gone");
  voteOn(2, fineMousse, B.saison, "gone");
  voteOn(3, fineMousse, B.saison, "gone");
  voteOn(1, fineMousse, B.torpedo, "gone");
  voteOn(2, fineMousse, B.torpedo, "gone");
  voteOn(1, academie, B.westmalle, "still");
  voteOn(1, fineMousse, 9999, "still");
  voteOn(1, 999, B.saison, "still");
  voteOn(1, fineMousse, B.saison, "maybe");
  step("votes", { method: "POST", path: `/venues/${fineMousse}/beers/${B.saison}/votes`, user: 1, json: {} });
  [1, 2, 3].forEach((u) => {
    step("votes", { path: `/venues/${fineMousse}/beers`, user: u });
    step("votes", { path: `/venues/${academie}/beers`, user: u });
    step("votes", { path: `/beers/${B.saison}/venues`, user: u });
    step("votes", { path: `/beers/${B.torpedo}/venues?latitude=48.86&longitude=2.38`, user: u });
    step("votes", { path: "/venues?confirmedOnly=true", user: u });
    step("votes", { path: "/venues?north=48.9&south=48.8&east=2.4&west=2.3", user: u });
    step("votes", { path: "/me/badges", user: u });
  });
  // signaler une bière, proposer un lieu
  step("lieux", { method: "POST", path: `/venues/${fineMousse}/beers`, user: 1, json: { beerId: B.guinness } });
  step("lieux", { method: "POST", path: `/venues/${fineMousse}/beers`, user: 1, json: { beerId: B.guinness } });
  step("lieux", { method: "POST", path: `/venues/${fineMousse}/beers`, user: 1, json: { beerId: 9999 } });
  step("lieux", { method: "POST", path: "/venues/999/beers", user: 1, json: { beerId: 1 } });
  step("lieux", { method: "POST", path: `/venues/${fineMousse}/beers`, user: 1, json: { beerId: "1" } });
  step("lieux", { method: "POST", path: `/venues/${fineMousse}/beers/${B.guinness}/votes`, user: 2, json: { sense: "still" } });
  const newVenue = { name: "  Le Comptoir Mousse ", type: "bar", address: " 1 rue de la Soif ", city: "Paris",
    description: "Petit bar", latitude: 48.87, longitude: 2.35 };
  step("lieux", { method: "POST", path: "/venues", user: 1, json: newVenue });
  step("lieux", { method: "POST", path: "/venues", user: 2, json: { ...newVenue, name: "le comptoir MOUSSE" } });
  step("lieux", { method: "POST", path: "/venues", user: 2, json: { name: "Sans Ville", type: "shop", address: "2 rue", latitude: 45.7, longitude: 4.8 } });
  step("lieux", { method: "POST", path: "/venues", user: 2, json: { name: " ", type: "pub", address: "", latitude: 91, longitude: "x", extra: true } });
  step("lieux", { method: "POST", path: "/venues", user: undefined, json: newVenue });
  step("lieux", { method: "POST", path: "/venues/37/beers", user: 3, json: { beerId: B.orval } });
  [1, 2, 3].forEach((u) => {
    step("lieux", { path: "/venues?q=comptoir", user: u });
    step("lieux", { path: "/venues?q=sans", user: u });
    step("lieux", { path: "/venues/37/beers", user: u });
    step("lieux", { path: "/venues/38/beers", user: u });
    step("lieux", { path: `/venues/${fineMousse}/beers`, user: u });
    step("lieux", { path: `/beers/${B.orval}/venues`, user: u });
    step("lieux", { path: "/venues?undiscovered=true&type=bar", user: u });
    step("lieux", { path: "/venues", user: u });
  });
  // avis
  const review = (user, beer, body) => step("avis", { method: "PUT", path: `/beers/${beer}/reviews/me`, user, json: body });
  review(1, B.westmalle, { rating: 4, text: "Jamais bue" });
  review(1, B.orval, { rating: 4.5, text: "  Superbe\r\namertume  ", sweetness: 2, acidity: 3, body: 4 });
  review(1, B.orval, { rating: 3.5, text: "Revue à la baisse", sweetness: null, acidity: 1, body: null });
  review(1, B.duvel, { rating: 5 });
  review(1, B.pils, { rating: 3, text: "", sweetness: 5, acidity: 5, body: 5 });
  review(2, B.pils, { rating: 2.5, text: "J'ai changé d'avis", sweetness: 1, acidity: 1, body: 1 });
  review(1, B.orval, { rating: 4.3 });
  review(1, B.orval, { rating: 0.5, text: "x".repeat(501), sweetness: 6, acidity: 1.5, body: "3" });
  review(1, B.orval, { text: "sans note", extra: 1 });
  review(1, 9999, { rating: 4 });
  step("avis", { method: "PUT", path: "/beers/abc/reviews/me", user: 1, json: { rating: 4 } });
  [1, 2, 3].forEach((u) => {
    [B.orval, B.pils, B.duvel].forEach((b) => {
      step("avis", { path: `/beers/${b}/reviews`, user: u });
      step("avis", { path: `/beers/${b}`, user: u });
    });
    step("avis", { path: "/beers?sort=rating", user: u });
    step("avis", { path: "/beers?minRating=4&sort=rating", user: u });
    step("avis", { path: "/me/feed", user: u });
  });
  step("avis", { method: "DELETE", path: `/beers/${B.duvel}/reviews/me`, user: 1 });
  step("avis", { method: "DELETE", path: `/beers/${B.duvel}/reviews/me`, user: 1 });
  step("avis", { method: "DELETE", path: "/beers/9999/reviews/me", user: 1 });
  review(1, B.duvel, { rating: 2 });
  [1, 2].forEach((u) => {
    step("avis", { path: `/beers/${B.duvel}/reviews`, user: u });
    step("avis", { path: `/beers/${B.duvel}`, user: u });
    step("avis", { path: "/me/feed", user: u });
  });
  // liste d'envies
  const wish = (user, beer) => step("envies", { method: "POST", path: "/me/wishlist", user, json: { beerId: beer } });
  wish(1, B.westmalle);
  wish(1, B.guinness);
  wish(1, B.westmalle);
  wish(1, 9999);
  wish(1, "3");
  wish(2, B.orval);
  step("envies", { method: "DELETE", path: `/me/wishlist/${B.guinness}`, user: 1 });
  step("envies", { method: "DELETE", path: `/me/wishlist/${B.guinness}`, user: 1 });
  step("envies", { method: "DELETE", path: "/me/wishlist/abc", user: 1 });
  wish(1, B.taras);
  // collections
  const col = (user, method, path, json) => step("collections", { method, path, user, json });
  col(1, "POST", "/me/collections", { name: "  Favoris  " });
  col(1, "POST", "/me/collections", { name: "favoris" });
  col(1, "POST", "/me/collections", { name: "   " });
  col(1, "POST", "/me/collections", { name: "x".repeat(41) });
  col(1, "POST", "/me/collections", { name: "À goûter" });
  col(2, "POST", "/me/collections", { name: "Favoris" });
  col(1, "POST", "/me/collections/1/beers", { beerId: B.orval });
  col(1, "POST", "/me/collections/1/beers", { beerId: B.duvel });
  col(1, "POST", "/me/collections/1/beers", { beerId: B.orval });
  col(1, "POST", "/me/collections/1/beers", { beerId: 9999 });
  col(1, "POST", "/me/collections/3/beers", { beerId: B.orval });
  col(1, "POST", "/me/collections/2/beers", { beerId: B.westmalle });
  col(1, "PATCH", "/me/collections/2", { name: "FAVORIS" });
  col(1, "PATCH", "/me/collections/2", { name: "Belges" });
  col(1, "PATCH", "/me/collections/2", { name: "belges" });
  col(1, "PATCH", "/me/collections/3", { name: "Pas à moi" });
  col(1, "PATCH", "/me/collections/99", { name: "x" });
  [1, 2, 3].forEach((u) => {
    ["/users/1/collections", "/users/1/collections/1", "/users/1/collections/2", "/users/1/collections/3", "/users/2/collections/3",
      "/users/1/wishlist", "/users/2/wishlist", "/me/collections", `/me/collections?beerId=${B.orval}`,
      `/me/collections?beerId=${B.westmalle}`].forEach((path) => step("collections", { path, user: u }));
  });
  col(1, "DELETE", `/me/collections/1/beers/${B.duvel}`);
  col(1, "DELETE", `/me/collections/1/beers/${B.duvel}`);
  col(1, "DELETE", "/me/collections/3/beers/1");
  col(1, "DELETE", "/me/collections/2");
  col(1, "DELETE", "/me/collections/2");
  col(1, "POST", "/me/collections", { name: "Belges" });
  col(1, "POST", "/me/collections/4/beers", { beerId: B.chimay });
  [1, 2].forEach((u) => ["/users/1/collections", "/users/1/collections/4", "/users/1/collections/1", `/me/collections?beerId=${B.chimay}`]
    .forEach((path) => step("collections", { path, user: u })));
  // avatar et nom
  const profile = (user, json) => step("profil", { method: "PUT", path: "/me/profile", user, json });
  profile(1, { displayName: "  Alicia  ", avatar: "foam" });
  profile(2, { displayName: "Zoé", avatar: "barrel" });
  profile(3, { displayName: "a", avatar: "unicorn" });
  profile(3, { displayName: "x".repeat(25), avatar: "hop", color: "#000" });
  profile(3, { avatar: "hop" });
  reread("après profils");
  return steps;
};

// ------------------------------------------------------------------ F11-F13 : lectures sur l'état initial
const readGetsF11to13 = () => {
  const list = [];
  const users = [1, 2, 3];
  const get = (path, user = 1) => list.push({ name: "F11-F13", path, user });
  // F12 : brasseries
  [1, 2, 3, undefined, "abc"].forEach((u) => get("/breweries", u));
  ["/breweries?foo=1", "/me/dex?x=1", "/beer-styles?page=0", "/venues/1?foo=bar", "/checkins/1?x=y", "/me/badges?a=b"]
    .forEach((p) => get(p, 2));
  // F11 : fiche d'un lieu, avec les visites de l'utilisateur courant
  for (let id = 1; id <= 36; id += 2) get(`/venues/${id}`, users[id % 3]);
  [venueId("La Fine Mousse"), venueId("Brasserie Cantillon"), venueId("Delirium Café")].forEach((id) => users.forEach((u) => get(`/venues/${id}`, u)));
  ["/venues/999", "/venues/abc", "/venues/0", "/venues/1.5", "/venues/-1", "/venues/2/"].forEach((p) => get(p, 2));
  get("/venues/1", undefined);
  // F11 : filtre visited
  users.forEach((u) => {
    get("/venues?visited=true", u);
    get("/venues?visited=true&latitude=50.85&longitude=4.35", u);
  });
  ["?visited=false", "?visited=yes", "?visited=1", "?visited=TRUE", "?visited=", "?visited=true&visited=true", "?visited=true&type=bar",
    "?visited=true&type=shop&type=brewery", "?visited=true&latitude=48.86&longitude=2.35&radiusKm=3", "?visited=true&undiscovered=true",
    "?visited=true&q=la", "?visited=true&north=51&south=50.8&east=4.5&west=4.2", "?visited=true&confirmedOnly=true",
    "?visited=true&family=trappist", `?visited=true&beer=${beerId("Orval")}`, "?visited=false&q=caf%C3%A9"]
    .forEach((q, i) => get(`/venues${q}`, i % 2 === 0 ? 2 : 3));
  // F11 : détail d'une dégustation
  [["/checkins/1", 2], ["/checkins/1", 1], ["/checkins/1", 3], ["/checkins/21", 3], ["/checkins/21", 2], ["/checkins/9999", 2],
    ["/checkins/abc", 2], ["/checkins/0", 2], ["/checkins/1", undefined]].forEach(([p, u]) => get(p, u));
  users.forEach((u) => get("/checkins?page=1", u));
  // F13 : recherche tolérante du catalogue
  ["?q=cantilon", "?q=CANTILON", "?q=cantillon", "?q=orvel", "?q=chimai%20rouje", "?q=westmale", "?q=duvle", "?q=delirim",
    "?q=pilsner%20urqell", "?q=brasseri%20cantilon", "?q=tripel%20westmale", "?q=lagr", "?q=abc", "?q=orv", "?q=xxxxxxxx",
    "?q=cantilon&sort=abv", "?q=cantilon&sort=brewery", "?q=cantilon&sort=rating", "?q=cantilon&size=1", "?q=cantilon&page=2&size=1",
    "?q=cantilon&page=9", "?q=orvel&family=ipa", "?q=orvel&family=trappist", "?q=cantilon&country=BE", "?q=cantilon&country=FR",
    "?q=cantilon&format=bottle", "?q=cantilon&format=can", "?q=cantilon&abvMin=5.5", "?q=cantilon&minRating=4",
    "?q=chimay&family=ipa", "?q=gueuz", "?q=kriekk", "?q=st%C3%A9lla", "?q=sierra%20nevadda", "?q=%20%20orvel%20%20",
    "?q=guiness", "?q=lambic%20cantilon%20zzzzzzzz", "?q=r%C3%B6s%C3%A9%20gambrinu"]
    .forEach((q, i) => get(`/beers${q}`, users[i % 3]));
  users.forEach((u) => ["drunk", "wishlist", "untasted"].forEach((s) => get(`/beers?q=cantilon&status=${s}`, u)));
  users.forEach((u) => get("/beers?q=pilsner%20urqell&status=drunk", u));
  // F13 : recherche tolérante des lieux
  ["?q=cantilon", "?q=fine%20mouse", "?q=suprcoin", "?q=bruxeles", "?q=lyonn", "?q=bruxeles&type=bar", "?q=bruxeles&type=shop",
    "?q=bruxeles&latitude=50.85&longitude=4.35", "?q=bruxeles&latitude=50.85&longitude=4.35&radiusKm=1", "?q=zzzz", "?q=abc",
    "?q=paris%20zzzz", "?q=trapiste", "?q=trapiste&undiscovered=true", "?q=bruxeles&confirmedOnly=true",
    "?q=bruxeles&north=51&south=50.8&east=4.5&west=4.2", "?q=bruxeles&north=49&south=48&east=3&west=2", "?q=delirim",
    `?q=bruxeles&beer=${beerId("Orval")}`, "?q=bruxeles&family=sourLambic", "?q=acad%C3%A9mie%20biere", "?q=capsul"]
    .forEach((q, i) => get(`/venues${q}`, users[i % 3]));
  users.forEach((u) => get("/venues?q=bruxeles&visited=true", u));
  return list;
};

// ------------------------------------------------------------------ F11-F13 : scénarios d'écriture (après les autres)
const scenariosF11to13 = (now) => {
  const ago = (ms) => new Date(now - ms).toISOString();
  const B = { orval: beerId("Orval"), duvel: beerId("Duvel"), westmalle: beerId("Westmalle Tripel"), saison: beerId("Saison Dupont"),
    guinness: beerId("Guinness Draught"), punk: beerId("Punk IPA"), gueuze: beerId("Cantillon Gueuze 100 % Lambic Bio") };
  const fineMousse = venueId("La Fine Mousse");
  const supercoin = venueId("Le Supercoin");
  const cantillon = venueId("Brasserie Cantillon");
  const lambicStyle = seed.styles.findIndex((st) => st.name === "Lambic et gueuze") + 1;
  const steps = [];
  const step = (name, request) => steps.push({ name, ...request });
  const ref = (key) => (ctx) => ctx[key];
  const reads = (name, users, paths) => users.forEach((user) => paths.forEach((path) => step(name, { path, user })));
  // F11 : dégustations liées à un lieu de la carte
  const checkin = (user, fields, photo, capture) =>
    step("F11 dégustations", { method: "POST", path: "/checkins", user, form: checkinForm(fields, photo), capture });
  checkin(1, { beerId: B.orval, drankAt: ago(2 * HOUR), place: " La Fine Mousse ", venueId: fineMousse, format: "draft", rating: 4 }, null, "a1");
  checkin(1, { beerId: B.duvel, drankAt: ago(26 * HOUR), place: "La Fine Mousse", venueId: fineMousse, format: "bottle", rating: 3,
    price: "6.5", comment: "Avant", aromas: "fruity,hoppy" }, PNG, "a2");
  checkin(1, { beerId: B.westmalle, drankAt: ago(5 * DAY), place: "Chez Paul", format: "bottle", rating: 3.5, price: "4.5",
    comment: "Bof", aromas: "fruity,spicy" }, null, "a3");
  checkin(1, { beerId: B.saison, drankAt: ago(3 * DAY), place: "Mon bar à moi", venueId: supercoin, format: "can" }, null, "a4");
  checkin(1, { beerId: B.orval, drankAt: ago(40 * DAY), place: "Le Comptoir Mousse", venueId: 37, format: "bottle" }, null, "a5");
  checkin(2, { beerId: B.guinness, drankAt: ago(3 * HOUR), place: "Brasserie Cantillon", venueId: cantillon, format: "draft" }, null, "b1");
  checkin(1, { beerId: B.orval, drankAt: ago(HOUR), place: "Bar", venueId: 9999, format: "bottle" });
  checkin(1, { beerId: B.orval, drankAt: ago(HOUR), place: "Bar", venueId: 9999, format: "bottle" }, PNG);
  checkin(1, { beerId: 9999, drankAt: ago(HOUR), place: "Bar", venueId: 9999, format: "bottle" });
  checkin(1, { beerId: B.orval, drankAt: new Date(now + 2 * HOUR).toISOString(), place: "Bar", venueId: 9999, format: "bottle" });
  checkin(1, { beerId: B.orval, drankAt: ago(HOUR), place: "Bar", venueId: 9999, format: "bottle" }, GIF);
  ["0", "abc", "", "1.5", "-3", "1e3x"].forEach((v) =>
    checkin(1, { beerId: B.orval, drankAt: ago(HOUR), place: "Bar", venueId: v, format: "bottle" }));
  checkin(1, { beerId: "x", drankAt: ago(HOUR), place: "", venueId: "y", format: "bottle" });
  step("F11 dégustations", { method: "POST", path: "/checkins", user: 1, form: () => {
    const form = checkinForm({ beerId: B.orval, drankAt: ago(HOUR), place: "Bar", format: "bottle" })();
    form.append("venueId", "1");
    form.append("venueId", "2");
    return form;
  } });
  step("F11 dégustations", { method: "POST", path: "/checkins", user: undefined,
    form: checkinForm({ beerId: B.orval, drankAt: ago(HOUR), place: "Bar", venueId: 9999, format: "bottle" }) });
  const visitReads = (name) => reads(name, [1, 2], ["/checkins", "/venues?visited=true", `/venues/${fineMousse}`, `/venues/${supercoin}`,
    `/venues/${cantillon}`, "/venues/37", "/venues?q=mousse", "/venues?visited=true&latitude=48.86&longitude=2.35", "/me/feed"]);
  visitReads("après F11");
  ["a1", "a2", "a4", "b1"].forEach((key) => [1, 2].forEach((user) => step("après F11", { path: (ctx) => `/checkins/${ctx[key]}`, user })));
  // F13 : corriger une dégustation
  const patch = (user, id, json, name = "F13 modifier") =>
    step(name, { method: "PATCH", path: (ctx) => `/checkins/${typeof id === "function" ? id(ctx) : id}`, user, json });
  const readBack = (key, user = 1) => step("F13 relecture", { path: (ctx) => `/checkins/${ctx[key]}`, user });
  patch(1, ref("a3"), { rating: 4.5, comment: "Finalement\r\nbien" });
  readBack("a3");
  patch(1, ref("a3"), { drankAt: ago(4 * DAY + 3 * HOUR), place: "  Chez Pierre  ", rating: 2, aromas: ["hoppy"], format: "draft",
    price: 3.25, comment: "Tout\rchangé" });
  readBack("a3");
  patch(1, ref("a3"), { place: "Le Supercoin", venueId: supercoin });
  reads("F13 lien", [1], [`/venues/${supercoin}`, "/venues?visited=true"]);
  patch(1, ref("a4"), { place: "Supercoin (texte libre)" });
  reads("F13 texte libre", [1], [`/venues/${supercoin}`, "/venues?visited=true"]);
  patch(1, ref("a1"), { venueId: null });
  reads("F13 lien effacé", [1], [`/venues/${fineMousse}`, "/venues?visited=true"]);
  patch(1, ref("a1"), { place: "Bar", venueId: 9999 });
  patch(1, ref("a1"), { venueId: fineMousse });
  patch(1, 99999, { venueId: fineMousse });
  patch(1, 99999, { venueId: 9999, place: "Bar" });
  patch(1, 99999, { rating: 3 });
  patch(1, ref("a1"), { drankAt: new Date(now + 10 * 60000).toISOString() });
  patch(1, ref("a1"), { drankAt: new Date(now + 4 * 60000).toISOString(), venueId: fineMousse });
  patch(1, ref("a1"), { drankAt: new Date(now + 4 * 60000).toISOString() });
  patch(1, ref("a1"), { drankAt: new Date(now + 10 * 60000).toISOString(), place: "Bar", venueId: 9999 });
  patch(1, ref("a1"), {});
  step("F13 modifier", { method: "PATCH", path: (ctx) => `/checkins/${ctx.a1}`, user: 1 });
  patch(1, ref("a1"), { beerId: B.punk, comment: "Après" });
  patch(1, ref("a1"), { foo: 1 });
  patch(1, ref("a1"), { foo: 1, rating: 9 });
  patch(1, 1, { rating: 3 });
  patch(1, 1, { place: "Bar", venueId: 9999 });
  patch(1, 1, {});
  patch(1, "abc", { rating: 3 });
  patch(1, "0", { rating: 3 });
  patch(undefined, ref("a1"), { rating: 3 });
  patch(4, ref("a1"), { rating: 3 });
  patch(1, ref("a2"), { rating: null, price: null, comment: "", aromas: [] });
  readBack("a2");
  [{ drankAt: null }, { place: null }, { format: null }, { aromas: null }, { comment: null }, { place: "   " }, { place: "a".repeat(81) },
    { drankAt: "2026-13-45" }, { drankAt: "2026-02-30T10:00:00Z" }, { drankAt: "hier" }, { rating: 0 }, { rating: 5.5 }, { rating: 4.2 },
    { rating: "4" }, { price: -1 }, { price: 1000.5 }, { price: 2.555 }, { price: "3" },
    { aromas: ["fruity", "citrus", "hoppy", "floral", "spicy", "malty"] }, { aromas: ["fruity", "fruity"] }, { aromas: ["unknown"] },
    { aromas: "fruity,hoppy" }, { comment: "a".repeat(501) }, { format: "keg" }, { place: "Bar", venueId: 0 },
    { place: "Bar", venueId: 1.5 }, { place: "Bar", venueId: "3" }, { venueId: -2 }, { rating: 0, price: -1, format: "keg", photoId: "x" }]
    .forEach((json) => patch(1, ref("a2"), json, "F13 refus"));
  readBack("a2");
  patch(1, ref("a2"), { place: ` ${"p".repeat(80)} `, comment: "b".repeat(500), aromas: ["fruity", "citrus", "hoppy", "floral", "spicy"],
    rating: 0.5, price: 0 }, "F13 limites");
  patch(1, ref("a2"), { rating: 5, comment: `${"c".repeat(499)}\r\n`, price: 999.99 }, "F13 limites");
  patch(1, ref("a2"), { comment: `${"c".repeat(500)}\r\n` }, "F13 limites");
  readBack("a2");
  // Bob corrige une dégustation de démo : le fil d'Alice et les visites de Bob suivent
  patch(2, 1, { place: "Le Supercoin", venueId: supercoin, rating: 2, comment: "Corrigée" });
  patch(2, 2, { drankAt: ago(2 * DAY) });
  patch(3, 1, { rating: 1 });
  reads("F13 après démo", [1], ["/me/feed", "/me/feed?page=2"]);
  reads("F13 après démo", [2], ["/checkins", "/venues?visited=true", `/venues/${supercoin}`, `/venues/${fineMousse}`, "/me/stats", "/me/badges",
    "/checkins/1", "/checkins/2"]);
  reads("F13 après démo", [1], ["/checkins", "/me/stats", "/me/badges", "/me/dex", "/venues?visited=true"]);
  // F12 : proposer une bière
  const propose = (user, json, capture, name = "F12 proposer") => step(name, { method: "POST", path: "/beers", user, json, capture });
  propose(1, { name: "  Mousse   du  Kit ", breweryName: " Brasserie   du Kit ", country: "FR", styleId: 1, abv: 5.5,
    description: "  Une blonde\r\nlégère  " }, "c1");
  propose(1, { name: "Kit Ambrée", breweryName: "brasserie DU kit", country: "BE", styleId: 3, abv: 6 }, "c2");
  propose(1, { name: "MOUSSE DU KIT", breweryName: "Brasserie du Kit", country: "FR", styleId: 1, abv: 5 });
  propose(2, { name: "mousse du kït", breweryName: "BRASSERIE DU KÏT", country: "DE", styleId: 2, abv: 5 });
  propose(1, { name: "Cantillon Gueuze 100 % Lambic Bio", breweryName: "brasserie cantillon", country: "BE", styleId: lambicStyle, abv: 5 });
  propose(1, { name: "cantillon  GUEUZE 100 % lambic bio", breweryName: "Brasserie Cantillón", country: "BE", styleId: lambicStyle, abv: 5 });
  propose(1, { name: "Cantillon Faro", breweryName: "Brasserie Cantillón", country: "FR", styleId: lambicStyle, abv: 4.5, description: null }, "c3");
  propose(2, { name: "Orval", breweryName: "Autre Brasserie", country: "BE", styleId: 1, abv: 6.2 }, "c4");
  propose(2, { name: "Bad style", breweryName: "X Brew", country: "FR", styleId: 999, abv: 5 });
  propose(2, { name: "Zéro", breweryName: "Zéro Brew", country: "FR", styleId: 1, abv: 0 }, "c5");
  [{}, { name: "a", breweryName: "b", country: "fr", styleId: 0, abv: 20.5 },
    { name: "x".repeat(81), breweryName: "y".repeat(61), country: "XX", styleId: 1.5, abv: 5.55, description: "z".repeat(501), extra: 1 },
    { name: 12, breweryName: null, country: null, styleId: "1", abv: "5" }, { name: "  a  ", breweryName: "  b ", country: "BE", styleId: 1, abv: 5 },
    { name: "     ", breweryName: "Brew", country: "BE", styleId: 1, abv: 5 }, { name: "Ok", breweryName: "Brew", country: "BE", styleId: 1, abv: -1 },
    { name: "Ok", breweryName: "Brew", country: "BE", styleId: 1, abv: 20.05 }, { name: "Ok", breweryName: "Brew", country: "BE", styleId: 1 },
    { name: "Ok", breweryName: "Brew", country: "BE", styleId: 999, abv: 5, source: "community" },
    { name: "a", breweryName: "Brew", country: "BE", styleId: 999, abv: 5 }]
    .forEach((json) => propose(1, json, undefined, "F12 refus"));
  step("F12 refus", { method: "POST", path: "/beers", user: 1 });
  propose(undefined, { name: "Anonyme", breweryName: "Brew", country: "BE", styleId: 1, abv: 5 }, undefined, "F12 refus");
  const created = ["c1", "c2", "c3", "c4", "c5"];
  created.forEach((key) => [1, 2, 3].forEach((user) => step("F12 fiches", { path: (ctx) => `/beers/${ctx[key]}`, user })));
  reads("F12 catalogue", [1, 2, 3], ["/beers?q=kit", "/beers?q=mousse%20du%20kit", "/beers?sort=brewery&q=kit", "/beers?country=FR&size=50",
    "/breweries", "/me/dex", "/me/badges", "/beers?q=moose%20kitt", "/beers?q=orval", "/beers?q=faro", "/beers?family=amber&size=50",
    "/beers?size=50&page=3", "/beers?sort=abv&size=5", "/beers?status=untasted&q=kit"]);
  // dégustation, avis, liste d'envies, collection et lieu sur une bière communautaire
  step("F12 usages", { method: "POST", path: "/checkins", user: 1, form: () =>
    checkinForm({ beerId: captured.c1, drankAt: ago(30 * 60000), place: "La Fine Mousse", venueId: fineMousse, format: "draft", rating: 4 })() });
  step("F12 usages", { method: "POST", path: "/checkins", user: 1, form: () =>
    checkinForm({ beerId: captured.c3, drankAt: ago(20 * 60000), place: "Maison", format: "bottle" })() });
  step("F12 usages", { method: "PUT", path: (ctx) => `/beers/${ctx.c1}/reviews/me`, user: 1, json: { rating: 4.5, text: "Maison !" } });
  step("F12 usages", { method: "PUT", path: (ctx) => `/beers/${ctx.c1}/reviews/me`, user: 2, json: { rating: 3 } });
  step("F12 usages", { method: "POST", path: "/me/wishlist", user: 2, json: (ctx) => ({ beerId: ctx.c2 }) });
  step("F12 usages", { method: "POST", path: "/me/collections", user: 1, json: { name: "Communautaires" }, capture: "col" });
  step("F12 usages", { method: "POST", path: (ctx) => `/me/collections/${ctx.col}/beers`, user: 1, json: (ctx) => ({ beerId: ctx.c1 }) });
  step("F12 usages", { method: "POST", path: `/venues/${fineMousse}/beers`, user: 1, json: (ctx) => ({ beerId: ctx.c1 }) });
  step("F12 usages", { method: "POST", path: (ctx) => `/venues/${fineMousse}/beers/${ctx.c1}/votes`, user: 2, json: { sense: "still" } });
  reads("F12 après usages", [1, 2], ["/me/dex", "/me/badges", "/me/stats", "/me/feed", "/users/1/profile", "/users", "/me/wishlist",
    "/beers?status=drunk", "/beers?minRating=4&sort=rating", `/venues/${fineMousse}/beers`, "/venues?visited=true"]);
  [1, 2].forEach((user) => {
    step("F12 après usages", { path: (ctx) => `/beers/${ctx.c1}`, user });
    step("F12 après usages", { path: (ctx) => `/beers/${ctx.c1}/reviews`, user });
    step("F12 après usages", { path: (ctx) => `/beers/${ctx.c1}/venues`, user });
    step("F12 après usages", { path: (ctx) => `/venues?beer=${ctx.c1}`, user });
    step("F12 après usages", { path: (ctx) => `/users/1/collections/${ctx.col}`, user });
    step("F12 après usages", { path: (ctx) => `/me/collections?beerId=${ctx.c1}`, user });
  });
  // quota : 10 propositions par 24 h glissantes, 404 avant 429, 429 avant 409
  for (let i = 1; i <= 10; i += 1) {
    propose(3, { name: `Quota ${i}`, breweryName: "Quota Brew", country: "NL", styleId: 1 + (i % 5), abv: 4 + i / 10 }, `q${i}`, "F12 quota");
  }
  propose(3, { name: "Quota 11", breweryName: "Quota Brew", country: "NL", styleId: 1, abv: 5 }, undefined, "F12 quota");
  propose(3, { name: "Quota 1", breweryName: "Quota Brew", country: "NL", styleId: 1, abv: 5 }, undefined, "F12 quota");
  propose(3, { name: "Quota 12", breweryName: "Quota Brew", country: "NL", styleId: 999, abv: 5 }, undefined, "F12 quota");
  propose(3, { name: "Q", breweryName: "Quota Brew", country: "NL", styleId: 1, abv: 5 }, undefined, "F12 quota");
  propose(2, { name: "Quota 1", breweryName: "quota brew", country: "NL", styleId: 1, abv: 5 }, undefined, "F12 quota");
  reads("F12 après quota", [1, 3], ["/breweries", "/beers?q=quota&size=50", "/beers?q=quota%20brw", "/beers?q=qouta&sort=abv",
    "/beers?country=NL&sort=brewery", "/me/dex"]);
  // createdByName suit le nom courant de l'auteur
  step("F12 auteur", { method: "PUT", path: "/me/profile", user: 1, json: { displayName: "Alice Kit", avatar: "hop" } });
  [1, 3].forEach((user) => {
    step("F12 auteur", { path: (ctx) => `/beers/${ctx.c1}`, user });
    step("F12 auteur", { path: "/beers?q=kit", user });
  });
  // fin : relecture générale
  reads("F11-F13 final", [1, 2, 3], ["/venues?visited=true", "/venues", "/venues?q=bruxeles", "/checkins", "/me/feed", "/me/dex", "/me/badges",
    "/me/stats", "/beers?q=cantilon", "/beers?q=kit"]);
  return steps;
};

// ------------------------------------------------------------------ exécution
const main = async () => {
  const backUrl = await startBack();
  try {
    const headers = (u) => ({ headers: { "X-User-Id": String(u) } });
    const pilsId = beerId("Pilsner Urquell");
    const reviewPage = await (await fetch(`${backUrl}/beers/${pilsId}/reviews`, headers(1))).json();
    const firstReview = seed.reviews.findIndex((r) => r.beerName === "Pilsner Urquell" && r.userName === "Bob");
    const bobReview = reviewPage.items.find((r) => r.authorId === 2);
    const reviewsNow = Date.parse(bobReview.createdAt) + seed.reviews[firstReview].daysAgo * DAY;
    const bobCheckins = await (await fetch(`${backUrl}/checkins?page=2`, headers(2))).json();
    const bobFirst = await (await fetch(`${backUrl}/checkins`, headers(2))).json();
    const checkin1 = [...bobCheckins.items, ...bobFirst.items].find((c) => c.id === 1);
    const firstBobRow = seed.demoCheckins.find((r) => r.userName === "Bob");
    const checkinsNow = Date.parse(checkin1.drankAt) + firstBobRow.daysAgo * DAY;
    const voteRow = seed.venueBeers.find((r) => r.status === "maybeGone" && r.positiveVotes > 0 && r.lastConfirmedDaysAgo !== null);
    const venueBeers = await (await fetch(`${backUrl}/venues/${venueId(voteRow.venueName)}/beers`, headers(1))).json();
    const linkDto = venueBeers.find((b) => b.beerId === beerId(voteRow.beerName));
    const votesNow = Date.parse(linkDto.lastConfirmedAt) + Math.round(voteRow.lastConfirmedDaysAgo * DAY);
    const seedNow = { reviews: reviewsNow, checkins: checkinsNow, votes: votesNow };
    testStart = Date.now();

    const store = new Map();
    const mock = loadMock(store, { latency: [0, 0], seedNow });
    const compare = makeComparer(backUrl, mock.fetch, "lecture");
    const gets = readGets();
    for (const request of gets) await compare(request);
    const legacyReadCount = compared;
    for (const request of readGetsF11to13()) await compare(request);
    const readCount = compared;

    const writeCompare = makeComparer(backUrl, mock.fetch, "scénario");
    for (const request of scenarios(testStart)) await writeCompare(request);
    const legacyWriteCount = compared - readCount;
    for (const request of scenariosF11to13(testStart)) await writeCompare(request);
    const writeCount = compared - readCount;
    const expectedCaptures = ["a1", "a2", "a3", "a4", "a5", "b1", "c1", "c2", "c3", "c4", "c5", "col",
      ...Array.from({ length: 10 }, (_, i) => `q${i + 1}`)];
    const missingCaptures = expectedCaptures.filter((key) => typeof captured[key] !== "number");

    const reloaded = loadMock(store, { latency: [0, 0], seedNow });
    const reloadCompare = makeComparer(backUrl, reloaded.fetch, "rechargement");
    for (const u of [1, 2, 3]) for (const request of rereads(u)) await reloadCompare(request);
    const photoIds = [...mock.__mockPhotos.keys()];
    const photoOk = photoIds.length > 0 && photoIds.every((id) => String(mock.__mockPhotos.get(id)).startsWith("data:image/png;base64,"));

    mock.__mockReset();
    const resetDex = await send(mock.fetch, MOCK_BASE, { path: "/me/dex", user: 1 });

    console.log(`Requêtes comparées : ${compared} (lectures ${readCount} dont F11-F13 ${readCount - legacyReadCount}, scénarios d'écriture ${writeCount} dont F11-F13 ${writeCount - legacyWriteCount}, après rechargement ${compared - readCount - writeCount})`);
    console.log(`Statuts du back : ${[...statuses.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}×${v}`).join(", ")}`);
    console.log(`Photos du mock en data URL : ${photoOk ? "oui" : "NON"} (${photoIds.length}) ; __mockReset -> dex Alice ${resetDex.body.discovered}`);
    console.log(`Ids créés pendant les scénarios F11-F13 : ${missingCaptures.length === 0 ? `tous lus (${expectedCaptures.length})` : `MANQUANTS ${missingCaptures.join(", ")}`}`);
    if (differences.length === 0) {
      console.log("Aucune différence.");
    } else {
      console.log(`${differences.length} différence(s) :`);
      differences.slice(0, 40).forEach((d) => console.log(`- [${d.label}] ${d.request}\n    ${d.detail}`));
    }
    process.exitCode = differences.length === 0 && missingCaptures.length === 0 && photoOk && resetDex.body.discovered === 0 ? 0 : 1;
  } finally {
    stopBack();
  }
};

main().catch((error) => {
  console.error(error);
  stopBack();
  process.exitCode = 1;
});
