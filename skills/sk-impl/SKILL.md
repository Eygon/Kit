---
name: sk-impl
description: Variante IMPLEMENTATION-SEULE spec-kit. Consomme un trio existant. 1 US = Agent Sonnet tdd-dev. N US = Workflow speckit-us-loop.js. Si FEATURE_DIR/parallel.yml existe, apres US1 les US annotees tournent en parallele (speckit-us-after-parallel.js). Pool wt-1..4. Use when the user invokes /sk-impl or wants to implement an already-prepared spec-kit feature.
argument-hint: "<feature: numero/nom, ou vide si .specify/feature.json pointe deja dessus>"
disable-model-invocation: true
allowed-tools: Agent Bash PowerShell Read Write Edit Glob Grep AskUserQuestion Skill ToolSearch EnterWorktree ExitWorktree Workflow ListAgents SendMessage mcp__azure
---

# Orchestrateur SPEC-KIT — IMPLEMENTATION SEULE (`/sk-impl`)

Cible : **$ARGUMENTS**

Declenchement workflow (turn-scoped). Workflow autorise
SYSTEMATIQUEMENT si n>=2 US enchainees (loop sequentiel,
ou speckit-us-after-parallel.js si parallel.yml) — cette
skill instruit l appel Workflow, ce qui vaut opt-in.
n==1 : PAS de Workflow.

## Mode audit (inerte hors audit)

Si AUDIT_MODE=1 (echo une fois). Absent = ignore.
1. Aucune AskUserQuestion. Lis AUDIT_INTENT_FILE.
   Consigne AUDIT_OUT_DIR/answers.jsonl
   {"question":"...","answer":"...","grounded":true|false}

2. Trio : la ou /sk-prep l a ecrit. Si specs/ du slot est
   une jonction vers le principal, le trio est deja visible
   ici et la copie est un no-op (« same file ») : ce n est
   PAS une erreur, ne la repare pas. .sk/repos.json se lit
   sur le PRINCIPAL (parent du git-common-dir), jamais sur le
   slot : un slot ne le voit pas, et « absent du slot » n est
   pas « absent ».
3. Marques : UN echo par marque, UNE marque par commande.
   Format exact :
     echo AUDIT_MARK sk-impl bootstrap start
   bootstrap = slot pool + trio. cycles = Sonnet(s) jusqu au
   dernier commit DONE. closing = gates + revue + verdict.
   `cycles start` s emet JUSTE AVANT le premier Agent/Workflow :
   emis apres, la decomposition du run est perdue. Six echos par run, ni plus
   ni moins : bootstrap s/e, cycles s/e, closing s/e.
   Un STOP avant cycles emet quand meme bootstrap end.
4. Ecris AUDIT_OUT_DIR/result.sk-impl.json avant la synthese,
   au schema EXACT de sk-audit.md §result. Jamais result.json
   nu (collision avec /sk-prep dans la meme session).
5. Pas d interaction differee. GO implicite. Pas de merge
   squash en audit (le runner compare le slot).
6. Slot IMPOSE = le cwd. Le runner l a deja prepare
   (wt-audit-N, branche sk-audit-<AUDIT_SESSION>, base =
   HEAD du principal). Verifie une fois :
     git branch --show-current  ->  sk-audit-<AUDIT_SESSION>
   Autre chose -> STOP « slot d audit absent ». Puis SAUTE
   0bis en entier : aucun slot FRONT wt-1..4, aucun checkout -B
   du slot front, aucune branche sk-impl-* front, aucune ligne
   STATUS_FILE front, aucun EnterWorktree.
   Slot BACKEND en audit : IMPOSE lui aussi. Si une US retenue
   porte des chemins backend, le slot est AUDIT_BACK_SLOT
   (prepare par le runner dans <POOL_BASE>/<BACK_SLUG>/
   wt-audit-N, branche sk-audit-<AUDIT_SESSION>, base =
   AUDIT_BACK_BASE = origin/<defaut> du backend). Verifie :
     git -C $env:AUDIT_BACK_SLOT branch --show-current
       -> sk-audit-<AUDIT_SESSION>
   Puis SAUTE la resolution du slot backend de la section
   Cross-repo (aucun wt-1..4 backend, aucun checkout -B,
   aucune ligne STATUS_FILE backend). AUDIT_BACK_SLOT absent
   alors qu une US backend est retenue -> STOP « slot backend
   d audit absent » : ne prends JAMAIS un slot du pool de
   travail backend en audit : il resterait pris sans
   liberation ni capture.
   Ne rebranche JAMAIS le slot front, quoi que plan.md dise
   de la base d implementation : le runner mesure le diff
   contre la base qu il a posee, un rebranchement rend la
   mesure vide.
Section Triage d un plan.md ancien : IGNORER.

## Ce que cette commande fait

Complement de /sk-prep. Ne produit PAS le trio.
1. Isolation pool wt-1..4. Jamais le working tree principal.
2. TDD dans le Sonnet (Bash) : par tache, un RED prouve
   avant la prod puis un GREEN, grain au choix du worker.
   Zero Haiku.
3. Revue : le reviewer (toi si n==1, un Opus dans le
   Workflow sinon) rend PASS, FIXED (il a corrige lui-meme
   ce qui etait plus court a faire qu a expliquer), FAIL
   (une passe de fix Sonnet, puis review2) ou ESCALATE
   (arbitrage humain, pas de fix).
   n>=2 enchainees : Workflow speckit-us-loop.js, sequentiel.
   Si parallel.yml (copie slot) et US retenues =
   after + ids parallel : speckit-us-after-parallel.js
   a la place (barriere puis Promise.all). Absent =
   sequentiel inchange. Une seule US selectionnee :
   ignorer parallel.yml (Agent unique).

## Pre-requis

spec.md + plan.md + tasks.md DOIVENT exister sur le
repo PRINCIPAL dans FEATURE_DIR (disque, specs/ gitignore
est normal). Un manque -> STOP, lance /sk-prep.
git add -f specs INTERDIT.

design.md (optionnel) : s il existe dans FEATURE_DIR,
DESIGN_PATH = <slot>\specs\<NNN>-<nom>\design.md apres
copie. C est un contrat visuel au pixel produit par
/sk-prep §0 : il se transmet TEL QUEL au Sonnet et au
reviewer. Si plan.md cite design.md mais que le fichier
manque -> STOP, relance /sk-prep (ne pas implementer un
ecran sans son contrat).

recon.md (optionnel, recommande) : inventaire de
l existant ecrit par /sk-prep (composants partages,
helpers, pieges, recettes de test). S il existe dans
FEATURE_DIR, RECON_PATH = <slot>\specs\<NNN>-<nom>\recon.md
apres copie, transmis au worker ET au reviewer. Il est
VIVANT : apres chaque US, tu y ajoutes les `facts` rendus
par le worker (section 4bis). Absent : cree-le vide avec
les 5 titres (section 4bis) au premier DONE, ne le
laisse pas manquer deux fois.

parallel.yml (optionnel) : s il existe dans
FEATURE_DIR, c est l annotation de parallelisme
ecrite par /sk-prep (contrat
~/.claude/skills/_shared/sk-parallel.md).
Copie slot avec le trio. Absent = sequentiel.
Impl ne l invente pas et ne le mute pas.

## Superviseur (optionnel, detecte a chaque question)

Contrat : ~/.claude/skills/_shared/sk-supervisor.md.
Detection (bash) :

```bash
sup="${SK_SUPERVISOR_DIR:-}"  # _shared/sk-config.md §SUPERVISOR_DIR
[ -n "$sup" ] || case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) sup=/c/tmp/mon-developpeur ;; *) sup="$HOME/.cache/mon-developpeur" ;; esac
hb=$(jq -r .heartbeatAt "$sup/supervisor.json" 2>/dev/null)
now=$(date -u +%s)
hbEpoch=$(date -u -d "$hb" +%s 2>/dev/null)
echo "age_minutes=$(( (now - hbEpoch) / 60 ))"
```

Comparaison OBLIGATOIREMENT via date -u (jamais date seul) : heartbeatAt est
UTC (suffixe Z), une lecture en heure locale decale de plusieurs heures et
fait conclure a tort qu un superviseur vivant est mort.

A CHAQUE AskUserQuestion (avant 0 aussi) :
heartbeat < 30 min (comparaison UTC, contrat §Detection), et ListAgents montre ce nom, et
SK_NO_SUPERVISOR n est pas a 1 -> SUPERVISOR = ce nom
pour cette question ; sinon AskUserQuestion local. Repli
automatique en local si aucun [SK-ANSWER] sous 5 min via
Bash({run_in_background: true}) (contrat paragraphe
Timeout et repli).
Avec SUPERVISOR : CHAQUE AskUserQuestion de cette
skill (feature, slot, GO, backend, verdict) devient un
SendMessage [SK-QUESTION] (type et options du contrat,
memes libelles, meme ordre, contexte = ce que l ecran
aurait montre), puis FIN DE TOUR sur une ligne :
« En attente de <SUPERVISOR> — ou reponds ici. »
La reponse [SK-ANSWER] arrive en nouveau tour et
s applique comme un choix humain ; une reponse tapee
dans ce terminal prime. [SK-ANSWER] escalade -> reposer
la question en AskUserQuestion. Jamais de defaut sans
reponse. Apres le GO : [SK-START]. Derniere action de
la skill, quelle que soit l issue : [SK-DONE].
AUDIT_MODE : ne detecte pas de superviseur.

## 0. FEATURE_DIR

Lis .specify/feature.json (ou setup-tasks.ps1 -Json).
Croise $ARGUMENTS (numero/nom). Plusieurs candidats ->
AskUserQuestion, ne devine pas. FEATURE_SLUG = kebab
du dossier. Branche : sk-impl-<FEATURE_SLUG>.

## 0bis. Slot du POOL (wt-1..4)

AUDIT_MODE=1 : section ENTIERE sautee, le slot est le cwd
(Mode audit, point 6). Un slot wt-1..4 pris en audit est un
defaut, pas une reprise.

Isolation : le principal n est JAMAIS le lieu d ecriture.
REPO_SLUG = basename du PARENT de
git rev-parse --path-format=absolute --git-common-dir
(jamais --show-toplevel depuis un worktree : ca donne wt-1).
POOL_BASE : voir ~/.claude/skills/_shared/sk-config.md
(SK_POOL_ROOT si defini, sinon C:\tmp\sk-pool sous Windows,
$HOME/.cache/sk-pool sinon).
POOL_ROOT = <POOL_BASE>\<REPO_SLUG>
STATUS_FILE = POOL_ROOT\status.md (informatif, pas un lock).
Pool absent -> /sk-pool-init (bootstrap x4, une fois).
Collision REPO_SLUG (pool d un autre depot) -> STOP.
Ce 0bis = pool FRONT seulement. Un backend lie
a son propre pool (voir Cross-repo) : jamais un
slot front pour le Sonnet back.

Resolution du slot : UNE commande, jamais a la main
(contrat ~/.claude/skills/_shared/sk-pool.md ; git fait
foi, STATUS_FILE ne porte que agent/session/terminal).
  SKP = pwsh -File ~/.claude/skills/_shared/sk-pool.ps1
1. Reprise :
   SKP -Action find -Repo <principal> -Feature <NNN ou slug>
   exit 0 `REPRISE <slot> | branche <b> | verdict <v>` :
   c est le slot. La branche peut etre sk-impl-<slug> OU
   feature/<NNN>-* (publication interrompue) : meme
   feature, on reprend. Verdict SALE / BRANCHE-DIFFERENTE :
   le dire au GO, ne rien reset.
   exit 3 (plusieurs) : AskUserQuestion, ne pas deviner.
2. exit 2 (aucun) : en-tete de plan.md `Slot : wt-N` (le slot que
   l humain a nomme a /sk-prep) : propose-le en premier, ne le
   redemande pas. Sinon SKP -Action free -Repo <principal>
   `LIBRE <slot>` : le prendre. `LIBRE-SALE` :
   AskUserQuestion avant. exit 2 : les 4 occupes ->
   AskUserQuestion (attendre / liberer un slot marque
   A-LIBERER par `-Action status` via `release` / abandon).
   Jamais voler un slot dont git est sur une autre branche.
3. Prise, reprise comprise (la commande detecte la
   branche et ne touche a rien : `REPRISE`) :
   SKP -Action claim -Slot <slot> -Branch sk-impl-<FEATURE_SLUG>
       -Note "<US retenues>"
   Neuf : checkout -B sur origin/<defaut> (ou -Base),
   reset --hard, clean -fd (jamais -x), ligne STATUS_FILE
   complete (session = FLEETVIEW_SESSION_ID ou transcript
   courant, terminal = FLEETVIEW_TERMINAL_ID).
   exit 3 `REFUS` : relire, decider avec l humain ;
   -Force seulement apres son accord.
   Reprise sur une branche feature/<NNN>-* : passer
   -Branch <cette branche> telle quelle (pas de checkout).
Heartbeat, apres chaque US (DONE ou WIP) et a chaque
ExitWorktree keep :
   SKP -Action touch -Slot <slot> -Note "<US livrees / en cours>"
Ne jamais supprimer un slot du pool.

Trio gitignore -> slot :
New-Item -ItemType Directory -Force <slot>\specs
Slot NEUF :
  Copy-Item -Recurse -Force <principal>\specs\<NNN>-<nom> <slot>\specs\
REPRISE : ne JAMAIS ecraser tasks.md / recon.md / STATE.md
du slot (ils portent les [X] et les faits du run
precedent ; les ecraser = repartir de zero). Copier
seulement l absent :
  robocopy <principal>\specs\<NNN>-<nom> <slot>\specs\<NNN>-<nom> /E /XC /XN /XO /NJH /NJS /NFL /NDL
  (exit < 8 = ok).
Verifier le trio DANS le slot. Absent -> STOP.

EnterWorktree { path: "<slot>" }.
AUDIT_MODE : saute EnterWorktree, chemins absolus.
Jonction node_modules seulement si manquante
(New-Item -ItemType Junction).
Sanity : node node_modules/vitest/vitest.mjs list --filesOnly
STOP seulement si 0 fichier. Interdit list --json= repo-wide.
Puis CHAUFFE le cache Vite du slot, AVANT le premier
spawn, une fois par run :
  node node_modules/vitest/vitest.mjs run --coverage=false <un fichier de test existant de la feature, sinon le plus petit de src/__tests__>
Resultat ignore (une baseline rouge n est pas un STOP
ici) : le cache chaud rend 1-2 min a chaque worker. En Cross-repo, meme
chose cote backend avec un `dotnet build` du projet de
tests (le verrou DLL se paye ici plutot que dans le
worker).
Chemins desormais absolus, cote slot.

## 1. Parse tasks.md du SLOT

Groupes = User Stories qui ont encore des taches [ ].
Toutes [X] -> STOP, deja implemente (reprise terminee).

## 2. Quelles US pour CE run

Si plusieurs restent : le choix part dans la question du GO
(§3), pas dans une question a part.
Defaut : l utilisateur en a cite une, ou TOUTES les
restantes s il a dit enchaine.
n = nombre d US selectionnees pour ce run.
US sequentielles sur la MEME racine git : jamais
en parallele (git add -A collision).

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
Agent unique tdd-dev (CONTRACT_HASH gele a la main
dans le brief), puis parent Opus us-reviewer.md.
Si 0 : STOP, deja implemente.
Sinon si les US retenues couvrent `after` + toutes
les ids `parallel` : Workflow speckit-us-after-parallel.js,
pas speckit-us-loop.js. Meme racine :
jamais parallele (ne pas lister ces US dans
parallel — defaut de prep). Chaque item parallel
DOIT porter root: SLOT_CWD (front vs back). Sans
root : le .js refuse le fan-out (sequentiel).

## 3. GO humain AVANT tout Agent/Workflow

UN SEUL AskUserQuestion (jusqu a 4 questions dans le meme appel) :
US retenues si plusieurs restent (defaut pre-rempli §2), slot back
si cross-repo et a trancher, puis Lancer / Ajuster / Abandonner
avec slot, branche, US retenues, n, fichiers vises. Ne repose pas
une question deja tranchee (slot nomme a /sk-prep, US citees).
Avant la question, le linter sur le trio du slot, familles
qui cassent un run seulement :
  node "<SK_SHARED>/audit-lint.mjs" "<slot>/specs/<NNN>-<nom>" --ref HEAD --only mount,wire,story,recon,design-token,design-lib,design-class,design-section,task-without,task-needs,test-without
Bash, chemins resolus en barres obliques et entre guillemets :
`~` ne s etend pas depuis PowerShell, un antislash nu disparait
dans Bash.
`--ref HEAD` depuis le slot, pas origin/<defaut> : les
fichiers des US deja livrees n existent que sur la branche du
slot, et c est elle que le worker aura sous les yeux.
Cite dans la question chaque finding qui porte sur une US
RETENUE (montage absent ou confie a une US qui ne le fait
pas, branchement sans cible, US trop grosse ou qui mele
API et UI, chemin de recon.md absent du slot, token ou prop
de lib inexistant). Ce sont des defauts de prep : « Ajuster » =
les corriger dans tasks.md / design.md avant le spawn. Un
Lancer malgre eux est un choix de l humain, pas un defaut.
Si US backend : slot BACK (wt-N de
BACK_POOL_ROOT) et s il est reprise ou neuf.
Si parallel.yml : after (barriere), ids parallel,
CONTRACT_PATH. Absent = ne pas inventer de
parallelisme.
Tant que ce n est pas approuve, n ecris rien.
Lancer approuve + SUPERVISOR : envoie [SK-START]
(projet, feature, slot, slotBack, branche, ta session
ListAgents, principal) avant tout Agent/Workflow.
AUDIT_MODE : GO implicite depuis l intent.

## 4. Spawn

Lis ~/.claude/skills/_shared/us-sonnet.md.
Remplis SLOT_CWD, US_ID, FACTS, TASK_LIST (Files/Test/Command),
ACCEPTANCE, PROD_PATHS, TEST_FILES, STANDARDS_PATHS, RECON_PATH
(ou "aucun"), DESIGN_PATH (ou "aucun"), LECTURE, SK_SHARED.
- ACCEPTANCE et TASK_LIST : recopies par brief-fill.mjs (ci-dessous)
  depuis spec.md et tasks.md. Une US sans scenario est un defaut de
  prep : dis-le au GO. Le reviewer juge sur ces scenarios (check 6).

Le but du brief : que le worker ecrive sa premiere ligne sans
recon. Tout ce que tu sais et qu il chercherait sinon y entre,
avec sa source ; rien que tu n aies verifie pour CETTE US.
- TEST_FILES : UN fichier par tache de prod, pris dans la
  colonne Test de tasks.md. Tache sans Test : derive le miroir
  src/__tests__/<chemin>/<composant>.test.tsx et signale le
  defaut de prep.
- PROD_PATHS : tout fichier que l US doit toucher, y compris la
  cible de chaque `Monté dans: <fichier>` SANS `(US<n>)` (le
  montage se fait dans cette US ; une cible `(US<n>)` appartient
  a US<n>) et, cote front, TOUS les fichiers de la ligne LOCALES
  de recon.md (etablis-la par un ls du dossier i18n si elle
  manque, et ajoute-la), le test de parite etant une gate de fin
  d US.
- LECTURE : les fichiers que tu as lus pour etablir les FACTS et
  que le worker va lire ou modifier, `chemin:lignes`, un par
  ligne (« aucune » sinon) : il les ouvre en un seul tour.
- FACTS : un constat par ligne AVEC SA SOURCE (fichier + branche,
  ou table + colonne + ce que la requete a rendu ; regles dans
  us-sonnet.md §Faits etablis). Une action serveur (mutation,
  export) porte toujours l endpoint du contrat (methode + chemin
  + ligne du yaml) et la fonction du service front (chemin:ligne,
  ou « a creer dans <chemin> sur le modele de <chemin:ligne> ») :
  deux grep chez toi, une chasse de plusieurs minutes chez lui.
  Une phrase de plan.md vraie pour une autre US n est pas un fait
  ici. Une interdiction (« aucune entite a creer ») derive d un
  fait : sans source citable, ne la pose pas, sinon le worker est
  coince entre une affirmation fausse et un interdit.
- SK_SHARED : <SK_HOME>/skills/_shared, chemin absolu resolu en
  barres obliques. Worker, fix et reviewer y lancent
  mount-check.mjs, le seul juge du montage (un grep du nom prend
  un `import type` ou un homonyme pour un montage).
- DESIGN_PATH n est JAMAIS design.md complet : c est l extrait
  design-<US_ID>.md que tu ecris dans FEATURE_DIR du slot avant
  le spawn, 3-5 Ko :
    1. les sections #C<n> des taches de l US, texte integral,
       en-tetes compris ;
    2. la table des tokens (design.md §3) entiere ;
    3. les arbitrages lib<->design (design.md §5) entiers.
  Decoupe par titres (grep -nE "^#{2,4} C<n>\b|^## " puis
  sed -n) — pas de reformulation, pas de resume : un mot change
  est une valeur perdue au pixel. Le reviewer recoit le MEME
  extrait. Une US avec au moins une tache `Design:
  design.md#C<n>` a un DESIGN_PATH obligatoire, la liste de ses
  ancres jointe, et le brief exige le champ `designConformance`
  de la sortie structuree (une entree par ancre, cf.
  us-sonnet.md).
- CONTRACT_PATH + CONTRACT_HASH si parallel.yml (ou 2 repos) :
  chemin du yaml, hash si gele.
Les trois briefs (worker us-sonnet.md, review us-reviewer.md, fix
us-fix.md) se remplissent par l outil, jamais a la main : ton
jugement va dans un JSON par US, la recopie au script.
  FEATURE_DIR/briefs/<US_ID>.json = { featureDir, slot, us, skShared,
    prod, tests, standards, lecture, facts, designPath?, anchors?,
    contractPath?, contractHash?, workerNotes?, reviewNotes? }
  node "<SK_SHARED>/brief-fill.mjs" <ce json> --out FEATURE_DIR/briefs
Il recopie les taches et les scenarios d acceptation de l US, met
les memes chemins dans les trois briefs et sort en exit 1 sur un
brief incomplet (Test: ou cible `Monté dans:` de l US absents des
listes, placeholder vide, US sans tache ni scenario) : corrige le
JSON, jamais le brief. workerNotes / reviewNotes : ce qui est propre
au depot ou a la stack (baseline connue, variante .NET).
Le prompt de chaque agent tient en trois lignes : « Ton brief est
dans <FEATURE_DIR/briefs/US_ID-worker.md> (resp. -review, -fix) ;
lis-le en entier en premier ; cwd du slot <SLOT_CWD> ».

n==1 : Agent({ subagent_type: tdd-dev, model: sonnet,
  prompt: brief }). PAS de Workflow. Pas d effort : ce champ n existe pas sur le tool Agent, seulement dans agent() d un Workflow.
Apres mort du Sonnet : TOI (Opus parent) appliques
us-reviewer.md, section « Qui corrige » comprise : ce qui est
plus court a faire qu a expliquer, tu le corriges toi-meme,
preuve a l appui (commit `sk-impl REVIEW(<US_ID>)`). Pas de
spawn reviewer.
Il reste des ecarts pour un fix (FAIL) : re-Agent Sonnet, 1
passe, avec us-fix.md rempli, la passation du worker (commit,
filesTouched, summary), ce que tu as deja corrige et les issues
restantes ; puis tu rejoues us-reviewer.md.
ESCALATE : PAS de passe de fix, tu remontes a l humain
(AskUserQuestion : corriger la prep / elargir le perimetre /
accepter l ecart). Un fix ne peut pas toucher un fichier hors
perimetre ni reecrire tasks.md.
Apres l arbitrage (n==1 comme n>=2) : la decision va dans le
fichier qui fait foi (design.md §5, tasks.md, PROD_PATHS elargi),
puis UN fix : Agent tdd-dev avec us-fix.md rempli + la decision +
les issues de la revue (elles listent aussi les ecarts de code
restants) ; puis TOI, comme en n==1, tu appliques us-reviewer.md en
partant de ces issues ; puis la chaine repart sur les US restantes.
Pas de brief worker manuscrit, pas de revue complete de plus.
Fix en STOP : pas de nouvelle revue, tu remontes.

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
SINON : Workflow
scriptPath ~/.claude/skills/_shared/speckit-us-loop.js
(chemin absolu resolu),
args.groups[] = [{id, prompt, reviewPrompt, fixPrompt}]
dans l ordre tasks.md. fixPrompt dans CHAQUE groupe, parallel
compris : sans lui, le moteur donne au fix le brief worker
complet (recon entiere) et le journalise.
Boucle : Sonnet US -> reviewer Opus. PASS ou FIXED : US
suivante. FAIL : Sonnet fix (1 passe, passation du worker et
corrections du reviewer jointes) puis review2 ; review2 FAIL ou
ESCALATE = STOP la chaine. ESCALATE = `escalated`, pas de fix,
STOP la chaine : c est a toi puis a l humain d arbitrer. Sonnet
STOP budget/WIP (il reste des [ ]) = STOP la chaine, pas de
revue. Fix en STOP = `fixStopped`, pas de review2, STOP la
chaine. Revue sans verdict lisible (agent() null, verdict hors
enum, FAIL ou ESCALATE sans issue) : relancee UNE fois, puis
`error: "review"` et STOP la chaine ; jamais lue comme un FAIL.
Lis chaque ligne de resultat (results[] du loop ; barrier et
parallel[] d after-parallel) : error, escalated, fixStopped,
review2Fail, halt, issues (ce que tu remontes sur un
ESCALATE), notes, fixedByReview, reviewFixes, reviewCommits.
agent() sans schema = string, d ou le schema obligatoire.
Commit DONE en fin d US quand tout [X] ; WIP au plafond dur
~40 min (us-sonnet.md §Budget).

Le Sonnet fait TOUT RED/GREEN de l US.
Coche [X] apres CHAQUE tache livree
(gate verte ET fichiers existants,
ligne chirurgicale dans tasks.md du slot).
Puis meurt.

Git et vitest DANS le Sonnet (Bash). Zero Haiku.
Gate fichier :
node node_modules/vitest/vitest.mjs run --coverage=false <fichier>
Jamais suite complete pendant les cycles.

## 4bis. Apres chaque US : recon.md s enrichit

Le worker rend `facts: [{fact, source}]` (0-5), le fix aussi. En
Workflow, ils sont dans results[].facts ; en n==1, dans la sortie
structuree de chaque Agent. C est la seule boucle qui fait
decroitre la recon des workers au fil des US. Pour CHAQUE fact :
0. Il commence par `Corrige recon.md :` : REMPLACE la ligne
   que cite sa source par le fait juste, n en ajoute pas une.
   Un faux fait laisse en place fait abandonner l US suivante
   sur la meme voie.
1. Deja dans recon.md (meme chemin ou meme regle) :
   ignore.
2. Sinon, ajoute UNE ligne sous le bon titre de
   recon.md, format `- <fact> — source: <source> (US<n>)`.
   Les titres, dans cet ordre, sans autre :
     ## Composants partages reutilisables
     ## Helpers et hooks de la feature
     ## Pieges verifies
     ## Recettes de test
     ## Interdits grep-ables
   Sous ce dernier, UNE regex par ligne seulement : le
   worker la passe sur son diff avant DONE, le reviewer
   sur le commit. Un fact du type « X est interdit /
   n existe pas » se traduit en regex ici, pas en prose.
   Plafond : une ligne = un fait, 200 caracteres au plus ;
   recon.md reste sous ~10 Ko, car chaque worker et chaque
   reviewer le relit en entier. Au-dela, n ajoute un fact
   qu en retirant (ou fusionnant) une ligne qui ne sert plus
   aux US restantes ; la prose et l historique vont dans
   STATE.md.
3. Copie recon.md du slot vers FEATURE_DIR du PRINCIPAL
   (specs/ est gitignore : sans cette copie le fichier
   meurt avec le slot). Pas de git add -f.
Puis relis recon.md avant d ecrire le brief suivant :
les FACTS de l US n+1 citent recon.md au lieu de
recopier. Un fact sans source ne rentre pas (regle 1
de us-sonnet.md §Faits etablis).

## Cross-repo

Si parallel.yml est present : le suivre
(barriere `after`, puis `parallel` sur roots
distincts). Ne pas deviner.
Absent : d abord un contrat machine-readable
(fichier), PUIS un second Sonnet sur cette
racine (sequentiel, comme aujourd hui).
Meme racine / meme worktree : jamais parallele
(git add -A collision).

La racine backend ne se devine pas : BACK_ROOT =
.sk/repos.json du repo principal, cle backend
(contrat : ~/.claude/skills/_shared/sk-repos.md).
Absente ou a null alors qu une US porte des chemins
backend -> STOP, /sk-init la renseigne.

Si une US retenue porte des chemins backend et
BACK_ROOT est pose :
- BACK_SLUG = basename du PARENT de
  git -C BACK_ROOT rev-parse --path-format=absolute
  --git-common-dir (meme regle que REPO_SLUG).
- BACK_POOL_ROOT = <POOL_BASE>/<BACK_SLUG>
  (ses PROPRES 4 slots, jamais le pool front).
- Pool absent -> meme bootstrap que /sk-pool-init
  mais contre BACK_ROOT (ou dire a l humain de
  lancer /sk-pool-init depuis ce repo). Ne jamais
  ecrire dans le pool front.
- Resolution du slot BACKEND : meme script que le
  front, contre BACK_ROOT (sk-pool.md) :
  1. SKP -Action find -Repo <BACK_ROOT> -Feature <NNN ou slug>
     `REPRISE <slot>` : TOUJOURS AskUserQuestion :
     "Reprendre <slot> existant (rien de
     destructif) / Prendre un slot idle neuf /
     Abandonner". Ne PAS auto-reutiliser. Idle
     neuf : ne pas voler/reset le vieux slot de
     cette feature.
  2. Sinon SKP -Action free -Repo <BACK_ROOT>.
     LIBRE-SALE : AskUserQuestion avant. exit 2 :
     AskUserQuestion attendre / liberer / abandon.
     Ne jamais voler le slot d une autre feature.
  3. SKP -Action claim -Slot <slot back>
       -Branch sk-impl-<FEATURE_SLUG>
       -Base origin/<defaut du backend>
     -Base est OBLIGATOIRE ici : la base est la
     branche d integration du backend, PAS le HEAD
     du working tree principal, presque toujours
     sur une feature d un autre chantier. plan.md
     la nomme (cf. sk-prep, recon second depot).
     Absente du plan : git symbolic-ref
     refs/remotes/origin/HEAD, mesurer l ecart avec
     le working tree (rev-list --left-right --count)
     et le dire a l humain avant de continuer.
  4. La ligne STATUS_FILE back est ecrite par claim,
     au meme format que le front. Heartbeat touch
     apres chaque US back.
- Le cwd du Sonnet backend est CE slot backend,
  PAS la branche courante de BACK_ROOT, PAS un
  wt-N front.
Le pool front se selectionne comme aujourd hui
(auto-reuse matching FEATURE_SLUG).

## Revue

Checklist : ~/.claude/skills/_shared/us-reviewer.md. Le
reviewer recoit RECON_PATH, TEST_FILES et le MEME extrait
design-<US_ID>.md que le worker, jamais design.md complet.
n==1 : le parent Opus l applique. Pas de spawn reviewer.
n>=2 : reviewer Opus medium DANS le Workflow.
Il corrige lui-meme ce qui est plus court a faire qu a
expliquer, dans les chemins de l US, preuve a l appui
(us-reviewer.md §Qui corrige) : il a le contexte, un agent
neuf le reconstruirait puis une review2 relirait son travail.
Le subagent tdd-reviewer doit pouvoir editer, committer et
rendre le schema : ne pas restreindre ses tools (sinon
agent()=null, revue sans verdict).
Le reviewer ne lance ni `yarn typecheck` ni la suite
complete : la gate ciblee de l US lui suffit, le typecheck
se fait une fois a la cloture.
FAIL -> Sonnet de correction, 1 passe, puis review2.
ESCALATE -> arbitrage humain, pas de fix (section 4).

## Cloture du run (apres toutes les US retenues)

Une seule fois : `yarn typecheck` + eslint sur les fichiers
modifies par le run (`git diff --name-only <base>..HEAD`, .ts et
.tsx), jamais `yarn lint` dans un slot. Typecheck en commande
complete, pas l incrementale des workers : c est la
cloture qui fait foi, un typecheck annonce vert par un worker
peut etre rouge.
Jamais la suite complete. Rouge -> corrige.
Rejoue ensemble les tests cibles des US de ce run.
Puis ce que les reviewers ont commite eux-memes, qu aucun autre
agent n a relu : pour chaque commit `sk-impl REVIEW(` du run
(`git log --format=%h --grep="^sk-impl REVIEW(" <base>..HEAD`),
  git show <sha> --unified=0 -- "*.test.*" "*.spec.*" "*Test.cs" "*Tests.cs" | grep -nE '^-[^-]|^\+.*(\.(skip|only|todo)\(|\bxit\(|Skip *=)'
Une ligne de test retiree, ou un skip / only / todo ajoute : tu
la lis et tu la cites dans la question de verdict. Une
assertion qui passe a la valeur du design est legitime ; une
assertion supprimee ne l est pas.
Diff slot : git -C <slot> diff et log --oneline -n 20.
Mesure du run (Workflow seulement) : UNE commande sur le dossier
de transcripts du workflow que la notification a rendu,
  node "<SK_SHARED>/run-metrics.mjs" "<dossier du workflow>"
puis une ligne par agent dans STATE.md (minutes, tours, appels,
1re ecriture).

## Publication (branche + PR draft, plus de merge local)

Contrat : ~/.claude/skills/_shared/sk-publish.md.
AskUserQuestion Publier / Corriger / Abandonner
(type=verdict via SUPERVISOR : contexte = gates,
revue, diff --stat, log -n 20). Le depot principal
ne recoit plus aucun merge : la feature part sur
origin en `feature/<NNN>-<slug>` avec une PR draft
vers la branche par defaut, revue par l humain sur
Azure DevOps.
Corriger AVEC `findings=<chemin>` dans la reponse
(superviseur) : ne sors pas du slot. Copie findings.md
dans <slot>\specs\<NNN>-<nom>\. Chaque ligne `- [ ]` des
sections Gates / Standards / Visuel est a traiter (RED si
testable, GREEN, gate cible), section Mineurs ignoree.
Ce qui est plus court a faire qu a expliquer, fais-le
toi-meme ; le reste part a UN Agent Sonnet tdd-dev sur ce
fichier, avec ce que tu as deja fait.
Rejoue typecheck + lint + tests cibles, commit
`fix(<slug>): address supervisor findings`, puis repose
la question de verdict une seconde fois (contexte =
findings traites). Deux fois maximum : un second
Corriger avec findings = Abandonner.
Abandonner ou Corriger sans findings : ExitWorktree keep.
Slot RESTE busy, avec un heartbeat qui dit ou on en est :
  SKP -Action touch -Slot <slot> -Note "<US livrees> ; <raison de l arret>"
Aucun merge.
Puis ECRIRE FEATURE_DIR/STATE.md dans le depot
PRINCIPAL (specs/ est gitignore, pas de git add) :
US livrees et US restantes, slot et branche de
chacune, SHA des commits, taches [X]/[ ], et la
raison de l arret. Sans ca l avancement n existe
que dans les tasks.md des slots : /sk-impl les
retrouve par le nom de branche, mais l humain qui
ouvre specs/<NNN>/tasks.md depuis le principal voit
un run jamais commence. Ne PAS recopier les tasks.md
des slots a cette etape (risque d ecraser une edition
faite entre-temps) : la recopie du trio reste
reservee a la publication.

Publier : suis sk-publish.md a la lettre, dans le
slot (ExitWorktree keep d abord si tu y es entre).
Ordre : slot propre, fetch, checkout -B
feature/<NNN>-<slug> origin/<defaut>, merge --squash
sk-impl-<FEATURE_SLUG>, commit unique, typecheck +
lint, push -u, PR DRAFT par GUID (jamais le nom),
verification que la PR existe, lien work item si
resolu, trio -> principal (Copy-Item, jamais
git add -f specs), STATE.md avec `PR: <url>`,
liberation du slot par
  SKP -Action release -Slot <slot>
(detache, branches supprimees si sur origin,
STATUS_FILE idle nue ; jamais ces gestes a la
main ; idem slot backend, PR back d abord si US
back).
`pr=<chemin>` dans la reponse du superviseur =
PR_BODY. Conflit de squash, gate rouge sur la
branche squashee, push refuse, PR introuvable apres
creation : STOP, aucun --force, aucune seconde
creation au-dela d une ; le slot reste busy sur
sk-impl-<FEATURE_SLUG>, issue=stopped.
Presente la diff --stat et le titre avant le push.

Avec SUPERVISOR, derniere action quelle que soit la
sortie (publie, keep, abandon, STOP garde-fou) :
[SK-DONE] issue=published|kept|abandoned|stopped,
pr=<url ou aucun>, state=<chemin STATE.md>, motif en
une phrase.

## Garde-fous

- clean -fd SANS -x. Ne jamais supprimer un slot.
- STATUS_FILE : jamais ecrit a la main. find / free /
  claim / touch / release de sk-pool.ps1, et rien
  d autre. Reprise = find d abord, toujours.
- Reprise : tasks.md / recon.md / STATE.md du slot ne
  s ecrasent jamais (robocopy /XC /XN /XO).
- Backend = son propre pool
  (<POOL_BASE>/<BACK_SLUG>/wt-1..4). Reprise
  backend = AskUserQuestion (reuse vs neuf).
  Jamais melanger slots front et back.
- Pas de Haiku : Sonnet pour le code, Opus pour la revue.
- [X] seulement si gate verte ET fichiers existants.
- FACTS : un fait transmis au worker porte sa source
  (fichier + branche, ou table + colonne + resultat).
  Jamais recopier un constat d une autre US sans le
  requalifier. Une interdiction sans fait source ne se
  pose pas. Un worker qui contredit un fait avec preuve
  a raison par defaut : verifier avant de le corriger.
- Chaque tache : un RED prouve avant la prod, test inchange
  ensuite (empreinte cmp), puis GREEN.
- Verdict de revue = us-reviewer.md seulement. Le reviewer
  corrige lui-meme dans les chemins de l US, jamais hors d eux.
- Commit DONE en fin d US quand tout [X]. WIP au plafond dur
  ~40 min. Pas de commit par cycle RED/GREEN.
- FAIL : 1 fix puis review2. ESCALATE : arbitrage, sans fix. Revue sans verdict = 1 relance puis erreur, jamais un FAIL. review2 FAIL, fix STOP, STOP budget ou ESCALATE = ne pas enchainer l US suivante.
- Verrou DLL / crash Vitest : 3 retries worker, pas un FAIL revue.
- US meme racine : sequentiel. Jamais parallele
  sur le meme worktree.
- parallel.yml = seule source de parallelisme.
  Absent = sequentiel. Ne pas inferer. Ne pas
  muter le yaml.
- Hash freeze du contrat (contract.sha256) :
  relu une fois apres tout le fan-out,
  diff ou illisible = STOP, pas de merge.
- Relais depuis /sk-prep = /sk-impl, et lui seul.
- Publication : jamais de merge dans le depot
  principal, jamais de push sur la branche par
  defaut, jamais --force, PR toujours draft et par
  GUID. Contrat _shared/sk-publish.md.

Lis ~/.claude/skills/_shared/sk-routing.md
Papier : /sk-prep puis /sk-impl. Trio : /sk-impl.
Sans papier XS : /sk-xs.

