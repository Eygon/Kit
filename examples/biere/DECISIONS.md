# Décisions prises en ton absence — à confirmer ou changer

Pendant la nuit, l'agent de préparation posait des questions et je répondais « au nom de Thomas ». Voici toutes ces décisions au même endroit. Pour chacune : ce qui est fait, pourquoi, et la façon de changer d'avis. Le détail est dans le `plan.md` de chaque feature (section « à confirmer par Thomas »).

Si tu ne dis rien, tout reste tel quel.

## Choix qui se voient dans l'appli

| # | Décision | Pourquoi |
|---|---|---|
| 1 | **« Déjà bue » = dégustée n'importe où**, pas seulement dans ce bar (F6) | C'est ce que dit le Pokédex : une bière découverte l'est partout |
| 2 | **Recherche d'un bar sur toute la carte**, avec les filtres actifs, pas seulement la zone visible (F6) | Chercher « Lyon » depuis Paris doit marcher |
| 3 | **Onglets : Accueil, Bières, Carte, Journal, Profil** ; l'Encyclopédie passe sur `/bieres` et l'onglet s'appelle « Bières » (F5) | 5 onglets tiennent à 360 px, « Encyclopédie » était coupé |
| 4 | **Fil d'actualité calculé à la volée** (dégustations, découvertes du jour, montées de niveau, avis), sans table d'historique (F5) | Pas de données à rattraper, une carte disparaît si on supprime la dégustation |
| 5 | **Niveaux : 0, 5, 15, 30, 60, 100 bières découvertes** (Curieux → Légende de la mousse) (F5) | Courbe douce au début |
| 6 | **Collections : 20 au plus, nom de 1 à 40 caractères, unique sans tenir compte des majuscules ni des accents**, visibles seulement par les abonnés ; « À goûter » en tête, ni renommable ni supprimable (F5) | Évite les doublons « Été » / « été » |
| 7 | **Un avis demande d'avoir bu la bière pour être créé** ; modifier ou supprimer reste possible ; les 20 avis de démo de Bob et Carol n'ont pas de dégustation (F7) | Avis crédible, mais démo lisible |
| 8 | **Amertume = IBU** ; **couleur = EBC**, et si la bière n'a pas d'EBC on montre la fourchette « typique du style » (jamais présentée comme la valeur de la bière) (F7) | Aucune bière du jeu de départ n'a d'EBC |
| 9 | **Un critère (douceur, acidité, corps) n'est affiché qu'à partir de 3 avis** (F7) | Évite qu'un seul avis fasse la « moyenne » |
| 10 | **La note 4,5 est comptée dans « 4 étoiles »** de l'histogramme (arrondi bas) (F7) | À revoir : on peut préférer demi-étoiles |
| 11 | **Pastille de regroupement brune**, pas verte (F8) | Le vert veut dire « confirmé » sur un repère |
| 12 | **Disponibilité d'une bière** : le dernier vote négatif l'emporte ; un seul vote positif = « Inconnue » ; 409 si on revote avant le délai (F3) | Règle simple et lisible |
| 13 | **État d'un lieu = meilleur état de ses bières**. Résultat : 32 lieux sur 36 sont « confirmés » sans filtre ; le repère n'informe vraiment qu'avec un filtre bière ou famille (F3) | À revoir si tu veux un état propre au lieu |
| 14 | **Badges recalculés à chaque lecture** : ils se reverrouillent si on supprime une dégustation (F4) | Pas de table de badges |
| 15 | **Degré moyen et pays** comptés par bière découverte ; **famille préférée** par dégustation (F4) | — |
| 16 | **Réessayer recharge la page** quand une page lourde ne s'est pas chargée (F9) | Le navigateur garde l'échec en mémoire : sinon le bouton ne fait rien |

| 24 | **Lieu d'une dégustation (F11)** : le champ « Lieu » propose les lieux de la carte (nom ou ville, sans casse ni accents) ; en choisir un lie la dégustation à ce lieu ; la moindre frappe ensuite retire le lien ; un texte libre reste possible et reste obligatoire | Évite les fautes de frappe sans interdire « Chez moi » |
| 25 | **« Vous avez bu ici N fois (dernière fois le …) »** compte seulement les dégustations liées au lieu, jamais celles dont le texte ressemble au nom ; les anciennes dégustations ne sont pas rattrapées (F11) | Pas de devinette sur des textes libres. Une base neuve crée la démo déjà liée |
| 26 | **Un lieu inconnu à l'enregistrement = erreur 404 « Venue N not found. »** ; le filtre « Lieux où j'ai bu » est dans l'adresse de la carte (`visited=1`) et une autre valeur côté API = 400 (F11) | Même règle que pour les bières inconnues |
| 27 | **La carte s'ouvre sur un lieu par l'adresse** (`/carte?venue=N`) ; fermer la fiche retire le lieu de l'adresse ; lieu introuvable = message « Ce lieu n'est plus sur la carte. » ; dans le Journal et l'historique d'une bière, le lieu lié est un lien (F11) | Lien partageable, et Journal et carte se parlent |

## Choix techniques

| # | Décision | Pourquoi |
|---|---|---|
| 17 | **Les lectures n'affichent pas de toast d'erreur** : une alerte avec « Réessayer » dans la section (écart au standard `api/error-handling`, F1 à F7) | Un toast disparaît, l'alerte reste |
| 18 | **L'identité est un en-tête `X-User-Id`**, un id inconnu donne 401 ; `GET /photos/{id}` est public (lien secret UUID) (F2) | Pas d'authentification dans ce banc |
| 19 | **Seed de démo social** derrière `SEED_DEMO_ACTIVITY` (activé par défaut, coupé en test) : dégustations de Bob et Carol sur 30 jours, Alice les suit (F5) | Ne casse pas les tests existants |
| 20 | **Recherche de lieux avec colonnes normalisées** (`searchName`, `searchCity`) + rattrapage au démarrage pour les bases déjà remplies (F6) | Pas de base à recréer |
| 21 | **Budgets du bundle** : fichier d'entrée ≤ 450 kB et JS initial ≤ 900 kB ; 5 pages chargées à la demande (F9) | 1 147 kB → 890 kB au départ |
| 22 | **Polices écrites à la main** (latin et latin-ext seulement) plutôt que les CSS par sous-ensemble de la bibliothèque (F9) | Ces CSS font télécharger latin-ext à chaque visite |
| 23 | **Appli installable + hors ligne (F10)** : vite-plugin-pwa 1.3.0 et sharp 0.35.4 en devDependency (versions exactes) ; icône d'appli tirée de la mascotte (écart au standard `ui/mascot`) ; cache de lecture des GET /api/v1 hors photos (réseau d'abord, 7 jours), jamais les écritures ; cache vidé au changement d'utilisateur de démo | Pas de file d'attente d'écritures hors ligne (hors périmètre). Réversible : supprimer `public/icons` et le plugin |

## À savoir (limites, pas des choix)

- Les tuiles OpenStreetMap ne sont pas joignables depuis mon environnement : la carte reste utilisable (message « Fond de carte indisponible »), mais je n'ai pas pu la voir avec son fond.
- Deux défauts connus, mineurs : le bouton « Nouvelle collection » est placé après la section et non dedans ; un 409 à la 21ᵉ collection affiche « Ce nom est déjà pris » (cas rare : liste périmée).
- Deux fichiers vides à la racine de ma machine (`/fr.txt`, `/map.test.bak`) : je n'ai pas pu les supprimer, ils ne font pas partie du projet.
