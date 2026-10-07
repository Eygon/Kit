# Rapport E2E (passage 2) — Tableau, F1 a F6 + 2 correctifs

**Cahier :** `e2e2/e2e.md` (18 scenarios : les 14 du passage 1, plus 2 F5 et 2 F6) · **Execute le :** 2026-10-07 · **Navigateur :** Chromium Playwright 1440x900
**Back :** miro/back dev `6f72179` (http://localhost:5080, SQLite memoire + seed) · **Front :** miro/front dev `e1fd828` (vite, http://localhost:5173)
**Scripts :** `e2e2/run.mjs` (repris du passage 1, avec F5/F6 en plus), `e2e2/proof-viewer.mjs` (inchange), `e2e2/stress.mjs` (charge API) · **Donnees brutes :** `e2e2/run{1..5}.json` et `.log` · **Captures :** `e2e2/shots/` (issues du run5)

## Synthese

| | PASS | FAIL | BLOQUE |
|---|---|---|---|
| Verdict par scenario (18) | **18** | 0 | 0 |
| Stabilite : 5 runs reels, sans serialisation | 18/18 a chaque run | 0 | 0 |

| Feature / correctif | Verdict |
|---|---|
| F1 commentaires post-it | PASS (3/3) |
| F2 partage | PASS (4/4) ; #2.4, en FAIL au passage 1, passe maintenant |
| F3 annuler/retablir | PASS (3/3) |
| F4 connecteurs | PASS (4/4) |
| F5 commentaires formes/textes + badge | PASS (2/2) |
| F6 dessin a main levee | PASS (2/2) |
| Correctif front (role inconnu → lecture seule) | PASS : `proof-viewer.mjs` passe |
| Correctif back (connexion SQLite par DbContext) | PASS : **0 reponse 500** sur les 5 runs, 0 « database is locked » dans `back.log` |

Methode : comme au passage 1, chaque run repart d un back relance, donc d une base fraiche. Les 5 runs sont « reels » : **aucune** file d attente Playwright, le front envoie ses requetes en parallele comme en prod. Le mode `SERIAL` du script n a pas ete utilise.

## Ecarts d environnement (inchanges depuis le passage 1, pas des defauts)

- Pas de plugin Tailwind dans `vitest.config.ts` : la CSS est compilee depuis `src/` (`e2e2/tw.mjs`, regeneree pour les nouvelles classes) puis injectee par Playwright. Les icones `ri-*` ne s affichent pas, donc les boutons sont cibles par `aria-label`.
- Carol (Viewer) : le module `/src/config/apiConfig.ts` est reecrit a la volee (`CURRENT_USER_ID = "3"`). Aucun fichier n est modifie.
- `net::ERR_ABORTED` (38 par run) : DELETE 204 et GET annules par react-query au demontage. C est du bruit Chromium, journalise a part sous la cle `aborted`.

## Verdicts

| # | Scenario (AC) | Verdict | Reel (5 runs) | Preuve (run5) |
|---|---|---|---|---|
| 1.1 | Poster un commentaire, le relire apres rechargement | **PASS** | 5/5 | `POST /boards/1/items/1/comments` 201 (body trimme) ; apres reload `GET …/comments` 200, texte visible ; serveur authorId=1. `shots/1-1.png` |
| 1.2 | Resoudre puis supprimer son commentaire | **PASS** | 5/5 | `PATCH …/comments/1` 200 `{"isResolved":true}` ; `DELETE` 204 ; « Aucun commentaire ». `shots/1-2a-resolu.png`, `shots/1-2.png` |
| 1.3 | Post-it sans commentaire : etat vide | **PASS** | 5/5 | `GET /items/2/comments` 204 → « Aucun commentaire », sans toast. `shots/1-3.png` |
| 2.1 | Modale Partager liste les membres | **PASS** | 5/5 | `GET /members` 200 ; Alice (Proprietaire), Bob, Carol. `shots/2-1.png` |
| 2.2 | Changer un role, retirer un membre | **PASS** | 5/5 | `PATCH /members/3` 200 `{"role":"Editor"}` ; `DELETE /members/2` 204 ; Bob → 403 par l API. `shots/2-2.png` |
| 2.3 | Ajouter un membre | **PASS** | 5/5 | `GET /users` 200, selecteur = [Bob] ; `POST /members` 201 `{"userId":2,"role":"Viewer"}`. `shots/2-3.png` |
| 2.4 | Viewer : lecture seule UI ET refus API (+ m6 US3-5, US4-4) | **PASS** (FAIL au passage 1) | 5/5 | Seul « Selectionner » est propose, sans Crayon, couleurs, epaisseurs ni Annuler/Retablir ; connecteur visible ; glisser et double-clic n envoient aucune ecriture ; l API repond 403 a POST item, PATCH item et POST connector (X-User-Id 3). `shots/2-4.png`. **Preuve du correctif :** `proof-viewer.mjs` (GET members force a 500) → outils = `["Sélectionner"]`, ecritures = `[]` (passage 1 : 6 outils et `PATCH /items/2 -> 403`). `shots/2-4b-viewer-members-500.png` |
| 3.1 | Annuler/Retablir visibles et desactives | **PASS** | 5/5 | `shots/3-1.png` |
| 3.2 | Annuler une creation, puis la retablir | **PASS** | 5/5 | `POST /items` 201 → Annuler → `DELETE` 204 → Ctrl+Shift+Z → `POST` 201 ; persiste apres reload. `shots/3-2a-apres-undo.png`, `shots/3-2.png` |
| 3.3 | Annuler un deplacement (Ctrl+Z) | **PASS** | 5/5 | 1 seul `PATCH /items/3` `{"x":270,"y":360}` puis, apres undo, `{"x":120,"y":280}` ; serveur et ecran en (120,280) apres reload. `shots/3-3.png` |
| 4.1 | Creer un connecteur, le retrouver apres rechargement | **PASS** | 5/5 | `POST /connectors` 201 Arrow ; ligne (170,130)→(390,130) avec `marker-end` ; apres reload `GET /connectors` 200, ligne presente. `shots/4-1.png` |
| 4.2 | Le connecteur suit l item deplace | **PASS** | 5/5 | Depart en (170,430) pendant le glisser ; `PATCH /items/1` 200 ; meme trace apres reload. `shots/4-2.png` |
| 4.3 | Style Line puis suppression d un connecteur | **PASS** | 5/5 | Selection (stroke-width 4) ; `PATCH /connectors/2` 200 `{"style":"Line"}` ; `DELETE` 204. `shots/4-3a-line.png`, `shots/4-3.png` |
| 4.4 | Supprimer un item supprime ses connecteurs | **PASS** | 5/5 | `DELETE /items/2` 204 → ligne retiree ; apres reload `GET /connectors` 204. `shots/4-4.png` |
| 5.1 | Badge apres un commentaire sur une forme (m5 US1-1/2/4, US2-1, US4-1/3/4, US5-1) | **PASS** | 5/5 | Pas de bouton « Commentaires » sans selection ; bouton propose pour le texte 4 et la forme 3 ; `GET /items/3/comments` 204 ; `POST /items/3/comments` 201 ; `GET /boards/1/comments/counts` rejoue tout seul (invalidation) → 200 `[{"itemId":3,"unresolved":1}]` ; badge « 1 » sur la forme seule, `aria-label="1 commentaire non résolu"`, sans reload ; toujours present apres reload (counts 200, une seule requete a l ouverture, FR-007). `shots/5-1a-badge.png`, `shots/5-1.png` |
| 5.2 | Badge disparait apres resolution (m5 US5-2, US2-2..5) | **PASS** | 5/5 | `PATCH /items/3/comments/2` 200 `{"isResolved":true}` → counts rejoue → 204 → badge retire sans reload, absent apres reload. Droits de l endpoint : Carol 204, sans X-User-Id 401, board 999 404. `shots/5-2.png` |
| 6.1 | Trace au Crayon → enregistre → retrouve apres reload (m6 US3-1/2/3, US4-1/2/3, US1-1, US2-1, SC-001) | **PASS** | 5/5 | Couleurs et epaisseurs absentes hors Crayon, affichees avec lui ; Vert + Epais ; trace sur le fond sans defilement du monde ; `POST /items` 201 `{"type":"Freehand","color":"#a7f3d0","strokeWidth":8,"points":[19 pts]}` ; serveur : memes 19 points, strokeWidth 8 ; polyligne `stroke=#a7f3d0`, `stroke-width=8`, `linecap=round` ; le Crayon reste actif ; apres reload, attribut `points` identique ; boite (596,576) 228x78 (trace a (600,580), marge strokeWidth/2). `shots/6-1a-trace.png`, `shots/6-1.png` |
| 6.2 | Annuler retire le trace (m6 US3-4, SC-002) | **PASS** | 5/5 | 2e trait `POST` 201 → Annuler → `DELETE /items/10` 204, trait retire, le serveur ne garde que le trait 9 ; Retablir → `POST` Freehand 201, trait revenu ; nouvel Annuler + reload → absent. `shots/6-2a-apres-undo.png`, `shots/6-2.png` |

## Correctif back : contention SQLite

- `back/Tableau.Api/Program.cs:17-29` : la base memoire est nommee et en cache partage. Chaque `DbContext` ouvre sa propre connexion, et une connexion « keeper » garde la base en vie.
- 5 runs reels : **0 reponse 500** (passage 1 : 7/2/2/4/2), aucune requete >= 400 inattendue, aucune erreur console. `grep -i locked e2e2/back.log` → 0.
- Charge hors navigateur (`stress.mjs`, lance 2 fois) : 200 GET concurrents (items, members, connectors, comments/counts, board) et 40 POST de commentaires en parallele donnent uniquement des 200, 201 et 204, aucun 500. Au passage 1, 80 GET donnaient environ 30 % de 500.

## Erreurs console et requetes en echec

- Console : aucune erreur, aucune `pageerror`, sur les 5 runs.
- Requetes >= 400 inattendues : **aucune**. Les 403, 401 et 404 observes viennent d appels API directs attendus (Viewer, Bob retire, sans en-tete, board inconnu).
- Contrat back/front F5/F6 : aucune divergence. `comments/counts` renvoie 200 avec un tableau ou 204 ; `Freehand` circule en chaine ; `points` et `strokeWidth` font l aller-retour a l identique ; les items non-Freehand reviennent avec `points:null, strokeWidth:null`.

## Remarques (hors verdict)

- Les points d un trace sont envoyes en flottants non arrondis (ex. `10.66668701171875`). Le back les accepte et les restitue a l identique. C est sans effet fonctionnel, mais le stockage est plus verbeux.
- Le trace doit commencer sur le fond : si l on appuie avec le Crayon sur un item existant, l item est selectionne et deplace (`canvasItem.tsx`, `onPointerDown` avec `stopPropagation`), sans aucun trait. La spec ne couvre pas ce cas. Le script l a rencontre au premier essai (`try1.json` : `PATCH /items/8` au lieu d un `POST` Freehand), puis le point de depart a ete deplace.
- Au premier essai, #5.1 a aussi echoue sur « pas de bouton Commentaires sans selection » : le script n avait pas deselectionne l item (cliquer l outil Selectionner ne vide pas la selection). C etait un defaut du script, corrige par un clic sur le fond.
