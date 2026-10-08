---
name: sk-xs
description: Variante RAPIDE hors spec-kit. Implémente une tâche XS (1 fichier / ~10-30 lignes / 1 comportement / pas d'écran / 0 décision d'archi) DANS UN SLOT DU POOL partagé wt-1..4 (même isolation que /sk-impl), SANS produire ni consommer de trio spec/plan/tasks. Pas de specify, pas de plan.md, pas de tasks.md, pas de Workflow, pas de flotte. L'agent écrit tests + code dans le slot, gate ciblée, typecheck+lint une fois en clôture, squash publié en PR après GO humain (plus de merge dans le principal). STOP si le besoin n'est plus un XS. Use when the user invokes /sk-xs or wants a quick isolated change without spec-kit.
argument-hint: "<besoin>"
disable-model-invocation: true
allowed-tools: Agent Bash PowerShell Read Write Edit Glob Grep AskUserQuestion Skill ToolSearch EnterWorktree ExitWorktree ListAgents SendMessage mcp__azure
---

# Implémentation XS isolée, hors spec-kit (`/sk-xs`)

Besoin : **$ARGUMENTS**

Modele : une session Haiku 5.5 suffit pour un vrai XS (`claude --model haiku "/sk-xs ..."`,
~20x moins cher au token). Banc du 7 octobre (TK-1, raccourci « 0 ») : livre et E2E 3/3 x 3
runs, 113k tokens et 3,9 min contre 85k et 3,8 min en Sonnet ; il a reutilise le libelle
existant du bouton. Au moindre doute sur la taille, garde la session par defaut.

## Ce que cette commande fait (et ne fait pas)

Le trou du tableau : **pool `sk` + zéro Speckit**. Compare à `/sk-impl` (trio exigé, TDD Sonnet dans le pool) : ici **aucun trio**, branche `sk-xs-<FEATURE_SLUG>`.

Tu (l'agent de cette commande) écris les tests et le code **toi-même**, dans le slot, sans sous-agent.

**Interdit :** `specs/`, `git add -f specs`, Skill `speckit-*`, `yarn test` comme gate, suite complète, `clean -fdx` / `clean -x`, toucher le working tree principal.

## Superviseur (optionnel, détecté à chaque question)

Contrat : `~/.claude/skills/_shared/sk-supervisor.md`. Detection (bash) :

```bash
sup="${SK_SUPERVISOR_DIR:-}"  # _shared/sk-config.md §SUPERVISOR_DIR
[ -n "$sup" ] || case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) sup=/c/tmp/mon-developpeur ;; *) sup="$HOME/.cache/mon-developpeur" ;; esac
hb=$(jq -r .heartbeatAt "$sup/supervisor.json" 2>/dev/null)
now=$(date -u +%s)
hbEpoch=$(date -u -d "$hb" +%s 2>/dev/null)
echo "age_minutes=$(( (now - hbEpoch) / 60 ))"
```

Comparaison OBLIGATOIREMENT via `date -u` (jamais `date` seul) : `heartbeatAt` est UTC (suffixe `Z`), une lecture en heure locale décale de plusieurs heures et fait conclure à tort qu'un superviseur vivant est mort.

A CHAQUE `AskUserQuestion` : heartbeat < 30 min (comparaison UTC, contrat §Detection), et `ListAgents` montre ce nom, et `SK_NO_SUPERVISOR` n'est pas à `1` → `SUPERVISOR` = ce nom pour cette question ; sinon `AskUserQuestion` local. Repli automatique en local si aucun `[SK-ANSWER]` sous 5 min via `Bash({run_in_background: true})` (contrat §Timeout et repli). Avec `SUPERVISOR` : chaque `AskUserQuestion` de cette skill (slug, slot sale, GO A.3, verdict C.4) devient un `SendMessage` `[SK-QUESTION]` (`skill=sk-xs`, type `autre` pour le slug, `slot`, `go`, `verdict` ; mêmes options, même ordre ; contexte = ce que l'écran aurait montré, **plus le besoin `$ARGUMENTS` en clair**), puis fin de tour : « En attente de <SUPERVISOR> — ou réponds ici. » `[SK-ANSWER]` s'applique comme un choix humain ; une réponse tapée ici prime ; `escalade` → reposer en `AskUserQuestion`. Après le GO : `[SK-START] skill=sk-xs slot=wt-N branche=sk-xs-<slug>`. Dernière action : `[SK-DONE] issue=published|kept|abandoned|stopped pr=<url|aucun>`.

## −1. Garde-fou XS — avant tout, avant le slug, avant le slot

Lis `$ARGUMENTS`. **STOP** (aucun slot, rien n'est créé) si ce n'est **pas** un XS :

| Signal | Route |
|---|---|
| 1 fichier de prod, ~10–30 lignes, 1 comportement, pas d'écran, 0 archi | **continue** |
| Écran / 2+ US / > ~2 fichiers de prod / décision d'archi / refactor large | **STOP** → `/sk-prep` puis `/sk-impl` |
| XS **avec** papier spec-kit voulu (AC, US, checklists) | **STOP** → `/sk-prep` puis `/sk-impl` |
| Trio déjà là pour ce besoin | **STOP** → `/sk-impl` |
| Cross-repo (2e dépôt à modifier) | **STOP** → `/sk-impl` (moteur impl) |

Annonce la route en une phrase. Ne « n'essaie pas quand même ».

## A. Slot du pool (même contrat que `/sk-impl`)

0. **`FEATURE_SLUG` identifie la session** (branche + `STATUS_FILE`), **avant** le slot.

   - `$ARGUMENTS` entier est un kebab unique (`^[a-z0-9]+(-[a-z0-9]+)+$`, rien d'autre) → c'est le slug. Le besoin reste ce kebab (peu informatif : 2–3 `Grep` ensuite).
   - Sinon **`AskUserQuestion`** : « Nom court kebab-case (ex. `wrap-index`) ? Il nomme la branche `sk-xs-<slug>`. » Pas de renommage a posteriori.
   - Slot deja pris pour CE besoin et deja sur une branche `sk-xs-<x>` (consigne du parent, reprise) → slug = `<x>`, sans question ni second slot (banc Miro : un second worktree cree a cote du premier).

0bis. **Pool partagé** avec `/sk-impl` et `/sk-review`. Isolation : le working tree principal n'est **jamais** le lieu d'écriture. Chemins et format de `STATUS_FILE` : `~/.claude/skills/_shared/sk-config.md` — **même contrat que `/sk-impl`**. Essentiel :

   - `REPO_SLUG` = basename du **parent** de `git rev-parse --path-format=absolute --git-common-dir` (jamais `--show-toplevel` depuis un worktree).
   - `POOL_ROOT = <POOL_BASE>\<REPO_SLUG>` · `STATUS_FILE = POOL_ROOT\status.md` (informatif, pas un lock). Pool absent → `/sk-pool-init` ou question de bootstrap ×4, **une fois**.
   - **Résolution et prise du slot : une commande, jamais à la main** (contrat `~/.claude/skills/_shared/sk-pool.md` ; git fait foi). `SKP = pwsh -File ~/.claude/skills/_shared/sk-pool.ps1`.
     1. Reprise : `SKP -Action find -Repo <principal> -Feature <FEATURE_SLUG>` → `REPRISE <slot>` = le slot (exit 3 = plusieurs, question).
     2. Sinon `SKP -Action free -Repo <principal>` → `LIBRE <slot>` ; `LIBRE-SALE` → `AskUserQuestion` avant ; exit 2 → question (attendre / libérer un slot `A-LIBERER` via `release` / abandonner). **Ne jamais** voler un slot dont git est sur une autre branche.
     3. `SKP -Action claim -Slot <slot> -Branch sk-xs-<FEATURE_SLUG> -Agent <AGENT>` : neuf = checkout -B sur `origin/<défaut>` + `reset --hard` + `clean -fd` (**jamais `-x`**) + ligne `STATUS_FILE` complète (session et terminal lus dans l'environnement) ; reprise = `REPRISE`, rien touché. `REFUS` (exit 3) → relire, décider avec l'humain, `-Force` seulement après accord. `AGENT` = `CLAUDE` ici, `CURSOR` dans Cursor, `CODEX` si Codex.
   - `EnterWorktree { path: "<slot>" }`. Hors interactif : saute EnterWorktree, pilote par chemins absolus.
   - Jonction `node_modules` **seulement si manquante** (`New-Item -ItemType Junction`).
   - **Sanity** : `node node_modules/vitest/vitest.mjs list --filesOnly` — STOP seulement si **0 fichier**. Interdit `list --json=` repo-wide.
   - À partir d'ici, tous les chemins (prod/test/gates) sont **absolus, côté slot**.

1. **Recon minimale** — d'abord la mémoire du dépôt, si elle existe : `cat "$(git rev-parse --path-format=absolute --git-common-dir)/sk-facts.json"` (pièges des tests et recettes appris par les runs précédents ; un fait dont le fichier a disparu est périmé). Puis 2–4 `Grep`/`Read` pour poser : fichier(s) de prod, fichier de test (miroir `src/__tests__/…` ou voisin existant), commande de gate ciblée. Pas de fan-out d'agents. Standards AgentOS : `agent-os/standards/index.yml` si présent, injection mentale seulement (rien n'est écrit sous `specs/`).

2. **Gates.** Skill `running-quality-gates` du dépôt si elle existe, sinon scripts réels. Dépôt .NET : sanity = `dotnet build` du .sln, gate ciblée = `dotnet test <projet de test> --filter <Classe>`, typecheck = `dotnet build`, lint = `dotnet format --verify-no-changes` (pas de vitest, de jonction `node_modules` ni d import paresseux). Fichier transverse touché (Program.cs, point d entrée, DI, middleware) : la clôture rejoue aussi le dossier des tests d intégration qui le traversent (ex. `--filter FullyQualifiedName~Controllers`), jamais la suite complète. Minimum : test **ciblé par chemin exact** (`node node_modules/vitest/vitest.mjs run --coverage=false <fichier>`) + typecheck. Lint en clôture. Pas de `yarn test`.

3. **Validation humaine via `AskUserQuestion`** (Lancer / Ajuster / Abandonner) : slot (chemin, branche `sk-xs-<FEATURE_SLUG>`, sanity), fichiers visés, **la liste exacte des tests qui vont être écrits**, commande de gate ciblée. Tant que ce n'est pas approuvé, n'écris rien.

## B. Code (toi, inline — pas de sous-agent, pas de `Workflow`)

Un XS tient en **1–2 comportements**. Au-delà : arrête et propose `/sk-prep` puis `/sk-impl`. N'empile pas.

Pour chaque comportement, **dans le slot** :

1. **RED.** Écris **un seul** cas de test (un `it.each` sur les variantes d'UN même comportement compte pour un). Lance la gate ciblée (`--coverage=false`). Elle **doit** échouer par assertion (pas compile/import). Le test invoque le code réel (import paresseux si le symbole n'existe pas). Assertion entre deux littéraux sans appeler le code visé = interdite. Rouge compile → corrige le **test**, relance. Vert d'emblée → déjà couvert, passe au suivant, SAUF si le défaut est constaté (E2E, console, ticket) : un test vert alors ne touche pas la cause, cherche-la (banc Miro : l'erreur venait du logger SignalR, pas du `.catch` que le test proposé visait). Un test EXISTANT que le comportement demandé contredit (assertion exacte sur l'ancien appel) s'adapte dans ce même RED, nommé dans le rapport (de même un mock partagé que le cas exige : il s'étend, sans retirer de comportement) ; jamais après GREEN (banc Miro : `toHaveBeenCalledWith(url)` cassait forcément).
2. Instantané du fichier de test (`Read`). Optionnel : `git add -A && git commit --no-verify -m "sk-xs RED(<cycle>)"`.
   L'import paresseux du RED repasse en import statique une fois GREEN (sinon `related` ne voit plus ce test).
3. **GREEN.** Code de production **minimal**. Relance la gate ciblée. Rouge → corrige la prod (jamais le test), **2 tentatives** max puis stop + signaler. Re-`Read` le test vs instantané : différent → restaure, reprends GREEN.
4. Comportement suivant.

REFACTOR léger seulement si évident, sous filet vert. « Rien à améliorer » est valide.

## C. Clôture

1. **Une seule fois** : typecheck complet + lint complet + la gate standards du projet si elle existe (ex. `yarn check:standards`). **Jamais** la suite de tests complète. Rouge → corrige.
2. Rejoue ensemble les tests ciblés de ce run.
3. Diff du slot : `git -C <slot> diff` / `git -C <slot> log --oneline -n 20`.
4. **Verdict humain via `AskUserQuestion`** (Publier / Corriger d'abord / Abandonner) : diff, gates. Plus de merge dans le principal : la revue se fait sur Azure DevOps.
   - **Abandonner / Corriger** : `ExitWorktree { action: "keep" }` ; slot **reste `busy`**, avec `SKP -Action touch -Slot <slot> -Note "<où on en est>"`. Corriger **avec `findings=<chemin>`** (superviseur) : traite chaque ligne `- [ ]` du fichier comme une tâche (RED si testable, GREEN, gate), commit, puis repose le verdict — deux fois maximum.
   - **Publier** (« GO pour merge » d un humain = Publier : il n y a plus de merge local) : contrat `~/.claude/skills/_shared/sk-publish.md`, variante XS. Origin hors Azure DevOps : branche poussée sans PR, issue `published-branch` (sk-publish.md étape 5).
     1. Commit si sale : `git -C <slot> add -A && git -C <slot> commit -m "sk-xs: <FEATURE_SLUG>"`.
     2. `ExitWorktree { action: "keep" }`, puis dans le slot : `fetch origin <défaut>`, `checkout -B feature/xs-<FEATURE_SLUG> origin/<défaut>`, `merge --squash sk-xs-<FEATURE_SLUG>`, commit unique `<type>(<scope>): <besoin en une ligne>`, typecheck + lint, `push -u origin feature/xs-<FEATURE_SLUG>`. Présente la diff avant le push. Conflit, gate rouge, push refusé → **STOP**, jamais `--force`.
     3. PR **draft** vers `<défaut>` par **GUID** (`repo_get_repo_by_name_or_id`, jamais le nom), corps = `pr=<chemin>` reçu du superviseur, sinon : besoin, fichiers touchés, tests écrits, gates. Vérifier que la PR existe (`git ls-remote origin 'refs/pull/*'`). Work item lié si le besoin cite un id ADO.
     4. Libération : `SKP -Action release -Slot <slot>` (détache sur `origin/<défaut>`, supprime `sk-xs-<FEATURE_SLUG>` et `feature/xs-<FEATURE_SLUG>` si leur contenu est sur origin, ligne `STATUS_FILE` → `idle` nue). Jamais ces gestes à la main.

## Garde-fous

- **Pas de Speckit** : aucun `spec.md` / `plan.md` / `tasks.md` créé ou lu comme source de vérité.
- **Pas de `Workflow`, pas de sous-agent.**
- **Jamais de suite complète** en cours de run.
- `clean -fd` **sans `-x`**. Ne jamais supprimer un slot du pool.
- Feature plus grosse qu'annoncé (fichiers hors périmètre, UI, 2e dépôt) : **stop**, propose la commande du tableau, n'élargis pas en silence.

## Écosystème — règle de routage par taille

Lis `~/.claude/skills/_shared/sk-routing.md`.

| Taille | Commande |
|---|---|
| Petite, sans trio | `/sk-xs` (cette commande) |
| Papier | `/sk-prep` puis `/sk-impl` |
| Trio déjà là | `/sk-impl` |
| Papier+code | `/sk-prep` puis `/sk-impl` |
| Gros / à enjeu | `/sk-prep` puis `/sk-impl` |
