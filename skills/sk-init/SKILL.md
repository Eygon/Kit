---
name: sk-init
description: Prépare un projet à recevoir le workflow sk-*. Vérifie puis installe si besoin (1) spec-kit de github/spec-kit dans le projet courant, avec la constitution Septeo de la stack si aucune n'existe, (2) les standards Agent OS Septeo depuis le dépôt context_engineering (agentOs/<stack>/standards) — installés s'ils manquent, synchronisés depuis le dépôt s'ils divergent, (3) le fichier .sk/repos.json qui enregistre les chemins des dépôts liés (backend actuel, legacy backend, legacy frontend) que /sk-prep, /sk-impl, /sk-code-search et /sk-legacy-search liront ensuite — une question par chemin manquant, rien si le fichier est déjà complet, (4) enchaîne /sk-pool-init pour créer les 4 worktrees du pool. Idempotent : ce qui est déjà là et identique n'est jamais réécrit. STOP si le répertoire courant n'est pas un dépôt git. Use when the user invokes /sk-init or wants to bootstrap or resync the sk-* workflow on a project.
argument-hint: ""
disable-model-invocation: true
allowed-tools: Bash PowerShell Read Write Glob Grep AskUserQuestion Skill WebFetch
---

# Bootstrap d'un projet pour le workflow sk-* (`/sk-init`)

Quatre étapes, dans cet ordre : **spec-kit** (outillage + constitution), **les standards
Agent OS Septeo**, **les dépôts liés** (`.sk/repos.json`), puis **le pool de worktrees**. Chaque
étape commence par une **détection**. Ce qui est déjà installé et identique à la référence n'est
jamais réécrit ; ce qui diverge est montré avant d'être touché, et rien n'est écrit sans le GO
de l'humain.

Cette commande **n'écrit aucun code de production** et ne touche à aucun fichier source.

Deux sources de référence, résolues via `~/.claude/skills/_shared/sk-config.md` :

- `STANDARDS_REPO` / `STANDARDS_REF` — le dépôt `context_engineering`, qui porte les standards
  Agent OS par stack sous `agentOs/<stack>/standards/`.
- `assets/speckit/constitution-<stack>.md` du kit — la constitution spec-kit de référence.

`<stack>` est détecté à l'étape 0 : `frontend-react` si `package.json` déclare `react`,
`backend-c#` si un `*.sln` ou `*.csproj` existe à la racine ou un niveau en dessous. Les deux à la
fois (mono-repo) → demande laquelle installer à la racine ; aucune des deux → étape 2 et
constitution STOP, dis-le, le reste continue.

## −1. Garde-fous d'entrée

STOP immédiat, sans rien installer, si :

- Le répertoire courant n'est **pas** un dépôt git (`git rev-parse --git-dir` échoue) : le pool de
  worktrees et le versionnement des specs en dépendent.
- Tu es **dans un worktree du pool** (le chemin courant est sous `<POOL_BASE>`) : `/sk-init`
  s'exécute depuis le repo principal, jamais depuis un slot. Dis-le et arrête-toi.

Résous et affiche, dès le départ :

- `PROJECT_DIR` = `git rev-parse --show-toplevel`.
- `REPO_SLUG` et `POOL_BASE` selon `~/.claude/skills/_shared/sk-config.md`.
- Le gestionnaire de paquets du projet (`yarn.lock`, `package-lock.json`, `pnpm-lock.yaml`), s'il
  y en a un — information utile pour l'étape 4 (jonctions `node_modules`).

## 0. Plan annoncé AVANT toute écriture

Fais les **quatre détections** (sections 1 à 4 ci-dessous) en **lecture seule** d'abord, puis
présente en une seule `AskUserQuestion` :

| Composant | État détecté | Action proposée |
|---|---|---|
| spec-kit | présent (v0.10.1) / absent | rien / `specify init --here` |
| Constitution spec-kit | présente (v1.1.0) / template vierge / absente | rien / copie `constitution-<stack>.md` |
| Standards Agent OS (`<stack>`) | identiques à `<ref>@<sha>` / absents / divergents (n modifiés, n locaux seuls, n absents en local) | rien / installer / synchroniser depuis le dépôt |
| Dépôts liés (`.sk/repos.json`) | complet / n clés manquantes (`backend`, `legacyBackend`, `legacyFrontend`) / fichier absent | rien / demander les chemins manquants |
| Pool de worktrees | 4 slots présents / absent | rien / `/sk-pool-init` |

Pour les standards divergents, la question **liste les fichiers** (modifiés / locaux seuls / à
ajouter) : l'humain valide un diff, pas une intention. Si l'index local porte des clés que le
dépôt n'a pas (`_meta`, `tags`, standards supplémentaires), ajoute une ligne d'avertissement :
« le local semble EN AVANCE sur le dépôt — synchroniser écraserait ces ajouts ; remonter d'abord
le local dans `context_engineering` est probablement le bon ordre ». Tu ne tranches pas, tu montres.

Options : **Tout installer / synchroniser** / **Choisir composant par composant** / **Annuler**.

Tant que ce GO n'est pas donné, **rien n'est écrit**. Si tout est déjà en place, ne pose pas la
question : dis-le en une phrase et arrête-toi.

## 1. spec-kit (github/spec-kit)

### 1.1 Détection

Le projet a spec-kit si `PROJECT_DIR/.specify/` existe **et** contient `templates/` et `scripts/`.
Un `.specify/` vide ou tronqué compte comme absent, mais **ne l'écrase pas** sans le dire :
signale l'anomalie et demande.

Version installée : `.specify/init-options.json`, clé `speckit_version`. Affiche-la.

Vérifie aussi le CLI : `specify --version` (ou `uv tool list | grep specify`). CLI absent →
l'étape 1.2 commence par son installation.

### 1.2 Installation

CLI absent :

```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git
```

`uv` lui-même absent → **STOP** sur ce composant : dis à l'humain de l'installer
(`winget install --id=astral-sh.uv --scope user` sous Windows, `curl -LsSf https://astral.sh/uv/install.sh | sh`
sinon), puis de relancer `/sk-init`. N'installe pas un gestionnaire de paquets système toi-même.

Puis, **depuis `PROJECT_DIR`** :

```bash
specify init --here --non-interactive --integration claude --script <ps|sh>
```

- `--here` : le projet existe déjà, on n'en crée pas un nouveau.
- `--non-interactive` : obligatoire ici — sans lui, l'init attend des flèches clavier et bloque.
- `--integration claude` : c'est l'agent cible de ce workflow.
- `--script ps` sous Windows, `sh` sinon.
- `--force` **seulement** si le répertoire n'est pas vide **et** que l'humain l'a validé au GO.
  Ne l'ajoute jamais de toi-même : c'est lui qui autorise l'écrasement.

### 1.3 Vérification

Après coup, contrôle la présence de `.specify/templates/`, `.specify/scripts/` et des skills
`speckit-specify`, `speckit-clarify`, `speckit-plan`, `speckit-tasks` (côté `.claude/`). Un manque
→ signale-le, ne le contourne pas : `/sk-prep` en dépend directement.

Ajoute `specs/` au `.gitignore` du projet **s'il n'y est pas déjà** : dans ce workflow le trio
spec/plan/tasks vit sur le disque, pas dans l'historique git (`git add -f specs` est interdit
partout dans les skills sk-*). Si l'humain veut versionner ses specs, c'est son choix — demande
avant de toucher au `.gitignore`.

### 1.4 Constitution spec-kit

`specify init` dépose `.specify/memory/constitution.md` **vierge** : un template à placeholders
(`[PROJECT_NAME]`, `[PRINCIPLE_1_NAME]`...). `/sk-prep` et `speckit-plan` s'appuient sur la
constitution pour le « Constitution Check » du plan : un template vierge est aussi inutile qu'un
fichier absent.

**Détection** — la constitution est *présente* si `.specify/memory/constitution.md` existe **et**
ne contient plus de placeholder `[...]` de template **et** porte une ligne `**Version**:`.
Affiche sa version. Vierge ou absente → à installer. Présente → **ne touche à rien**, même si le
kit porte une version plus récente : la constitution d'un projet est amendée par son équipe
(section Governance), jamais par un installeur. Signale l'écart, laisse décider.

**Installation** — copie `<SK_HOME>/assets/speckit/constitution-<stack>.md` (soit
`~/.claude/assets/speckit/` par défaut). Absent → le kit a été installé sans son dossier
`assets/` : dis-le, donne la commande de copie du README (étape 1) et le chemin dans le clone
`sk-kit`, et passe au composant suivant. N'invente pas de constitution. Puis écris-la vers
`PROJECT_DIR/.specify/memory/constitution.md`, puis remplace les trois placeholders — et **eux
seuls** : les principes sont ceux de l'équipe, l'adaptation au projet passe par un amendement.

| Placeholder | Remplacé par |
|---|---|
| `<PROJECT_NAME>` | `basename PROJECT_DIR` |
| `<RATIFIED>` | la date du jour |
| `<QUALITY_GATES>` | les commandes de gate **réelles** du projet (voir ci-dessous) |

`<QUALITY_GATES>` n'est pas décoratif : la constitution est ce que `speckit-plan` oppose au plan,
et `/sk-impl` ferme une US sur ces commandes. Une gate qui n'existe pas dans le projet rend le
document faux dès le premier run. Lis les scripts réellement déclarés :

```bash
jq -r '.scripts | keys[]' PROJECT_DIR/package.json     # projet node
```

Retiens, dans cet ordre et **seulement s'ils existent** : `lint`, `typecheck` (ou `type-check`,
`tsc`), la gate de conformité aux standards s'il y en a une (`check:standards` et apparentés),
puis `test` sous le commentaire « if the change introduces or modifies a feature ». Préfixe-les
du gestionnaire détecté (`yarn` / `npm run` / `pnpm`). Projet .NET : `dotnet build` et
`dotnet test`.

Aucun script de gate trouvé → écris une seule ligne
`# TODO: aucune gate détectée — à compléter avant le premier /sk-impl` et **dis-le dans le
rapport final**. Ne recopie jamais les gates d'un autre projet : c'est exactement ce qui a
motivé ce placeholder.

Pas de `constitution-<stack>.md` pour la stack détectée (aujourd'hui seule `frontend-react`
existe) → **STOP sur ce composant**, dis-le, et propose d'en rédiger une via
`Skill(speckit-constitution)` — c'est un travail d'équipe, pas un défaut à combler en silence.

## 2. Standards Agent OS Septeo (dépôt `context_engineering`)

Les standards ne viennent **pas** de buildermethods/agent-os : ils sont écrits par l'équipe et
versionnés dans `context_engineering`, sous `agentOs/<stack>/standards/`, avec leur `index.yml`.
Le dépôt est la **source de vérité** : un projet dont les standards divergent se resynchronise
*depuis* le dépôt, pas l'inverse. (Les commandes `agent-os/*` de buildermethods — shape-spec,
plan-product — ne sont pas installées : ce workflow n'utilise que spec-kit pour le papier.)

### 2.1 Récupérer la référence (lecture seule, dans un cache hors du repo)

`STANDARDS_REPO`, `STANDARDS_REF` et `STANDARDS_CACHE` selon `sk-config.md`. Puis :

```bash
if [ -d "<STANDARDS_CACHE>/.git" ]; then
  git -C "<STANDARDS_CACHE>" fetch -q --depth 1 origin "<STANDARDS_REF>" \
    && git -C "<STANDARDS_CACHE>" checkout -q FETCH_HEAD
else
  git clone -q --depth 1 --branch "<STANDARDS_REF>" "<STANDARDS_REPO>" "<STANDARDS_CACHE>"
fi
REF_SHA=$(git -C "<STANDARDS_CACHE>" rev-parse --short HEAD)
SRC="<STANDARDS_CACHE>/agentOs/<stack>/standards"
test -f "$SRC/index.yml" || echo "ABSENT"
```

Échec réseau ou d'authentification → **STOP sur ce composant**, donne l'URL et la commande
`git clone` à rejouer à la main ; ne retombe pas sur une autre source. `$SRC/index.yml` absent
→ la stack n'est pas couverte par le dépôt : dis-le, n'invente pas de standards.

`REF_SHA` va dans le rapport final : c'est ce qui dit *de quelle version* du dépôt le projet est
le reflet.

### 2.2 Détection et diff

Le projet a des standards si `PROJECT_DIR/agent-os/standards/index.yml` existe. Trois cas :

- **absents** (pas de dossier, ou dossier sans `index.yml`) → installer (2.3). Un dossier
  `standards/` sans index n'est pas une installation : dis-le avant de le compléter.
- **présents et identiques** → rien. Test : `diff -rq "$SRC" PROJECT_DIR/agent-os/standards`
  ne rend rien.
- **présents et divergents** → synchroniser (2.4). Classe la sortie du `diff -rq` en trois
  listes que tu montres au GO : *modifiés* (les deux côtés, contenu différent), *locaux seuls*
  (« Only in PROJECT_DIR ») et *à ajouter* (« Only in $SRC »).

Ne compare pas au working tree du dépôt local `context_engineering` s'il en existe un sur la
machine : il dérive. La référence est `STANDARDS_REF` fraîchement fetché, rien d'autre.

### 2.3 Installation (standards absents)

```bash
mkdir -p PROJECT_DIR/agent-os
cp -R "$SRC" PROJECT_DIR/agent-os/standards
```

Puis vérifie `PROJECT_DIR/agent-os/standards/index.yml` : `/sk-prep` ancre ses chemins dessus,
un index manquant rend le trio non livrable.

### 2.4 Synchronisation (standards divergents)

Le dépôt gagne, fichier par fichier :

- *modifiés* → écrasés par la version du dépôt ;
- *à ajouter* → copiés ;
- *locaux seuls* → **conservés**, pas supprimés — mais listés dans le rapport comme « à remonter
  dans `context_engineering` ou à supprimer », car l'`index.yml` du dépôt ne les référence pas :
  `/sk-prep` ne les sélectionnera plus. Un standard qui ne figure dans aucun index est mort.

```bash
cp -R "$SRC"/. PROJECT_DIR/agent-os/standards/
```

Si `git -C PROJECT_DIR status --porcelain -- agent-os/standards` n'était **pas vide avant** la
copie, les modifications locales non commitées sont perdues par l'écrasement : dis-le au GO,
en une ligne, avec la liste. C'est le cas typique du « local en avance » signalé à l'étape 0 —
l'humain choisit, pas toi.

Ne lance jamais de `prettier`/formatter sur `agent-os/standards/` : le frontmatter YAML de ces
fichiers est strict et un reformatage le casse en silence.

## 3. Dépôts liés — `.sk/repos.json`

Le contrat complet du fichier (format, trois états d'une clé, ordre de résolution, lecture par
une skill) est dans [`~/.claude/skills/_shared/sk-repos.md`](../_shared/sk-repos.md). **Lis-le
avant cette étape** : `/sk-init` est la *seule* commande qui écrit ce fichier, et c'est ici que
la sémantique du `null` se joue.

En un mot : trois chemins que les skills ne peuvent pas deviner — le **backend actuel** du
projet, le **legacy backend**, le **legacy frontend** — écrits une fois, relus ensuite par
`/sk-code-search`, `/sk-legacy-search`, `/sk-prep` et `/sk-impl`.

**Le fichier vit dans le projet** (`PROJECT_DIR/.sk/`), jamais dans `~/.claude` : chaque dépôt a
ses propres voisins, et le backend d'un projet n'est pas celui du suivant. `/sk-init` se relance
donc sur chaque projet. Ce qui est global, c'est le *format* (`_shared/sk-repos.md`) ; les
*valeurs* sont locales.

### 3.1 Détection

```bash
SK_REPOS="PROJECT_DIR/.sk/repos.json"
test -f "$SK_REPOS" && jq -r 'to_entries[] | "\(.key)=\(.value)"' "$SK_REPOS"
```

Pour chacune des trois clés `backend`, `legacyBackend`, `legacyFrontend` :

- **absente du fichier** (ou fichier absent) → à demander en 3.2 ;
- **`null`** → l'humain a déjà répondu « pas de dépôt de ce type ». **Ne redemande pas.** C'est
  la différence entre une réponse et un trou ;
- **chaîne** → vérifie seulement que le dossier existe encore
  (`test -d "<forme POSIX>"`). Présent → rien à faire. **Absent du disque** → une question, et
  une seule, pour ce chemin : le dépôt a été déplacé, ou le drive n'est pas monté. Propose
  l'ancienne valeur dans l'intitulé, et « garder tel quel » comme option (un drive réseau
  temporairement absent n'est pas une erreur de configuration).

Les trois clés renseignées (chaîne **ou** `null`) et les chemins présents → **n'ouvre aucune
question**, dis-le en une ligne dans le plan de l'étape 0.

Fichier illisible (JSON cassé, écrit à la main) → montre l'erreur de parsing et demande :
**réécrire** (les réponses connues sont reposées) ou **annuler** ce composant. Ne le répare
jamais en silence.

### 3.2 Demander les chemins manquants — une question par dépôt

**Une `AskUserQuestion` par clé manquante**, dans cet ordre : `backend`, puis `legacyBackend`,
puis `legacyFrontend`. Pas de question groupée : un chemin absolu se saisit dans le champ libre,
et trois champs libres dans une même question se remplissent mal.

Chaque question porte :

- ce que la clé désigne, en une phrase orientée usage — par exemple, pour `backend` : « le dépôt
  git de l'API que ce front appelle ; il sert à `/sk-code-search` (contrat API front↔back) et
  aux User Stories cross-repo de `/sk-impl` » ;
- comme options : les **candidats voisins** s'il y en a — un simple
  `ls "$(dirname PROJECT_DIR)"` et, sous Windows, `ls ~/source/repos` s'il existe, dont le nom
  évoque la clé (`*.Api`, `*.Server`, `*Legacy*`) —, puis **« Aucun dépôt de ce type »**, qui
  écrit `null` ;
- l'humain peut toujours saisir un chemin absolu libre (option « Other »).

Ne parcours pas le disque pour trouver ces candidats : un `ls` de deux dossiers connus, pas de
`find`. Un candidat est une **proposition**, jamais une valeur retenue sans clic.

Réponse « Aucun dépôt de ce type » → la clé vaut `null`, définitivement : c'est ce qui évite
que la question revienne à chaque `/sk-init`.

Chemin saisi → vérifie-le tout de suite :

```bash
test -d "<chemin POSIX>" || echo ABSENT
git -C "<chemin>" rev-parse --git-dir >/dev/null 2>&1 || echo "PAS UN DEPOT GIT"
```

Dossier absent → repose la question une fois, avec le message d'erreur. Dossier présent mais
pas un dépôt git → **accepte-le** en le signalant : un legacy exporté sans `.git` reste lisible,
et `/sk-legacy-search` n'a besoin que de lire. En revanche `backend` sans `.git` prive
`/sk-code-search` de son ancrage git : dis-le explicitement.

### 3.3 Écriture

Crée `PROJECT_DIR/.sk/` si besoin, puis écris le fichier **complet** — les trois clés, plus
`version` et `updated` (date du jour) :

```json
{
  "version": 1,
  "updated": "<YYYY-MM-DD>",
  "backend": "<chemin ou null>",
  "legacyBackend": "<chemin ou null>",
  "legacyFrontend": "<chemin ou null>"
}
```

**Normalise chaque chemin en barres normales avant de l'écrire** : l'humain saisira
`C:\Users\...`, tu écris `C:/Users/...`. Un backslash non doublé casse le JSON, et l'erreur ne se
verra qu'au prochain `/sk-code-search`. Relis le fichier avec `jq .` juste après l'avoir écrit :
une erreur de parsing ici se corrige tout de suite, pas trois jours plus tard.

Mise à jour d'un fichier existant : **préserve les clés déjà renseignées** et toute clé
supplémentaire qu'il porterait (un projet peut en avoir ajouté). Tu n'écris que ce qui manquait,
plus `updated`.

Propose ensuite d'ajouter `.sk/` au `.gitignore` — ce fichier décrit **une machine**, pas le
projet. Demande avant d'y toucher, comme pour `specs/` : une équipe dont tous les postes ont la
même arborescence peut vouloir le versionner.

## 4. Pool de worktrees

### 4.1 Détection

Pool présent si `<POOL_BASE>/<REPO_SLUG>/status.md` existe. Partiellement présent (dossier ou un
seul `wt-N`, sans `status.md`) : **ne répare pas**, signale l'état — `/sk-pool-init` s'arrêtera de
lui-même sur un pool partiel, et c'est le comportement voulu.

### 4.2 Création

Pool absent → invoque `Skill(sk-pool-init)`.

Cette skill pose **sa propre** `AskUserQuestion` de confirmation (chemin cible, branche de base,
sous-projets à jonctionner, coût estimé). Ne la court-circuite pas et ne réimplémente pas ses
étapes ici : `/sk-init` ne fait que l'enchaîner.

Si `/sk-pool-init` s'arrête (pool déjà là, collision de `REPO_SLUG`, refus humain), reprends la
main et rapporte son verdict tel quel. Ne force rien.

## 5. Rapport final

Un tableau des cinq composants — état avant, action menée, état après — avec, pour les
standards, `STANDARDS_REF@REF_SHA` et la liste des fichiers *locaux seuls* conservés s'il y en
a, et pour les dépôts liés, les trois chemins retenus (`null` affiché tel quel : c'est une
réponse). Puis, en deux lignes, la suite :

- Besoin avec papier spec-kit → `/sk-prep`, puis `/sk-impl`.
- Petit changement sans papier → `/sk-xs`.

Si un composant a échoué, dis-le explicitement et donne la commande exacte à rejouer à la main.
Ne présente jamais une installation partielle comme terminée.

## Garde-fous

- **Idempotent** : détecter avant d'installer, toujours. Rien n'est réinstallé ni écrasé sans un
  oui explicite de l'humain sur ce composant précis.
- **Jamais de `--force` de ta propre initiative** sur `specify init` : c'est l'humain qui autorise
  l'écrasement d'un répertoire non vide.
- **Aucune mise à jour non demandée de spec-kit ni de la constitution** : un spec-kit plus ancien
  ou une constitution d'une autre version ne sont **pas** des motifs de réécriture. Signale
  l'écart, laisse décider.
- **Les standards Agent OS, eux, se synchronisent depuis le dépôt** — mais seulement après un GO
  qui a vu la liste des fichiers touchés, et jamais en supprimant un fichier local. Le dépôt
  gagne sur le contenu ; l'humain gagne sur le moment.
- **Une seule source pour les standards** : `STANDARDS_REPO@STANDARDS_REF`, fetché à l'instant.
  Jamais un clone local qui traîne, jamais buildermethods, jamais un autre projet de la machine.
- **`/sk-init` est la seule commande qui écrit `.sk/repos.json`.** Une clé à `null` est une
  réponse, pas un trou : elle ne se redemande jamais. Une clé déjà renseignée ne se redemande
  que si son dossier a disparu du disque. Aucun chemin n'est deviné, aucun `find` n'est lancé
  pour en trouver un — au plus un `ls` de deux dossiers connus, proposé comme option.
- **Aucune écriture hors des quatre cibles** : `.specify/` (installeur spec-kit + constitution),
  `agent-os/standards/`, `.sk/repos.json`, `.gitignore` (avec accord) — plus le pool, hors du repo.
- **Pas d'installation d'outillage système** (`uv`, `git`, `node`, `bash`) : tu les détectes, tu
  donnes la commande, tu t'arrêtes.
- **Aucun code de production écrit**, aucun fichier source modifié.
- **Depuis le repo principal uniquement**, jamais depuis un slot du pool.

## Écosystème

Routage complet : `~/.claude/skills/_shared/sk-routing.md`.
Dépôts liés (contrat de `.sk/repos.json`) : `~/.claude/skills/_shared/sk-repos.md`.
Chemins et variables : `~/.claude/skills/_shared/sk-config.md`.
