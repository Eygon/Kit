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
- Chiffres finaux : front 120 fichiers / 1034 tests, back 114 fichiers / 1078 tests, E2E F1 36/37 (anglais : F4), F2 38/38, F3 29/29, API F2 49/49, F3 48/48.
