# Depots lies d un projet — `.sk/repos.json` (source unique)

Un projet ne vit presque jamais seul : le front appelle un backend qui est un
AUTRE depot git, et il reprend souvent des comportements d un systeme legacy
qui en est encore un autre. Ces chemins sont **propres a la machine** (chacun
clone ou il veut) et **propres au projet** (le legacy de l un n est pas celui
de l autre). Les coder en dur dans une skill, c est verrouiller le kit sur un
poste ; les redemander a chaque run, c est une question de plus a chaque fois.

D ou ce fichier : ecrit UNE fois par `/sk-init`, relu par toutes les skills.

## Emplacement : DANS le projet, jamais dans `~/.claude`

`<PROJECT_DIR>/.sk/repos.json` — a la racine git du projet courant, resolue
par `git rev-parse --show-toplevel` au moment de la lecture.

**Un fichier par projet, et c est le point entier.** Le backend du projet A
n est pas celui du projet B ; le legacy que reprend l un n a rien a voir avec
celui de l autre. Un projet purement front n a pas de backend du tout. Poser
ces valeurs dans `~/.claude` (ou dans une variable d environnement globale)
les rendrait fausses des le deuxieme projet, en silence, et une skill lisant
un backend qui n est pas le sien produirait un contrat API fictif.

Ce qui est global : **ce fichier-ci**, `_shared/sk-repos.md`, qui decrit le
FORMAT. Ce qui est local au projet : les VALEURS. Une skill ne lit jamais des
chemins de depot ailleurs que dans le `.sk/repos.json` du depot courant.

Corollaire : depuis un worktree du pool (`<POOL_BASE>/<REPO_SLUG>/wt-N`),
`git rev-parse --show-toplevel` rend le slot, pas le repo principal. Le
fichier se lit sur le **repo principal** :
`git rev-parse --path-format=absolute --git-common-dir` puis son parent —
la meme regle que `REPO_SLUG` dans `sk-config.md`.

## Format

```json
{
  "version": 1,
  "updated": "2026-08-28",
  "backend": "C:/Users/moi/source/repos/MonProjet.Api",
  "legacyBackend": "D:/legacy/MonProduit.Monolithe",
  "legacyFrontend": null
}
```

| Cle | Contenu | Lu par |
|---|---|---|
| `backend` | Depot backend ACTUEL du projet (celui que le front appelle) | `/sk-code-search`, `/sk-impl` (cross-repo), `/sk-prep` |
| `legacyBackend` | Depot legacy cote serveur / metier | `/sk-legacy-search`, `/sk-prep` |
| `legacyFrontend` | Depot legacy cote client (WPF, WinForms, ancien web) | `/sk-legacy-search`, `/sk-prep` |

Chemins **absolus**, **barres normales `/` meme sous Windows** — `C:/Users/...`,
jamais `C:\Users\...`. Ce n est pas cosmetique :

- un backslash doit etre double en JSON (`\\`), et un seul oubli rend le
  fichier illisible par `jq` — panne silencieuse, au pire moment ;
- `C:/...` est accepte tel quel par git, node, dotnet et l API Windows ;
- la conversion vers la forme POSIX de `Bash` (`/c/...`) devient une seule
  substitution, sans echappement.

Un fichier ecrit a la main avec des `\\` reste lu (c est du JSON valide) ;
`/sk-init`, lui, ecrit toujours des `/`.

## Trois etats, et pourquoi ils comptent

| Etat de la cle | Sens | Ce que fait `/sk-init` |
|---|---|---|
| **absente** | jamais demandee | la demande |
| **`null`** | demandee, ce depot n existe pas / sans objet ici | ne la redemande PAS |
| **chaine** | chemin connu | ne la redemande pas ; verifie juste qu il existe encore |

Sans le `null` explicite, un projet purement front se ferait redemander son
backend inexistant a chaque `/sk-init`. Un fichier ou toutes les cles sont
renseignees (chaine ou `null`) est **complet** : `/sk-init` n a plus rien a
demander et le dit en une ligne.

## Lecture par une skill

Une skill ne parse pas ce fichier a la main : une commande, une valeur.

```bash
# racine du repo PRINCIPAL, correcte aussi depuis un worktree du pool
MAIN_ROOT=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")
SK_REPOS="$MAIN_ROOT/.sk/repos.json"
BACK_ROOT=$(jq -r '.backend // empty' "$SK_REPOS" 2>/dev/null)
```

`jq` absent → repli sans dependance :

```bash
BACK_ROOT=$(node -e "try{const r=require(process.argv[1]);process.stdout.write(r.backend||'')}catch{}" "$SK_REPOS")
```

Conversion `C:/...` → forme POSIX de `Bash` (`/c/...`) :

```bash
BACK_POSIX=$(printf '%s' "$BACK_ROOT" | tr '\134' '/' | sed -E 's#^([A-Za-z]):#/\l\1#')
```

Le `tr` d abord (au cas ou un fichier ecrit a la main porte des backslashes),
en **octal `\134`** et non `'\\'` — selon le shell qui invoque la commande, la
paire de backslashes arrive collapsee et `tr` avertit ou se trompe. Puis un
`sed -E` avec `#` comme delimiteur : avec `|`, sed lit `\|` comme une
alternation et le script casse.

## Ordre de resolution (identique dans toutes les skills)

1. Un chemin **explicite** passe en argument de la commande — il gagne
   toujours, et ne modifie pas le fichier.
2. `.sk/repos.json`, cle correspondante, si elle porte une chaine.
3. La variable d environnement historique (`SK_BACK_ROOT`, `SK_LEGACY_ROOT`)
   si elle est definie — compatibilite avec les postes deja configures.
4. Rien. **STOP** sur ce point, avec la phrase : « chemin inconnu — lance
   `/sk-init` pour le renseigner, ou passe-le en argument ». Jamais un defaut
   devine, jamais un `find` sur le disque.

Une cle a `null` s arrete a l etape 2 : c est une reponse, pas une absence.
La skill dit « pas de depot <X> pour ce projet » et continue sans lui.

## Ecriture

**`/sk-init` seul ecrit ce fichier.** Aucune autre skill ne le cree, ne le
complete ni ne le corrige en passant : une skill qui trouve une cle manquante
le signale et renvoie vers `/sk-init`. C est ce qui garde une seule porte
d entree pour une donnee que l humain est seul a connaitre.

Le fichier est **specifique a la machine ET au projet** : `/sk-init` propose
d ajouter `.sk/` au `.gitignore` du projet. Une equipe dont tous les postes
ont la meme arborescence peut choisir de le versionner — c est son choix, pas
un defaut.

`/sk-init` se lance donc **une fois par projet**, pas une fois par poste :
c est ce qui garantit que chaque depot porte ses propres voisins.

## Verification a l usage

Une skill qui lit un chemin le teste avant de s en servir
(`test -d "<chemin POSIX>"`). Chemin present dans le fichier mais absent du
disque (depot deplace, drive non monte) → **STOP**, dis lequel, propose
`/sk-init` pour le corriger. Ne le remplace pas par un voisin plausible.
