# Publier une feature — branche `feature/<NNN>-<slug>` + PR draft Azure DevOps (source unique)

Contrat lu par `/sk-impl` (option « Publier » du verdict) et par `/mon-developpeur`
(qui prepare `pr.md` et repond « Publier »). Il remplace l ancien merge squash dans le
`dev` local : le depot principal ne recoit plus rien, la revue se fait sur Azure DevOps.

## Pourquoi plus de merge local

Le flux de l equipe est PR -> `dev`. Un squash dans le `dev` local mettait le poste en
avance sur `origin/dev`, sans revue, et supprimait la branche : plus rien a pousser. Ici la
branche vit sur `origin`, la PR est en brouillon, l humain la passe en revue. Rien
d irreversible ne part sans lui : un brouillon se ferme d un clic.

## Entrees

| Nom | Valeur |
|---|---|
| `SLOT` | le slot qui porte `sk-impl-<FEATURE_SLUG>` |
| `DEFAULT` | branche par defaut du depot (`git -C <SLOT> symbolic-ref refs/remotes/origin/HEAD`, sinon `dev`) |
| `PUB_BRANCH` | `feature/<NNN>-<slug>` (le dossier `specs/` sans rien d autre) |
| `TITLE` | `<type>(<scope>): <titre de spec.md>` — type `feat` sauf si spec.md dit fix/refactor |
| `PR_BODY` | `FEATURE_DIR/pr.md` s il existe (ecrit par le superviseur) ; sinon genere (voir §Description) |
| `WORK_ITEM` | ligne `Work item: <id>` en tete de `spec.md` ; sinon consigne ; sinon `mcp__azure__search_workitem` sur le titre de la spec, projet `MySepteo` — **un seul** resultat dont le titre recouvre le besoin, sinon aucun lien et on le dit |
| `REPO_ID` | GUID via `mcp__azure__repo_get_repo_by_name_or_id` (projet + nom du depot, lus dans l URL de `origin`). **Jamais le nom** : avec un nom l outil repond « created » sans rien creer |

## Procedure (dans le slot, puis Azure DevOps)

1. Slot propre : `git -C <SLOT> status --porcelain` vide (le Sonnet a commite DONE par US ;
   sinon commit). `git -C <SLOT> fetch origin <DEFAULT>`.
2. Branche de publication a partir de la base fraiche :
   ```
   git -C <SLOT> checkout -B <PUB_BRANCH> origin/<DEFAULT>
   git -C <SLOT> merge --squash sk-impl-<FEATURE_SLUG>
   # ce que le hook du depot faisait a chaque commit, fait ici une seule fois (stack front)
   F=$(git -C <SLOT> diff --cached --name-only --diff-filter=ACMR -- '*.js' '*.jsx' '*.ts' '*.tsx' '*.json')
   [ -n "$F" ] && (cd <SLOT> && node node_modules/eslint/bin/eslint.js --fix $F ; node node_modules/prettier/bin/prettier.cjs --write $F && git add $F)
   git -C <SLOT> commit --no-verify -m "<TITLE>" -m "<3-6 lignes : US livrees, une par ligne>" -m "Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
   ```
   Conflit au squash → `git merge --abort`, revenir sur `sk-impl-<FEATURE_SLUG>`, et la
   reponse est **STOP** : « conflit avec origin/<DEFAULT> sur <fichiers> » (l humain ou une
   passe Corriger rebase ; jamais de resolution a l aveugle).
3. Typecheck + lint sur la branche squashee (une seule fois : la base a pu bouger). Rouge →
   STOP, meme regle.
4. Push : `git -C <SLOT> push -u origin <PUB_BRANCH>`. Refus (protection, droits) → STOP,
   jamais `--force`.
5. PR **draft** : `mcp__azure__repo_create_pull_request` avec `repositoryId=<REPO_ID>`,
   `sourceRefName=refs/heads/<PUB_BRANCH>`, `targetRefName=refs/heads/<DEFAULT>`,
   `title=<TITLE>`, `description=<PR_BODY>`, `isDraft=true`.
   Puis **verifier** : `git -C <SLOT> ls-remote origin 'refs/pull/*'` ou
   `repo_list_pull_requests_by_repo_or_project` doit montrer la PR. Absente → le dire, ne
   pas re-creer en boucle (une seconde tentative maximum).
   `origin` hors Azure DevOps (pas d URL dev.azure.com / visualstudio.com) ou outils
   `mcp__azure__*` absents : pas de PR, statut `published-branch` (branche poussee, PR a
   ouvrir par l humain, URL de la branche dans le rapport) ; on saute 5-6, pas 7-9.
6. Work item : `mcp__azure__wit_link_work_item_to_pull_request` si `WORK_ITEM` resolu.
7. Trio → principal (specs/ gitignore, toujours) : `Copy-Item -Recurse -Force
   <SLOT>\specs\<NNN>-<slug>` vers `<principal>\specs\`. **Interdit** : `git add -f specs`.
8. `STATE.md` : ajouter `PR: <url>` et `Branche publiee: <PUB_BRANCH>`.
9. Liberation du slot, UNE commande (contrat `_shared/sk-pool.md`) :
   `pwsh -File ~/.claude/skills/_shared/sk-pool.ps1 -Action release -Slot <SLOT>`.
   Elle arrete les serveurs du slot, detache sur `origin/<DEFAULT>` (jamais
   `checkout <DEFAULT>`, qui echoue si la branche est extraite ailleurs), supprime
   `sk-impl-<FEATURE_SLUG>` et `<PUB_BRANCH>` seulement si leur contenu est sur origin
   (sinon les conserve et le dit), remet la ligne `STATUS_FILE` a `<slot> | idle` nue.
   Meme commande dans le slot backend s il y en a un. Ne jamais faire ces gestes a la main.

## Variante `/sk-xs` (pas de `specs/`)

Meme procedure avec `PUB_BRANCH = feature/xs-<slug>`, branche source `sk-xs-<slug>`,
`TITLE` derive du besoin (`fix(<scope>): …` par defaut), pas de trio a copier, pas de
`STATE.md`. Description sans `pr.md` : besoin en clair, fichiers touches, tests ecrits,
gates. `WORK_ITEM` seulement si le besoin cite un id.

## Cross-repo (US backend)

Le slot backend porte lui aussi `sk-impl-<FEATURE_SLUG>` : rejouer 1-6 et 9 dans ce slot,
sur le depot backend (`REPO_ID` du backend, meme projet ADO), **avant** la PR front, et
citer l URL de la PR back dans la description de la PR front (« Depend de : <url> »). Deux
PR, deux brouillons, un seul `STATE.md`.

## Description (quand `pr.md` manque)

```markdown
## Feature <NNN>-<slug>

<le paragraphe d intention de spec.md, tel quel>

### US livrees
- US1 — <titre> · <n> taches
- US2 — <titre> · <n> taches

### Verification
- typecheck, lint, tests cibles : verts (run /sk-impl du <date>)
- revue us-reviewer : PASS
<si pr.md absent, pas de section ecran : ne pas inventer de scenarios joues>

### Reste a faire
- <US restantes selon STATE.md, ou « aucune »>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

Le superviseur, lui, ecrit `pr.md` avec en plus la section « Scenarios verifies a l ecran »
(un scenario par ligne, PASS, chemin de la capture) et « Findings traites » : c est la
preuve que la PR a ete vue en marche, pas seulement compilee.

## Pannes connues

- `mcp__azure__*` repond « Failed to connect » : c est le gateway MCP mutualise
  (`127.0.0.1:8765`) qui est tombe, pas Azure DevOps. STOP apres le push (la branche est
  sur origin, rien n est perdu), `issue=stopped`, motif « gateway MCP a relancer, PR a
  creer depuis feature/<NNN>-<slug> ». Ne pas retenter en boucle, ne pas passer par
  `az repos pr create` (extension cassee sur cette machine).
- La PR existe deja pour cette branche (reprise apres un STOP) : ne pas en creer une
  seconde, mettre a jour la description (`repo_update_pull_request`) et continuer a 6.

## Ce que cette procedure ne fait jamais

- Pousser sur `<DEFAULT>`, ni sur une branche qui n est pas `feature/<NNN>-<slug>`.
- `--force`, `--force-with-lease`, suppression d une branche distante.
- Passer la PR hors brouillon, l approuver, la completer, poser un vote : c est l humain.
- Creer une PR avec un nom de depot au lieu du GUID.
- Resoudre un conflit de squash sans l humain.
