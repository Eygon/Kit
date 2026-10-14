# Données de départ (seed)

Jeux de données chargés par le back au démarrage pour les features F1 « Catalogue » et F3 « Carte ». Tous les fichiers sont des tableaux JSON indentés à 2 espaces, en UTF-8. Les liens entre fichiers passent par les **noms** (uniques, insensibles à la casse), jamais par des identifiants : c'est le seeder qui attribue les ids.

Vérification : `npm run check:seed` (ou `node scripts/check-seed-data.mjs`), code de sortie 1 en cas d'erreur.

| Fichier | Contenu | Volume |
|---|---|---|
| `styles.json` | styles de bière regroupés en 18 familles | 34 |
| `breweries.json` | brasseries réelles | 70 |
| `beers.json` | bières réelles et courantes | 120 |
| `venues.json` | bars, caves et brasseries à Paris, Lyon, Lille et Bruxelles | 36 |
| `venue-beers.json` | disponibilité d'une bière dans un lieu | 325 |

## `styles.json`

| Champ | Type | Règle |
|---|---|---|
| `family` | string | une des familles : `Lager`, `Pilsner`, `Pale Ale`, `IPA`, `Blonde`, `Ambrée`, `Brune`, `Stout`, `Porter`, `Blanche`, `Weizen`, `Saison`, `Trappiste`, `Abbaye`, `Belgian Strong`, `Sour / Lambic`, `Fruitée`, `Sans alcool` |
| `name` | string | unique |
| `description` | string | courte, en français |
| `ebcMin`, `ebcMax` | entier | couleur typique, 2 à 100, min ≤ max |
| `abvMin`, `abvMax` | nombre | degré typique en %, 0 à 14, min ≤ max |
| `ibuMin`, `ibuMax` | entier | amertume typique, 0 à 120, min ≤ max |

## `breweries.json`

| Champ | Type | Règle |
|---|---|---|
| `name` | string | unique |
| `country` | string | code ISO 3166-1 alpha-2 (`BE`, `FR`, `DE`…) |
| `city` | string | ville du site de brassage (nom français quand il existe) |

## `beers.json`

| Champ | Type | Règle |
|---|---|---|
| `name` | string | unique |
| `breweryName` | string | référence `breweries.json` → `name` |
| `styleName` | string | référence `styles.json` → `name` |
| `abv` | nombre | degré en %, une décimale, 0 à 14, dans la plage du style |
| `ibu` | entier ou `null` | 0 à 120 ; `null` quand le fabricant ne publie pas de valeur fiable |
| `ebc` | entier ou `null` | 2 à 100 ; `null` quand le fabricant ne publie pas de valeur fiable (les plages du style servent alors de repère) |
| `description` | string | 1 à 2 phrases en français |
| `aromas` | string[] | 3 à 5 valeurs distinctes parmi `fruite`, `agrumes`, `houblonne`, `floral`, `epice`, `caramel`, `malte`, `torrefie`, `cafe`, `chocolat`, `miel`, `banane`, `clou-de-girofle`, `acidulee`, `boisee`, `herbace`, `fume`, `biscuit` |
| `formats` | string[] | 1 à 3 valeurs distinctes parmi `bottle`, `can`, `draft` |
| `country` | string | ISO-2, identique à celui de la brasserie |
| `imageUrl` | `null` | pas d'image fournie |

## `venues.json`

| Champ | Type | Règle |
|---|---|---|
| `name` | string | unique |
| `type` | string | `bar`, `shop` (cave, magasin) ou `brewery` |
| `city` | string | `Paris` (14), `Lyon` (6), `Lille` (6) ou `Bruxelles` (10) |
| `address` | string | adresse postale |
| `latitude`, `longitude` | nombre | WGS 84, à moins de 0,12° du centre de la ville |
| `description` | string | une phrase en français |

## `venue-beers.json`

| Champ | Type | Règle |
|---|---|---|
| `venueName` | string | référence `venues.json` → `name` |
| `beerName` | string | référence `beers.json` → `name` ; le couple lieu + bière est unique |
| `status` | string | `confirmed`, `maybeGone`, `gone` ou `unknown` |
| `lastConfirmedDaysAgo` | entier ou `null` | jours depuis la dernière confirmation, relatif à la date du seed ; `null` si et seulement si `unknown` |
| `positiveVotes` | entier | votes « Toujours là », ≥ 0 ; plus que de négatifs si `confirmed` |
| `negativeVotes` | entier | votes « Plus là », ≥ 0 ; plus que de positifs si `gone` |

Nombre de bières par lieu : 8 à 25 pour un bar, 15 à 30 pour une cave, 0 à 25 pour une brasserie (une brasserie qui ne sert que ses propres bières, absentes du catalogue, n'a aucun lien).
