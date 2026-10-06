# Configuration sk-* (source unique)

Toute skill sk-* qui manipule le pool de worktrees resout ses chemins ICI.
Aucune skill ne code un chemin absolu en dur.

## POOL_BASE — racine de tous les pools

Ordre de resolution, premier gagnant :

1. Variable d environnement `SK_POOL_ROOT` si elle est definie et non vide.
2. Sinon, selon la plateforme :
   - Windows : `C:\tmp\sk-pool`
   - macOS / Linux : `$HOME/.cache/sk-pool`

Contrainte : un chemin COURT, hors du repo, et **jamais un dot-dir**
(`.claude/worktrees/...` est interdit : Vitest et Jest ignorent les tests
sous un dossier commencant par un point).

## SUPERVISOR_DIR — registre du superviseur `/mon-developpeur`

Ordre de resolution, premier gagnant :

1. Variable d environnement `SK_SUPERVISOR_DIR` si elle est definie et non vide.
2. Sinon, selon la plateforme :
   - Windows : `C:\tmp\mon-developpeur`
   - macOS / Linux : `$HOME/.cache/mon-developpeur`

Le superviseur y ecrit `supervisor.json`, `runs.json` et `journal.md`
(`mon-developpeur/references/registre.md`) ; `/sk-prep`, `/sk-impl` et `/sk-xs`
y lisent `supervisor.json` pour le detecter. Tous doivent resoudre le MEME
dossier. Resolution en Bash (Git Bash sous Windows) :

```bash
sup="${SK_SUPERVISOR_DIR:-}"
[ -n "$sup" ] || case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) sup=/c/tmp/mon-developpeur ;; *) sup="$HOME/.cache/mon-developpeur" ;; esac
```

## REPO_SLUG — un pool par projet git

`REPO_SLUG` = basename du **parent** de
`git rev-parse --path-format=absolute --git-common-dir`.

Jamais `git rev-parse --show-toplevel` : depuis un worktree, il rend le
nom du slot (`wt-1`) au lieu du nom du repo.

Un worktree git n appartient qu a un seul depot : deux projets ont donc
chacun leurs 4 slots, sous des sous-dossiers distincts de `POOL_BASE`.

## Chemins derives

| Nom | Valeur |
|---|---|
| `POOL_ROOT` | `<POOL_BASE>/<REPO_SLUG>` |
| Slots | `<POOL_ROOT>/wt-1` .. `<POOL_ROOT>/wt-4` |
| `STATUS_FILE` | `<POOL_ROOT>/status.md` (informatif, **pas un lock**) |
| SHA de base | `<POOL_ROOT>/base-sha/<BRANCH>.txt` |
| Baseline memoise | `<POOL_ROOT>/baseline/<BASE_SHA>.json` |
| Cache tsc | `<POOL_ROOT>/tsbuildinfo/<slot>-<subproject>.tsbuildinfo` |
| Journaux serveurs (`/sk-test`) | `<POOL_ROOT>/<slot>-dev.log` (Vite), `<POOL_ROOT>/<slot>-api.log` (.NET) |

Ces dossiers et journaux vivent **hors de tout worktree** pour survivre
aux `git clean -fd`.

## Configuration locale d un slot (credentials gitignores)

Un slot ne recoit que les fichiers versionnes. Les credentials ignores par
git (fichier d environnement du front, etc.) y arrivent par
`_shared/link-local-config.ps1` : hardlinks depuis le repo PRINCIPAL, jamais
une copie a resynchroniser, jamais lus par une skill. Contrat d usage :
`_shared/sk-runtime.md`.

## Depots lies — `.sk/repos.json` (backend, legacy)

Les chemins des depots VOISINS du projet (backend actuel, legacy backend,
legacy frontend) ne sont ni des variables globales ni des defauts codes en
dur : ils vivent dans `<PROJECT_DIR>/.sk/repos.json`, ecrit par `/sk-init`,
**un fichier par projet**. Deux projets sur la meme machine ont deux
backends differents : une valeur globale serait fausse pour l un des deux.
Depuis un worktree du pool, ce fichier se lit sur le repo PRINCIPAL
(meme resolution que `REPO_SLUG` ci-dessus), pas sur le slot.

Contrat complet — format, semantique du `null`, lecture par une skill,
conversion Windows -> POSIX : **`_shared/sk-repos.md`**.

Resolution, premier gagnant : argument explicite, puis la cle du fichier,
puis la variable d environnement historique (`SK_LEGACY_ROOT`,
`SK_BACK_ROOT`), puis STOP — jamais un defaut devine.

Ces depots sont lus en **lecture seule** par `/sk-legacy-search` et
`/sk-code-search`. Seul `/sk-impl` y ecrit, et seulement sur `backend`,
dans une US cross-repo explicite.

Un backend lie (cle `backend` != null) est un AUTRE projet git :
il a son propre pool `<POOL_BASE>/<BACK_SLUG>/wt-1..4`
(`BACK_SLUG` = meme regle que `REPO_SLUG`, depuis `BACK_ROOT`).
`/sk-impl` ne partage JAMAIS le pool front avec le back.

## STANDARDS_REPO / STANDARDS_REF / STANDARDS_CACHE — standards Agent OS Septeo

Source de verite des standards installes par /sk-init sous
`<PROJECT_DIR>/agent-os/standards/` (chemin `agentOs/<stack>/standards/`
dans le depot, `<stack>` = `frontend-react` ou `backend-c#`).

| Nom | Resolution (premier gagnant) |
|---|---|
| `STANDARDS_REPO` | `SK_STANDARDS_REPO` si defini ; sinon `https://dev.azure.com/Septeo/I.A/_git/context_engineering` |
| `STANDARDS_REF` | `SK_STANDARDS_REF` si defini ; sinon `dev` (branche par defaut du depot) |
| `STANDARDS_CACHE` | `<POOL_BASE>/_standards-src` |

Le cache est un clone `--depth 1`, refetche a chaque /sk-init, hors de
tout repo projet, lu seulement. Il ne remplace jamais un clone de travail :
un clone local de context_engineering present ailleurs sur la machine
n est PAS une reference (il derive).

## SK_HOME — racine d installation des skills

Le kit est installe sur DEUX hotes, avec la meme arborescence et des racines
differentes. Ordre de resolution :

1. `SK_HOME` si defini.
2. Sinon, selon l hote (detection : `_shared/sk-host.md` §0) :
   - Claude Code : `CLAUDE_CONFIG_DIR` si defini, sinon `~/.claude`
     (soit `%USERPROFILE%\.claude` sous Windows).
   - Cursor : `CURSOR_HOME` si defini, sinon `~/.cursor`.

Les skills sont sous `<SK_HOME>/skills/`, les agents sous `<SK_HOME>/agents/`.
Une skill qui renvoie vers un fichier partage ecrit
`~/.claude/skills/_shared/<fichier>` : c est le chemin par defaut de Claude
Code, a reinterpreter via `SK_HOME` — sous Cursor, le meme fichier est sous
`~/.cursor/skills/_shared/`.

Cursor a un troisieme sous-arbre que Claude Code n a pas :
`<SK_HOME>/commands/sk-*.md`, les raccourcis `/sk-*`. Ils sont **generes** par
`_shared/install-cursor.ps1` depuis le frontmatter des `SKILL.md` — ne pas les
editer a la main, la generation suivante les ecrase.

Adaptation de runtime entre les deux hotes (outils, modeles, sous-agents,
worktrees, navigateur, CLI non interactive) : `_shared/sk-host.md`.

## Format d une ligne de STATUS_FILE

Slot libre — exactement :

```
wt-2 | idle
```

Slot occupe :

```
wt-2 | <branche> | busy | agent CLAUDE|CODEX|CURSOR | session <id> | terminal <id> | base <sha> | updated <iso>
```

Les champs nommes sont facultatifs. `agent` / `session` / `terminal` disent
QUI tient le slot : un outil exterieur (une fleet de terminaux, qui pose
`FLEETVIEW_TERMINAL_ID` et `FLEETVIEW_SESSION_ID` dans l environnement) peut
ainsi afficher en face de la bonne conversation qu elle travaille dans un
worktree, et la rouvrir.

Un slot libere revient a `<slot> | idle` **nu**, sans aucun de ces champs.

**Ce fichier n est JAMAIS ecrit a la main.** Une seule porte :
`_shared/sk-pool.ps1` (`find` / `free` / `claim` / `touch` / `release` /
`repair`), contrat `_shared/sk-pool.md`. Git fait foi (branche du worktree) ;
le releve ne porte que ce que git ignore. Le script refuse d ecrire un releve
qui contredit le disque.
