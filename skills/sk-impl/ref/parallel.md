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
