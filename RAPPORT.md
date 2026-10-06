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
`node --test skills/_shared/tests/*.test.mjs` : 19 tests, qui couvrent brief-fill, la sonde, recon-seed, standards-pack, tasks-merge, design-extract et les deux moteurs Workflow.
