# Mousse — faux serveur d'API dans le navigateur

Ce dossier permet de montrer le front de Mousse (`front`, branche `dev`, F1 à F13) en démo hébergée, sans back. `mock-api.js` remplace `window.fetch` pour toute URL qui commence par `https://mousse.mock/api/v1` et répond comme le back NestJS (`back`, branche `dev`) : mêmes statuts, mêmes corps JSON, mêmes erreurs `{ message }`, mêmes règles de validation, mêmes tris, même identification par l'en-tête `X-User-Id` (1 Alice, 2 Bob, 3 Carol ; un id absent ou inconnu donne 401). Les autres URL partent vers le vrai `fetch`. Le script ne fait aucun appel réseau.

| Fichier | Rôle |
|---|---|
| `mock-api.js` | Le faux serveur. Un seul fichier ES2020, sans dépendance. C'est la logique du back portée en JavaScript. |
| `seed-data.js` | Définit `window.__MOUSSE_SEED__` : les JSON de seed du back (`src/database/seed/data/*.json`, dont les 70 brasseries), plus les utilisateurs et les abonnements de `seed.constants.ts`. Chaque dégustation de démo porte son `venueId`, calculé comme `data-seeder.ts` (lieu dont le nom est exactement sa place, sinon `null`). |
| `build-seed.mjs` | Régénère `seed-data.js` : `node build-seed.mjs [chemin/du/back]`. |
| `diff-test.mjs` | Test différentiel du mock contre le vrai back (voir plus bas). |

## Inclusion

Les deux scripts doivent être chargés **avant** le bundle du front :

```html
<script src="seed-data.js"></script>
<script src="mock-api.js"></script>
<script type="module" src="/assets/index-xxxx.js"></script>
```

Le front doit être construit avec `VITE_API_URL=https://mousse.mock`. Ses services appellent alors `https://mousse.mock/api/v1/...`.

Photos : `POST /checkins` lit le `FormData` (`body.get`). Le fichier envoyé dans le champ `file` est contrôlé comme dans le back : 5 Mo au plus, sinon 413, et signature JPEG, PNG ou WebP, sinon 400. Il est ensuite gardé sous forme de data URL dans `window.__mockPhotos`, une `Map` qui associe le `photoId` à l'URL. Le front affiche les photos avec `<img src=".../photos/{id}">`, ce qui ne passe pas par `fetch`. Le packaging doit donc remplacer cette URL par `window.__mockPhotos.get(id)`. Le mock ne sert pas `/photos/{id}`.

## État

- L'état est gardé en mémoire et persisté dans `localStorage` sous la clé `mousse-mock-state-v1`, avec les photos en data URL. Il porte un numéro de version (2 depuis F11-F13) : un état d'une autre version est ignoré et la démo repart du seed. Si le quota est dépassé, l'état est enregistré sans les photos. Tous les accès au stockage sont dans un `try/catch`, donc la page marche aussi sans `localStorage` (navigation privée, stockage bloqué) : l'état dure alors le temps de la page.
- `window.__mockReset()` vide l'état et repart du seed. Il faut ensuite recharger la page pour que le cache TanStack Query du front se vide aussi.
- Les dates relatives du seed (`daysAgo`, `lastConfirmedDaysAgo` des votes) sont calculées à partir de `new Date()` au premier chargement. L'état persisté garde ensuite ces dates : d'un jour à l'autre, la démo « vieillit » jusqu'au prochain `__mockReset()`.
- Chaque réponse arrive avec une latence simulée de 30 à 120 ms, pour que les états de chargement s'affichent. Un `AbortSignal` (par exemple `AbortSignal.timeout` du front) est respecté.
- Options de test, à poser avant `mock-api.js` : `window.__MOUSSE_MOCK_OPTIONS__ = { latency: [min, max], seedNow: ms | { reviews, votes, checkins }, persist: false }`. `seedNow` sert au test différentiel, pour caler les dates du seed sur celles du back.

## Ce qui est porté

C'est la logique du back, pas des réponses figées.

- **Catalogue** : recherche insensible à la casse et aux accents (même `normalizeSearchText` : NFD, suppression des diacritiques, `ß` → `ss`). Filtres famille, style, pays, format, degré, statut (`drunk` / `wishlist` / `untasted`) et note minimale. Facettes calculées chacune sans son propre filtre. Tris `name`, `abv`, `brewery` et `rating`, avec `LOWER()` ASCII et comparaison binaire comme SQLite, puis départage par id. Niveaux d'amertume et de couleur, et plage de couleur du style.
- **Recherche tolérante (F13)** : copie de `src/common/text/` (distance de Levenshtein, mots d'au moins 4 lettres, distance 1 jusqu'à 7 lettres, 2 dès 8). Si `q` ne donne rien, filtres compris, `GET /beers` retente sur le nom et la brasserie de toutes les bières et rend `isApproximate: true` (filtres, tri, pagination et facettes appliqués aux bières proches) ; `GET /venues?q=` fait de même sur le nom et la ville, chaque lieu rendu par le repli portant `isApproximateMatch: true`, sans tri par distance, comme le back.
- **Bières communautaires (F12)** : `GET /breweries` (tri `LOWER()` puis id) et `POST /beers` : nom et brasserie remis sur une ligne, pays ISO 3166 (liste du back), degré à une décimale entre 0 et 20, description facultative. Ordre des contrôles 400 → 404 style → 429 (10 propositions sur 24 h glissantes) → 409 (même nom et même brasserie, sans casse ni accents ; le message cite le nom normalisé, comme le back). Brasserie réutilisée si son nom normalisé existe, sinon créée (pays de la bière, ville vide). Chaque carte et fiche porte `source`, `createdBy` et `createdByName` (nom courant de l'auteur). Le Pokédex (`total`, familles, `discovered`), le badge complétiste et les spécialistes ne comptent que les 120 bières officielles ; `beers` du dex, les niveaux et les autres badges comptent toutes les découvertes.
- **Avis** : création, remplacement (l'id du premier avis est conservé ; l'auto-incrément est consommé comme le fait l'upsert SQLite) et suppression. 403 si l'utilisateur n'a pas dégusté la bière. Moyennes arrondies au dixième. Histogramme arrondi à l'étoile la plus proche, la demi-étoile allant vers le haut (`CAST(rating + 0.5 AS INTEGER)`). Moyenne d'un critère affichée seulement à partir de 3 avis.
- **Dégustations** : validation du multipart (arômes séparés par des virgules, prix à 2 décimales, date ISO 8601 stricte, tolérance de 5 min dans le futur). `isFirstDiscovery`. Suppression réservée au propriétaire (403 sinon). F11 : `venueId` facultatif à la création (400 s'il n'est pas un entier ≥ 1, 404 « Venue N not found. » après le 404 de la bière, rien n'est écrit, photo comprise), rendu partout (`null` pour un lieu libre). `GET /checkins/{id}` (404 puis 403). F13 : `PATCH /checkins/{id}` en JSON, chaque champ facultatif ; `null` est refusé pour `drankAt`, `place`, `aromas`, `format` et `comment` (`@ValidateIf`) et efface `rating`, `price` et `venueId` ; `place` sans `venueId` remet le lien à `null`. Ordre : 400 forme (dont « property beerId should not exist ») → 400 « At least one field must be supplied. » → 400 date future → 400 « venueId requires place. » → 404 → 403 → 404 lieu.
- **Dex, stats et badges** recalculés à chaque requête : séries de jours au fuseau de Paris, histogramme des 12 derniers mois, pays, famille favorite, spécialistes par famille, globe-trotteur, photographe, habitué, sentinelle.
- **Lieux** : bbox, type, recherche avec tri par pertinence (préfixe du nom, puis nom, puis ville), filtres `beer`, `family`, `style`, `undiscovered`, `confirmedOnly` et `visited` (F11 : lieux où l'utilisateur courant a au moins une dégustation liée ; toute autre valeur que `true`/`false` donne 400), distance haversine, rayon. Chaque lieu (liste, recherche, `GET /venues/{id}`, création) porte `checkinCount` et `lastCheckinAt` de l'utilisateur courant. Disponibilité calculée sur une fenêtre de 30 jours (dernier vote de chaque utilisateur, seuil de 2 votes). Un second vote dans les 24 h donne 409, avec le message du back (« Try again in N hours. »), et `nextVoteAt` est renseigné. Proposition de lieu (unicité du nom insensible à la casse) et signalement d'une bière.
- **Social** : niveaux 0/5/15/30/60/100 avec leurs titres, profils, abonnés et abonnements, suivre et ne plus suivre, changement de nom et d'avatar. Fil d'actualité calculé (dégustations, cartes « découvertes du jour » au fuseau de Paris, montées de niveau, avis), avec le même tri et la même pagination par 20.
- **Collections** : liste d'envies et collections personnelles (20 au plus par utilisateur, 200 bières au plus par collection, unicité du nom insensible à la casse), lecture réservée à soi et aux profils suivis (403 sinon).
- **Validation** : reproduction de class-validator et class-transformer (whitelist + `forbidNonWhitelisted`, messages par défaut, ordre des messages) et de `ParseIntPipe`. Une route sans `@Query()` ignore sa chaîne de requête, comme Nest. Ordre des contrôles 401 → 400 → 404 → 403 → 409. Une route inconnue donne 404 `Cannot GET /api/v1/...`. Les routes sont insensibles à la casse et tolèrent la barre finale, comme Express.

## Non porté volontairement

Ce que le front n'appelle jamais : `GET /users/me`, `GET /photos/{id}` (une balise `<img>`, voir plus haut), `/health`, les en-têtes CORS et les requêtes `OPTIONS`/`HEAD`. Les tuiles de carte ne sont pas gérées non plus. Ces routes répondent par un 404 `Cannot <METHOD> <url>`.

## Limites connues

- Un JSON mal formé donne 400 avec un message générique, et ce contrôle a lieu après l'identification. Dans le back, c'est le message de body-parser, avant le 401. Le front envoie toujours du JSON valide.
- Les paramètres de requête sont lus avec `URLSearchParams`. Express 5 utilise le parseur `querystring` de Node, et les deux peuvent différer sur des chaînes mal encodées. La syntaxe imbriquée de multer (`champ[clé]`) n'est pas reproduite.
- `ROUND(AVG(...), 1)` de SQLite est reproduit par un arrondi décimal au demi supérieur. Les deux sont identiques tant qu'une bière a au plus 3 avis, ce qui est toujours le cas avec 3 utilisateurs.
- Les tris `localeCompare` (noms de lieux en `fr`, noms d'utilisateurs, pays) dépendent de l'ICU du navigateur. Le test a tourné sous Node 22.
- Un seul onglet à la fois : deux onglets ouverts sur la démo écrasent l'état l'un de l'autre dans `localStorage`.
- Les ids des photos sont des UUID v4 aléatoires, comme dans le back.

## Test différentiel

```bash
/opt/node22/bin/node diff-test.mjs   # BACK_DIR=/home/user/biere/back BACK_PORT=5095 par défaut
```

Le script lance le vrai back (`node dist/main.js` avec `PORT=5095 DATABASE_PATH=:memory: SEED_DEMO_ACTIVITY=true`) ; il faut d'abord `node node_modules/@nestjs/cli/bin/nest.js build` si `dist` est absent ou périmé. Avec `BACK_URL`, il utilise un back déjà lancé (fraîchement démarré, mêmes variables), par exemple quand un autre script arrête les processus `dist/main.js`. Il charge ensuite `seed-data.js` et `mock-api.js` dans un contexte `vm`, avec un faux `window`, un faux `localStorage` et un `fetch` qui refuse le réseau. Il cale les dates du seed sur celles du back, puis compare le statut et le corps de chaque réponse. Avant la comparaison, les horodatages créés pendant le test sont remplacés par `<RECENT+Nh>` et les UUID par `<UUID>`. Les étapes :

1. 495 requêtes GET, dont 154 pour F11-F13. Les 341 d'origine : listes avec chaque filtre et des combinaisons, pagination, recherches accentuées, tris, détails, avis, « où boire », dex, stats, badges, profils, abonnés, fil, collections, lieux (bbox, type, `q`, `undiscovered`, `confirmedOnly`, position, rayon), bières d'un lieu, et cas d'erreur, pour les utilisateurs 1, 2 et 3, sans identité et avec une identité invalide ;
2. 809 requêtes de scénarios d'écriture, identiques des deux côtés, avec relectures. Les scénarios d'origine (490 avec les relectures enrichies de `visited`, `GET /venues/{id}`, `/breweries` et `q=cantilon`) : dégustations avec et sans photo (y compris fichier trop gros, deux fichiers, champ inattendu, image non reconnue, date future, bière inconnue, validation), suppression, suivre et ne plus suivre, votes de disponibilité (dont le 409 et `nextVoteAt`), signalement d'une bière et proposition de lieu, avis (créer, remplacer, supprimer, 403), liste d'envies, collections (créer, ajouter, renommer, supprimer, droits de lecture), changement de nom et d'avatar. Puis 319 requêtes F11-F13, jouées après les autres (les ids créés sont lus dans les réponses du back) : dégustations liées à un lieu (lieu inconnu, `venueId` invalide, ordre des contrôles avec bière inconnue, date future et photo refusée), visites et `visited` ; `PATCH` (chaque champ, lien, texte libre, `null`, 29 corps refusés, limites, 400 avant 404, 404 puis 403, 403 avant 404 lieu, corps vide ou absent, sans identité) et effet sur le fil, les stats et les badges ; `POST /beers` (brasserie créée ou réutilisée sans casse ni accents, doublons, 12 corps refusés, style inconnu, quota de 10 puis 429, 404 avant 429, 429 avant 409) puis dégustation, avis, liste d'envies, collection, lien de lieu et vote sur une bière communautaire, Pokédex et badges, `createdByName` après changement de nom ;
3. 78 relectures avec un second mock rechargé depuis le même `localStorage`, pour vérifier la persistance. Le test contrôle aussi `window.__mockPhotos` et `__mockReset()`.

Dernier résultat : **1382 requêtes comparées (857 avant F11-F13), 0 différence**. Statuts du back sur ce jeu : 200×1047, 201×64, 204×7, 400×146, 401×19, 403×28, 404×55, 409×13, 413×1, 429×2. Il ne reste aucun écart observé ; les divergences théoriques sont listées dans « Limites connues ».
