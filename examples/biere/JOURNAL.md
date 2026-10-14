# Journal du projet Mousse (banc du kit)

## F1 Catalogue (13 octobre)
- Prep Opus : 11 US (back US1-5 || front US6-11), contrat OpenAPI écrit en prep, 3 questions (hypothèses, trio). Écarts à confirmer par Thomas : lectures du catalogue sans toast (D2), seeder qui lit les JSON avec ids attribués à l'insertion (D4), Record de tri dans beer-sort.enum.ts.
- Moteur `speckit-us-after-parallel.js` : back US1-5 PASS (2 corrigées par la revue Opus). Front : US6 ESCALATE (le trio imposait des helpers de facettes dans beerPageMapper alors que le standard model-dto-mapper impose 3 fichiers sans exception) → tranché au nom de Thomas : ajouter les 2 mappers ; puis US7-11 PASS.
- Défaut du banc (pas du kit) vu par la revue : `mousse-impl.py` laissait `.sk/repos.json` modifié et le worker l'a commité → script corrigé (skip-worktree).
- Review-lens : back 6 tests retenus / 7 pistes (aucun défaut de prod) ; front 18 tests retenus + 2 défauts de production trouvés par mutation (libellés anglais de 2 familles, tiroir qui se ferme quand la référence de la requête change).
- Passage réel 390×844 (API NestJS réelle + Vite sur instantané figé) : 37 vérifications, 36 PASS. 2 défauts de production vus au navigateur seulement : choix du tiroir (pastille au-dessus du libellé : HeroUI v3 attend Field > Content > Control+Label) et hauteurs de cartes inégales dans une rangée. Corrigés (puces DA 44 px, `h-full`). Limite connue : langue fixe en français (choix de la langue prévu en F4).
- Trouvé à la revue du back : le garde accepte un `X-User-Id` inexistant (99 → 200) ; ajouté comme pré-requis de F2.
- Chiffres : front 66 fichiers / 460 tests, back 61 fichiers / 280 tests.

## Constats pour le kit
- Le kit a deux fois évité de livrer un défaut grâce à l'escalade de la revue (mappers) et à la loupe de tests (2 défauts de prod que les tests écrits par le worker ne voyaient pas).
- Une prep ne doit pas écrire dans tasks.md un écart à un standard « sans exception » sans le tracer comme écart à confirmer : à vérifier en audit (piste).
- Serveurs de dev oubliés d'un cycle précédent (Vite :5173) servent la mauvaise application : le script de passage réel doit vérifier le titre de la page avant de tester.

## F2 Dégustations et Pokédex (13 octobre)
- Prep Opus : 18 US dont 4 « run suivant » (photo dans la feuille, vignettes, Journal, suppression), 87 tâches. 3 décisions au nom de Thomas (D2=b module « tastings » sous BeersModule, D3=a photos publiques par UUID, portée réduite). À confirmer par Thomas : garde utilisateur qui interroge la base (inconnu → 401), `GET /photos/{id}` publique, lectures sans toast.
- Moteur : back US1-9 || front US10-14. Front : 5 PASS d'affilée (US10, US14 corrigées par la revue). Back : US1-4 PASS, US5 ESCALATE (le trio ne prévoyait pas de mapper pour une lecture du repository : 2e fois après F1 US6 front) → mapper ajouté, fix, puis US6-9 PASS.
- Défaut du banc : `data-model.md` n'était pas copié dans les slots d'implémentation (2 workers l'ont signalé) → script corrigé.
- Review-lens : back 7 pistes retenues (aucun défaut de prod) ; front 8 pistes retenues (fuseau horaire d'affichage et d'envoi, bornes du prix, retrait optimiste de l'envie…).
- Passage réel : API 49/49 sur des cas hostiles (faux JPEG, 6 Mo, CRLF, 10 envois simultanés, 401 avant 400…) ; navigateur 390×844 et 360×740 : 38/38. Deux défauts de production vus au navigateur seulement : (1) un commentaire de 500 caractères avec un retour à la ligne refusé (le navigateur envoie CRLF, le serveur compte 501) ; (2) un astérisque rouge « obligatoire » dans CHAQUE choix du Format (HeroUI propage data-required aux Label enfants).
- Oracle `unreachable` : ignore maintenant le texte masqué visuellement (bouton « Rejeter » sr-only des tiroirs de la lib), faux positif vu 3 fois.
- Chiffres : front 90 fichiers / 720 tests, back 90 fichiers / 631 tests.

## F3 Carte et disponibilité (13 octobre)
- Prep Opus : 19 US dont 3 « run suivant » (signaler une bière, proposer un lieu, « Où en boire » sur la fiche), 4 questions de clarify : votes de départ anonymes (le back n'a que 3 utilisateurs, la règle « un votant = son dernier vote » ne peut pas porter 14 votants), ordre de la règle de disponibilité (le dernier vote négatif récent prime, un seul positif = Inconnue), 409 avec `nextVoteAt`, portée. Contrat écrit en prep.
- Moteur : back US1-8 || front US9-16 (en parallèle de F2). 4 arrêts sur escalade, tous tranchés au nom de Thomas : AC2 vs données du seed (5 liens « gone » sans vote positif mais avec une date : AC2 amendée), chemins de props manquants (2 fois : `venueMap.ts`, `venueListDrawer.ts`), défaut réel trouvé par la revue (toucher un repère avec la liste ouverte laissait deux panneaux) corrigé.
- Fusion F2+F3 : conflits additifs dans les modules partagés ; résolus par deux agents (back 1050 puis 1078 tests, front 1034 tests).
- Review-lens : back 14 pistes retenues (bornes une par une, ordre des contrôles, identité avant saisie, plus récent vote gagne…), front 11 pistes retenues. Défauts de prod trouvés par la loupe : lectures qui avalaient l'erreur (« Aucun lieu » au lieu de l'alerte), repères à 36 px au lieu de 44, pastille « Filtres » qui comptait un rayon non appliqué.
- Passage réel : API 48/48 (bornes, rayon, distance, votes 409, 8 votes simultanés = 1 seul accepté, XSS dans un nom de lieu) ; navigateur 29/29. Défauts vus au navigateur seulement : boutons de zoom Leaflet recouverts par la barre flottante (nouvel oracle `covered` du kit), commutateur « confirmée seulement » avec le libellé sous le bouton.
- Observation produit : sans filtre de bière, l'état d'un lieu = meilleur état de ses bières, donc 32 lieux sur 36 sont « confirmés » : le repère n'est vraiment informatif qu'avec le filtre bière ou famille. Défaut théorique noté (pas corrigé) : une violation d'unicité en base ne serait pas traduite en 409 (impossible avec SQLite synchrone, possible avec un autre moteur).
- Limite du bac à sable : les tuiles OpenStreetMap ne sont pas joignables ; l'écran affiche « Fond de carte indisponible » et reste utilisable (vérifié).
- Kit : nouvel oracle `covered` (contrôle recouvert par un autre élément), documenté dans sk-e2e.md ; `unreachable` ignore le texte masqué visuellement.
- Chiffres finaux : front 120 fichiers / 1034 tests, back 114 fichiers / 1078 tests, E2E F1 37/37 (anglais levé par F4), F2 38/38, F3 29/29, API F2 49/49, F3 48/48.

## F4 Profil, badges, stats (13-14 octobre)
- Prep Opus : back US1-4 (stats, badges, série de jours, Sentinelle/Cartographe) || front US5-11 (langue, anneaux par famille, partage, badges, stats, histogramme 12 mois, envies).
- Moteur : 10 US sur 11 PASS d'emblée ; US9 en ESCALATE (spec « 6.5% » en anglais vs tâche qui impose `formatAbv` = « 6.5 % ») → tranché « 6.5 % » (espace insécable), spec corrigée ; US10-11 relancées en compact (arguments `{root, dir, banc, ids}`).
- Review-lens : back 4 pistes (égalité de famille, corps zéro complet, fuseau Paris, cible du Complétiste) ; front 14 pistes dont 1 **défaut de production** : la date « Débloqué le » suivait le fuseau du téléphone au lieu du jour de Paris → corrigé.
- Passage réel 390×844 : 29/29 (stats vierges puis remplies, badges débloqués, histogramme 12 barres, envies, passage en anglais persistant, suppression → badges recalculés, panne API, 360 px).
- Kit : `unreachable` tolère 2 px (select natif masqué de la lib) ; `watch` ignore un ERR_ABORTED tardif sur une requête déjà répondue (204).

## F6 Recherche de lieux + « déjà bue » (14 octobre)
- Prep Opus : back US1-4 (clés normalisées + rattrapage au démarrage, `q`, état bue, `undiscovered`) || front US5-9 (feuille de recherche, centrage, tampon, bascule « pas encore bues », filtre carte). 3 décisions au nom de Thomas : colonnes stockées + rattrapage, recherche sur toute la carte avec les filtres, « déjà bue » = n'importe où.
- Moteur : 9 US PASS sans escalade. Review-lens : back 3 pistes (combinaisons q + filtres), front 9 pistes + 1 **défaut de production** : bouton « Effacer » de la recherche à 20 px (cible tactile) → 44 px.
- Passage réel : 39/39 (API : casse, accents, `%` et `_` littéraux, 100/101 caractères, injection, isolation entre utilisateurs ; UI : anti-rebond, vide/erreur, XSS, tampon, bascule, filtre, 360 px). Oracle : la bascule HeroUI se clique par son libellé (l'input réel fait 13 px).

## F7 Amertume, critères, notes, avis (14 octobre)
- Prep Opus : 15 US (back 7 || front 8), 61 tâches ; l'amertume vient de l'IBU, la couleur de l'EBC avec plage « typique du style » (aucune bière du seed n'a d'EBC).
- Moteur : 15 US PASS sans escalade (le correctif kit sur les compagnons mapper/props a évité les arrêts de F3).
- Review-lens : back 6 pistes (bornes des niveaux, concurrence, facettes sous `minRating`) ; front 10 fichiers de test + 1 défaut noté (avatar de l'auteur d'un avis sans la couleur de l'auteur, à traiter avec F5).
- Passage réel : 46/46 (API : 403 sans dégustation, 400 sur 8 notes invalides, remplacement qui conserve `createdAt`, tri/filtre par note ; UI : niveaux, histogramme, formulaire à curseurs, publication, édition, suppression avec confirmation, panne API, 360 px).
- Chiffres : front 189 fichiers / ~1880 tests, back 139 fichiers / 1525 tests.

## Non-régression complète (14 octobre, après fusion F1-F7)
- Les quatre suites navigateur précédentes sur le dev à jour : F1 36/37 → l'unique échec était l'assertion de la limite « anglais » (maintenant levée par F4, assertion corrigée), F2 37/37, F3 29/29, G (carte+point) 35/35. Aucune régression de F4/F6/F7 sur F1-F3.
- Polish 1 (mois en initiale, Journal, un seul bandeau de carte) : 3 contrôles 360 px sans débordement.

## F5 Profil social + collections (14 octobre, nuit)
- Prep Opus : 31 US (back 13, front 18), 4 questions de clarify tranchées au nom de Thomas (seed de démo derrière `SEED_DEMO_ACTIVITY`, fil calculé à la volée, Accueil sur « / » + Encyclopédie sur « /bieres » + 5 onglets, portée en 2 runs). Run 1 : profil, suivi, fil (back US1-8, front US9-19) — 19 US PASS sans escalade. Run 2 : collections (« mes Pokédex ») — back US20-24, front US25-31 : 3 escalades (enum du contrat sans chemin de tâche ; hook sans `isEnabled` + titre de section pour le profil d'autrui ; onglet actif sur les pages de collection) + 1 (feuille de renommage à réutiliser) → toutes tranchées, fix workers, relance en compact.
- Kit : sk-prep SKILL.md (enums du contrat, `isEnabled` des hooks, prop de titre réutilisé) ; oracle `a11y` (axe-core) ajouté à `e2e-oracles.mjs` + doc.
- Review-lens : back 7+7 pistes dont 1 **défaut de contrat** (nom de « À goûter » rendu côté API au lieu de `""`) ; front 13+6 pistes (aucun défaut de prod bloquant ; 2 notés).
- Passage réel : F5 profil social 67/68 (1 erreur de mon script), collections 61/62 (1 erreur de mon script, corrigée) : API 409 casse + accents (« Été »/« été »), limite de 20, 403 non-abonné, 404 avant 403, retrait 204/404 ; UI : création, renommage par feuille, suppression avec confirmation, A goûter non modifiable, collections d'un profil suivi seulement. Deux défauts vus au navigateur seulement : cases à cocher empilées dans la feuille « Ajouter à une collection », bouton « Retirer » flottant sous la carte → polish 2.
- Audit axe-core (fr/en, 19 écrans) : 3 violations réelles (contraste du gris secondaire 3,57:1, liens du fil sans soulignement, ordre des titres sur /bieres) → polish 3. Reste le lien Leaflet de l'attribution (bibliothèque).
- Chiffres : front 235 fichiers / 2524 tests, back 165 fichiers / 1993 tests.

## F8 Regroupement des repères (14 octobre, matin) et polish 3
- Front seul, 1 US : prep Opus avec 3 questions (regroupement glouton en pixels absolus plutôt que grille écran, pastille brun cuir pour ne pas se lire comme « confirmé », hypothèses) ; moteur sans contrat ni voie back (arguments compacts sans `hashPrompt`) ; PASS sans escalade ; review-lens 4 pistes.
- Passage réel : 17/17 (3 pastilles « 3 / 6 / 3 » + 1 repère à Paris au lieu de 14 icônes superposées, 0 paire d'icônes à moins de 40 px, tap = zoom sans fiche, recherche → fiche + zoom 16, filtre recalcule, mode Proposer, 360 px). Défaut de script uniquement (nom accessible lu dans `title`).
- Polish 3 (audit axe) : le gris à 3,57:1 ne venait pas du jeton `--muted` (7,3:1) mais d'un `opacity-70` sur les cartes non goûtées → 85 ; liens du fil soulignés ; titres de cartes en h2 ; attribution Leaflet soulignée. Audit axe : 0 violation (fr).
- Kit : règle `contract-enum-without-file` dans `audit-lint` (+ test, 86 passent).

## F9 Pages à la demande, polices, budget du bundle (14 octobre, matin)
- Front seul, 3 US, prep Opus avec 3 questions (5 pages lazy ; budgets entrée <= 450 kB ET JS initial <= 900 kB lus dans le manifeste, car un budget sur le seul fichier d'entrée se contourne avec un chunk partagé ; @font-face maison car les CSS par sous-ensemble de fontsource n'ont pas d'unicode-range et feraient télécharger latin-ext à chaque visite). Moteur : 3 US PASS sans escalade ; garde `scripts/check-bundle-size.mjs` (entrée 447 kB, JS initial 890 kB au lieu de 1 147 kB, 6 woff2).
- Review-lens : 6 pistes dont un défaut de course (échec d'un chargeur pendant que la page est démontée) déjà corrigé dans le hook.
- Passage réel : 15/16 puis 16/16. **Défaut vu au navigateur seulement** : « Réessayer » ne faisait rien (aucune requête ne part, le navigateur garde l'échec de l'import en mémoire) ; les 51 tests unitaires et le test d'échec passaient. Correctif : après un second échec en ligne, rechargement de la page ; hors ligne l'alerte reste. Piège ajouté à `sk-e2e.md`.

## F10 Appli installable et lecture hors ligne (14 octobre, matin)
- Front seul, 5 US, prep Opus avec 3 questions tranchées (vite-plugin-pwa 1.3.0 épinglée ; écart au standard `ui/mascot` pour la seule icône d'appli + sharp 0.35.4 en devDependency pour générer les PNG ; 9 hypothèses dont purge du cache API au changement d'utilisateur de démo). Le nouvel `audit-lint` a signalé 1 `component-without-props-file` (OfflineBanner sans prop : ignoré à raison). Moteur : 5 US PASS sans escalade (dépendances préinstallées dans le `node_modules` partagé : le brief du moteur le dit).
- Passage réel sur le **build de production** + `vite preview` : 19/19 (manifeste, 3 icônes PNG dont maskable, service worker actif et contrôlant la page, précache JS/CSS/woff2, 13 lectures API en cache sans aucune photo, mode avion : coquille + liste des bières + fiche lues depuis le cache, bandeau « Vous êtes hors ligne », écriture hors ligne = échec visible sans file d'attente, bandeau retiré au retour du réseau, cache purgé au changement d'utilisateur, axe 0 violation).
- Piège de banc : les tests réels précédents tournent sur `vite dev` (aucun service worker) ; celui-ci a besoin de `vite build` + `vite preview` (port 5174, déjà permis par le CORS du back).

## Non-régression finale F1-F10 (14 octobre, midi)
- Défaut de F10 trouvé par la loupe : après un changement d'utilisateur de démo, un refetch qui échoue (hors ligne) laissait à Bob les données d'Alice, car les clés de requête ne dépendent pas de l'utilisateur et `invalidateQueries` ne vide rien. Corrigé : `resetQueries`.
- Passage réel complet sur le dev final (API réelle, 390 et 360 px) : F1 37/37, F2 37/37, F3 29/29, carte+point 35/35, F4 29/29, F5 68/68, collections 62/62, F6 39/39, F7 46/46, F8 17/17, F9 16/16, F10 19/19 (build de production). Les échecs vus au passage étaient des suites de test à jour avec les changements de routes (Accueil sur « / », Encyclopédie sur « /bieres », onglet « Bières », repères regroupés, pages chargées à la demande qui demandent un temps d'attente) : aucun défaut produit.
- Chiffres finaux : front 257 fichiers / 2 750 tests, back 165 fichiers / 1 993 tests, kit 87 tests.

## Polish 4 + kit (14 octobre, après-midi)
- Back : `authorAvatar` dans `ReviewDto` (prévu au contrat F5, jamais fait) ; histogramme des notes à l'étoile la plus proche (0,5 → 1 étoile, 4,5 → 5). Front : avatar de l'auteur dans les avis, « Nouvelle collection » dans sa section, message de limite à 20 collections (relecture de la liste sur un 409, le standard interdit de lire le message du back), barre d'outils de la carte sur 2 rangées (noms accessibles conservés), placeholder « Bière ou brasserie ». Non-régression navigateur sur la version finale : F2 37, F3 29, G 35, F5 68, collections 62, F6 39, F7 46, F8 17 (tous verts).
- Kit : liste permanente de « trous de tests » dans le brief worker (`us-sonnet.md`) ; règle `route-without-tab-owner` dans `audit-lint` ; 88 tests.

## F11 Lieux de dégustation liés à la carte (14 octobre, soir)
- Back 5 US + front 7 US en parallèle, prep Opus (14 hypothèses H1-H14, 4 réponses du superviseur), 12 US sur 12 en PASS dès le premier passage, 0 escalade, 36 agents, 4,1 M de jetons de sous-agents.
- Fusion sans conflit. Tsc et eslint propres ; back 166 fichiers / 2 079 tests, front 262 fichiers / 2 906 tests.
- Review-lens back : 3 pistes confirmées (migration d'une table existante sans la colonne, 404 sans lecture de visites, filtre `visited` combiné aux autres filtres), 5 tests rouges sous mutation, aucun défaut de prod.
- Passage réel : 53/53 (API réelle avec démo, 390 et 360 px) : lien suggestion → dégustation liée, texte libre sans lien, retrait du lien à la frappe, accents et ville, panne des suggestions, fiche « Vous avez bu ici 3 fois », adresse partageable, filtre carte, Journal en lien (clavier compris), suggestions de 52 px à 360 px. Les 7 échecs du premier tour venaient de mon script (forme des réponses, libellés), pas du produit.
- Kit : règle sk-prep « un champ obligatoire ajouté à une entité impose les types dérivés (`Omit`/`Pick`) dans les chemins de la US » (vu en F12 US2).
