import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "database", "seed", "data");

const FAMILIES = [
  "Lager", "Pilsner", "Pale Ale", "IPA", "Blonde", "Ambrée", "Brune", "Stout", "Porter", "Blanche",
  "Weizen", "Saison", "Trappiste", "Abbaye", "Belgian Strong", "Sour / Lambic", "Fruitée", "Sans alcool",
];
const AROMAS = [
  "fruite", "agrumes", "houblonne", "floral", "epice", "caramel", "malte", "torrefie", "cafe",
  "chocolat", "miel", "banane", "clou-de-girofle", "acidulee", "boisee", "herbace", "fume", "biscuit",
];
const FORMATS = ["bottle", "can", "draft"];
const VENUE_TYPES = ["bar", "shop", "brewery"];
const STATUSES = ["confirmed", "maybeGone", "gone", "unknown"];
const ABV_RANGE = [0, 14];
const IBU_RANGE = [0, 120];
const EBC_RANGE = [2, 100];
const EXPECTED_BEERS = 120;
const EXPECTED_VENUES = 36;
const CITIES = {
  Paris: { count: 14, latitude: 48.85, longitude: 2.35 },
  Lyon: { count: 6, latitude: 45.76, longitude: 4.84 },
  Lille: { count: 6, latitude: 50.63, longitude: 3.06 },
  Bruxelles: { count: 10, latitude: 50.85, longitude: 4.35 },
};
const CITY_TOLERANCE_DEGREES = 0.12;
const LINKS_PER_VENUE = { bar: [8, 25], shop: [15, 30], brewery: [0, 25] };
const LOW_ALCOHOL_MAX_ABV = 1.2;
const MINIMUMS = [
  { label: "sans alcool ou < 1,2 %", min: 6, test: (beer) => beer.abv < LOW_ALCOHOL_MAX_ABV },
  { label: "IPA / Pale Ale", min: 10, families: ["IPA", "Pale Ale"] },
  { label: "trappistes / abbaye", min: 10, families: ["Trappiste", "Abbaye"] },
  { label: "blanches / weizen", min: 8, families: ["Blanche", "Weizen"] },
  { label: "acides", min: 6, families: ["Sour / Lambic"] },
  { label: "stouts / porters", min: 8, families: ["Stout", "Porter"] },
];
const EVERYDAY_LAGERS = ["Heineken", "Kronenbourg 1664", "Stella Artois"];

const errors = [];
const warnings = [];
const error = (file, message) => errors.push(`[${file}] ${message}`);
const warn = (file, message) => warnings.push(`[${file}] ${message}`);

const load = (file) => {
  const raw = readFileSync(join(DATA_DIR, file), "utf8");
  if (raw.charCodeAt(0) === 0xfeff) error(file, "BOM UTF-8 interdit");
  if (raw.includes("�")) error(file, "caractère de remplacement U+FFFD (encodage cassé)");
  let data;
  try {
    data = JSON.parse(raw);
  } catch (cause) {
    error(file, `JSON invalide : ${cause.message}`);
    return [];
  }
  if (raw !== `${JSON.stringify(data, null, 2)}\n`) error(file, "indentation attendue : 2 espaces, retour à la ligne final");
  if (!Array.isArray(data)) {
    error(file, "la racine doit être un tableau");
    return [];
  }
  return data;
};

const isString = (value) => typeof value === "string" && value.trim().length > 0;
const isInt = (value) => Number.isInteger(value);
const isNumber = (value) => typeof value === "number" && Number.isFinite(value);
const hasOneDecimal = (value) => Math.abs(value * 10 - Math.round(value * 10)) < 1e-9;
const inRange = (value, [min, max]) => value >= min && value <= max;
const key = (value) => value.trim().toLocaleLowerCase("fr");

const checkShape = (file, item, index, fields) => {
  const label = isString(item?.name) ? `« ${item.name} »` : `#${index}`;
  if (item === null || typeof item !== "object" || Array.isArray(item)) {
    error(file, `${label} : objet attendu`);
    return false;
  }
  const expected = Object.keys(fields);
  for (const field of Object.keys(item)) {
    if (!expected.includes(field)) error(file, `${label} : champ inattendu « ${field} »`);
  }
  let valid = true;
  for (const [field, check] of Object.entries(fields)) {
    if (!(field in item)) {
      error(file, `${label} : champ manquant « ${field} »`);
      valid = false;
    } else if (!check(item[field])) {
      error(file, `${label} : valeur invalide pour « ${field} » (${JSON.stringify(item[field])})`);
      valid = false;
    }
  }
  return valid;
};

const indexByName = (file, items, field = "name") => {
  const index = new Map();
  for (const item of items) {
    if (!isString(item?.[field])) continue;
    const k = key(item[field]);
    if (index.has(k)) error(file, `nom en double (insensible à la casse) : « ${item[field]} »`);
    else index.set(k, item);
  }
  return index;
};

const nullable = (check) => (value) => value === null || check(value);
const subsetOf = (allowed, min, max) => (value) =>
  Array.isArray(value) &&
  value.length >= min &&
  value.length <= max &&
  new Set(value).size === value.length &&
  value.every((entry) => allowed.includes(entry));

const styles = load("styles.json");
const breweries = load("breweries.json");
const beers = load("beers.json");
const venues = load("venues.json");
const venueBeers = load("venue-beers.json");

styles.forEach((style, index) => {
  const valid = checkShape("styles.json", style, index, {
    family: (v) => FAMILIES.includes(v),
    name: isString,
    description: isString,
    ebcMin: isInt,
    ebcMax: isInt,
    abvMin: isNumber,
    abvMax: isNumber,
    ibuMin: isInt,
    ibuMax: isInt,
  });
  if (!valid) return;
  const pairs = [
    ["ebc", EBC_RANGE],
    ["abv", ABV_RANGE],
    ["ibu", IBU_RANGE],
  ];
  for (const [prefix, range] of pairs) {
    const min = style[`${prefix}Min`];
    const max = style[`${prefix}Max`];
    if (min > max) error("styles.json", `« ${style.name} » : ${prefix}Min > ${prefix}Max`);
    if (!inRange(min, range) || !inRange(max, range)) error("styles.json", `« ${style.name} » : ${prefix} hors plage ${range.join("-")}`);
  }
});
const styleIndex = indexByName("styles.json", styles);
for (const family of FAMILIES) {
  if (!styles.some((style) => style.family === family)) error("styles.json", `famille sans style : « ${family} »`);
}

breweries.forEach((brewery, index) => {
  checkShape("breweries.json", brewery, index, {
    name: isString,
    country: (v) => typeof v === "string" && /^[A-Z]{2}$/.test(v),
    city: isString,
  });
});
const breweryIndex = indexByName("breweries.json", breweries);

beers.forEach((beer, index) => {
  const valid = checkShape("beers.json", beer, index, {
    name: isString,
    breweryName: isString,
    styleName: isString,
    abv: (v) => isNumber(v) && hasOneDecimal(v) && inRange(v, ABV_RANGE),
    ibu: nullable((v) => isInt(v) && inRange(v, IBU_RANGE)),
    ebc: nullable((v) => isInt(v) && inRange(v, EBC_RANGE)),
    description: isString,
    aromas: subsetOf(AROMAS, 3, 5),
    formats: subsetOf(FORMATS, 1, FORMATS.length),
    country: (v) => typeof v === "string" && /^[A-Z]{2}$/.test(v),
    imageUrl: (v) => v === null,
  });
  if (!valid) return;
  const brewery = breweryIndex.get(key(beer.breweryName));
  if (!brewery) error("beers.json", `« ${beer.name} » : brasserie inconnue « ${beer.breweryName} »`);
  else if (brewery.country !== beer.country) error("beers.json", `« ${beer.name} » : pays ${beer.country} différent de celui de la brasserie (${brewery.country})`);
  const style = styleIndex.get(key(beer.styleName));
  if (!style) {
    error("beers.json", `« ${beer.name} » : style inconnu « ${beer.styleName} »`);
    return;
  }
  if (!inRange(beer.abv, [style.abvMin, style.abvMax])) error("beers.json", `« ${beer.name} » : ${beer.abv} % hors de la plage du style « ${style.name} » (${style.abvMin}-${style.abvMax})`);
  if (beer.ibu !== null && !inRange(beer.ibu, [style.ibuMin, style.ibuMax])) error("beers.json", `« ${beer.name} » : IBU ${beer.ibu} hors de la plage du style (${style.ibuMin}-${style.ibuMax})`);
  if (beer.ebc !== null && !inRange(beer.ebc, [style.ebcMin, style.ebcMax])) error("beers.json", `« ${beer.name} » : EBC ${beer.ebc} hors de la plage du style (${style.ebcMin}-${style.ebcMax})`);
});
const beerIndex = indexByName("beers.json", beers);
if (beers.length !== EXPECTED_BEERS) error("beers.json", `${beers.length} bières, ${EXPECTED_BEERS} attendues`);

const familyOf = (beer) => styleIndex.get(key(beer.styleName ?? ""))?.family;
const familyCounts = new Map(FAMILIES.map((family) => [family, 0]));
for (const beer of beers) {
  const family = familyOf(beer);
  if (family) familyCounts.set(family, familyCounts.get(family) + 1);
}
for (const [family, count] of familyCounts) {
  if (count === 0) error("beers.json", `famille non représentée : « ${family} »`);
}
const minimumResults = MINIMUMS.map(({ label, min, families, test }) => {
  const count = beers.filter((beer) => (test ? test(beer) : families.includes(familyOf(beer)))).length;
  if (count < min) error("beers.json", `répartition : ${count} ${label}, minimum ${min}`);
  return { label, min, count };
});
for (const name of EVERYDAY_LAGERS) {
  if (!beerIndex.has(key(name))) error("beers.json", `bière du quotidien manquante : « ${name} »`);
}
for (const style of styles) {
  if (!beers.some((beer) => key(beer.styleName ?? "") === key(style.name))) warn("styles.json", `style sans bière : « ${style.name} »`);
}
for (const brewery of breweries) {
  if (!beers.some((beer) => key(beer.breweryName ?? "") === key(brewery.name ?? ""))) warn("breweries.json", `brasserie sans bière : « ${brewery.name} »`);
}

venues.forEach((venue, index) => {
  const valid = checkShape("venues.json", venue, index, {
    name: isString,
    type: (v) => VENUE_TYPES.includes(v),
    city: (v) => Object.keys(CITIES).includes(v),
    address: isString,
    latitude: (v) => isNumber(v) && inRange(v, [-90, 90]),
    longitude: (v) => isNumber(v) && inRange(v, [-180, 180]),
    description: isString,
  });
  if (!valid) return;
  const city = CITIES[venue.city];
  const far =
    Math.abs(venue.latitude - city.latitude) > CITY_TOLERANCE_DEGREES ||
    Math.abs(venue.longitude - city.longitude) > CITY_TOLERANCE_DEGREES;
  if (far) error("venues.json", `« ${venue.name} » : coordonnées (${venue.latitude}, ${venue.longitude}) incohérentes avec ${venue.city}`);
});
const venueIndex = indexByName("venues.json", venues);
if (venues.length !== EXPECTED_VENUES) error("venues.json", `${venues.length} lieux, ${EXPECTED_VENUES} attendus`);
for (const [city, { count }] of Object.entries(CITIES)) {
  const actual = venues.filter((venue) => venue.city === city).length;
  if (actual !== count) error("venues.json", `${city} : ${actual} lieux, ${count} attendus`);
}

const seenLinks = new Set();
const linksPerVenue = new Map();
const statusCounts = new Map(STATUSES.map((status) => [status, 0]));
venueBeers.forEach((entry, index) => {
  const valid = checkShape("venue-beers.json", entry, index, {
    venueName: isString,
    beerName: isString,
    status: (v) => STATUSES.includes(v),
    lastConfirmedDaysAgo: nullable((v) => isInt(v) && v >= 0),
    positiveVotes: (v) => isInt(v) && v >= 0,
    negativeVotes: (v) => isInt(v) && v >= 0,
  });
  if (!valid) return;
  const label = `${entry.venueName} / ${entry.beerName}`;
  if (!venueIndex.has(key(entry.venueName))) error("venue-beers.json", `${label} : lieu inconnu`);
  if (!beerIndex.has(key(entry.beerName))) error("venue-beers.json", `${label} : bière inconnue`);
  const linkKey = `${key(entry.venueName)}|${key(entry.beerName)}`;
  if (seenLinks.has(linkKey)) error("venue-beers.json", `${label} : doublon lieu + bière`);
  seenLinks.add(linkKey);
  linksPerVenue.set(key(entry.venueName), (linksPerVenue.get(key(entry.venueName)) ?? 0) + 1);
  statusCounts.set(entry.status, statusCounts.get(entry.status) + 1);
  const neverConfirmed = entry.status === "unknown";
  if (neverConfirmed !== (entry.lastConfirmedDaysAgo === null)) error("venue-beers.json", `${label} : lastConfirmedDaysAgo doit être null si et seulement si le statut est unknown`);
  if (entry.status === "confirmed" && entry.positiveVotes <= entry.negativeVotes) error("venue-beers.json", `${label} : confirmed avec plus de votes négatifs que positifs`);
  if (entry.status === "gone" && entry.negativeVotes <= entry.positiveVotes) error("venue-beers.json", `${label} : gone avec plus de votes positifs que négatifs`);
});
for (const venue of venues) {
  if (!isString(venue?.name) || !LINKS_PER_VENUE[venue.type]) continue;
  const count = linksPerVenue.get(key(venue.name)) ?? 0;
  const [min, max] = LINKS_PER_VENUE[venue.type];
  if (!inRange(count, [min, max])) error("venue-beers.json", `« ${venue.name} » (${venue.type}) : ${count} bières, attendu ${min} à ${max}`);
}
const confirmed = statusCounts.get("confirmed");
if (confirmed * 2 <= venueBeers.length) error("venue-beers.json", `statuts : ${confirmed} confirmed sur ${venueBeers.length}, une majorité est attendue`);
for (const status of ["gone", "maybeGone"]) {
  if (statusCounts.get(status) === 0) error("venue-beers.json", `statuts : aucun « ${status} »`);
}

const pad = (value, width) => String(value).padEnd(width);
const lines = [];
lines.push("Vérification des données de départ (src/database/seed/data)");
lines.push("");
lines.push(`  styles.json       ${styles.length} styles, ${FAMILIES.length} familles`);
lines.push(`  breweries.json    ${breweries.length} brasseries, ${new Set(breweries.map((b) => b.country)).size} pays`);
lines.push(`  beers.json        ${beers.length} bières`);
lines.push(`  venues.json       ${venues.length} lieux (${Object.keys(CITIES).map((city) => `${city} ${venues.filter((v) => v.city === city).length}`).join(", ")})`);
lines.push(`  venue-beers.json  ${venueBeers.length} liens (${STATUSES.map((s) => `${s} ${statusCounts.get(s)}`).join(", ")})`);
lines.push("");
lines.push("Bières par famille :");
for (const [family, count] of familyCounts) lines.push(`  ${pad(family, 16)} ${count}`);
lines.push("");
lines.push("Répartitions minimales :");
for (const { label, min, count } of minimumResults) lines.push(`  ${count >= min ? "OK    " : "ERREUR"} ${pad(label, 24)} ${count} (min ${min})`);
lines.push("");
if (warnings.length > 0) {
  lines.push(`Avertissements (${warnings.length}) :`);
  for (const message of warnings) lines.push(`  - ${message}`);
  lines.push("");
}
if (errors.length > 0) {
  lines.push(`ÉCHEC : ${errors.length} erreur(s)`);
  for (const message of errors) lines.push(`  - ${message}`);
} else {
  lines.push("OK : aucune erreur");
}
process.stdout.write(`${lines.join("\n")}\n`);
process.exitCode = errors.length > 0 ? 1 : 0;
