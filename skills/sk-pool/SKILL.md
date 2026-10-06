---
name: sk-pool
description: Etat et entretien des pools de worktrees, TOUS PROJETS CONFONDUS. Montre pour chaque slot ce que git dit (branche, proprete, derniere ecriture) face a ce que status.md declare, nomme les incoherences, et propose de les corriger : rendre au pool les slots dont le run est fini, aligner le releve sur le disque, supprimer les lignes fantomes. Ne lance aucune implementation, n ecrit aucun code, ne supprime jamais un worktree. Use when the user invokes /sk-pool, asks which slots are free or busy, why a slot is stuck, or wants to free or repair slots.
argument-hint: "[projet | slot | libere | repare] (vide = etat de tous les pools)"
disable-model-invocation: true
allowed-tools: Bash PowerShell Read Glob Grep AskUserQuestion
---

# Etat et entretien des pools de worktrees (`/sk-pool`)

Cible : **$ARGUMENTS** (vide = tous les pools)

Contrat unique : `~/.claude/skills/_shared/sk-pool.md`. Tout passe par
`SKP = pwsh -File ~/.claude/skills/_shared/sk-pool.ps1`. Tu n ecris JAMAIS `status.md`
toi-meme, tu ne fais AUCUN `git checkout` / `branch -D` / `stash` a la main : le script porte
les gardes (stash nomme, detachement, branche conservee si elle n est pas sur origin).

## Ce que cette commande fait, et ne fait pas

- Elle **lit** l etat des pools et le **rend lisible** : un tableau par depot, git face au releve.
- Elle **repare** apres accord : rendre au pool un slot dont le run est fini, aligner une ligne,
  supprimer une ligne fantome.
- Elle ne lance pas d implementation (`/sk-impl`), n ecrit pas de code, ne supprime jamais un
  worktree ni un pool, ne touche pas a un slot dont git montre qu il travaille encore.

## 1. Inventaire

`POOL_BASE` : `SK_POOL_ROOT` si defini, sinon `C:\tmp\sk-pool` (`_shared/sk-config.md`).
Chaque sous-dossier qui porte un `status.md` est le pool d un projet. Pour chacun, le depot
principal se lit dans le `.git` d un de ses slots (`gitdir: <depot>/.git/worktrees/<slot>`) —
ne le devine pas depuis le nom du dossier.

$ARGUMENTS nomme un projet ou un chemin : ne traite QUE celui-la. Vide : tous.

Pour chaque pool :

```
SKP -Action status -Repo <depot principal>
```

Rends les tableaux tels quels, sans les reformuler. Un tableau par depot, dans l ordre.

## 2. Lire les verdicts

| Verdict | Ce que ca veut dire | Ce que tu proposes |
|---|---|---|
| `ok` | git et le releve concordent | rien |
| `A-LIBERER` | le releve dit occupe, git montre le worktree libre : run fini ou interrompu sans liberation | `release` |
| `A-LIBERER (sale)` | idem, avec des fichiers non commites | `release` (ils partent en stash nomme) |
| `HORS-RELEVE` | git est sur une branche de travail, le releve dit libre ou se tait | `repair` |
| `BRANCHE-DIFFERENTE` | occupe des deux cotes, mais pas la meme branche (publication qui a rebranche, autre chantier) | `repair`, apres avoir dit laquelle est la vraie |
| `INTROUVABLE` | ligne occupee, dossier disparu | `repair` (supprime la ligne) |

Un slot dont git est sur une branche de travail ET dont le worktree a ecrit recemment porte un
run **vivant** : ne propose rien dessus, meme si son releve est vieux. En cas de doute sur un
slot que tu t appretes a toucher, regarde ce qu il contient :
`git -C <slot> log --oneline -n 5` et `git -C <slot> status --short`.

## 3. Proposer, puis agir

Une seule `AskUserQuestion` pour tout le lot, jamais une par slot. Enonce, slot par slot, ce
qui sera fait et ce qui sera preserve :

- « rendre au pool <n> slots dont le run est fini » — nomme-les avec leur branche, et dis pour
  chacun si des fichiers non commites partiront en stash ;
- « aligner le releve sur le disque pour <n> slots » — nomme l ancienne et la nouvelle valeur ;
- « ne rien faire ».

Options : **Tout appliquer / Choisir slot par slot / Ne rien faire**. Rien n est ecrit avant.

Puis, dans l ordre :

```
SKP -Action release -Slot <chemin du slot>      # un slot dont le run est fini
SKP -Action repair  -Repo <depot> -Apply        # les lignes a aligner, en une fois
```

`repair` sans `-Apply` est un dry-run : lance-le d abord si l utilisateur veut voir avant.

Jamais `-Force` de toi-meme. Un `REFUS` (exit 3) se rapporte a l utilisateur avec la raison
exacte, et c est lui qui tranche.

## 4. Rendre compte

Une ligne par slot touche : ce qui a ete fait, les branches supprimees, celles conservees et
pourquoi, le nom du stash s il y en a un. Puis le nombre de slots de travail libres par projet —
c est la seule chose que l utilisateur veut savoir avant de lancer un run.

Termine par ce qui reste anormal et que tu n as pas touche (run vivant, slot d un autre agent,
`REFUS` du script), une ligne chacun.

## Garde-fous

- `status.md` ne s ecrit que par `sk-pool.ps1`. Aucune edition a la main, aucune exception.
- Jamais `git worktree remove`, jamais la suppression d un pool : un slot resservira.
- Jamais toucher a un slot dont git montre un travail en cours, meme avec un releve perime.
- Jamais `-Force` sans accord explicite, et jamais « pour voir ».
- Le bouton de liberation de Claude Fleet appelle exactement le meme script : les deux gestes
  doivent rester indiscernables.

## Ecosysteme

`/sk-pool-init` cree un pool (4 slots) pour un projet qui n en a pas. `/sk-impl`, `/sk-xs` et
`/sk-review` prennent et rendent leurs slots eux-memes, par ce meme script. Cette commande-ci
est l entretien : elle ne fait rien qu ils ne puissent faire, elle le fait quand personne ne
tourne.
