---
name: sk-update
description: Met à jour l'installation locale du kit sk-* depuis la branche main du dépôt Azure DevOps sk-kit (https://dev.azure.com/Septeo/I.A/_git/sk-kit). Résout la racine d'installation de la machine courante (SK_HOME, sinon CLAUDE_CONFIG_DIR, sinon ~/.claude) — jamais un chemin en dur, le kit est partagé par plusieurs personnes. Détecte en lecture seule ce qui est nouveau, modifié ou local-seul dans skills/, agents/ et assets/, montre le plan, n'écrit qu'après GO humain, sauvegarde tout fichier écrasé, ne supprime jamais rien, puis rend un récapitulatif de ce qui a été mis à jour. Use when the user invokes /sk-update, or wants to pull the latest sk-* skills from the sk-kit repository into their global Claude installation.
argument-hint: "[--check] [--ref <branche>] [--target claude|cursor|all]"
disable-model-invocation: true
allowed-tools: Bash PowerShell Read Write Glob Grep AskUserQuestion
---

# Mise à jour du kit sk-* depuis le dépôt (`/sk-update`)

Sens de la copie : **dépôt → machine locale**, jamais l'inverse. Cette commande ne pousse rien,
ne commit rien, ne supprime rien. Elle ne touche que trois sous-arbres de la racine
d'installation : `skills/`, `agents/`, `assets/`.

Elle **n'écrit aucun fichier avant le GO de l'humain**, et ce GO porte sur une **liste de
fichiers**, pas sur une intention.

## 0. Résolution des chemins — aucun chemin en dur

Le kit est installé par plusieurs personnes, sur des machines différentes : **aucun chemin
absolu de machine ne doit apparaître** dans ce que tu exécutes ou affiches, en dehors de ce que
la résolution ci-dessous rend.

Le kit s installe sur **deux hôtes** : Claude Code (`~/.claude`) et Cursor
(`~/.cursor`). `--target` dit lequel mettre à jour — `claude` par défaut,
`cursor`, ou `all`. Chaque cible a sa propre résolution de racine, sa propre
détection et son propre plan : elles ne se déduisent pas l'une de l'autre.

| Nom | Résolution, premier gagnant |
|---|---|
| `SK_HOME` (cible `claude`) | `$SK_HOME` si défini et non vide ; sinon `$CLAUDE_CONFIG_DIR` ; sinon `$HOME/.claude` (sous Windows, `%USERPROFILE%\.claude`) |
| `CURSOR_HOME` (cible `cursor`) | `$CURSOR_HOME` si défini et non vide ; sinon `$HOME/.cursor` |
| `KIT_REPO` | `$SK_KIT_REPO` si défini ; sinon `https://dev.azure.com/Septeo/I.A/_git/sk-kit` |
| `KIT_REF` | `--ref <branche>` de `$ARGUMENTS` si fourni ; sinon `$SK_KIT_REF` ; sinon `main` |
| `KIT_CACHE` | `<POOL_BASE>/_sk-kit-src` — `POOL_BASE` via `~/.claude/skills/_shared/sk-config.md` (`$SK_POOL_ROOT`, sinon `C:\tmp\sk-pool` / `$HOME/.cache/sk-pool`) |
| `STATE_FILE` | `<SK_HOME>/.sk-kit-install.json` — trace de la version installée |
| `BACKUP_DIR` | `<SK_HOME>/.sk-kit-backup/<horodatage compact>` |

```bash
SK_HOME="${SK_HOME:-${CLAUDE_CONFIG_DIR:-$HOME/.claude}}"
test -d "$SK_HOME/skills" || echo "PAS UNE INSTALLATION"
```

`<SK_HOME>/skills` absent → **STOP**. Ce n'est pas une mise à jour mais une première
installation : renvoie vers la section « Installation » du README du dépôt, et n'improvise pas
la création de l'arborescence.

`STATE_FILE`, `BACKUP_DIR` et `KIT_CACHE` vivent **hors** de `skills/`, `agents/` et `assets/` :
un `diff -rq` entre le dépôt et l'installation doit rester propre après une mise à jour.

**Lien symbolique / jonction** : si `<SK_HOME>/skills`, `<SK_HOME>/agents` ou l'un de leurs
sous-dossiers est un lien (cas d'une machine où l'installation pointe sur un clone de travail),
écrire dessus écrirait **dans le clone**. Détecte-le (`test -L`, ou sous Windows
`Get-Item <chemin> | Select-Object LinkType`), signale-le dans le plan, et fais confirmer ces
entrées explicitement.

## 1. Récupérer la référence

```bash
if [ -d "<KIT_CACHE>/.git" ]; then
  git -C "<KIT_CACHE>" fetch -q --depth 1 origin "<KIT_REF>" \
    && git -C "<KIT_CACHE>" checkout -q FETCH_HEAD
else
  git clone -q --depth 1 --branch "<KIT_REF>" "<KIT_REPO>" "<KIT_CACHE>"
fi
git -C "<KIT_CACHE>" rev-parse --short HEAD
cat "<KIT_CACHE>/VERSION" 2>/dev/null
```

Échec réseau ou d'authentification → **STOP**. Donne l'URL, la branche et la commande à rejouer
à la main ; ne retombe sur aucune autre source. Un clone local de `sk-kit` trouvé ailleurs sur
la machine **n'est pas une référence** : il dérive, et peut porter du travail non poussé.

`<KIT_CACHE>/skills` absent après récupération → **STOP** : mauvaise URL ou mauvaise branche.

## 2. Détection — lecture seule

Compare chacun des trois sous-arbres présents dans le dépôt (`skills/`, `agents/`, `assets/` ;
un sous-arbre absent du dépôt est simplement ignoré) :

```bash
LC_ALL=C diff -rq "<KIT_CACHE>/skills" "<SK_HOME>/skills"
```

Trois classes, et trois seulement :

| Sortie de `diff` | Classe | Action |
|---|---|---|
| `Only in <KIT_CACHE>/...` | **nouveau** | à copier |
| `Files ... differ` | **modifié** | à écraser, après sauvegarde |
| `Only in <SK_HOME>/...` | **local seul** | **jamais touché**, seulement signalé |

Tout le reste est identique et n'est pas réécrit. Les « locaux seuls » attendus sur une machine
installée — `estimate-us`, `sk-copy-credentials`, des agents hors kit, un `README.md` local — ne
sont **pas** du bruit à nettoyer : cette commande ne supprime rien, jamais, même sur demande.
Un local seul qui ressemble à du travail non poussé (une skill `sk-*` absente du dépôt) mérite
une ligne d'avertissement : « le local semble **en avance** sur le dépôt — à remonter dans
`sk-kit` avant qu'il ne se perde ».

Lis aussi `STATE_FILE` s'il existe (`version`, `commit`) et `<KIT_CACHE>/CHANGELOG.md` : extrais
les sections comprises entre la version installée (exclue) et la version du dépôt (incluse).
Pas de `STATE_FILE` → version installée « inconnue », le plan se lit alors uniquement au niveau
des fichiers.

## 3. Plan, puis GO

Présente en une seule `AskUserQuestion`, après ce tableau :

| Sous-arbre | Nouveaux | Modifiés | Identiques | Locaux seuls |
|---|---|---|---|---|
| `skills/` | n | n | n | n |
| `agents/` | … | … | … | … |
| `assets/` | … | … | … | … |

Sous le tableau : la version installée → la version du dépôt (`<VERSION>` @ `<SHA>`, branche
`<KIT_REF>`), **la liste nominative** des fichiers nouveaux et modifiés (chemins relatifs à
`<SK_HOME>`), la liste des locaux seuls, et l'extrait de CHANGELOG.

Options : **Tout mettre à jour** / **Choisir sous-arbre par sous-arbre** / **Annuler**.

Rien à faire (aucun nouveau, aucun modifié) → ne pose **aucune** question : dis que
l'installation est déjà à jour sur `<VERSION>` @ `<SHA>`, liste les locaux seuls s'il y en a,
et arrête-toi là.

`--check` dans `$ARGUMENTS` → arrête-toi ici dans tous les cas : le plan est le livrable, aucune
question, aucune écriture.

## 4. Sauvegarde, puis copie

Dans cet ordre, jamais l'inverse :

1. **Sauvegarder** chaque fichier de la classe *modifié* sous `<BACKUP_DIR>`, en conservant son
   chemin relatif. Les *nouveaux* n'ont rien à sauvegarder.
2. **Copier** depuis `<KIT_CACHE>` vers `<SK_HOME>`, sous-arbre par sous-arbre, sans jamais
   supprimer un dossier de destination au préalable.

```bash
mkdir -p "<BACKUP_DIR>"
# pour chaque fichier modifié, en préservant son chemin relatif :
#   mkdir -p "<BACKUP_DIR>/$(dirname "$rel")" && cp -p "<SK_HOME>/$rel" "<BACKUP_DIR>/$rel"

cp -R "<KIT_CACHE>/skills/." "<SK_HOME>/skills/"
cp -R "<KIT_CACHE>/agents/." "<SK_HOME>/agents/"
mkdir -p "<SK_HOME>/assets" && cp -R "<KIT_CACHE>/assets/." "<SK_HOME>/assets/"
```

Sous Windows, l'équivalent est `Copy-Item -Recurse -Force "<KIT_CACHE>\skills\*"
"<SK_HOME>\skills\"`. **N'emploie jamais `robocopy /MIR` ni `rsync --delete`** : ils suppriment
les locaux seuls.

**Cible `cursor`** — n'improvise pas la copie, le dépôt porte le script :

```powershell
pwsh -File "<KIT_CACHE>/skills/_shared/install-cursor.ps1" -Source "<KIT_CACHE>" -Check
pwsh -File "<KIT_CACHE>/skills/_shared/install-cursor.ps1" -Source "<KIT_CACHE>"
```

Il applique les mêmes règles que cette commande — trois classes, aucune suppression, les
locaux seuls signalés — et fait en plus les deux choses que Cursor exige et que Claude Code
n'a pas :

1. Il **génère `<CURSOR_HOME>/commands/sk-*.md`**. Cursor ne dérive pas une commande d'une
   skill : sans ces fichiers, les skills sont installées mais aucun `/sk-*` n'apparaît. Ils
   sont générés, jamais édités à la main, et ne remontent pas dans le dépôt (ils portent le
   chemin résolu de la machine).
2. Il **ne génère aucun raccourci pour une skill absente du dépôt** : ranimer un `/sk-full` ou
   un `/sk-tdd` retiré, c'est offrir au menu une commande qui échoue en cours de run.

`assets/` ne part pas vers Cursor : il ne sert qu'à `/sk-init`, qui lit `SK_HOME`.

3. **Écrire `STATE_FILE`** — en dernier, seulement si les copies ont réussi :

```json
{
  "version": "<VERSION>",
  "ref": "<KIT_REF>",
  "commit": "<SHA>",
  "repo": "<KIT_REPO>",
  "installedAt": "<ISO 8601 UTC>",
  "subtrees": ["skills", "agents", "assets"]
}
```

Copie partielle (une erreur au milieu) → n'écris pas `STATE_FILE`, dis quels sous-arbres ont
abouti et lesquels non, et donne `<BACKUP_DIR>` comme chemin de retour arrière.

4. **Vérifier** : rejoue le `diff -rq` de la section 2 sur les sous-arbres copiés. Il ne doit
   plus rester que des `Only in <SK_HOME>` (les locaux seuls). Toute ligne `differ` restante est
   un échec de copie à signaler, pas à taire.

## 5. Récapitulatif — le livrable

Termine **toujours** par ce récapitulatif, en français, dans cet ordre :

1. **Une ligne de verdict** : `1.3.4 → 1.4.0 (main @ 9454069)`, ou « déjà à jour ».
2. **Ce qui a changé, fichier par fichier**, groupé par skill / agent, avec la classe et le
   volume — par exemple `sk-impl/SKILL.md — modifié (249 → 490 lignes)`,
   `_shared/sk-parallel.md — nouveau`. Nomme les fichiers : « 11 fichiers mis à jour » ne dit
   rien à qui veut savoir si son garde-fou favori a bougé.
3. **Ce qui n'a pas été touché** : les locaux seuls, et l'avertissement « en avance sur le
   dépôt » le cas échéant.
4. **Ce que ça change à l'usage** : les entrées de CHANGELOG qui portent sur une commande
   (comportement, nouvelle commande, garde-fou retiré), et rien d'autre. Deux ou trois lignes.
5. **Où est la sauvegarde** : `<BACKUP_DIR>`, et la commande pour revenir en arrière.
6. **Le rappel de session** : les skills sont chargées au démarrage — une commande **nouvelle**
   ou dont le frontmatter a changé n'apparaît qu'après **redémarrage de l'hôte** (Claude Code
   ou Cursor, selon la cible). Une commande dont seul le corps a changé prend effet à sa
   prochaine invocation.
7. **Sur `--target all`, un récapitulatif par cible**, jamais fondu en un seul : les deux
   installations divergent, et « 11 fichiers mis à jour » sans dire de quel côté ne permet pas
   de savoir laquelle est en retard.

## Garde-fous

- **Aucune suppression, aucune exception.** Pas de `rm -rf` sur la destination, pas de miroir.
- **Rien hors de `<SK_HOME>/{skills,agents,assets}`.** Ni le projet courant, ni `settings.json`,
  ni les mémoires, ni `CLAUDE.md`. Sur la cible `cursor`, `<CURSOR_HOME>/commands/` s'ajoute à
  cette liste — mais **seulement les fichiers `sk-*.md`**, et seulement ceux d'une skill
  présente dans le dépôt. Les autres commandes de l'utilisateur ne se touchent pas.
- **`~/.cursor/skills-cursor/` est interdit.** C'est le dossier des skills intégrées de Cursor,
  géré par Cursor lui-même. Le kit s'installe dans `~/.cursor/skills/`, jamais là.
- **Aucun chemin absolu de machine** dans ce que tu écris ou affiches : tout passe par
  `SK_HOME`, `KIT_CACHE`, `POOL_BASE`. Ce fichier est lui-même versionné dans le dépôt et lu par
  d'autres personnes.
- **Le dépôt est la seule source.** Un clone de travail local n'en est pas une.
- **Cette commande peut se mettre à jour elle-même** : `sk-update/SKILL.md` réécrit en cours
  d'exécution ne pose pas de problème (le contenu courant est déjà en mémoire), mais signale-le
  dans le récapitulatif — la version qui vient de s'exécuter n'est plus celle installée.
- **Elle ne remplace pas `/sk-init`.** Mettre le kit à jour ne met à jour aucun projet : si le
  CHANGELOG touche `.sk/repos.json`, les standards ou le pool, dis-le et propose `/sk-init` sur
  les projets concernés — sans le lancer.
