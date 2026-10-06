# Audit du kit sk-* — contrat (source unique)

`/sk-audit` mesure la chaine `/sk-prep` -> `/sk-impl` en la
FAISANT TOURNER, sur n importe quel depot, dans un pool de
worktrees qui lui est propre.

Trois principes, dont tout le reste decoule :

1. **L audit mesure, il ne demande pas au sujet de se
   mesurer.** Les durees viennent du transcript JSONL de la
   session, pas d un journal que le modele tient sur lui-meme.
   Un journal auto-redige est un temoignage ; un transcript
   horodate est une preuve. Quand les deux existent, l ECART
   est lui-meme un finding.
2. **Le corpus est gele.** Deux campagnes ne sont comparables
   que si elles rejouent le meme besoin. Un item ne se modifie
   jamais : on cree `<item>-v2`.
3. **La repetition precede la couverture.** Rejouer le MEME
   besoin donne le plancher de bruit de la chaine. Sans ce
   plancher, un ecart entre deux besoins differents n est
   attribuable a rien — ni a un patch, ni a une taille.

## Ce que l audit ne fait pas

Il n ecrit RIEN sur les branches de travail. Il ne merge pas.
Il ne touche ni `wt-1..4` (les slots de `/sk-impl`) ni le
working tree principal. Il ne modifie aucun skill : il
constate, il propose, l humain applique.

## POOL — les slots `wt-audit-N`

Chemins resolus par `_shared/sk-config.md`. Aucun chemin
absolu en dur.

| Nom | Valeur |
|---|---|
| `POOL_ROOT` | `<POOL_BASE>/<REPO_SLUG>` (identique a `/sk-impl`) |
| Slots d audit | `<POOL_ROOT>/wt-audit-1` .. `wt-audit-N` |
| `STATUS_FILE` | `<POOL_ROOT>/status.md`, format de `sk-config.md` |
| `AUDIT_RUNS` | `<PROJECT_DIR>/audit-runs/` (gitignore) |
| Corpus | `<PROJECT_DIR>/.sk/audit/corpus/<item>/` |

**Pourquoi des slots distincts de `wt-1..4`.** Un audit dure
des dizaines de minutes et lance plusieurs sessions a la fois.
S il piochait dans le pool de travail, il volerait le slot
d une feature en cours — et `/sk-impl` reprend un slot par le
NOM DE BRANCHE : deux runs qui se croisent sur le meme slot
font heriter le second des `[X]` et des commits `DONE` du
premier. L audit rendrait alors des chiffres faux **sans
prevenir**. C est le defaut le plus vicieux du fan-out : il ne
plante pas, il mesure autre chose.

**N est incremental.** Les slots sont crees a la demande, un
par session parallele, et JAMAIS supprimes : les jonctions
`node_modules` posees une fois survivent aux campagnes. C est
le principal gain de vitesse d une campagne a la suivante.

**Branche d un slot d audit :** `sk-audit-<AUDIT_SESSION>`.
Jamais `sk-impl-<slug>` : ce prefixe est celui que la reprise
de `/sk-impl` reconnait, et un slot d audit oublie serait
adopte par un vrai run.

**Base :** le HEAD du repo principal, comme le pool front de
`/sk-impl`. Une US backend prend son propre pool
`<POOL_BASE>/<BACK_SLUG>/wt-audit-N`, base sur la branche
d integration du backend (`sk-repos.md`, cle `backend`).

**Liberation :** en fin de session, `git checkout` sur la
branche par defaut, `git branch -D sk-audit-<session>`, ligne
`STATUS_FILE` remise a `<slot> | idle` nue. Le dossier reste.
`git clean -fd`, jamais `-x` ni `-fdx` (la jonction
`node_modules` doit survivre).

## Variables d environnement du run

Posees par le runner, lues par le bloc `Mode audit` de
`/sk-prep` et `/sk-impl`. Hors audit elles sont absentes et
les deux skills se comportent normalement.

| Variable | Valeur |
|---|---|
| `AUDIT_MODE` | `1` |
| `AUDIT_SESSION` | `<item>-r<n>` — suffixe TOUT chemin de travail |
| `AUDIT_OUT_DIR` | `<AUDIT_RUNS>/<runId>/<AUDIT_SESSION>/` |
| `AUDIT_INTENT_FILE` | `<corpus>/<item>/intent.md` |
| `AUDIT_BACK_SLOT` | `<POOL_BASE>/<BACK_SLUG>/wt-audit-N` — pose seulement si la session a un backend (`session.backend`, ou regime `L`) ; `/sk-impl` l adopte, ne prend jamais un `wt-1..4` backend |
| `AUDIT_BACK_BASE` | sha de `origin/<defaut>` du backend sur lequel le slot backend est branche |
| `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS` | `2700000` |

Le plafond d attente est **obligatoire** : sa valeur par
defaut (600 s) tue une session d implementation en cours et
le run se lit alors comme un timeout du skill, pas de
l instrumentation.

## Corpus — un item

```
.sk/audit/corpus/<item>/
  prompt.txt      le besoin, exactement comme tu l ecrirais
  intent.md       ce que tu SAIS, et qui remplace l humain
  expected.json   la prediction, falsifiable
```

`prompt.txt` : une ou deux phrases, ni plus detaillees ni plus
vagues que ton usage reel — sinon tu n audites pas ta
pratique.

`intent.md` : plus complet que le prompt. Le prompt est ce que
tu dis, l intent est ce que tu sais. Perimetre inclus et
exclu, cas limites, regles metier tranchees, contraintes
techniques. C est la source des reponses aux gates : clarify,
filet d hypotheses, gate checklists, validation du trio, GO
de `/sk-impl`. Chaque reponse substituee est consignee dans
`answers.jsonl` avec un drapeau `grounded` : `false` = l intent
ne permettait pas de trancher. Quelques-unes sont normales,
beaucoup disent que l intent est trop mince OU que le prompt
etait sous-specifie — les deux sont des informations.

Un item dont `prompt.txt` est vide ou commence par `<!--` est
ignore : les gabarits non remplis ne declenchent rien.

**Le gel.** Ne modifie jamais un item existant, n ecrase
jamais un item genere. Pour le changer, cree `<item>-v2` et
laisse l ancien. Un corpus qui bouge rend l historique faux
sans prevenir. C est aussi pourquoi un item genere est ECRIT
SUR DISQUE et valide par l humain avant la moindre depense.

## expected.json — la prediction falsifiable

```json
{
  "regime": "XS",
  "engine": "agent-single",
  "userStories": 1,
  "prodFiles": 2,
  "parallelYml": false,
  "crossRepo": false,
  "anchors": ["src/utils/text/truncateMiddle.ts"],
  "rationale": "fonction pure, dossier d accueil existant"
}
```

L analyzer confronte cette prediction au run reel. Sans elle,
deux defauts de nature opposee se confondent :

| Constat | Cause | Ou corriger |
|---|---|---|
| `engine` observe != `engine` attendu, mais le nombre d US tient | la selection du moteur | `/sk-impl` §2 |
| US ou fichiers tres au-dela de la prediction | l enonce du besoin etait mal dimensionne | regenerer l item sous un NOUVEAU nom |
| `parallelYml` attendu, absent | les 4 conditions de `sk-parallel.md` | `/sk-prep` annotation parallel |

Confondre les deux fait patcher un skill pour une erreur qui
vient de l enonce.

## REGIMES — pourquoi quatre, et pas trois tailles

Le kit n a plus de triage global (`/sk-impl` neutralise
explicitement la section Triage d un plan.md ancien). Depuis
le 2026-09-08, `/sk-prep` porte UN garde-fou de taille
(A.1bis, apres la recon) : un besoin XS au sens de
`/sk-xs` §-1 declenche une AskUserQuestion « basculer vers
/sk-xs (recommande) / garder le papier ». Consequence pour
le banc : l item de regime `XS` lance par `/sk-prep` doit
desormais rendre `outcome: stopped`, `stop.section: "## A.
1bis Garde-fou de taille"` en ~1 min — c est la promesse
qu il mesure. La chaine prep -> impl se mesure a partir du
regime `S`. Ce qui
varie reellement, c est le MOTEUR D EXECUTION. Un regime qui
n active pas un moteur ne le teste pas.

| Regime | Demande | Moteur active |
|---|---|---|
| `XS` | 1 fichier prod + 1 test | `n==1` : Agent Sonnet unique, revue par le parent Opus, pas de Workflow |
| `S` | 1 US, 3-5 fichiers prod | idem, mais budget worker sollicite : plafond dur ~40 min, commit WIP |
| `M` | 2-3 US, meme git root | `n>=2` : Workflow `speckit-us-loop.js`, chaine Sonnet -> revue (PASS / FIXED / FAIL / ESCALATE) -> fix, `review2` |
| `L` | 2 git roots, contrat API | `parallel.yml` + `speckit-us-after-parallel.js` : barriere, `Promise.all`, hash freeze, pool backend |

`L` est le regime le plus complexe du kit et le moins
eprouve : barriere `after`, rehash du contrat apres CHAQUE
worker, deux pools distincts. Prioritaire.

## QUATRE DIMENSIONS mesurees

### 1. Determinisme

Le meme item, joue `repeat` fois. On ne compare pas les
sessions entre elles pour departager un gagnant : on mesure
l ECART. Variance de `userStories`, `prodFiles`, `tasks`,
`durationMs`, `costUsd`, et du moteur retenu.

Un moteur qui varie d une repetition a l autre sur un besoin
IDENTIQUE est le defaut le plus grave que l audit peut
trouver : il rend toute autre mesure non attribuable. Il se
traite avant tout le reste.

### 2. Temps

Reconstruit depuis le transcript JSONL (`<SK_TRANSCRIPTS>/
<projet>/<sessionId>.jsonl`). Chaque entree porte
`timestamp`, `isSidechain` (parent vs sous-agent),
`message.model` et `message.usage`.

| Metrique | Definition |
|---|---|
| `fixedMs` | bootstrap + closing (marqueurs `AUDIT_MARK`) |
| `variableMs` | cycles : le travail reel sur les US |
| `fixedShare` | `fixedMs / totalMs` — repond a « le kit est-il trop lourd pour une petite tache » |
| `topCosts` | les 5 postes les plus longs, par outil et par agent |
| `waitMs` | temps hors appel d outil et hors generation : attente pure |
| `agents` / `overlapMs` / `parallelismRatio` | temps de chaque sous-agent (depuis `agents/`), temps ou >= 2 travaillent en meme temps, et sa part : c est ce qui distingue un `Promise.all` reel d une sequence. `bySidechain` lu sur le transcript parent vaut toujours 0 |

### 3. Robustesse — l injection de fautes

Chaque `STOP` prescrit par un skill est une promesse. Une
faute injectee demande : la promesse tient-elle ?

Trois verdicts, et un seul est bon :

| Verdict | Sens |
|---|---|
| `held` | le skill s est arrete comme prescrit, avec le message attendu |
| `circumvented` | il a invente un contournement pour « sauver » le run |
| `crashed` | il est mort sans diagnostic exploitable |

`circumvented` est le finding le plus precieux du systeme : un
run qui reussit ne prouve presque rien, un run qui devait
s arreter et qui a continue prouve un defaut exact.

Catalogue : `_shared/sk-audit-faults.md`.

### 4. Conformite du livrable

`audit-lint.mjs` sur le trio produit, sans agent et sans
depense. Il applique les garde-fous que `/sk-prep` s impose
a lui-meme : artefacts vides interdits, US <= ~6 fichiers
prod et <= ~6 taches, jamais API+UI dans un `[USn]`, ancres
`Design:` / `Legacy:` / `Code:` resolvables, chaque champ de
`contracts/` avec sa source dans les Faits verifies, ids de
`parallel.yml` colles aux `[USn]`.

Ce lint tourne AUSSI seul, sur n importe quel `specs/<NNN>/`
deja produit : c est le retour sur investissement le plus
immediat du paquet, campagne ou pas.

## campaign.json — format

Le plan valide par l humain, lu par `audit-run.mjs`. Ecrit par `/sk-audit`
(ou par un generateur du projet, ex. `<PROJECT_DIR>/.sk/audit/mkcampaign*.mjs`).
Une campagne deja ecrite se REJOUE telle quelle : ne pas la regenerer.

```json
{
  "runId": "L-2026-09-09T14-38-21",
  "mainRoot": "C:\...\MySepteoWeb",
  "outDir": "<mainRoot>\audit-runs\<runId>",
  "corpusRoot": "<mainRoot>\.sk\audit\corpus",
  "timeoutMin": 90,
  "concurrency": 1,
  "baseline": "- texte injecte dans le prompt de cadrage ({{BASELINE}}) : gates rouges preexistantes, gates retirees, consignes d environnement",
  "faults": { "<id>": { "id", "family", "target", "inject", "op", "path", "...": "voir sk-audit-faults.md" } },
  "sessions": [
    {
      "id": "<item>-<variante>-r<n>",
      "slot": "wt-audit-1",
      "regime": "XS | S | M | L",
      "item": "<dossier du corpus>",
      "backend": true,
      "steps": [
        { "command": "/sk-prep", "arg": "<prompt.txt de l item>" },
        { "faults": ["<id>"] },
        { "command": "/sk-impl" }
      ]
    }
  ]
}
```

- `timeoutMin` : par ETAPE. **45 suffit a un XS, PAS a un L** : le 2026-09-09 une
  session L a expire sur `/sk-impl` a 45 min et a perdu toute sa capture. Pour L :
  **90**. Une session expiree sort `harness-timeout`, jamais `crashed`.
- `concurrency` : **1** des que l on mesure des durees (deux sessions Claude en
  parallele se disputent le CPU) ou que `specs/` est partage (collision
  `.specify/feature.json`). Les slots `wt-audit-N` sont alors pris a tour de role.
- `session.backend` : `true` = le runner prepare aussi
  `<POOL_BASE>/<BACK_SLUG>/wt-audit-N` (base `origin/<defaut>` du backend apres fetch)
  et pose `AUDIT_BACK_SLOT` / `AUDIT_BACK_BASE`. Defaut : `true` si `regime == "L"`.
- `steps` : les slash-commands, dans l ordre, `arg` = le prompt de l item ; un step
  `{ "faults": [...] }` insere les mutations a cet endroit (`before-impl` = entre
  `/sk-prep` et `/sk-impl`). Une session = UNE faute au plus, sinon la premiere qui
  STOP rend les autres `not-exercised`.
- `session.id` doit finir par `-r<n>` : c est le suffixe `AUDIT_SESSION` du
  FEATURE_DIR, et la cle de comparaison entre repetitions.
- La base git de chaque session est le HEAD du principal AU DEMARRAGE DE LA SESSION,
  pas de la campagne : un merge en cours de campagne rend les repetitions non
  comparables (constate le 2026-09-09 : r1 sur 53a78f1b, r2 sur 2f25eef8).
  Ne pas merger pendant une campagne.

## Artefacts d un run

```
audit-runs/<runId>/
  campaign.json          le plan valide par l humain
  progress.jsonl         avancement, suivable en direct
  report.generated.md    ecrit par l analyzer, ECRASE a chaque rejeu
  report.md              le verdict HUMAIN ; l analyzer n y touche jamais
  findings.json          un objet par constat
  analysis.json          sessions, timelines, calibration : la matiere
  <session>/
    turn1.json           tour de cadrage (doit rendre PRET)
    step<n>.json         chaque slash-command : duree, cout, tours
    result.sk-prep.json  ecrit par /sk-prep, schema §result
    result.sk-impl.json  ecrit par /sk-impl, meme schema
    answers.jsonl        reponses substituees + grounded
    marks.jsonl          marques AUDIT_MARK horodatees (runner)
    transcript.jsonl     copie du transcript de session
    timeline.json        decomposition du temps (analyzer)
    faults.json          fautes injectees et verdict
    agents/              transcripts des sous-agents (agent-<id>.jsonl) :
                         SEULE source du temps des workers et de leur
                         chevauchement — le transcript parent n en a rien
    slot-check.json      slot attendu / pris, front ET backend
    slot-diff.full.patch le code produit, capture AVANT clean -fd
    slot-diff-back.*     idem pour le slot backend d audit
    trio/                le FEATURE_DIR capture
```

Pourquoi deux rapports. Le rejeu de l analyzer est gratuit et
encourage ; le verdict humain est obligatoire et vit dans
`report.md`. Un seul fichier pour les deux, et chaque rejeu
detruisait le verdict. Constate le 2026-09-08.

## result.<skill>.json — schema

Un fichier PAR skill, jamais `result.json` nu (les deux skills
d une meme session s ecraseraient). Schema EXACT, memes cles,
memes types pour les deux skills ; une valeur sans objet vaut
`0`, `false` ou `null`, jamais absente. Quatre sessions
libres ont produit quatre formes incompatibles, jusqu a la
casse des cles : le fichier existait pour comparer, il ne
comparait rien.

```json
{
  "schema": 1,
  "skill": "sk-prep",
  "session": "<AUDIT_SESSION>",
  "outcome": "completed",
  "stop": null,
  "featureDir": "specs/001-slug-<AUDIT_SESSION>",
  "engine": "none",
  "counters": {
    "userStories": 1, "tasks": 4, "tasksChecked": 0,
    "prodFilesNew": 1, "prodFilesModified": 1, "testFiles": 1,
    "answersSubstituted": 7, "answersGroundedFalse": 2,
    "agentSpawns": 0, "workflowCalls": 0, "slotsTaken": 0,
    "commits": 0, "merges": 0, "defectsObserved": 0
  },
  "artifacts": {
    "parallelYml": false, "designMd": false,
    "contracts": false, "researchMd": false
  }
}
```

- `outcome` : `completed` | `stopped`.
- `stop` : `null`, ou `{"section":"## Pre-requis","reason":"..."}`
  — la section du skill qui a prescrit l arret, citee.
- `engine` : `none` | `agent-single` | `workflow-loop` |
  `after-parallel`. Pour /sk-prep, toujours `none`.
- `featureDir` : relatif a la racine du repo, tel qu ecrit.

## Marques AUDIT_MARK — format

```
echo AUDIT_MARK <skill> <phase> <start|end>
```

`<skill>` = `sk-prep` | `sk-impl`, `<phase>` = `bootstrap` |
`cycles` | `closing`. UN echo par marque, UNE marque par
commande. Deux marques dans un meme appel : l analyzer n en
retenait qu une et la phase disparaissait du calcul. Une marque
emise deux fois : appariement ambigu. Le nom du skill dans la
marque permet d apparier les phases de deux skills enchaines
dans une meme session, ce que `bootstrap start` nu ne
permettait pas.

L ancien format `AUDIT_MARK <phase> <start|end>` reste lu, et
attribue au skill par la position du tour dans progress.jsonl.

`audit-runs/` est gitignore : les transcripts pesent lourd et
n ont rien a faire dans l historique.

`<AUDIT_RUNS>/history.jsonl` : une ligne par campagne, pour
comparer avant / apres un patch.

## Deux tours, jamais un seul

Une session d audit se lance en DEUX tours sur le meme
`--session-id` :

1. Le cadre (non-interactivite, tenue du journal, interdiction
   de modifier les skills). Doit repondre exactement `PRET`.
   Toute autre reponse = arret : le tour 2 partirait sans
   cadre et se bloquerait sur la premiere gate.
2. La slash-command SEULE et EN TETE du message.

Une slash-command precedee de texte n est pas interpretee
comme telle. C est la panne la plus couteuse du harnais : elle
ne leve aucune erreur, le modele traite la commande comme une
phrase.

## Separer la collecte de l analyse

`audit-run.mjs` capture, `audit-analyze.mjs` interprete. Un
run capture se reanalyse gratuitement et instantanement :
changer une question ne coute jamais une nouvelle campagne.

## Les deux hotes

`audit-run.mjs --host claude|cursor` (defaut `claude`). Seule
la COLLECTE change ; l analyse repart du meme
`transcript.jsonl` dans les deux cas.

| | `--host claude` | `--host cursor` |
|---|---|---|
| Binaire | `claude` | `cursor-agent` |
| Modele | celui du plan | `--model <slug>` **obligatoire** |
| Identifiant de session | impose (`--session-id`) | rendu par l evenement `init`, repris ensuite par `--resume` |
| `transcript.jsonl` | copie du JSONL de `~/.claude/projects/` | flux `stream-json` de stdout, recolle tour par tour |
| `agents/` | fichiers separes par sous-agent | **vide** : les sous-agents sont dans le meme flux |
| Plafond au temps | `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS` + `timeoutMs` | `timeoutMs` seul |

Consequence a ne pas taire dans un rapport : sous
`--host cursor`, `agents/` est vide, donc `overlapMs` et
`parallelismRatio` ne se calculent pas. Une campagne Cursor ne
peut PAS conclure sur le parallelisme reel des workers — elle
le declare non mesure, elle ne le declare pas absent.

Table complete des deux runtimes : `_shared/sk-host.md` §9.
Sous Windows, `--host cursor` se lance depuis PowerShell
(§6) : depuis Git Bash, les hooks de Cursor rejettent tous
les appels shell et la campagne rend des sessions vides.

## Boucle d amelioration

1. Le rapport propose des correctifs sur `/sk-prep` ou
   `/sk-impl`.
2. Applique-en **un seul**.
3. Rejoue le MEME corpus.
4. Compare via `history.jsonl`.

Un patch a la fois, sinon l effet n est pas attribuable. Et
jamais de modification du corpus entre deux comparaisons.
