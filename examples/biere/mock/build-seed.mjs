// Génère seed-data.js à partir des JSON de seed du back (branche dev).
// Usage : node build-seed.mjs [chemin/vers/back]   (défaut : /home/user/biere/back)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const backDir = process.argv[2] ?? "/home/user/biere/back";
const dataDir = join(backDir, "src/database/seed/data");
const read = (name) => JSON.parse(readFileSync(join(dataDir, name), "utf8"));

const beers = read("beers.json").map(({ imageUrl, ...beer }) => beer);
const venues = read("venues.json");
// F11 : data-seeder.ts relie chaque dégustation de démo au lieu dont le nom est exactement sa place
// (venueIdsByName.get(row.place) ?? null) ; les ids des lieux suivent l'ordre de venues.json.
const venueIdByExactName = new Map(venues.map((venue, i) => [venue.name, i + 1]));
const demoCheckins = read("demo-checkins.json").map((row) => ({ ...row, venueId: venueIdByExactName.get(row.place) ?? null }));

const seed = {
  users: [
    { id: 1, displayName: "Alice", avatarColor: "#F59E0B", avatar: "hop" },
    { id: 2, displayName: "Bob", avatarColor: "#10B981", avatar: "malt" },
    { id: 3, displayName: "Carol", avatarColor: "#8B5CF6", avatar: "glass" },
  ],
  follows: [
    { followerId: 1, followedId: 2 },
    { followerId: 1, followedId: 3 },
  ],
  demoCheckinUserIds: [2, 3],
  styles: read("styles.json"),
  breweries: read("breweries.json"),
  beers,
  venues,
  venueBeers: read("venue-beers.json"),
  reviews: read("reviews.json"),
  demoCheckins,
  // F14 : propositions de correction de démo (correction-seed.ts), dans l'ordre du JSON (ids 1..n).
  demoCorrections: read("demo-corrections.json"),
};

const banner =
  "/* Données de seed de Mousse, générées par build-seed.mjs depuis back/src/database/seed (users, abonnements et\n" +
  "   utilisateurs de démo recopiés de seed.constants.ts). Ne pas éditer à la main. */\n";
writeFileSync(join(here, "seed-data.js"), `${banner}window.__MOUSSE_SEED__ = ${JSON.stringify(seed)};\n`);
console.log("seed-data.js written");
