# /sk-impl — parallel.yml (lu seulement si FEATURE_DIR/parallel.yml existe ET >= 2 US retenues)

## Selection (section 2)
Apres le parse : LIRE FEATURE_DIR/parallel.yml
(copie slot). Contrat : ~/.claude/skills/_shared/sk-parallel.md.
Absent = comportement sequentiel actuel, inchange.
Present : NE PAS DEVINER. parallel.yml est la seule
source. Si l utilisateur n a selectionne qu UNE US,
ignorer parallel.yml pour CE run (Agent unique).
Si `after` a deja toutes ses taches [X] : barriere
franchie. Ne pas la rejouer. Retenues = ids `parallel`
encore [ ]. Si >=2 et roots distincts : Workflow
after-parallel avec barrier: null, parallel =
restants, hashPrompt. Si ==1 : PAS de Workflow.
Agent unique sk-worker (CONTRACT_HASH gele a la main
dans le brief), puis parent Opus us-reviewer.md.
Si 0 : STOP, deja implemente.
Sinon si les US retenues couvrent `after` + toutes
les ids `parallel` : Workflow speckit-us-after-parallel.js,
pas speckit-us-loop.js. Meme racine :
jamais parallele (ne pas lister ces US dans
parallel — defaut de prep). Chaque item parallel
DOIT porter root: SLOT_CWD (front vs back). Sans
root : le .js refuse le fan-out (sequentiel).

## GO (section 3)
Si parallel.yml : after (barriere), ids parallel,
CONTRACT_PATH. Absent = ne pas inventer de
parallelisme.

## Spawn (section 4)
n>=2 ET enchaine maintenant :
SI parallel.yml present ET les US retenues
incluent after + toutes les ids parallel :
Workflow speckit-us-after-parallel.js
a la place de speckit-us-loop.js.
scriptPath ~/.claude/skills/_shared/speckit-us-after-parallel.js
(chemin absolu resolu),
args = { barrier: {id, prompt, reviewPrompt, fixPrompt, root: SLOT_CWD} ou null,
parallel: [{id, prompt, reviewPrompt, fixPrompt, root: SLOT_CWD}, ...],
hashPrompt: "sha256 du fichier CONTRACT_PATH, rends {sha256}",
expectedHash: <contenu de FEATURE_DIR/contract.sha256> si barrier null }.
Le script : barrier d abord (Sonnet -> Opus review
-> fix), PUIS Promise.all sur le groupe parallel.
Barriere en STOP, FAIL non resolu ou ESCALATE = ne pas lancer le Promise.all. ok agrege les workers parallel (un ko => ok false, siblings vont au bout).
Hash du contrat, une seule source de verite :
- barrier null (contrat ecrit et gele par la prep, cas courant) :
  CONTRACT_HASH = contract.sha256 dans tous les briefs, expectedHash
  dans args ; le moteur ne lance aucun agent de hash
  (`hashCheckedBy: "parent"`). Au retour du Workflow, TU recalcules
  `sha256sum` du contrat : different de contract.sha256 = STOP, pas
  de publication.
- barrier non null : le moteur lit le hash apres la barriere (le
  contrat que la barriere vient d ecrire), le fige, et le relit une
  fois apres tout le fan-out ; illisible ou different = STOP
  (ok=false). Le hash fige est rendu dans `frozenHash` : ecris-le
  dans contract.sha256.
Workers : interdiction d ecrire / reformater
le yaml contrat. Champ hors contrat = STOP.
Jamais parallele sur le meme worktree.

## Chaines (voies)

Un item `- [US1, US2]` de parallel.yml = une CHAINE : dans args.parallel,
`{ root: <slot de ce depot>, chain: [{id, prompt, reviewPrompt, fixPrompt}, ...] }`
dans l ordre de la chaine. Les voies tournent en parallele, les US d une voie
en sequence (meme slot). Une US ko arrete sa voie seulement ; ok=false au
global. Un item simple `- US3` reste `{id, prompt, ..., root}`.

## Vagues calculees (lanes.mjs)

  node "<SK_SHARED>/lanes.mjs" "<FEATURE_DIR>" [--union]
donne les vagues : les US d une vague tournent en parallele (un slot chacune),
la vague suivante part apres leur fusion. Dependance = fichier de prod commun,
fichier reutilise (`Code:`) ou montage annonce `(USn)` : l ordre de tasks.md
est garde. Mesure sur les 4 features du banc jeu : 7, 5, 5 et 6 vagues pour
7, 7, 7 et 8 US. `--union` ne compte pas les fichiers PARTAGE (4 vagues au
lieu de 6 en feature 4) mais leurs fusions demandent alors une passe de
resolution (union des deux cotes, ~1 min d agent) : le pilote git
`merge=union` a ete essaye et casse les objets `as const` (10 erreurs tsc).

## Voies dans un seul depot (banc jeu)

Deux voies du MEME depot tournent chacune dans son slot (worktree du pool,
trio copie), puis la voie secondaire est fusionnee dans la principale
(`git merge --no-ff`) et ses cases reportees par `tasks-merge.mjs`.
Condition : AUCUN fichier de prod commun entre les voies, fichiers PARTAGE et
point d entree (main.ts) compris : ce que signale le lint
`story-parallel-candidate`. Mesure : 2 fusions sans fichier commun propres ;
1 fusion avec main.ts + visualConfig.ts communs = 3 conflits et un agent de
resolution. Un fichier commun = meme voie, en sequence.
