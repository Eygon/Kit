# Rapport E2E (passage 5, mode lot) — Tableau, 9 features

**PASS 46 · FAIL 1 · BLOQUE 0** — 3 runs reels sur base fraiche (back relance avant chacun des 5 scripts de chaque run), requetes non serialisees, 47 scenarios x 3. Aucune reponse 5xx sur les 3 runs.

## FAIL (a lire en premier)

- **#X.7 Crayon actif : un clic dans le dock cree un trace parasite** · m7 Edge « A click inside the dock (minimap or zoom bar) never creates an item » x m6 (Crayon) — FAIL/FAIL/FAIL
  Observe : Crayon actif, un clic sur "Zoom avant" puis un clic dans la mini-carte envoient **2 POST /boards/1/items** (201) : `{"type":"Freehand","x":1033,"y":702,"width":4,"height":4,"color":"#fde68a","points":[1 point],"strokeWidth":4}` et un second a (740,461). Deux points jaunes sont ajoutes au tableau sous le dock, et entrent dans l historique Annuler. Le zoom passe bien a 125 %.
  Attendu : zoom a 125 %, centrage par la mini-carte, aucun item cree.
  Cause probable : `runs/m9/slot/src/pages/board/components/modules/boardCanvas/boardCanvas.tsx:70` met les gestionnaires pointer du dessin (`drawing.handlers`) sur tout le viewport, dock compris ; le conteneur du dock (`boardCanvas.tsx:104-107`) n arrete que `onClick` (ligne 106), pas `onPointerDown/Up`. `useFreehandDrawing.ts:26-29` demarre un trait au pointerdown, et `:41-46` l enregistre au pointerup, meme s il n a qu un point (le back l accepte : 1 a 2000 points). Le test 7.L1 (outil Post-it) passe parce que la creation d un post-it passe par `onClick`, qui est bien arrete. Meme cause probable, non verifiee ici : avec l outil Selection, un glisser qui part de la mini-carte deplace la vue (`usePanGesture`).
  Releve d un **/sk-xs** : oui. Un seul comportement (arreter la propagation de `onPointerDown` sur le dock, ou ignorer un pointerdown dont la cible est dans le dock), un seul depot (front). A rejouer ensuite : 7.L1, 6.1, 6.2, X.7.
  Preuve : `shots/X-7.png`, `out/run{1,2,3}-x.json` (corps des POST).

## Tableau par feature

| Feature | Scenarios | PASS | FAIL | BLOQUE |
|---|---|---|---|---|
| F1 commentaires | 1.1-1.3 | 3 | 0 | 0 |
| F2 partage / roles | 2.1-2.4 | 4 | 0 | 0 |
| F3 annuler / retablir | 3.1-3.3 | 3 | 0 | 0 |
| F4 connecteurs | 4.1-4.4 | 4 | 0 | 0 |
| F5 commentaires partout + badge | 5.1-5.2 | 2 | 0 | 0 |
| F6 dessin a main levee | 6.1-6.2 | 2 | 0 | 0 |
| F7 mini-carte + zoom | 7.1-7.4, 7.6-7.11, 7.L1 | 11 | 0 | 0 |
| F8 presence + synchro | 8.1-8.5 | 5 | 0 | 0 |
| F9 export / import | 9.1-9.6 | 6 | 0 | 0 |
| Entre features | X.1-X.7 | 6 | 1 (X.7) | 0 |
| **Total** | 47 | **46** | **1** | **0** |

Chaque PASS = PASS/PASS/PASS. Detail par run : `out/summary.json`, preuves `shots/<id>.png` (capture du dernier run), journaux `out/run<n>-<script>.log|json`.

## Entre features — verdicts

- [x] **#X.1 GET members bloque** — **PASS**
  Observe : GET members `FAILED net::ERR_FAILED` ; un seul toast d erreur ; outils d edition et Annuler/Retablir absents ensemble (lecture seule partout : le role passe par la meme cle de requete pour la barre d outils et pour l historique) ; Suppr, Ctrl+Z et glisser : aucune ecriture ; Exporter telecharge le fichier (5 items) ; presence ["Alice"] en ligne ; zoom 125 % ; mini-carte complete. Le defaut du banc (F3 bloque, F2 laisse la barre) n est plus la.
- [x] **#X.2 Historique apres synchro** — **PASS** : post-it supprime par Bob et disparu en direct ; Annuler -> DELETE 404, 1 toast d erreur, Annuler et Retablir desactives, rien de recree.
- [x] **#X.3 Trace + connecteur de Bob en direct** — **PASS** chez Alice et Carol (points "4,4 60,40 120,12 164,60", #a7f3d0, 8), mini-carte a jour, historique d Alice inchange ; la suppression du trace par Bob retire aussi le connecteur en direct.
- [x] **#X.4 Import trace + connecteurs, annuler/retablir, mini-carte** — **PASS** : rendu identique, 2 connecteurs rattaches aux nouveaux ids, historique vide ; suppr -> annuler -> POST Freehand avec les memes points ; retablir -> DELETE ; Tout afficher : tous les items visibles. Note : le connecteur du trace supprime n est pas restaure par Annuler (hors perimetre m4 : « undo/redo of connectors »).
- [x] **#X.5 Lectrice qui importe** — **PASS** : ownerId 3, barre complete, Annuler present, presence ["Carol"], Partager liste seulement « Carol Propriétaire », post-it cree (201).
- [x] **#X.6 Badge apres import** — **PASS** : GET counts du nouveau tableau = 204, aucun badge ; badge sur la forme importee apres un commentaire ; le tableau source garde « 1 ».
- [ ] **#X.7 Crayon + dock** — **FAIL** (voir plus haut). Le trace a 125 % est enregistre aux bonnes coordonnees monde (512,448).

## Oracles transverses

- 5xx : 0 sur les 3 runs (navigateur + appels API des scripts).
- Erreurs console non attendues : aucune.
- Erreurs console laissees de cote, sur les 3 runs : 108 x « Failed to start the connection: … stopped during negotiation ». Le double montage React StrictMode coupe la premiere negociation SignalR a chaque ouverture de tableau, la 2e connexion s etablit, et 8.x, X.1 et X.3 montrent que la presence et la synchro marchent. S y ajoutent 3 x 400 (#9.3, provoque), 3 x 404 (#X.2, provoque) et 3 x net::ERR_FAILED (#X.1, blocage volontaire).

## Hors perimetre / non joue

m7 US1 AC5 et US2 AC7 (pixels de design.md), libelles en/es (m7 US1 AC6, US2 AC6 ; m8 US4 AC5 ; m9 US5), m8 US4 AC2 (7 utilisateurs, +N), US3 AC3 et US4 AC3 (coupure puis reconnexion), m9 US3 AC3 (export en echec), US4 AC3 (bouton occupe). Aucun de ces cas n a ete joue : ils ne sont ni PASS ni BLOQUE.
