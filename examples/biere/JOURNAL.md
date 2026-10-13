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
