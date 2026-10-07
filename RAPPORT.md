# Kit sk-* — itérations sur /sk-prep et /sk-impl

Ce rapport couvre 5 cycles de mesure sur de fausses US, faits sur deux bancs :
- **fakeweb**, un clone réduit de MySepteoWeb (React 19, TanStack, i18n fr/en/es, lib Septeo simulée) ;
- **Tableau**, un « Miro » en deux dépôts : un back .NET 8 en couches qui suit les standards back, et un front React.

Les runs sont des sous-agents qui appliquent les SKILL.md à la lettre en mode audit : Opus pour la prep et la revue, Sonnet pour le code. Les coûts sont estimés à partir des tokens réels (cache compris).

## Résultats en bref

| Mesure | Avant (v0) | Après | Gain |
|---|---|---|---|
| `sk-prep/SKILL.md` lu à chaque tour | 50 Ko | 23 Ko + modules lus à la demande | −54 % |
| `sk-impl/SKILL.md` | 36 Ko | 16 Ko + modules | −56 % |
| Prep S (filtre statut) | 4,04 $ · 561 s | 1,5–2,7 $ · 290–430 s | ~−45 % |
| Prep M (ajout contact) | 4,19 $ · 598 s | 1,87–1,95 $ · 315–360 s | ~−55 % |
| Prep « export TTC » (tordue) | 3,83 $ · 489 s | 1,85 $ · 382 s | −52 % |
| Prep XS (doit basculer en /sk-xs) | 0,90 $ · 101 s | 0,78 $ · 81 s | −15 % |
| Trios avec HIGH « faux » du linter | 6 sur 6 | 0 | — |
| Back + front en parallèle (régime L) | 1 paire puis le reste en série | voies parallèles par dépôt | −42 % de temps mur sur la paire mesurée |
| Agents « hash » sur le chemin critique (L) | 2 par run | 0 | — |

Les preps v0 et v1 ont été rejouées sur les mêmes US, aux mêmes moments et avec les mêmes intents. Les preps v2+ ont aussi été jouées sur les US tordues : UX floue, badge pluriel, confirmation d'archivage. Toutes ont terminé avec un trio sans HIGH, sauf les dépassements de taille que l'humain a acceptés.

## Ce qui a changé

### 1. Fiabilité : bugs réels corrigés
- **Agents en conflit avec les briefs.** `tdd-dev` et `tdd-reviewer` disaient « ne commite pas », « n'exécute pas les gates », « écris review.md » et « lis ta mémoire ». Ils sont remplacés, pour ce kit, par `agents/sk-worker.md` et `agents/sk-reviewer.md`, de 5 lignes chacun, qui renvoient au brief. Les anciens restent en place pour un éventuel autre pipeline.
- **`brief-fill` trouvait 0 tâche** quand tasks.md restait au format spec-kit (`## Phase 3: User Story 1`). Il refusait alors tous les briefs.
- **Le linter levait de faux HIGH** sur tous les trios réels :
  - il comptait les 3 fichiers de langue pour 3 ;
  - il comptait les chemins seulement réutilisés (`Code:`, `Eviter:`) ;
  - il comptait `contracts/` comme du code de prod ;
  - il comptait les fichiers « type pur » (interfaces, DTO, entités .NET) ;
  - il appliquait le cap de standards à la feature entière, au lieu de chaque US ;
  - il ne reconnaissait pas les références `chemin:12-20` ;
  - il prenait un libellé traduit (« Rechercher un contact ») pour une consigne de recherche.

  Chaque faux HIGH faisait redécouper les US contre l'avis de l'humain.
- **`mount-check`** renvoyait UNMOUNTED sur les fichiers de types et sur tout le C#. Il rend maintenant SKIP.
- **Régime L** :
  - rien ne copiait le trio dans le slot back. C'est corrigé, et `tasks-merge.mjs` réunit les `[X]` des deux copies : avec un seul fichier, deux `sed -i` en parallèle pouvaient perdre une case ;
  - le placeholder `<CONTRACT_PATH>` restait vide dans le brief de revue.
- **Pièges de brief vus en vrai** :
  - `| tail` derrière une gate masquait l'échec et cochait la case ;
  - un chemin avec antislashs cassait la commande Bash ;
  - la recette du RED par import paresseux était mal comprise (« Cannot find package » *est* le RED attendu).
- **Ambiguïtés levées** (relevées par les runs eux-mêmes) :
  - l'ordre sonde / audit ;
  - les marques d'audit (4 en cas d'arrêt XS, bornes des phases) ;
  - un `spec.md` pré-rempli par le script ;
  - le déclencheur du module contrat ;
  - l'endpoint dicté par l'humain mais divergent des builders du dépôt ;
  - l'intent muet sur un point ;
  - « pas d'écran » dans le garde-fou XS ;
  - une valeur demandée absente du dépôt (statut « Archivé ») ;
  - un besoin vague (« c'est pénible »).

### 2. Vitesse et coût
- **sk-prep découpé en cœur + `ref/`** (design, legacy, code-search, contrat, audit). Les cas rares ne sont plus relus à chaque tour.
- **Trio écrit directement** depuis des gabarits du kit (`sk-prep/templates/`), aux titres spec-kit. On ne charge plus les 4 skills speckit-* (~20k tokens), et on ne réécrit plus tasks.md après coup.
- **Clarify, filet et choix des US en UNE question**, posée **avant** d'écrire la spec. Le découpage proposé est déjà confronté au cap à ce moment-là.
- **`sk-probe.mjs`** remplace 6 à 8 détections en un appel de 0,1 s : audit, superviseur en UTC, branche par défaut, `repos.json`, standards, scripts spec-kit, LOCALES, alias.
- **`recon-seed.mjs`** génère `recon.md` : composants et leurs props lus sur `origin/<défaut>`, ligne LOCALES et test de parité, alias, interdits. recon.md devient obligatoire même à 1 US, puisqu'il ne coûte plus rien.
- **`brief-fill`** :
  - retire les blocs design et contrat sans objet (−17 % de brief) ;
  - déduit seul les chemins de prod et de test depuis les tâches ;
  - écrit lui-même l'extrait design de l'US (`design-extract.mjs`, découpe sans reformulation).
- **`sk-impl`** :
  - la chauffe du cache vitest se fait aussi en audit ;
  - l'orchestrateur ne recopie plus en « faits » ce que recon.md dit déjà.

### 3. Standards agent-os : appliqués strictement, par dépôt
Avant : le brief worker n'avait qu'une ligne « chemins, pas les corps », sans consigne. Le reviewer n'avait **aucun** check standards et excluait même nommage et découpage.
- **`standards-pack.mjs pack`** assemble, pour chaque US et **dans le dépôt de l'US** (index front ou back), le corps des `alwaysInject` et des standards ancrés. Il écarte les standards purement UI d'une US sans interface, et sort en erreur sur un id inconnu.
- **`standards-pack.mjs check`** passe des contrôles mécaniques sur les lignes ajoutées (`standards-checks.json`, ou `metadata.checks` dans le standard). Exemples : commentaire en prod, `status === 409`, contrôle natif au lieu de la lib, `[13px]`, hex, classe C# non `sealed`, fichier dans `Migrations/`.
- **Prep** : chaque `## [USn]` porte sa ligne `Standards:`, et le pack est lu **avant** d'écrire les chemins. Mesuré : la v3 plaçait la modale hors de son dossier, la v4 suit `file-placement`.
- **Revue** : un check 11 « Standards ». Un écart n'est **jamais** une remarque non bloquante : il est FIXED, FAIL, ou ESCALATE si la tâche l'impose.
- **Écart voulu** : quand le besoin contredit un standard ou exige une lib absente, c'est une question de clarify. L'écart accepté est tracé dans plan.md et porté par le pack. Rien d'autre ne déroge.
- **Sonde** : elle signale les standards présents sur disque mais absents de l'index.

### 4. Parallélisme
- `parallel.yml` accepte des **chaînes par dépôt** : `- [US1, US2]` et `- [US3, US4, US5]`. Le moteur fait tourner les voies en parallèle et les US d'une voie en séquence. Une US en échec n'arrête que sa voie.
- Le gel du contrat est lu dans la sortie des reviewers (`contractSha256`, ils le mesuraient déjà au check 9). Il n'y a plus d'agent Sonnet dédié à un sha256 avant et après le fan-out.
- Les deux moteurs (`speckit-us-loop.js`, `speckit-us-after-parallel.js`) sont testés avec un `agent()` simulé : routage, chaînes, dérive du contrat, repli.

### 5. Design Claude Design
Le flux a été testé de bout en bout avec un faux projet. DesignSync n'est utilisable que dans `/design-sync`, il a donc été remplacé par un export local. La prep a rendu :
- la variante `EDITMODE` retenue, les autres exclues ;
- la table des tokens ;
- les sections `## C<n>` avec des valeurs exactes ;
- le 13px hors échelle arbitré vers le token 12px ;
- l'ombre non définie (`--elev-3`) remplacée par celle de la lib, sans rien inventer ;
- l'**instruction injectée** dans le JSX, ignorée et signalée ;
- 8 tâches UI ancrées `Design: design.md#C<n>`.

À l'implémentation, l'extrait par US est maintenant produit par l'outil. Mesuré sur l'US « panneau de commentaires » (6 ancres) :
- le worker livre avec les 6 ancres conformes, uniquement des tokens Septeo, et 0 hex, 0 `px` arbitraire, 0 token design brut ;
- le 13px est rendu en `--font-size-small` + `leading-4.5`, comme l'arbitrage le prévoit ;
- la revue (check 8) a rattrapé un détail du contrat (texte « préservé tel que saisi » → `whitespace-pre-wrap`) ;
- elle a reconnu le `<button>` natif imposé par l'arbitrage §5 comme un écart accepté ;
- elle a vérifié le hash du contrat : intact.

Voie front complète « commentaires » : US3 (data) puis US4 (UI design), 2 workers et 1 revue, environ 9 minutes.

## Phase 2 : chemins non testés, recommandations mises à l'épreuve

| Test | Résultat | Suite donnée |
|---|---|---|
| Vrai Workflow `speckit-us-loop.js` (US1, US2) | US1 : ESCALATE correct, chaîne arrêtée. US2 : FIXED, le reviewer a renforcé un test d'AC trop lâche, preuve rouge→vert | Rien à changer |
| ESCALATE → arbitrage → fix → review 2 | PASS | Rien à changer |
| `sk-pool.ps1` (claim, reprise, release) | Marche | 2 bugs corrigés : session perdue à la reprise, cmdlet Windows seule |
| Pannes injectées A1, A2, A10 | Tenues (A10 a révélé un trou) | Trou corrigé |
| Agents Explore (haiku) | 14/15 fiables | Gardés pour la recon |
| Legacy sans index, « déjà fait » (code-search) | Tenus | Règles précisées |
| Contrôles mécaniques sur vrais diffs | 0 faux positif | +10 règles |
| Bruit de mesure (même US jouée 2×) | Prep S : 2,03 $ / 2,10 $ ; prep M : 2,01 $ / 1,83 $ | Écart < 10 % : les gains mesurés sont réels |
| WIP/budget (plafond forcé à 1 min) | Arrêt propre à 44 s : 2 tâches vertes commitées en `WIP(US6) 2/4`, rien laissé à moitié. Reprise : le nouveau worker saute les 2 tâches faites et livre le reste, gates vertes | Rien à changer |
| C1 : contrat modifié en cours de run | Dérive vue au hash près (ligne 107) | Le reviewer rendait FAIL, et le fix aurait écrasé le contrat. Désormais ESCALATE si la modif ne vient pas de l'US : rejoué, ESCALATE obtenu, contrat intact |
| C2 : tâche qui écrit le contrat | Le worker a laissé le contrat intact mais a livré un champ hors contrat | brief-fill refuse la tâche en amont ; le worker s'arrête (STOP prouvé, 19 s) sur un champ absent du contrat |
| design.md écrit par Sonnet au lieu d'Opus | 0,50 $ et 2 min. Valeurs, tokens, arbitrages et injection signalée équivalents ; 2 décisions de jugement laissées « à confirmer » (ombre, point d'entrée) | Délégué à Sonnet ; Opus relit §2/§5 et pose les points en suspens au clarify (≈ −1,5 $ par prep design) |
| Plafond de taille par dépôt | Le back n'atteint jamais le plafond. Côté front, ce sont les petits fichiers « compagnons » (clés de requête) et une ligne de montage qui le dépassent, alors que ces US se livrent en 2 à 5 min (l1 US4 : 8 fichiers, 2 min 24) | Pas de plafond par dépôt. Les compagnons « and its » ne comptent plus (8 fichiers au plus avec eux), plafond à 6. Dépassements sur le corpus : 27 → 8, rien d'autre ne change |
| A/B standards sur une US d'interface (l1 US4, même commit) | Avec standards : 2,03 $, revue PASS, 0 écart. Sans : 1,97 $, revue FIXED, 1 vrai écart (table `Record<Enum>` dans le composant) et 1 « écart » corrigé à tort | Standards gardés dans le brief, à coût égal pour du code propre du premier coup. +2 contrôles mécaniques (`Record<Enum>` hors du fichier de l'enum, type déclaré dans un `.tsx`), 0 faux positif. Le reviewer vérifie désormais la portée du standard et le fichier modèle avant de corriger |
| Deux /sk-impl qui réservent un slot en même temps | Course reproduite 3 fois sur 3 : les deux obtenaient wt-1, le second écrasait la branche du premier | Réservation sous verrou : le second reçoit REFUS et se rabat sur un autre slot, sans rien demander. Vérifié 3 fois sur 3 |
| Même feature lancée deux fois ; mises à jour simultanées de status.md | La 2e session recevait REPRISE et travaillait dans le même worktree ; 1 ligne d'état perdue sur 4 | REFUS si une autre session active (signe de vie < 45 min) tient le slot ; toutes les écritures sous verrou. Rejoué : refus, reprise par la même session OK, session morte reprise OK, 0 ligne perdue sur 3 essais |
| Répétitions (3 preps) | 0 HIGH | 7 ambiguïtés levées : pack lu via fichier (38 Ko tronqués sinon), ligne « Dépôt prime », enum dans la tâche consommatrice, HIGH de taille exempté, etc. |

## Banc 3 : un jeu mobile three.js (« Dernière Vague »)

Un domaine neuf pour le kit : un FPS de survie par vagues, en TypeScript avec three.js, sans React ni .NET, et avec ses propres standards agent-os (séparation logique/rendu, pas d'allocation dans la boucle, réglages centralisés, perf mobile). Le besoin a été découpé en 3 features : cœur jouable, économie, finition premium.

| Étape | Mesure |
|---|---|
| Prep feature 1 (7 US, 30 tâches) | 2,32 $ · 7 min 24 · 0 HIGH |
| Impl feature 1 | 7 US livrées, 297 tests, 93 % de couverture, build d'une seule page de 588 Ko. ~3 à 4 $ par US (worker + revue). 3 allers-retours de correction (~1 $ chacun) |
| Prep feature 2 (7 US, 29 tâches) | 2,94 $ · 9 min · 0 HIGH. Ligne `PARTAGE` posée d'elle-même |

| Impl feature 2 (économie) | 7 US livrées, 609 tests, 95 % de couverture. 2 ESCALATE justifiés : tirs bloqués par une porte ouverte (dette de la feature 1), invite de porte affichée comme un achat d'arme |
| Prep + impl feature 3 (bonus, finition) | 7 US, 859 tests. **3 US en voies parallèles** dans des slots séparés : 2 fusions propres (aucun fichier commun) et 1 fusion à 3 conflits (`main.ts` commun), résolus par union |
| Prep + impl feature 4 (rendu premium) | 8 US, 1032 tests. 2 paires de voies parallèles (US1 ∥ US6 → US5, US2 ∥ US8), 3 fusions sans conflit. `window.__qa()` mesure : 101 appels de dessin (budget 150), qualité adaptative de 3 à 10 images/s sur rendu logiciel |
| Total features 1 à 4 | 91 $ · 76 agents · 4 preps · 29 US, soit ~3,10 $ par US, corrections comprises. Code et trios dans `examples/derniere-vague/` |

Ce que le domaine a révélé, et ce qui a été corrigé dans le kit :
- **Écart déclaré jamais jugé** : une copie figée de la carte, déclarée par le worker en feature 1, a cassé les tirs à travers les portes en feature 2. Le reviewer rend maintenant un verdict explicite sur chaque écart déclaré. Effet immédiat : il a trouvé l'invite de porte erronée à l'US suivante.
- **Variante ajoutée sans son consommateur** (invite, état de zombie) : la prep embarque maintenant le consommateur (HUD, pose, son) dans la même US.
- **DONE commité avec un typecheck rouge** : interdit. Un consommateur cassé hors des chemins de l'US donne un STOP prouvé.
- **`vitest related` aveugle aux imports paresseux** : la gate de fin ajoute les tests trouvés par recherche du chemin du module (un test cassé était passé inaperçu).
- **Parallélisme dans un seul dépôt** : le lint signale une US sans fichier commun (`story-parallel-candidate`), et sk-impl documente les voies par slot, la fusion et `tasks-merge`. Condition : aucun fichier commun, point d'entrée compris.
- **`mount-check` muet hors React** : il ne classait que composants, hooks et services, et répondait « NONE » à chaque US du jeu. Il contrôle maintenant tout module ajouté, sans faux positif sur les runs MySepteoWeb.
- **Voies parallèles par paires** : le lint liste aussi les paires d'US sans fichier commun (`story-parallel-pairs`), ce qui a donné 2 voies en feature 4.
- **Entrée partagée rendue morte par l'US** : elle se retire, au lieu de rester sans lecteur.
- **Index de standards à plat** (`game/x:`) : la sonde le déclarait « non indexé » et le pack refusait ses identifiants, donc aucun standard en sous-dossier n'aurait été appliqué. Corrigé, avec test.
- **Fichiers `ui/` en `.ts`** non reconnus comme interface : le standard HUD était écarté. Corrigé.
- **recon-seed** posait des interdits propres à MySepteoWeb (`<table`, tokens Septeo) sur un dépôt qui n'en a pas. Ils sont maintenant conditionnels, et la liste des modules les remplace.
- **Regex d'alias fantômes en `(?:`**, que `grep -E` rejette : ce contrôle ne marchait pas, MySepteoWeb compris. Corrigé.
- **Recette du RED par import paresseux** : un test sans `import` devient un script global, d'où des collisions TS2451 qui apparaissent ou non selon le cache `tsc`. Désormais : `export {};` en tête.
- **Config partagée hors des chemins de l'US** (`visualConfig.ts`) : 2 ESCALATE de suite. Ajout d'une ligne `PARTAGE` dans recon.md : ces fichiers sont ouverts en ajout seul à toutes les US, et le reviewer le sait.
- **Partie de fichier qu'un standard range ailleurs** (textures) : la prep la déclare maintenant en compagnon, et le test de ce compagnon rejoint la liste des tests du brief.
- **Faits rendus en `[object Object]`** : les workers renvoient `facts: [{fact, source}]`, mais brief-fill ne savait afficher que du texte. Recopiés tels quels, les faits devenaient illisibles, et une feature entière en a perdu 22. Les deux formats sont maintenant acceptés, avec test.
- **`main.ts` signalé « non monté »** à chaque US : un point d'entrée est maintenant la racine du montage.
- Clarifications de prep : ordre d'écriture, `Monté dans:` pour la logique appelée, point d'entrée non rendable, interdits limités à un dossier.

Le kit a aussi bien fonctionné là où on l'attendait. Les 2 ESCALATE étaient de vrais défauts de prep, et le reviewer a refusé de les trancher seul. Les contre-tests rouge→vert ont été faits, la reprise des faits d'une US à l'autre a évité des recherches répétées, et 0 standard a été violé en fin de chaîne.

## Nuit du 6 au 7 octobre : nouveaux systèmes, mis à l'épreuve

| Système | Ce qu'il fait | Résultat mesuré |
|---|---|---|
| `facts-add.mjs` | Les faits rendus par chaque worker vont automatiquement dans `facts.json`, et brief-fill les injecte aux US suivantes | Plus de recopie manuelle, ni de `[object Object]` |
| `lanes.mjs` | Calcule les vagues d'US parallélisables (fichiers communs, réutilisation, propriétaire du montage) | Jeu : 5 à 7 vagues pour 7 ou 8 US. Proposé au GO quand il n'y a pas de parallel.yml |
| Pilote de fusion `merge=union` | Testé pour fusionner seul les fichiers PARTAGE | **Rejeté** : il casse les objets `as const` (10 erreurs tsc) |
| Test A/B : review par Sonnet ou par Opus | 7 US du jeu déjà revues, rejouées avec Sonnet | Sonnet seul : 3 défauts ratés sur 5, et 1 trouvé à moitié. Opus reste le reviewer |
| `diff-cover.mjs` | Liste les lignes de prod ajoutées qu'aucun test n'exécute (lcov : vitest, jest, coverlet) | Retrouve le cylindre jamais construit (F4-US1) raté par Sonnet. Tourne à la fin du worker et dans la review |
| Gate du reviewer = `related` + imports paresseux | Le reviewer relance aussi les tests qui chargent le module indirectement | Retrouve le test cassé (F3-US5) raté par Sonnet |
| `reviewTier: "auto"` (expérimental, désactivé par défaut) | Première review par Sonnet pour une petite US (≤ 4 fichiers de prod) qui ne déclare aucun écart | Avec les deux contrôles ci-dessus, Sonnet rattrape 3 défauts mécaniques sur 4. Il rate encore un écart de conception, d'où le garde-fou |


**Miro F1 (commentaires des post-it, régime L : back .NET + front React + design)**, préparé et implémenté avec le kit de cette nuit :

| Étape | Mesure |
|---|---|
| Prep (7 US, 28 tâches, contrat, design) | 5,93 $ · 14 min · 0 HIGH après correction |
| Impl : 2 voies en parallèle (back US1-3 ∥ front US4-7) | 7 US, 13 agents, 9,19 $ soit **~1,3 $ par US** (jeu : 3,10 $, avec des US plus grosses). Back 77 tests, front 128, tsc et eslint verts, fusion dans dev des deux dépôts |
| Verdicts | 5 PASS (Opus), 1 PASS (Sonnet, palier auto sur une petite US), 1 FIXED : Opus a jugé défectueux un écart de design déclaré (label C7 décalé de 16 px) et l'a corrigé avec un test vu rouge |

**Miro F2 (partage de tableau, rôles lecteur/éditeur, back + front)** :

| Étape | Mesure |
|---|---|
| Prep (9 US, 32 tâches, contrat) | 3,62 $ · 9 min · 0 finding. La prep a vu seule qu'un lecteur recevait déjà 403 sur les items (exigence déjà remplie) |
| Impl, 2 voies (back US1-3 ∥ front US4-9) | 9 US, 18 agents, 9,38 $ soit **~1,0 $ par US**. Back 126 tests, front 199, tout vert, fusionné |
| Reviews | 4 par Sonnet (palier auto) : 4 PASS à 0,21 $ en moyenne. 6 par Opus (0,70 $) : 3 FIXED, dont 2 fois un 204 du contrat non testé et 1 test tautologique |
| Contre-vérification | 2 US validées par Sonnet relues par Opus : 2 PASS, verdicts identiques |

Ce que F2 et F3 ont apporté au kit :
- **diff-cover voit les branches** (BRDA) : le 204 d'un ternaire sur une ligne passait la couverture de ligne. L'alerte BRANCH reste non bloquante (une garde défensive n'est pas un défaut).
- **Lint `mount-note-missing`** : un module créé dans une US mais lu seulement par une US ultérieure, sans annotation. 1 vrai positif, 0 faux positif sur 6 autres features.
- **Lint `recon-edit-outside-paths`** : recon.md demandait d'éditer un fichier (builders.ts) qu'aucune tâche ne touche. 2 vrais positifs (F1 et F2).
- **Lint des faits vérifiés** : il sautait les fichiers existants cités par une tâche « Créer » (15 faits sur 25 non vérifiés), et lisait le disque au lieu de la ref.
- **Dérive après fusion** : F3 a été préparée avant la fusion de F2. Au GO, le lint trouve 7 faits décalés, et `fact-lines.mjs` les recale tous les 7 en une commande.
- **`lanes.mjs`** voit les dépendances par nom de classe (même stack) et par mention « (USn) ».
- **Moteur Workflow** : les faits d'un worker passent aux US suivantes du même dépôt pendant le run. Avant, ils n'arrivaient qu'après.
- Le worker repasse l'import paresseux du RED en statique après GREEN ; un cas de contrat hors seed se teste en substituant le service.

**Miro F3 (annuler / rétablir, front seul)**, volontairement préparée AVANT la fusion de F2 pour tester la dérive :

| Étape | Mesure |
|---|---|
| Prep (3 US, 11 tâches) | 3,71 $ · 8 min · 0 finding |
| GO après la fusion de F2 | le lint (qui lit maintenant la ref) trouve 7 faits décalés, et `fact-lines.mjs` les recale en une commande |
| Impl (3 US) | 4,30 $. Front 253 tests, tout vert, fusionné |
| Dérive de structure | T008 demandait de « créer » des types livrés depuis par F2. Le worker s'est arrêté avec la preuve au lieu de casser un consommateur. Arbitrage : garder l'existant et supprimer un service en doublon. Nouvelle règle de lint `task-creates-existing`, vérifiée au GO |

**Miro F4 (connecteurs entre items, back + front)**, préparée avant la fusion de F3 :

| Étape | Mesure |
|---|---|
| Prep (8 US, 37 tâches) | 4,03 $ · 10 min |
| GO après la fusion de F3 | 3 faits décalés recalés par `fact-lines`, 0 tâche « Créer » sur un fichier existant |
| Impl | 8 US, 16 agents, 8,98 $ soit **~1,1 $ par US**. Back 162 tests, front 346 |
| **Voies parallèles dans un seul dépôt** | US4 ∥ US5, proposées par `lanes.mjs` : un worktree par US, puis fusion sans conflit, `tasks-merge` et `facts-add` de la voie (301 tests verts juste après la fusion) |
| Reviews | 3 par Sonnet (palier auto) : 3 PASS. 5 par Opus : 5 PASS, dont 1 doublon de helper accepté (règle de prep ajoutée) |

 Nouvel outil `cap-check.mjs` : il mesure l'esquisse de découpage AVANT clarify, avec le même compte que le lint. 3 preps sur 4 redécoupaient après la réponse de l'humain.

**Miro F5 (demande piège : « commenter aussi les formes et textes + badge du nombre de commentaires »)** : le back acceptait déjà les commentaires sur tout type d'item. La prep l'a vérifié : la partie « formes et textes » est 1 seule US front, sans tâche back. Le badge passe par un endpoint de comptage, pas par N requêtes. Prep 3,36 $, impl 5 US pour 4,34 $ (~0,9 $ par US), front 374 tests. 5 reviews : 5 PASS.

**Palier de review Sonnet (`reviewTier: "auto"`), bilan de la nuit** : 10 reviews de petites US sans écart déclaré, toutes PASS, à 0,21 $ en moyenne contre 0,70 $ pour Opus. 3 de ces US ont été relues par Opus en contre-vérification : 3 verdicts identiques. Tous les défauts trouvés en review (5 FIXED) l'ont été par Opus, sur des US que le routage lui envoyait (écart déclaré ou plus de 4 fichiers). Ma recommandation : activer `reviewTier: "auto"`. Il reste désactivé par défaut tant que tu ne l'as pas décidé.

**Test de bout en bout de Miro après F1 à F4** (back et front lancés, Playwright, 14 scénarios tirés des critères d'acceptation des 4 spec.md) : 13 PASS, 1 FAIL. Le contrat back/front est conforme sur tous les appels exercés : URL, verbes, corps, 201 avec Location, 204, CORS. Deux défauts que les tests unitaires (qui mockent le transport) et les reviews ne pouvaient pas voir :
- **Cohérence entre features** : le rôle courant est calculé deux fois. Si GET members échoue, le service renvoie une liste vide : F3 bloque alors l'historique, mais F2 laisse toute la barre d'outils à un lecteur. Règle de prep ajoutée : un état dérivé qui existe déjà se réutilise, et un droit dérivé traite l'état inconnu comme le plus restrictif.
- **Concurrence côté back** (« database is locked » sur SQLite mémoire) : un défaut du socle de départ, pas des features. Les 3 lectures parallèles ajoutées à l'ouverture d'un tableau le rendent visible.
Recommandation : un passage E2E (le cahier `sk-e2e.md` existe, mais aucune skill ne l'exécute) après chaque lot de features.

**`/sk-xs` mis à l'épreuve sur les 2 défauts** (premier passage de cette skill sur le banc) : les 2 corrections sont faites en un commit chacune, avec un test vu rouge puis vert. Côté front, la lecture seule quand le rôle est inconnu (`it.each` sur 3 cas). Côté back, une connexion SQLite par DbContext, plus un test de 80 GET parallèles : 3 rouges sur 3 avant, 3 verts sur 3 après. Le skill n'était écrit que pour vitest : il a maintenant ses gates .NET, et rejoue les tests d'intégration quand un fichier transverse (Program.cs) est touché.

**Deuxième test de bout en bout, après F5, F6 et les 2 corrections** : 18 scénarios sur 18 PASS, sur chacun des 5 runs réels non sérialisés. 0 réponse 500 (17 au premier passage), et un test de charge (200 lectures + 40 créations simultanées) passe. Le badge de F5 se met à jour sans rechargement et le tracé de F6 survit au rechargement et à annuler/rétablir. Un cas non spécifié remonte : appuyer avec le Crayon sur un item existant le déplace au lieu de dessiner. D'où une règle de prep : tout nouveau mode d'interaction dit ce qu'il fait sur les éléments existants.

**Miro F6 (dessin à main levée, extension de l'enum `BoardItemType` des deux côtés)** : prep 4,28 $ (4 US, 20 tâches). Impl 6,79 $, dont 0,94 $ perdus (un worker arrêté sur un brief refusé, un autre coupé par un redémarrage du conteneur). Back 206 tests, front 438.
- **Brief refusé à tort** : brief-fill prenait une simple référence au contrat (« contract \`contracts/x.yaml\` ») pour une écriture, alors que le lint de prep ne faisait pas ce contrôle. Désormais, seule l'écriture compte (un verbe d'écriture devant le chemin), avec la même fonction côté lint (`task-writes-contract`).
- **Worker perdu en pleine US** (redémarrage du conteneur) : nouvelle règle de reprise dans sk-impl. Le travail non commité part en stash, les cases sont remises à zéro, et l'on relance sur un arbre propre.
- **BRANCH** : pour la 4e fois, une branche écartée par le worker était un cas métier trouvé en revue (déplacer un tracé doit garder ses points). Dans un service, un repository ou un hook, BRANCH est maintenant présumée cas métier.
- Lint : mots-clés OpenAPI (`minItems`…) et champs déjà présents dans un DTO existant ne sont plus signalés comme champs de contrat sans source.

**Miro F7 (mini-carte et zoom regroupés, depuis une 2e maquette claude.ai/design, 3 pièges)** : la prep traite les 3 pièges de la maquette. Le token `--space-7` inexistant est demandé puis tranché à 4 px (sans le confondre avec le `--spacing-7` de la lib, qui fait 28 px). Les 14,5 px deviennent 14 px, en écart accepté. La variante b est exclue. Le zoom existant est étendu, sans second état. 2 US, front 489 tests. La review de US1 a corrigé une garde du worker qui rendait « Tout afficher » inerte sur un tracé de F6 parfaitement horizontal (interaction entre features). Côté kit : faux positif de brief-fill (un type TS `<HTMLElement | null>` pris pour un placeholder), recon des composants de la lib avec le type de leurs props, mode audit qui s'arrête proprement quand le projet design est introuvable (mon chemin de banc était faux, et le kit a refusé de deviner).

**Non-régression des preps après toutes les règles de la nuit** (mêmes besoins que les bancs de référence, kit actuel) :

| Prep | Référence | Kit de cette nuit |
|---|---|---|
| S (filtre statut) | 1,5–2,7 $ · 290–430 s | 2,11 $ · 279 s · 0 finding final |
| M (ajout contact, 2 US) | 1,87–1,95 $ · 315–360 s | 2,09 $ · 302 s · 0 HIGH, 0 MEDIUM |

Pas de régression : coût dans la fourchette (M +7 % au pire), durée meilleure. Les 4 frictions remontées sont corrigées : un chemin cité en prose (« lu dans dist/index.d.ts ») était pris pour un fait (seuls les chemins entre backticks comptent), un standard qui contredit le besoin se lit avant clarify, l'endpoint sans réponse de l'humain suit le dépôt, et la règle de montage tient en une ligne.

Défauts du kit révélés par F1, et corrigés :
- Le brief d'une US back renvoyait à `specs/...` en relatif, alors que le trio vit dans le dépôt front. Il donne maintenant le chemin absolu.
- Les faits du back (SQLite, horloge figée) arrivaient dans les briefs front. Ils sont maintenant rangés par dépôt (`--slot`).
- `mount-check` lisait la tâche qui cite le fichier comme cible de montage au lieu de la tâche du fichier, d'où un faux UNMOUNTED.
- `diff-cover` côté .NET : coverlet écrit `<guid>/coverage.info`, et les propriétés auto `{ get; set; }` faisaient du bruit. Les deux sont gérés.
- Retours de prep : recettes back dans recon.md (section `## Back`, vérifiée dans le dépôt back), source « créé par T<n> » pour une table que crée la feature, design.md écrit avant que FEATURE_DIR existe, token cité dans une note pris pour une cible.

## À faire de ton côté
1. **Copier `agents/sk-worker.md` et `agents/sk-reviewer.md`** dans `~/.claude/agents/` (et `~/.cursor/agents/`). Les workflows les appellent désormais.
2. **Index front** : 4 standards existaient sans être indexés, donc n'étaient jamais appliqués : `api/multipart-upload`, `api/request-timeouts`, `react/grid-filters`, `react/paginated-grids`. Ils sont ajoutés dans `agent-os/front/standards/index.yml` du dépôt : à reporter dans MySepteoWeb.
3. **Index back** : il n'avait pas de `_meta.alwaysInject`. J'en propose un, avec sealed, no-hardcoded-values, base classes et interfaces : à valider.
4. Les gabarits `sk-prep/templates/` et les scripts `.ps1` de spec-kit : la sonde détecte la variante `ps1` ou `sh`, rien à faire sous Windows.

## Limites du banc
- Je n'ai pas lancé de sessions `claude -p` imbriquées (refusées par les permissions de cet environnement). Les runs sont des sous-agents qui jouent les skills en mode audit, avec le prompt système de l'agent passé en texte. L'effet du conflit `tdd-dev` est donc sans doute **sous-estimé** ici.
- Les sous-agents ne peuvent pas relancer d'agents : le fan-out Explore de la prep n'a pas été mesuré (0 agent sur 15 preps, la recon inline a suffi). Le Workflow (n ≥ 2) a été rejoué à la main et ses moteurs testés hors modèle.
- Les durées de runs lancés en parallèle peuvent être un peu gonflées. Les comparaisons s'appuient surtout sur les tokens, le coût et la qualité des trios.

## Tests du kit
`node --test skills/_shared/tests/*.test.mjs` : 39 tests, qui couvrent brief-fill, la sonde, recon-seed, standards-pack, tasks-merge, design-extract et les deux moteurs Workflow.
