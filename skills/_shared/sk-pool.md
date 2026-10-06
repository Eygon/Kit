# Prendre, marquer et rendre un slot du pool — `sk-pool.ps1` (source unique)

Contrat lu par `/sk-impl`, `/sk-xs`, `/sk-review`, `/sk-publish` et par Claude Fleet
(bouton « libérer » de la barre latérale). Une skill qui touche a un slot du pool passe par
ce script et n ecrit JAMAIS `status.md` a la main : c est ce qui a produit des releves qui
mentaient (slot declare sur la 902 alors que git etait sur la 914, `wt-2` declare busy sans
dossier, sessions inventees `sk914` que rien ne peut rouvrir).

## Deux verites, une regle

- **Git fait foi.** Un slot est OCCUPE si son worktree est sur une branche autre que la
  branche par defaut ; il est LIBRE s il est detache ou sur la branche par defaut.
- **`status.md` porte ce que git ignore** : qui tient le slot (`agent`, `session`,
  `terminal`), la base, l heure, une note libre.
- Le script relit git avant chaque ecriture et REFUSE (exit 3) d ecrire un releve qui
  contredit le disque. `-Force` ne se pose qu apres un accord humain explicite.

## Actions

```
pwsh -File ~/.claude/skills/_shared/sk-pool.ps1 -Action <action> ...
```

| Action | Quand | Sortie / code |
|---|---|---|
| `status -Repo <depot ou slot>` | voir un pool, les deux verites cote a cote | table ; `-Json` pour une machine |
| `find -Repo <depot> -Feature <NNN ou slug>` | **reprise** : la feature a-t-elle deja un slot ? | `REPRISE <slot> \| branche … \| verdict …` ; exit 2 aucun ; exit 3 plusieurs (trancher, ne pas deviner) |
| `free -Repo <depot>` | slot neuf | `LIBRE <slot>` ; `LIBRE-SALE <slot>` (question avant) ; exit 2 aucun |
| `claim -Slot <slot> -Branch <b> [-Base <ref>] [-Note <txt>] [-Session <id>] [-Force]` | prendre le slot | `CLAIM …` (neuf : checkout -B, reset --hard, clean -fd) ou `REPRISE …` (deja sur `-Branch` : rien touche) ; exit 3 `REFUS …` (slot pris entre free et claim ; ou deja tenu par une AUTRE session active < 45 min : meme feature lancee deux fois). claim et toute ecriture de status.md passent sous le verrou `<pool>/.claim.lock` |
| `touch -Slot <slot> [-Note <txt>]` | heartbeat apres chaque US | reecrit `updated` et la note |
| `release -Slot <slot> [-Force] [-KeepBranch]` | rendre le slot | `RELEASE …` : serveurs arretes, sale -> stash nomme, `checkout --detach origin/<defaut>`, branches supprimees si sur origin, ligne `idle` nue, `worktree prune` |
| `repair -Repo <depot> [-Apply]` | releve incoherent | dry-run par defaut : `A FAIRE …` ; `-Apply` ecrit |

`-Repo` accepte le depot principal ou n importe quel worktree : le pool se resout par le
`git-common-dir` (regle `REPO_SLUG` de `sk-config.md`). Sans `-Repo`, le cwd.

## Ce que `find` reconnait comme la meme feature

La branche git du slot, puis la tache du releve, debarrassees de leur prefixe
(`sk-impl-`, `sk-xs-`, `sk-audit-`, `review-`, `feature/`) : egalite avec le slug, ou meme
numero `NNN`. Un slot laisse sur `feature/913-…` par une publication interrompue est donc
une REPRISE de la 913, ce que la regle « branche == sk-impl-<slug> » ratait.

## Ce que `claim` ecrit

```
wt-2 | sk-impl-913-console | busy | agent CLAUDE | session <uuid> | terminal <id> | base <sha> | updated <iso> | <note>
```

- `session` : `-Session` si donne ; sinon `FLEETVIEW_SESSION_ID` (pose par Claude Fleet) ;
  sinon `CLAUDE_SESSION_ID` ; sinon le transcript le plus recent (< 10 min) du dossier
  principal sous `~/.claude/projects/`. Jamais un libelle invente.
- `terminal` : `FLEETVIEW_TERMINAL_ID` s il est pose.
- `base` : SHA du HEAD apres checkout, copie aussi dans `<POOL_ROOT>/base-sha/<branche>.txt`.
- `-Base` par defaut : `origin/<defaut>` apres fetch, repli `<defaut>` local. Backend :
  passer `-Base origin/<defaut du backend>` explicitement (contrat sk-impl §Cross-repo).

## Ce que `release` ne fait jamais

- `git checkout <defaut>` : echoue des que la branche par defaut est extraite ailleurs
  (depot principal, autre slot). Le script detache toujours (`--detach`).
- Perdre un fichier : un slot sale part en `stash push --include-untracked -m "sk-release
  <slot> <branche> <date>"`, jamais en reset. `-Force` seulement si le stash echoue.
- Supprimer une branche dont le contenu n est nulle part ailleurs : elle est **conservee** et
  nommee dans la sortie, avec sa raison.

Une branche part quand son contenu survit ailleurs, et la sortie dit laquelle :

| Raison | Cas |
|---|---|
| `sur origin` | la branche est ancetre de son upstream, ou de `origin/<defaut>` |
| `pointeur de PR` | `review-*`, qui ne porte aucun travail propre |
| `publiee en squash sur feature/<core>` | `refs/remotes/origin/feature/<core>` existe : la publication a pousse le travail. Un `merge --squash` ne laissant la branche de travail ancetre de RIEN, c est le seul indice qui dit qu elle a fait son office — sans lui, chaque run publie laisserait sa branche derriere lui |
| `-Force` | accord humain explicite |

Le slot peut porter l une ou l autre : apres une publication reussie c est `feature/<NNN>-<slug>`
qui est extraite, et `release` retrouve `sk-impl-<slug>` par le coeur du nom. `find` aussi : un
slot laisse sur `feature/<NNN>-*` reste une REPRISE de cette feature.

## Verdicts de `status` / `repair`

| Verdict | Sens | Geste |
|---|---|---|
| `ok` | releve et git concordent | rien |
| `A-LIBERER` | releve busy, git libre (run fini sans liberation) | `release` |
| `A-LIBERER (sale)` | idem, avec des fichiers non commites | `release` (stash nomme) |
| `HORS-RELEVE` | git sur une branche de travail, releve idle ou muet | `repair -Apply` (ligne busy sans agent) |
| `BRANCHE-DIFFERENTE` | busy des deux cotes, mais pas la meme branche | `repair -Apply` aligne la tache sur git |
| `INTROUVABLE` | ligne busy, dossier disparu | `repair -Apply` supprime la ligne |

## Reprise : ce que la skill doit AUSSI proteger

Le trio (`spec.md`, `plan.md`, `tasks.md`, `recon.md`) est gitignore : il vit dans le slot
et dans le principal. Sur une REPRISE, le `tasks.md` du slot porte les `[X]` du run
precedent ; le recopier depuis le principal les efface et le run repart de zero. Copier
seulement les fichiers ABSENTS du slot :

```
robocopy <principal>\specs\<NNN>-<nom> <slot>\specs\<NNN>-<nom> /E /XC /XN /XO /NJH /NJS /NFL /NDL
```

(`/XC /XN /XO` = n ecrase rien qui existe ; exit < 8 = succes.) Slot NEUF : `Copy-Item
-Recurse -Force` comme avant.
