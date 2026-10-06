---
name: sk-review
description: Review une PR Azure DevOps dans un slot du pool de worktrees (<POOL_BASE>\<REPO_SLUG>\wt-1..4), en lecture seule. Trois axes et trois seulement : conformité aux standards AgentOS du projet concerné, duplication / divergence avec l'existant, défauts réels du diff. Puis poste sur la PR les seuls points pertinents, après GO humain. STOP immédiat si aucune URL de PR n'est fournie. N'écrit aucun code, ne commit rien, ne vote pas. Use when the user invokes /sk-review or asks for a review of a pull request.
argument-hint: "<url de la PR Azure DevOps>"
disable-model-invocation: true
allowed-tools: Bash PowerShell Read Glob Grep AskUserQuestion ToolSearch EnterWorktree ExitWorktree Agent
---

# Review de PR isolée en worktree (`/sk-review`)

Cible : **$ARGUMENTS**

## 0. Garde-fou d'entrée — avant le repo, avant le slot

Lis `$ARGUMENTS`. **Aucune URL de PR Azure DevOps exploitable → STOP.** Ne résous pas de repo, ne
touche pas au pool, ne crée aucun worktree. Demande l'URL par `AskUserQuestion` et arrête-toi là.

Est exploitable : une URL de la forme
`https://dev.azure.com/<org>/<project>/_git/<repo>/pullrequest/<id>`, ou le couple explicite
`<repo> #<id>`. Un numéro nu (`3712`) sans repo ne suffit **pas** : deux dépôts du projet ont chacun
leur PR 3712. Un nom de branche non plus.

Extrais et annonce en une ligne : `ORG`, `PROJECT`, `PR_REPO`, `PR_ID`.

**Cette commande ne modifie jamais le code.** Pas d'`Edit`/`Write` sur les fichiers du dépôt, pas de
commit, pas de push, pas de vote sur la PR. Sa seule écriture externe est le post des commentaires de
l'étape 5, sous GO humain.

## 1. Résoudre le dépôt local du **repo de la PR** (pas du repo courant)

Le repo de la PR est souvent un **autre dépôt** que celui de la session (ex. session dans le front,
PR dans l'API). Ne suppose jamais que c'est le repo courant.

1. Si `PR_REPO` correspond au dépôt courant (compare à l'`origin` de
   `git remote -v`) → `LOCAL_REPO` = racine du dépôt courant.
2. Sinon, cherche le clone dans cet ordre, et **vérifie l'`origin`** de chaque candidat avant de le
   retenir : le `CLAUDE.md` du dépôt courant (il documente souvent le chemin du dépôt frère),
   `C:\Users\<user>\source\repos\<PR_REPO>`, `C:\Users\<user>\Documents\git\<PR_REPO>`.
3. Aucun clone trouvé → `AskUserQuestion` (chemin du clone) et **STOP** sans cloner quoi que ce soit.

`REPO_SLUG` = basename du **parent** de `git -C <LOCAL_REPO> rev-parse --path-format=absolute --git-common-dir`
(jamais `--show-toplevel` : depuis un worktree il renvoie le slot, pas le dépôt).

## 2. Slot du pool — contrat commun à `/sk-impl` et `/sk-xs`

- `POOL_BASE` et `REPO_SLUG` : `~/.claude/skills/_shared/sk-config.md`.
- `POOL_ROOT = <POOL_BASE>\<REPO_SLUG>` · `STATUS_FILE = POOL_ROOT\status.md` (informatif, pas un
  lock). Le pool est **scopé par dépôt git** : le pool du front n'a rien à voir avec celui de l'API.
- **Pool absent pour ce `REPO_SLUG`** (cas courant sur un dépôt jamais passé par `/sk-*`) : ne lance
  pas `/sk-pool-init` (il crée 4 slots avec jonctions `node_modules`, hors de proportion pour une
  review). Crée **un seul** slot : `git -C <LOCAL_REPO> worktree add --detach <POOL_ROOT>\wt-1 <SOURCE_SHA>`,
  puis initialise `STATUS_FILE` avec les 4 lignes `wt-N | idle` (les 3 autres slots n'existent pas
  encore, c'est normal et attendu).
- **Résolution et prise du slot : une commande** (contrat `~/.claude/skills/_shared/sk-pool.md`,
  `SKP = pwsh -File ~/.claude/skills/_shared/sk-pool.ps1`) :
  `SKP -Action free -Repo <LOCAL_REPO>` → `LIBRE <slot>`. Les slots occupés (git sur une branche de
  travail) appartiennent à un run d'implémentation — **ne les touche pas**. `LIBRE-SALE` →
  `AskUserQuestion` avant de le détourner ; ne jette pas silencieusement le travail de quelqu'un.
  Exit 2 → `AskUserQuestion` (attendre / créer un slot supplémentaire / abandonner).
- Prise : `SKP -Action claim -Slot <slot> -Branch review-pr-<PR_ID> -Base <SOURCE_SHA>`. La
  branche `review-pr-<PR_ID>` n'est qu'un pointeur sur la tête de la PR : c'est ce qui rend le
  slot visiblement occupé pour git et pour Claude Fleet, et la libération la jette toujours. Le
  `claim` écrit la ligne `STATUS_FILE` (session et terminal lus dans l'environnement).
  **Libère à l'étape 6 par `SKP -Action release -Slot <slot>`**, y compris si la review s'arrête
  en erreur.
- `EnterWorktree { path: "<slot>" }`. Hors interactif, pilote par chemins absolus.
- Pas de jonction `node_modules`, pas de `yarn install` : une review ne lance pas la suite de tests.
  Si l'étape 4 impose une vérification qui a besoin des dépendances, pose la jonction **à ce
  moment-là** seulement.

## 3. Cadrer le diff

Charge les outils Azure d'un coup :
`ToolSearch("select:mcp__azure__repo_get_pull_request_by_id,mcp__azure__repo_list_pull_request_threads,mcp__azure__repo_create_pull_request_thread")`.

1. `repo_get_pull_request_by_id` (avec `includeWorkItemRefs: true`) → titre, auteur, `isDraft`,
   `sourceRefName`, `targetRefName`, `lastMergeSourceCommit` = **`SOURCE_SHA`**, work items liés.
2. `git -C <LOCAL_REPO> fetch origin <source> <target>` — un `fetch` ne touche pas le working tree,
   il est sûr même avec du WIP dans le dépôt principal.
3. **`BASE_SHA` = `git merge-base <SOURCE_SHA> origin/<target>`.** N'utilise **pas**
   `lastMergeTargetCommit` de l'API : la branche cible a avancé depuis, et le diff serait pollué par
   les commits des autres.
4. `git diff --stat <BASE_SHA>...<SOURCE_SHA>` puis le diff complet par couche. Un `...` (trois
   points), jamais deux.
5. `repo_list_pull_request_threads` — **obligatoire** : ne redis pas ce qu'un autre relecteur a déjà
   écrit, et ne rouvre pas un point tranché.
6. Les work items liés portent les critères d'acceptation. Lis-les (`wit_get_work_item`, champs
   `System.Description` et `Microsoft.VSTS.Common.AcceptanceCriteria`) : c'est le seul moyen de
   distinguer « le code est faux » de « le code ne fait pas ce qui était demandé ».

Diff > ~20 fichiers : découpe la lecture par couche plutôt que de tout charger. Un fan-out `Agent`
n'est justifié qu'au-delà, et jamais pour la partie standards (elle exige la citation exacte).

## 4. Les trois axes de la review

### Axe A — Standards AgentOS du projet concerné

Le point central de cette commande. Les standards vivent dans le dépôt de la PR, pas dans celui de
la session.

1. `agent-os/standards/index.yml` absent dans le dépôt de la PR → dis-le et saute cet axe. Ne
   transpose **jamais** les standards d'un autre dépôt : ceux du front et ceux de l'API sont des
   corpus différents.
2. Lis l'index (les `description:` suffisent à trier), puis **ouvre les fichiers des seuls domaines
   que le diff touche**. Un diff controller + DTO + repository n'a pas besoin des standards
   `middleware` ou `configuration`.
3. **Lis les standards depuis `origin/<target>`** (`git show origin/dev:agent-os/standards/<x>.md`),
   pas depuis le slot : le slot est sur la branche de la PR, où l'auteur a pu modifier un standard
   dans la même PR — un standard ne se valide pas contre lui-même.
4. **Une divergence ne se poste qu'avec la citation littérale du standard qui la fonde.** Pas de
   « ça me semble non conforme ». Cette règle n'est pas cosmétique : sans elle on invente des
   violations. Un `204 No Content` sur résultat vide *ressemble* à un défaut d'API et est en fait
   prescrit noir sur blanc par `controllers/http-204-no-content` — sans lecture du fichier, le
   commentaire aurait été faux.
5. Inverse aussi la lecture : un standard **respecté avec soin** (whitelist de tri, escaping `LIKE`,
   `ApplyConfiguration` pour un parent sans DbSet) mérite d'être noté dans le rapport terminal, pas
   sur la PR.

### Axe B — Duplication et divergence avec l'existant (double sécurité)

Un code peut être conforme à chaque standard pris isolément et rester une deuxième façon de faire
une chose déjà faite ailleurs. C'est ce que l'axe A ne voit pas.

Pour chaque brique introduite (DTO de filtre, service de grille, endpoint paginé, mapper, config EF,
constantes de tri…), cherche son équivalent le plus proche déjà en place :

- `Glob` sur les noms voisins (`*Filter.cs`, `*Query.cs`, `*SortFields.cs`, `*ConsoleRepository.cs`),
  `Grep` sur le type de retour ou l'abstraction partagée (`PagedResult<`, `IQueryable<`).
- Puis compare la **forme** : mêmes couches, même type de retour, mêmes conventions de propriétés,
  même découpage des responsabilités.

Deux verdicts valent un commentaire :
- **Duplication** : la brique refait ce qu'un helper / une extension / un DTO existant fait déjà.
- **Divergence de forme** : la brique fait la même chose qu'un précédent identifié, mais autrement,
  sans raison. C'est le cas le plus fréquent et le plus utile à signaler — un pattern à deux variantes
  coûte plus cher que les deux implémentations réunies. Cite toujours le précédent par
  `chemin/fichier.cs`, sinon le commentaire n'est pas actionnable.

Une divergence **assumée et justifiée** (commentaire de code qui l'explique, contrainte technique
réelle) n'est pas un finding. Vérifie avant de poster.

### Axe C — Défauts réels du diff

Bugs, écarts aux critères d'acceptation, sécurité, requêtes qui ne passeront pas. Ne spécule pas :
**vérifie**.

- Mapping EF, colonnes, valeurs de discriminateur, unicité d'une clé de jointure → le MCP
  `mssql-sqlserver` fait foi (`describe_table`, `run_sql` en lecture seule sur `db_GENAPI`), pas la
  lecture du code. Une jointure sur une colonne non unique, une constante métier, une collation :
  ça se prouve par une requête.
- Doute sur la compilation ou sur la traduction d'une requête → `dotnet build` dans le slot, ou une
  sonde de test temporaire. Toute sonde écrite est **supprimée avant l'étape 5** ; dis-le dans le
  rapport.
- Un finding qui n'a pas pu être vérifié se formule comme une question, pas comme une affirmation.

## 5. Filtrer, puis poster

### Le filtre — c'est la partie qui fait la valeur de cette commande

Par défaut un point **ne se poste pas**. Il faut qu'il passe les deux barrières :

**Ne poste pas :**
- Le formatage, l'ordre des membres, un nom qui aurait pu être meilleur, une préférence de style.
- Un manque de commentaire ou de doc sur un point isolé, sauf si le standard l'exige explicitement.
- Une remarque de perf sans mesure, sur un volume que tu n'as pas regardé.
- Une réécriture « plus propre » qui n'est fondée que sur ton goût.
- Une déviation que **tout le voisinage** partage déjà : c'est une dette de repo, pas un défaut de
  cette PR. À dire au terminal, pas sur la PR de quelqu'un.
- Un point déjà couvert par un thread existant (étape 3.5).

**Poste :**
- Une violation d'un standard AgentOS, avec sa citation.
- Une duplication ou une divergence de forme face à un précédent nommé.
- Un défaut vérifié : bug, écart à un AC, faille, requête qui casse.

Ordre de grandeur d'une PR saine : **3 à 6 commentaires**. Au-delà de ~8, tu es en train de poster
du chichi — retrie. Zéro commentaire est un résultat valide et doit être annoncé comme tel.

### Le GO humain

`AskUserQuestion` avec la liste exacte des commentaires prévus (fichier:ligne + une ligne de résumé
chacun), groupés par axe. Options : Poster tout / Choisir un sous-ensemble / Ne rien poster.
**N'écris rien sur la PR avant ce GO.** L'utilisateur retire souvent un ou deux points — c'est le
but de l'étape.

Par défaut, seuls les axes **A et B** partent sur la PR ; les findings de l'axe C restent dans le
rapport terminal et ne sont proposés à l'envoi que si l'utilisateur le demande. Il commente
généralement les divergences de principe et garde les écarts fonctionnels pour l'oral.

### Le post

`mcp__azure__repo_create_pull_request_thread`, un thread par point, **inline** :
`filePath` avec son `/` initial (`/MySepteo.Api.Dto/OfferGridFilter.cs`),
`rightFileStartLine`/`rightFileEndLine` + `rightFileStartOffset`/`rightFileEndOffset` (les offsets
sont obligatoires dès qu'une ligne est donnée). Les numéros de ligne sont ceux du fichier **côté
source de la PR** — relève-les dans le slot, pas dans le dépôt principal.

Forme d'un commentaire : le constat en une phrase, la citation du standard ou le chemin du
précédent, le correctif attendu. Pas de préambule, pas de « super travail mais ». Le français est la
langue des commentaires ; les identifiants restent en anglais.

## 6. Clôture

- `ExitWorktree` s'il y a eu `EnterWorktree`.
- `SKP -Action release -Slot <slot>` — **y compris en cas d'abandon ou d'erreur**. Un slot laissé
  occupé bloque les runs d'implémentation. Jamais de `checkout` ni d'édition de `STATUS_FILE` à la main.
- Ne supprime pas le worktree : il resservira. Ne supprime pas le pool.
- Rapport terminal : les trois axes, ce qui a été posté (avec les ids de thread), ce qui a été écarté
  et pourquoi, les vérifications faites (requêtes SQL, build, sondes supprimées), et ce qui reste en
  question ouverte pour l'auteur.

## Garde-fous

- **Aucune URL de PR → STOP à l'étape 0.** Rien n'est résolu, rien n'est créé.
- **Lecture seule sur le code.** Aucun `Edit`/`Write` dans le dépôt, aucun commit, aucun push, aucun
  vote sur la PR. Une sonde de test temporaire est la seule exception, et elle est supprimée.
- **Le pool du dépôt de la PR**, jamais celui du dépôt courant quand ils diffèrent.
- **Slots `busy` intouchables** : ils portent un run d'implémentation en cours.
- **`BASE_SHA` = `merge-base`**, jamais `lastMergeTargetCommit` : la cible a avancé.
- **Standards lus sur `origin/<target>`**, jamais dans le slot.
- **Pas de finding sans preuve** : citation du standard, chemin du précédent, ou requête SQL / build.
  Un doute se formule en question.
- **Pas de chichi** : 3 à 6 commentaires sur une PR saine. Le filtre de l'étape 5 n'est pas
  optionnel.
- **GO humain avant tout post.** Poster est une action visible par l'auteur et l'équipe.
