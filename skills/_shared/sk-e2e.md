# Cahier E2E d une feature — `FEATURE_DIR/e2e.md` et `e2e-report.md` (source unique)

Contrat lu par `/sk-test`. Le cahier est ecrit AVANT tout lancement de
serveur, valide par l humain, puis execute dans le navigateur (Claude in
Chrome). Le rapport est le meme document, complete d un verdict par scenario.

## Pourquoi un cahier avant de cliquer

Un test E2E improvise regarde ce qui marche, pas ce qui etait promis. Le
cahier part des **Acceptance Scenarios** de `spec.md` (Given / When / Then,
deja numerotes par US), pas de l ecran : ce sont les criteres que `/sk-impl`
a implementes et que le reviewer a coches. Un scenario que le cahier ne peut
pas ecrire (donnee introuvable, ecran inaccessible) est un manque a signaler,
pas a taire.

## Sources, dans cet ordre

| Source | Ce qu on en tire |
|---|---|
| `spec.md` § User Scenarios & Testing | un scenario E2E par Acceptance Scenario ; les Edge Cases donnent les cas limites |
| `quickstart.md` (si present) | route d acces a l ecran, prerequis, ce que les tests unitaires ne couvrent pas |
| `tasks.md` | les taches UI livrees ([X]) — un composant monte par aucune tache est un scenario BLOQUE d avance |
| `design.md` (si present) | ancres `#C<n>` a verifier a l oeil (valeurs exactes, jamais « ressemble ») |
| `STATE.md` (si present) | US livrees vs restantes : on ne teste pas une US non livree, on la liste en « hors perimetre » |

Le cahier ne lit pas `plan.md` ni le code : il decrit ce que voit un
utilisateur, pas comment c est fait.

## Format de `e2e.md`

```markdown
# Cahier E2E — <NNN>-<nom>

**Feature :** specs/<NNN>-<nom> · **Slot front :** wt-N (<branche>) · **Slot back :** wt-M | principal | aucun
**URL :** https://localhost:5173 · **Redige le :** <date> · **Perimetre :** US1, US2 · **Hors perimetre :** US3 (non livree)

## Prerequis

- Compte : <role attendu, ex. utilisateur avec au moins un dossier>
- Donnees : <ce qui doit exister pour que les scenarios aient un sens ; "à demander" si inconnu>
- Ecran : <chemin de navigation depuis l accueil, libelles exacts de l UI>

## US1 — <titre de l US>

- [ ] **#1.1 <titre court>** · AC 1
  Étant donné <contexte>, quand <action>, alors <resultat attendu>.
  - Route : <URL ou chemin de navigation>
  - Oracle : <ce qui prouve le resultat : texte visible, nombre de lignes, requete reseau, etat DOM>
  - Preuve : capture `e2e/1-1.png` ou lecture DOM si la capture echoue

- [ ] **#1.2 ...**

## Cas limites

- [ ] **#L.1 ...** · Edge case « ... »

## Design (si design.md)

- [ ] **#D.1 <ancre C<n>>** : <valeur exacte attendue> — Oracle : `getComputedStyle` ou capture
```

Regles :

- Un scenario = un AC. Le numero `#<US>.<n>` suit l ordre de `spec.md`.
  L ancre `AC n` en fin de titre garde la tracabilite.
- L **oracle** est observable depuis le navigateur : texte, compteur,
  attribut, requete dans `read_network_requests`, valeur de style. « Ca
  marche » n est pas un oracle.
- Un scenario qui exige une panne (batch qui echoue, reseau coupe) precise
  COMMENT la provoquer depuis le navigateur (ex. bloquer une requete via
  `javascript_tool` en surchargeant `fetch` pour une URL donnee) ou est marque
  `BLOQUE : necessite une manipulation hors navigateur`.
- Pas de vocabulaire de code (nom de composant, de hook, de fichier) dans les
  etapes ; l oracle peut citer un selecteur ou une URL d API.
- Le cahier tient sur une page : au-dela de ~15 scenarios, garder les AC et
  laisser les variantes de roles en une ligne.

## Format de `e2e-report.md`

Meme document, chaque case remplie :

```markdown
- [x] **#1.1 <titre>** · AC 1 — **PASS**
  Observe : 25 lignes puis 50 apres defilement ; aucune reference en double (lecture DOM).
  Preuve : e2e/1-1.png

- [ ] **#1.3 <titre>** · AC 3 — **FAIL**
  Observe : la grille se vide au lieu de conserver les 25 lignes ; aucun message d erreur.
  Attendu : lignes conservees + erreur affichee.
  Preuve : e2e/1-3.png · console : TypeError ... (extrait)

- [ ] **#1.4 <titre>** · AC 4 — **BLOQUE**
  Raison : impossible de forcer l echec du premier lot depuis le navigateur.
```

En tete du rapport, une ligne de synthese : `PASS n · FAIL n · BLOQUE n`,
puis la liste des FAIL avec l AC vise — c est ce que l humain lit en premier,
et ce qui devient le brief d un `/sk-impl` de correction ou d un `/sk-xs`.

Verdicts :

| Verdict | Quand |
|---|---|
| PASS | l oracle est observe tel quel |
| FAIL | l oracle est contredit, ou une erreur console/reseau accompagne l action |
| BLOQUE | le scenario n a pas pu etre joue (auth, donnee absente, outil navigateur en echec 3 fois) — la raison est ecrite |

Un BLOQUE n est jamais requalifie en PASS « parce que le reste marche ».

## Preuves

Captures sous `FEATURE_DIR/e2e/<US>-<n>.png` quand l outil `computer`
(screenshot) repond. Il echoue souvent sur cette application (connexions de
telemetrie qui empechent `document_idle`) : le repli est une lecture DOM
via `javascript_tool` ou `read_page`, consignee en clair dans « Observe ».
Une preuve absente est dite absente.

## Oracles transverses (tout scenario, sans les ecrire)

Banc Miro (2 passages E2E apres 4 puis 6 features) : les 2 defauts trouves
etaient invisibles aux tests unitaires, qui mockent le transport.
- **Aucune reponse 5xx** pendant tout le passage (journal reseau ou
  `page.on("response")`) : une 500 est un FAIL du scenario en cours, meme si
  l ecran semble correct (17 x « database is locked » au passage 1, ecran
  intact).
- **Aucune erreur console** non attendue pendant l action. « Attendue » = listee
  dans une section `## Console attendue` du cahier : le bruit connu du mode dev
  (double montage StrictMode) et les erreurs que le scenario provoque lui-meme
  (400/404 voulus, requete bloquee). Tout le reste est un FAIL.
- **Requetes reelles en parallele** : ne jamais serialiser les appels pour
  « stabiliser » ; la concurrence est ce que le passage doit exercer.
- **Texte lisible** (feature qui touche couleurs, theme, jetons CSS) : sur chaque
  ecran du cahier et dans chaque theme, `unreadable(page)` de `e2e-oracles.mjs`
  (contraste WCAG calcule dans le navigateur, 4,5:1 ; 3:1 grand texte) doit
  rendre `[]`, et une capture de l ecran est REGARDEE. Banc TK-3 (mode sombre) :
  11/11 scenarios PASS, mais le texte des post-it etait clair sur jaune (1,02:1),
  vu seulement a la capture. Un texte deja sous le seuil sur la branche de base
  est preexistant : signale dans le rapport, pas un FAIL de la feature.
  Une couleur que la spec ACCEPTE (contenu choisi par l utilisateur et garde tel
  quel) va dans `## Contraste attendu` du cahier (option `expected`), avec l AC
  ou la decision qui l accepte : sans cela l oracle la signale a tort (banc TK-3 :
  texte rouge #dc2626 sur canevas sombre, 3,49:1, accepte par la reponse Q2).

## Oracles de texte : ce que la spec impose, rien de plus

Un oracle sur un libelle visible (aide, bouton, toast) n exige un texte EXACT
que si la spec ou l AC le cite. Sinon il verifie la presence de l element
(ligne de l aide qui porte la touche, bouton au bon role) ou le libelle lu dans
les locales par sa cle. Banc TK-1 : l oracle attendait « Reinitialiser le
zoom » ; la livraison Sonnet affichait « Revenir a 100 % », conforme a la
tache (« le raccourci apparait dans l aide ») : 3 FAIL a tort.

## Mode lot (apres plusieurs features)

Un passage par lot de 3-5 features fusionnees, en plus (ou a la place) du
passage par feature : les defauts entre features n apparaissent qu ensemble.
- Cahier = les AC de chaque spec.md du lot, plus une section
  `## Entre features` : pour chaque etat derive partage (role courant,
  selection, zoom, historique), un scenario ou sa source ECHOUE (requete
  bloquee) et ou chaque feature qui le lit doit se comporter pareil
  (banc : GET members en echec -> F3 bloquait l historique, F2 laissait la
  barre d outils a un lecteur).
- La source qui ECHOUE se simule par un abort de la requete (`route.abort()`),
  pas par une 5xx simulee (elle declencherait l oracle 5xx). L etat inconnu
  attendu est celui de la spec ; a defaut, le plus restrictif.
- Execution scriptee quand Claude in Chrome est absent : un script Playwright
  (Chromium du poste) par feature, base fraiche avant chaque script (back
  relance), **3 runs** au moins : un scenario qui passe 2 fois sur 3 est un FAIL
  (concurrence), jamais un flake ; BLOQUE sur un run et PASS ailleurs = BLOQUE.
- La limite « ~15 scenarios » vaut par feature ; en mode lot, une ligne par
  scenario deja joue, le detail seulement pour `## Entre features`.
- Script : `<SK_SHARED>/e2e-oracles.mjs` donne `watch(page, { api, expectedConsole })`
  (5xx et console inattendue par scenario) et `verdict(runs)` (regle des 3 runs) ;
  ne les reecris pas.
- Les FAIL deviennent des `/sk-xs` (1 comportement, 1 depot) ou un
  `/sk-impl` de correction ; le passage suivant rejoue tout le cahier.
