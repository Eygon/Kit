---
name: sk-copy-credentials
description: Prépare la copie des fichiers de configuration locaux non versionnés (typiquement le .env du front) depuis le dépôt principal vers un slot du pool de worktrees, pour qu'un `yarn dev` y fonctionne. Ne copie RIEN elle-même : elle rend une commande prête à coller, parce que le hook block-secrets refuse toute commande touchant un credential. Vérifie aussi le dépôt backend lié et dit s'il y a quelque chose à y faire. Use when the user invokes /sk-copy-credentials, or wants to run the app from a pool slot and lacks its local config.
argument-hint: "[slot ou chemin, ex. wt-3]"
disable-model-invocation: true
allowed-tools: Bash Read Glob AskUserQuestion
---

# Copie des credentials vers un slot du pool (`/sk-copy-credentials`)

## Ce que fait cette commande — et ce qu'elle ne fait pas

Un worktree git ne reçoit **que** les fichiers versionnés. Tout ce qui est gitignoré — au premier
chef le `.env` du front — manque donc dans les slots du pool, et `yarn dev` y échoue. Les gates
(`typecheck`, `lint`, Vitest) fonctionnent sans, c'est pourquoi le manque ne se voit qu'au moment de
lancer l'application.

Cette commande **ne copie rien**. Elle inventorie, puis rend **une commande à coller**. Raison :
le hook `~/.claude/hooks/block-secrets.ps1` bloque `Bash`, `PowerShell`, `Read`, `Edit`, `Write` et
`Grep` dès que le texte contient l'un de ses motifs — `\.env(\.|$|\b)`, `localSettings\.json`,
`appsettings`, `secrets\.json`, `\.pfx\b`, `\.pem\b`. Ce garde-fou est délibéré : il empêche le
contenu d'un credential d'entrer dans le contexte du modèle. On ne le contourne pas.

L'utilisateur exécute la commande rendue en la préfixant de `!` dans le prompt : elle tourne dans
la session et sa sortie revient dans la conversation, sans jamais passer par un tool call.

## Contrainte majeure — comment détecter sans nommer

**N'écris jamais une commande contenant un motif bloqué**, pas même pour tester une existence.
`test -f`, `ls` ou `Test-Path` sur le fichier sont tous refusés. Le hook inspecte la **chaîne
entière** de la commande : un `echo` explicatif, un commentaire `#`, un nom de variable suffisent à
la faire refuser — constaté en écrivant cette commande. Détecte par **listage**, et filtre en lisant
la sortie :

```bash
git -C <PRINCIPAL> status --ignored --porcelain -- . | grep -E '^(!!|\?\?)' | cut -c4-
```

Cette commande ne porte aucun motif bloqué ; sa sortie, oui — c'est acceptable, un **nom** de
fichier n'est pas un secret, seul son contenu l'est. Ne lis jamais le contenu.

**Prends les deux préfixes, `!!` et `??`.** Un fichier utile au slot peut être simplement *non
suivi* plutôt qu'ignoré, et il manque tout autant dans un worktree : c'est le cas de `.sk/` sur
MySepteoWeb, que `--ignored` seul ne montre pas.

Écarte de la sortie les artefacts de build et de cache, qui n'ont rien à faire dans un slot :
`node_modules`, `dist`, `build`, `coverage`, `bin`, `obj`, `.vite`, `.turbo`, `.tmp*`, `*.log`,
`audit-runs`, `playwright-report`, `test-results`, `.playwright-mcp`. Écarte aussi `specs/`, que
`/sk-impl` copie déjà lui-même.

Garde ce qui reste, en le classant en deux familles :

- **credentials** — ce qui matche un motif du hook. C'est le cœur du besoin ;
- **configuration locale non sensible** — typiquement `.sk/` (résolution des dépôts pour les
  skills `sk-*`), `.vscode/`, `.claude/` s'il est ignoré. Utile, à proposer séparément : l'utilisateur
  peut n'en vouloir aucun.

## 1. Résoudre le dépôt principal et le slot cible

`PRINCIPAL` = `dirname` de `git rev-parse --path-format=absolute --git-common-dir`. Jamais
`--show-toplevel` : depuis un worktree, il rend le nom du slot.

`POOL_BASE` et `REPO_SLUG` se résolvent via [`_shared/sk-config.md`](../_shared/sk-config.md).
`POOL_ROOT` = `<POOL_BASE>/<REPO_SLUG>`.

Slot cible, premier gagnant :

1. l'argument s'il est fourni — un nom (`wt-3`) ou un chemin absolu ;
2. le worktree courant, si la commande est lancée depuis un slot du pool ;
3. le slot dont la branche commence par `sk-impl-` ou `sk-xs-` — s'il n'y en a qu'un ;
4. plusieurs candidats, ou aucun : **une** `AskUserQuestion` listant les slots avec leur branche.
   Ne devine pas.

Slot inexistant → STOP, et renvoie vers `/sk-pool-init`. Ne crée aucun worktree ici.

## 2. Inventorier ce qui manque

Pour chaque entrée retenue à l'étape précédente, détermine si elle est **absente du slot**, toujours
par listage (`ls -a <slot>`), jamais en la nommant dans la commande.

Tu ne peux pas comparer les contenus — la lecture est bloquée. Donc :

- **absente du slot** → à copier ;
- **présente dans le slot** → propose quand même la copie, en disant clairement qu'elle **écrase** :
  le fichier du principal a pu changer depuis, et rien ne permet de le vérifier sans le lire.

## 3. Vérifier le dépôt backend lié — sans rien affirmer d'avance

Si `.sk/repos.json` du principal porte une clé `backend` non nulle, vérifie ce dépôt aussi. Deux
questions, dans cet ordre :

1. **Les secrets sont-ils hors dépôt ?** `grep -rn "UserSecretsId" <BACK>/*/*.csproj`. Si un
   `UserSecretsId` est déclaré, les secrets vivent dans
   `%APPDATA%\Microsoft\UserSecrets\<id>\secrets.json` — **hors** du dépôt, donc déjà partagés par
   tous les worktrees de la machine. **Rien à copier.** Dis-le, ne laisse pas l'utilisateur croire
   qu'une copie est nécessaire.
2. **Les fichiers de configuration sont-ils versionnés ?** Liste le dossier du projet hôte dans le
   principal *et* dans son worktree, et compare les noms. Sur `MySepteo.Api` au 2026-08-31, tous les
   `appsettings*.json` sont versionnés et présents dans le worktree : seuls manquent un `.csproj.user`
   (préférences Visual Studio) et un dossier de logs, sans intérêt.

Ne recopie pas ce constat sans l'avoir refait : un dépôt peut changer de pratique.

## 4. Rendre la commande

Une seule ligne, chaînée, chemins absolus, à coller telle quelle avec le préfixe `!` :

```
! cp <PRINCIPAL>/<fichier> <SLOT>/ && cp -r <PRINCIPAL>/<dossier> <SLOT>/
```

Sous Windows, `cp` de Git Bash convient et accepte les chemins POSIX (`/c/...`). Si l'utilisateur
préfère PowerShell, rends `Copy-Item -Force` avec des chemins Windows entre guillemets.

Présente, dans cet ordre :

1. le slot cible et sa branche, pour qu'une erreur de cible saute aux yeux ;
2. la liste des credentials à copier, et celle des configurations locales, séparées ;
3. ce qui **écrasera** un fichier déjà présent ;
4. le verdict backend — « rien à faire » est une information utile, pas un silence ;
5. la commande, seule sur sa ligne, préfixée de `!`.

Si rien ne manque et que l'utilisateur n'a pas demandé de resynchronisation, dis-le en une phrase et
ne rends aucune commande.

## Garde-fous

- **Aucune commande, aucun `Read`, aucun `Grep` portant un motif du hook.** Détection par listage,
  filtrage à la lecture de la sortie.
- **Ne lis jamais le contenu** d'un fichier de credentials, même si le hook le laissait passer.
- **Ne modifie jamais** `block-secrets.ps1`. Si l'utilisateur veut un skill autonome, c'est une
  décision qui lui appartient et qui se prend explicitement, hors de cette commande.
- **Ne crée ni ne supprime de worktree** : c'est le domaine de `/sk-pool-init` et `/sk-impl`.
- **Ne copie pas `specs/`** : `/sk-impl` s'en charge, avec sa propre logique de trio.
- **Rien vers le dépôt principal.** Le flux va toujours du principal vers un slot, jamais l'inverse :
  un `.env` de slot modifié pour un essai ne doit pas remonter.
- Sortie **idempotente** : relancer la commande rendue ne casse rien.
