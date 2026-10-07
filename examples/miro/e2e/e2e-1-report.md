# Rapport E2E — Tableau, F1 commentaires · F2 partage · F3 annuler/retablir · F4 connecteurs

**Cahier :** `e2e/e2e.md` (14 scenarios) · **Execute le :** 2026-10-07 · **Navigateur :** Chromium Playwright 1440x900
**Back :** miro/back dev `cf3c0f0` (http://localhost:5080, SQLite memoire + seed) · **Front :** miro/front dev `02d8e65` (vite, http://localhost:5173)
**Script :** `e2e/run.mjs` (+ `e2e/proof-viewer.mjs`) · **Donnees brutes :** `e2e/run{1,2,4,5,6}.json` (mode reel), `e2e/runs{1,2,3}.json` (mode serialise) · **Captures :** `e2e/shots/` (issues du run6, mode reel)

## Synthese

| | PASS | FAIL | BLOQUE |
|---|---|---|---|
| Verdict par scenario | **13** | **1** (#2.4) | 0 |

Plus **une anomalie transverse T1 (back)** : des 500 `database is locked` aleatoires sur les GET concurrents, presents dans **les 5 runs reels** (2 a 7 par run). Ils ont fait tomber 9 des 14 scenarios au moins une fois en mode reel ; en serialisant les appels API (mode diagnostic), les 14 scenarios passent 3 fois sur 3 apres correction d un point de clic du script (#4.3).

Methode : chaque run repart d un back relance (base fraiche). 5 runs « reels » (le front envoie ses requetes comme en prod) + 3 runs « serialises » (Playwright met en file les appels vers :5080, une requete a la fois, sans toucher au code) pour separer les defauts fonctionnels de la contention du back. Verdict = comportement fonctionnel (stable en serialise ET observe PASS en reel) ; la colonne « Reel » donne la stabilite.

## Ecarts d environnement (pas des defauts des features)

- **Pas de config vite applicative** : seul `vitest.config.ts` existe, sans plugin Tailwind → page sans mise en page (`shots/smoke-board.png`). Contournement : CSS Tailwind compilee depuis `src/` avec le `tailwindcss` 4.3.3 du projet (`e2e/tw.mjs`) et injectee par Playwright. Les icones Remix (`ri-*`) ne s affichent pas (police non chargee) : les boutons sont identifies par leur `aria-label`.
- **Carol (Viewer)** : intercepter seulement `X-User-Id` ne suffit pas, car le front calcule le role a partir de la constante `CURRENT_USER_ID` (`board.tsx:70`, `useCurrentUserBoardRoleQuery.ts:9`). Le module `/src/config/apiConfig.ts` servi par vite est donc reecrit a la volee (`CURRENT_USER_ID = "3"`) ; l en-tete suit. Aucun fichier n est modifie.
- `net::ERR_ABORTED` sur les DELETE 204 et sur des GET annules par react-query au demontage : bruit Chromium, journalise a part (cle `aborted`), pas compte comme echec.

## Verdicts

| # | Scenario (AC) | Verdict | Reel (5 runs) | Preuve (run6 sauf mention) |
|---|---|---|---|---|
| 1.1 | Poster un commentaire, le relire apres rechargement (m1 US6-1, US7-1, US2-3) | **PASS** | 5/5 | `POST /boards/1/items/1/comments` 201 body `{"body":"E2E commentaire …"}` (trim fait par le front) ; apres reload `GET …/comments` 200, texte visible ; serveur : authorId=1, isResolved=false. `shots/1-1.png` |
| 1.2 | Resoudre puis supprimer son commentaire (m1 US7-4, US7-5) | **PASS** | 5/5 | `PATCH …/comments/1` 200 `{"isResolved":true}` (serveur isResolved=true) ; `DELETE …/comments/1` 204 ; « Aucun commentaire » revient. `shots/1-2a-resolu.png`, `shots/1-2.png` |
| 1.3 | Post-it sans commentaire : etat vide (m1 US2-2, US5-2) | **PASS** | 5/5 | `GET /boards/1/items/2/comments` 204 → « Aucun commentaire », sans toast. `shots/1-3.png` |
| 2.1 | Modale Partager liste les membres (m2 US6-1) | **PASS** | 4/5 | `GET …/members` 200 ; Alice (Proprietaire), Bob, Carol. Run4 : FAIL, `GET /members` 500 (T1) → modale vide. `shots/2-1.png` |
| 2.2 | Changer un role, retirer un membre (m2 US7-1, US7-2) | **PASS** | 4/5 | `PATCH …/members/3` 200 `{"role":"Editor"}` ; `DELETE …/members/2` 204 ; Bob → 403 sur `GET /boards/1/items` (API). Run4 : BLOQUE (modale vide, cf. 2.1). `shots/2-2.png` |
| 2.3 | Ajouter un membre (m2 US9-1, US9-2, US9-3) | **PASS** | 4/5 | `GET /users` 200 ; le selecteur ne propose que Bob ; `POST …/members` 201 `{"userId":2,"role":"Viewer"}` ; ensuite « Ajouter » est desactive. Run4 : FAIL, `GET /users` 500 (T1). `shots/2-3.png` |
| 2.4 | Viewer : lecture seule UI ET refus API (m2 US5-1/2, US3-7 ; m3 US3-1 ; m4 US5-4, US3-5) | **FAIL** | 2/5 | Quand `GET /members` repond, c est conforme : seul « Selectionner » est propose, pas d Annuler/Retablir, connecteur visible, glisser/double-clic sans aucune ecriture, et l API repond 403 a POST item, PATCH item et POST connector en X-User-Id 3 (`shots/2-4.png`). **Mais run2 : `GET /members` 500 → Carol a eu toute la barre d outils, et le glisser a envoye `PATCH /boards/1/items/2` → 403.** Reproduit a coup sur dans `proof-viewer.mjs` (GET members force a 500) : outils affiches = Selectionner, Post-it, Forme, Texte, Connecteur, Supprimer ; `PATCH …/items/2 -> 403`. `shots/2-4b-viewer-members-500.png`. Runs 1 et 5 : BLOQUE (`GET /items` 500, le tableau ne s affiche pas). |
| 3.1 | Annuler/Retablir visibles et desactives (m3 US1-1) | **PASS** | 5/5 | Deux boutons visibles, `disabled`. `shots/3-1.png` |
| 3.2 | Annuler une creation, puis la retablir (m3 US1-2, US2-2) | **PASS** | 5/5 | `POST /items` 201 → Annuler → `DELETE /items/7` 204, post-it retire, Retablir active → Ctrl+Shift+Z → `POST /items` 201 ; persiste apres reload. `shots/3-2a-apres-undo.png`, `shots/3-2.png` |
| 3.3 | Annuler un deplacement par Ctrl+Z (m3 US1-3, US2-1) | **PASS** | 4/5 | Un seul `PATCH /items/3` 200 `{"x":270,"y":360}` pour le glisser, puis Ctrl+Z → `PATCH` 200 `{"x":120,"y":280}` ; serveur et affichage apres reload en (120,280). Run1 : BLOQUE (reload, `GET /items` 500). `shots/3-3.png` |
| 4.1 | Creer un connecteur, le retrouver apres rechargement (m4 US5-1, US1-2, US3-1) | **PASS** | 3/5 | `POST /connectors` 201 `{"fromItemId":1,"toItemId":2,"style":"Arrow"}` ; ligne (170,130)→(390,130) = centres, `marker-end` fleche, outil revenu a Selection ; apres reload `GET /connectors` 200, ligne presente. Run1 : FAIL, `GET /connectors` 500 apres reload → aucune ligne, sans nouvel essai (le service avale l erreur). Run5 : FAIL en cascade (connecteur de 2.4 non nettoye). `shots/4-1.png` |
| 4.2 | Le connecteur suit l item deplace (m4 US3-4, US4-1) | **PASS** | 2/5 | Pendant le glisser (souris encore enfoncee), le depart est deja en (170,430) ; `PATCH /items/1` 200 ; apres reload (170,430)→(390,130). Runs 1, 2 et 5 : BLOQUE/FAIL en cascade de T1. `shots/4-2.png` |
| 4.3 | Style Line puis suppression d un connecteur (m4 US6-1, US8-1, US7-1) | **PASS** | 3/3* | Clic sur la ligne → `stroke-width` 4 ; bouton « Fleche / trait » → `PATCH /connectors/2` 200 `{"style":"Line"}`, plus de `marker-end` ; Supprimer → `DELETE /connectors/2` 204, ligne retiree. *Runs 1-2 ecartes : le point de clic du script tombait sur l item 3 (corrige). `shots/4-3a-line.png`, `shots/4-3.png` |
| 4.4 | Supprimer un item supprime ses connecteurs (m4 US1-7) | **PASS** | 3/5 | `POST /connectors` 201 (2→4) ; `DELETE /items/2` 204 → ligne retiree tout de suite ; apres reload `GET /connectors` 204. Run5 : FAIL, `GET /connectors` 500 (T1). `shots/4-4.png` |

## Causes

### FAIL #2.4 — le mode lecture seule s ouvre quand le role est inconnu (front, F2)

- `front/src/pages/board/board.tsx:70-71` :
  `const isReadOnly = members.isLoading || currentMember?.role === BoardRoleEnum.VIEWER;`
  Quand le chargement des membres echoue, `BoardService.getMembers` (`front/src/api/boards/boardService.ts:43-46`) avale l erreur et renvoie `[]`. On a alors `currentMember` = undefined, donc `isReadOnly = false`, et la barre d outils complete s affiche. Le mode lecture seule « s ouvre » au lieu de se fermer.
- Le contraste avec F3 est net : `canUseHistory` (`board.tsx:62`) exige un role connu (Editor/Owner), conformement a m3 US3 AC4. Il masque donc bien Annuler/Retablir dans le meme cas. Les deux features calculent le role a deux endroits, avec deux politiques differentes.
- L API refuse bien l ecriture (403) : il n y a pas de faille de droits. Mais le Viewer voit des outils qui produisent des refus, exactement ce que m2 US5 voulait eviter. Declencheur reel : T1.

### T1 (transverse, back) — 500 « database is locked » sous requetes concurrentes

- `back/Tableau.Api/Program.cs:17-19` : une seule `SqliteConnection("DataSource=:memory:")` ouverte, partagee par tous les `DbContext` scoped (singleton `DbContextOptions`). Des requetes simultanees initialisent la meme connexion en parallele : `SqliteException 5: database is locked` (pile dans `e2e/back.log`, `SqliteRelationalConnection.InitializeDbConnection`).
- Reproduit hors navigateur : 80 GET concurrents (`/items` + `/members`) donnent environ 30 % de 500. L ouverture d un tableau lance 5 GET en parallele (`/boards/1`, `/items`, `/members`, `/connectors`, `/users`).
- Le code date du commit initial `9372fa7`, mais les 4 features l ont rendu visible : elles ont ajoute 3 GET paralleles a l ouverture (members, connectors, users), plus comments.
- Effet amplifie cote front : les services (`connectorService.ts:23-26`, `boardService.ts:43-46`, idem comments/users) attrapent l erreur et renvoient `[]`. React Query voit donc un succes et ne relance jamais la requete (`retry: 1` inoperant, `queryClient.ts:5`). Un 500 passager donne des connecteurs absents, une modale de partage vide ou un Viewer en mode edition, jusqu au prochain rechargement.

## Erreurs console et requetes en echec

- Console : uniquement `Failed to load resource: 500` (T1). Aucune `pageerror`.
- Requetes >= 400 inattendues : 500 seulement, 7/2/2/4/2 sur les runs reels 1/2/4/5/6, 0 en serialise, plus le `PATCH /items/2` 403 du Viewer (run2, #2.4). Les 403 attendus (refus Viewer, Bob retire) viennent d appels API directs, verifies comme tels.
- Contrat back/front : **aucune divergence** sur les URL, les verbes, les corps ni les statuts exerces (201+Location, 204 liste vide, PATCH partiels, enums en chaine). CORS correct (preflight 204, `Access-Control-Allow-Origin: *`).
