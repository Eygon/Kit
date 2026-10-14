# Mousse — l'appli des amateurs de bières

> Cadrage produit (version 1). Application **mobile first** : React 19 + TypeScript + **HeroUI** côté front, .NET 8 + SQLite côté back. Développée feature par feature avec le kit `sk-*` (prep Opus -> moteur de workflow -> revue + loupe -> passage navigateur réel), ce qui sert aussi de banc d'essai du kit.

## 1. L'idée en une phrase

Un **Pokédex de bières** (« j'ai bu / je veux goûter »), couplé à une **carte communautaire** qui dit **où boire** chaque bière, avec des votes pour savoir si le bar **en a encore** ou **n'en a plus**.

## 2. Ce qu'a demandé Thomas, et ce que j'y ajoute

| Demandé | Complété |
|---|---|
| Encyclopédie des bières existantes | Fiche riche (brasserie, pays, famille et style, degré, amertume IBU, couleur EBC, arômes, formats), **rareté** calculée, bières similaires. |
| « Déjà bues » comme un Pokédex | Carte **grisée « ??? »** tant que non bue, **tamponnée** avec la date une fois bue ; progression globale et **par style** (anneaux) ; **badges** à débloquer ; liste d'envies « à goûter ». |
| Où et quand on l'a bue + photo du moment | Un **check-in** (dégustation) = date et heure, lieu (bar / magasin de la carte ou texte libre), **photo**, note, arômes ressentis, format (pression, bouteille, canette), prix, commentaire. Plusieurs check-ins par bière : **historique** daté sur la fiche. |
| Carte des bars et magasins avec leurs bières | Lieux : bar, magasin / cave, brasserie. **Disponibilité d'une bière dans un lieu** avec **vote** : « Toujours là » / « Plus là ». |
| Système de vote (plus / encore) | État calculé avec **fraîcheur** : *Confirmée* (votes récents positifs), *Peut-être épuisée*, *Épuisée*, *Inconnue* ; « confirmée il y a 2 j par 5 personnes ». **Un vote par personne, bière et lieu toutes les 24 h** (anti-abus), le plus récent compte. |
| Filtres sur la carte et l'encyclopédie | Recherche texte, famille / style, degré (curseur), amertume, couleur, pays, format ; « déjà bues / à goûter / favorites » ; sur la carte : **« où boire cette bière »**, par style, type de lieu, disponibilité confirmée seulement, **rayon autour de moi**. |
| Mobile first | Barre d'onglets **en bas**, feuilles (drawers) au lieu de modales, cibles tactiles >= 44 px, carte plein écran avec **liste en tiroir**, pas de défilement horizontal à 360 px. |

Idées ajoutées par moi (à garder ou couper) : badges, rareté, bières similaires, statistiques de goût (styles préférés, degré moyen, pays goûtés, série de jours), liste d'envies, partage d'un check-in, proposition d'une bière ou d'un lieu manquant par la communauté.

## 3. Écrans (mobile)

1. **Encyclopédie** (onglet 1) : en-tête de progression « 42 / 120 découvertes », barre de recherche, puces de filtres rapides, grille de cartes (2 colonnes à 360 px) ; tiroir « Filtres » (famille, style, degré, amertume, couleur, pays, format, statut).
2. **Fiche bière** : photo / étiquette, identité, caractéristiques, rareté, état Pokédex, **historique de mes dégustations** (date, lieu, photo), « où en boire » (lieux proches avec état), bières similaires, boutons « Je l'ai bue » et « À goûter ».
3. **Check-in** (feuille plein écran) : bière, photo (appareil photo ou galerie), note, arômes, lieu, format, prix, commentaire.
4. **Carte** (onglet 2) : carte OpenStreetMap, repères par type et état, tiroir liste, filtres, bouton « autour de moi ».
5. **Fiche lieu** : adresse, bières du lieu avec état et vote, « signaler une bière ici », « modifier / signaler une erreur ».
6. **Journal** (onglet 3) : mes check-ins en frise, photos, filtres par bière / lieu / mois.
7. **Profil** (onglet 4) : utilisateur de démonstration (1 à 3), progression, badges, statistiques, liste d'envies.

## 4. Modèle de données

`User` · `Brewery`(nom, pays) · `BeerStyle`(famille, nom) · `Beer`(nom, brasserie, style, degré, IBU, EBC, description, arômes, formats, image) · `Venue`(nom, type, adresse, latitude, longitude) · `VenueBeer`(lieu, bière, état calculé, dernière confirmation, nombre de votes) · `AvailabilityVote`(utilisateur, lieu, bière, sens, date) · `Checkin`(utilisateur, bière, date, lieu ou texte, note, arômes, format, prix, commentaire) · `Photo`(checkin, contenu, type) · `WishlistItem`(utilisateur, bière) · `Badge`/`UserBadge`.

## 5. API (REST `/api/v1`, identité par `X-User-Id`)

`GET /beers` (recherche, filtres, tri, pagination, facettes) · `GET /beers/{id}` · `GET /beer-styles` · `POST /beers` (proposition) · `GET /me/dex` (progression globale et par style) · `GET|POST /checkins`, `DELETE /checkins/{id}`, `GET /photos/{id}` (multipart, 5 Mo, jpeg/png/webp) · `GET /venues` (boîte englobante, filtres, rayon) · `POST /venues` · `GET /venues/{id}/beers` · `POST /venues/{id}/beers` (signaler) · `POST /venues/{id}/beers/{beerId}/votes` · `GET|POST|DELETE /me/wishlist` · `GET /me/badges` · `GET /me/stats`.

## 6. Découpage en features pour le kit

| # | Feature | Contenu | Genre pour le kit |
|---|---|---|---|
| F1 | **Catalogue** | Données de départ (≈120 vraies bières, brasseries, styles), `GET /beers` filtré et paginé, écran Encyclopédie (grille, recherche, filtres), fiche bière | back + front, filtres, pagination, données |
| F2 | **Dégustations et Pokédex** | Check-in avec photo, historique sur la fiche, état grisé / tamponné, progression, liste d'envies | upload de fichier, états visuels, caméra |
| F3 | **Carte et disponibilité** | Lieux, carte Leaflet, bières par lieu, votes avec fraîcheur, filtres de carte | carte, calcul métier temporel, géolocalisation |
| F4 | **Profil, badges, statistiques** | Progression par style, badges, statistiques, partage | agrégats, règles de déblocage |
| F5 | **Finition mobile** | Hors-ligne léger, états vides et erreurs, accessibilité, passage 360 px | transversal |


### Ajouts demandés par Thomas le 13 octobre au soir (backlog, dans cet ordre)

| # | Feature | Contenu |
|---|---|---|
| F6 | **Recherche d'un bar sur la carte** | Champ de recherche par nom de bar / ville sur la carte ; fiche du bar avec ses bières et, pour chacune, « déjà bue / pas encore » pour l'utilisateur courant. |
| F7 | **Critères, notes et avis** | Pour chaque bière : niveau d'amertume et autres critères (couleur, douceur, acidité, corps), note moyenne et avis des utilisateurs (un avis par personne et par bière, modifiable). |
| F5 | **Profil social** | Photo de profil à choisir parmi une sélection ; **niveau et titre** selon les bières bues ; **collections** (« mes Pokédex » : listes de bières nommées, la liste d'envies en est une) ; **suivre** un profil ; **fil d'actualité** sur la page d'accueil avec les dernières activités des profils suivis. |

## 7. Hors périmètre (v1)

Comptes avec mots de passe, modération, paiement, réseau social complet (amis, fil), recommandation par apprentissage, application native (PWA possible ensuite).

### Polish (13-14 octobre) : tout est traité
- Avatar de l'auteur d'un avis : `authorAvatar` ajouté au contrat côté back et affiché (fait, polish 4).
- Libellés de mois de l'histogramme : une initiale par mois (polish 1).
- Histogramme des notes : arrondi à l'étoile la plus proche, demi vers le haut (4,5 compte dans « 5 étoiles ») (polish 4).
- Carte : un seul bandeau (polish 1), repères regroupés (F8), barre d'outils sur 2 rangées (polish 4).
- Collections : bouton « Nouvelle collection » dans la section ; message « 20 collections au plus » à la limite (polish 4).
- Placeholder de recherche de l'Encyclopédie raccourci (polish 4).

### Backlog ergonomie / manques (14 octobre, demande de Thomas : « ergonomie ou features nécessaires manquantes »)
Audit rapide (lecture du produit en l'état) : le lieu d'une dégustation est du texte libre (la carte et le Journal ne se parlent pas) ; le catalogue est fermé (120 bières : impossible d'enregistrer une bière absente) ; une dégustation ne se modifie pas (suppression seulement) ; le Journal n'a ni recherche, ni filtre, ni regroupement ; le fil n'a pas de réaction ; pas de vraie authentification (sélecteur de démo, hors périmètre du banc).
- **F11 Lieux de dégustation liés à la carte** (back + front) : complétion des lieux dans « Je l'ai bue », `venueId`, « vous avez bu ici N fois », filtre carte « Lieux où j'ai bu », lien depuis le Journal. *(prep lancée)*
- **F12 Proposer une bière manquante** (back + front) : POST/PATCH/DELETE de bières communautaires, doublon 409, repère « Proposée par », Pokédex officiel inchangé (à confirmer). *(prep lancée)*
- **F13 Journal : modifier, chercher, filtrer** : PATCH d'une dégustation (note, lieu, date, format, commentaire, photo), recherche texte, filtre par note et par mois, titres de mois. À lancer après F11 (même formulaire).
- **F14 Réactions « Santé ! » sur le fil** : une réaction par utilisateur et par carte, compteur, qui a réagi.
- **F15 Autres bières de la brasserie / du même style** sur la fiche.
- Hors périmètre du banc, à signaler : authentification réelle (inscription, mot de passe), notifications, export/suppression des données.
