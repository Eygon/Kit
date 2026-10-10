---
name: sk-impl
description: Variante IMPLEMENTATION-SEULE spec-kit. Consomme un trio existant. 1 US = Agent Sonnet sk-worker. N US = Workflow speckit-us-loop.js. Si FEATURE_DIR/parallel.yml existe, apres US1 les US annotees tournent en parallele (speckit-us-after-parallel.js). Pool wt-1..4. Use when the user invokes /sk-impl or wants to implement an already-prepared spec-kit feature.
argument-hint: "<feature: numero/nom, ou vide si .specify/feature.json pointe deja dessus>"
disable-model-invocation: true
allowed-tools: Agent Bash PowerShell Read Write Edit Glob Grep AskUserQuestion Skill ToolSearch EnterWorktree ExitWorktree Workflow ListAgents SendMessage mcp__azure
---

# Orchestrateur SPEC-KIT — IMPLEMENTATION SEULE (`/sk-impl`)

Cible : **$ARGUMENTS**

Workflow (turn-scoped) : autorise SYSTEMATIQUEMENT si n>=2 US enchainees
(speckit-us-loop.js, ou speckit-us-after-parallel.js si parallel.yml) —
cette skill instruit l appel, ce qui vaut opt-in. n==1 : PAS de Workflow.

`<SK_SHARED>` = `~/.claude/skills/_shared` resolu en chemin absolu a barres
obliques (`_shared/sk-config.md`) ; `<REF>` = le dossier `ref/` a cote de
ce fichier. Agents : `sk-worker` (Sonnet, code et fix) et `sk-reviewer`
(Opus, revue), definis dans `~/.claude/agents/`.

## Carte du run — les modules ne se lisent QUE declenches

| Declencheur | Module |
|---|---|
| `AUDIT_MODE=1` (sonde) | `<REF>/audit.md`, avant tout le reste |
| une US retenue porte des chemins backend | `<REF>/cross-repo.md` |
| FEATURE_DIR/parallel.yml existe ET >= 2 US retenues | `<REF>/parallel.md` |
| verdict final (en fin de run, des qu un slot a ete pris) | `<REF>/publish.md` |

## Ce que cette commande fait

Complement de /sk-prep, ne produit PAS le trio.
1. Isolation pool wt-1..4, jamais le working tree principal.
2. TDD dans le Sonnet (Bash) : par tache, un RED prouve avant la prod puis
   un GREEN. Zero Haiku.
3. Revue (toi si n==1, un Opus dans le Workflow sinon) : PASS, FIXED (il a
   corrige lui-meme ce qui etait plus court a faire qu a expliquer), FAIL
   (une passe de fix Sonnet, puis review2) ou ESCALATE (arbitrage humain).

## 0. Sonde et pre-requis (UN appel Bash)

  node "<SK_SHARED>/sk-probe.mjs" --skill sk-impl [--feature specs/<NNN>-<nom>]

Elle rend AUDIT_MODE, superviseur (age UTC), branche par defaut, `backend`
de .sk/repos.json (lu sur le PRINCIPAL), feature.json, scripts spec-kit,
LOCALES, test de parite, commandes vitest/tsc/eslint, et l etat du trio
(`trio`, `designMd` CITE-MAIS-ABSENT, taches ouvertes / cochees,
`checkedWithoutFile`). Ne les re-cherche pas.

spec.md + plan.md + tasks.md DOIVENT exister dans FEATURE_DIR du depot
PRINCIPAL (specs/ gitignore est normal). Un manque -> STOP, /sk-prep.
`git add -f specs` INTERDIT.
- design.md : s il existe, il se transmet par extrait (§4). Absent alors
  qu une US RETENUE porte des taches `Design: design.md#C<n>` -> STOP,
  relance /sk-prep (jamais un design deduit du JSX). Une US retenue sans
  ancre (back, data layer) n en a pas besoin : elle continue.
- STOP de pre-requis (avant le slot) : rien n a ete touche, pas de
  publication ni de STATE.md ; dis la commande a relancer.
- recon.md : inventaire VIVANT (§4bis). Absent : cree-le avec les 5 titres
  au premier DONE (`node <SK_SHARED>/recon-seed.mjs --out ...`).
- parallel.yml : annotation ecrite par /sk-prep, copiee avec le trio,
  jamais inventee ni mutee. Absent = sequentiel.

FEATURE_DIR : .specify/feature.json croise avec $ARGUMENTS (numero/nom).
Plusieurs candidats -> AskUserQuestion, ne devine pas. Dossier absent ->
STOP. FEATURE_SLUG = kebab du dossier. Branche : sk-impl-<FEATURE_SLUG>.

Superviseur (contrat `<SK_SHARED>/sk-supervisor.md`) : heartbeat < 30 min ET
ListAgents montre ce nom ET SK_NO_SUPERVISOR != 1 ET AUDIT_MODE != 1 ->
CHAQUE AskUserQuestion (feature, slot, GO, backend, verdict) devient un
SendMessage [SK-QUESTION] (type et options du contrat, memes libelles,
meme ordre, contexte = ce que l ecran aurait montre), puis FIN DE TOUR :
« En attente de <SUPERVISOR> — ou reponds ici. ». [SK-ANSWER] vaut choix
humain ; une reponse tapee ici prime ; `escalade` -> AskUserQuestion ;
repli local sans [SK-ANSWER] sous 5 min. Jamais de defaut sans reponse.
Apres le GO : [SK-START]. Derniere action, quelle que soit l issue :
[SK-DONE].

## 0bis. Slot du POOL (wt-1..4)

AUDIT_MODE=1 : section ENTIERE sautee (slot = cwd, `<REF>/audit.md`).

REPO_SLUG = basename du PARENT de `git rev-parse --path-format=absolute
--git-common-dir` (jamais --show-toplevel depuis un worktree). POOL_BASE :
`<SK_SHARED>/sk-config.md`. POOL_ROOT = <POOL_BASE>/<REPO_SLUG>,
STATUS_FILE = POOL_ROOT/status.md (informatif, pas un lock). Pool absent ->
/sk-pool-init. Collision REPO_SLUG -> STOP. Pool FRONT seulement (backend :
`<REF>/cross-repo.md`).

Resolution : UNE commande, jamais a la main (contrat `<SK_SHARED>/sk-pool.md`,
git fait foi). SKP = `pwsh -File <SK_SHARED>/sk-pool.ps1`.
1. `SKP -Action find -Repo <principal> -Feature <NNN ou slug>` :
   exit 0 `REPRISE <slot> | branche <b> | verdict <v>` = le slot (branche
   sk-impl-<slug> OU feature/<NNN>-* : meme feature). SALE /
   BRANCHE-DIFFERENTE : le dire au GO, ne rien reset. exit 3 :
   AskUserQuestion.
2. exit 2 : `Slot : wt-N` en tete de plan.md -> propose-le en premier.
   Sinon `SKP -Action free -Repo <principal>` : `LIBRE <slot>` = le
   prendre ; `LIBRE-SALE` -> AskUserQuestion ; exit 2 (4 occupes) ->
   AskUserQuestion (attendre / liberer un A-LIBERER via `release` /
   abandon). Jamais voler un slot dont git est sur une autre branche.
3. `SKP -Action claim -Slot <slot> -Branch sk-impl-<FEATURE_SLUG> -Note
   "<US retenues>"` (reprise : rien touche ; branche feature/<NNN>-* :
   `-Branch` = cette branche). exit 3 `REFUS` sur un slot que `free`
   venait de rendre LIBRE = une autre session l a pris dans l intervalle
   (claim est sous verrou) : relance free puis claim, une fois, sans
   demander. REFUS « deja tenu par la session X (active il y a N min) » =
   meme feature deja en cours ailleurs : AskUserQuestion (attendre /
   prendre la main si cette session est morte, avec `-Force` / abandonner),
   jamais deux sessions dans un slot. Tout autre REFUS : decider avec
   l humain, `-Force` seulement apres son accord.
Heartbeat apres chaque US et a chaque ExitWorktree keep :
`SKP -Action touch -Slot <slot> -Note "<US livrees / en cours>"`.
Ne jamais supprimer un slot.

Trio -> slot. Slot NEUF : copie recursive de <principal>/specs/<NNN>-<nom>
vers <slot>/specs/. REPRISE : ne JAMAIS ecraser tasks.md / recon.md /
STATE.md du slot (ils portent les [X] et les faits) ; copier seulement
l absent : `robocopy <src> <dst> /E /XC /XN /XO /NJH /NJS /NFL /NDL` (exit
< 8 = ok ; hors Windows `cp -rn`). specs/ en jonction vers le principal :
la copie est un no-op, ce n est pas une erreur. Trio absent du slot ->
STOP.

EnterWorktree { path: "<slot>" }. Jonction node_modules seulement si
manquante. Sanity : `node node_modules/vitest/vitest.mjs list --filesOnly`,
STOP seulement si 0 fichier (jamais `list --json=` repo-wide).

## 0ter. Chauffe du cache (TOUJOURS, audit compris)

Une fois par run, AVANT le premier spawn, en arriere-plan pendant que tu
ecris les briefs (Bash run_in_background) :
  node node_modules/vitest/vitest.mjs run --coverage=false <un test existant de la feature, sinon le plus petit de src/__tests__>
Resultat ignore (le cache chaud rend 1-2 min a chaque worker). Backend :
un `dotnet build` du projet de tests (le verrou DLL se paye ici). Etait
dans 0bis, que l audit saute : le worker d audit partait a froid.

## 1. Parse tasks.md du SLOT

US = groupes ([USn]) qui ont encore des taches [ ]. Toutes [X] -> STOP,
deja implemente, SAUF si la sonde rend `checkedWithoutFile` != none : des
cases cochees sans leur fichier = trio INCOHERENT (coche a tort, ou copie
d un autre slot) -> STOP avec la liste, jamais « deja implemente ».

## 2. Quelles US pour CE run

Defaut : celle que l utilisateur a citee, ou TOUTES les restantes s il a
dit « enchaine ». Plusieurs restantes sans indication : le choix part dans
la question du GO (§3). n = nombre d US retenues. US d une meme racine git :
jamais en parallele DANS LE MEME SLOT (collision `git add -A`). parallel.yml +
n >= 2 : `<REF>/parallel.md` decide du moteur. Sans parallel.yml et n >= 3 :
`node "<SK_SHARED>/lanes.mjs" "<FEATURE_DIR>"` ; s il rend moins de vagues que
d US, propose-les au GO (une vague = un slot par US, fusion apres la vague,
`<REF>/parallel.md` §Voies dans un seul depot), sequentiel par defaut si
l humain ne choisit pas.

## 3. GO humain AVANT tout Agent/Workflow

D abord le linter du trio du slot, familles qui cassent un run seulement :
  node "<SK_SHARED>/audit-lint.mjs" "<slot>/specs/<NNN>-<nom>" --ref HEAD --only mount,wire,story,recon,verified-fact,task-creates,design-token,design-lib,design-class,design-section,task-without,task-needs,test-without
(Bash, chemins a barres obliques entre guillemets ; `--ref HEAD` depuis le
slot : les fichiers des US deja livrees n existent que sur sa branche.)
`verified-fact-line-mismatch` = le code a bouge depuis la prep (une autre
feature fusionnee) : AVANT le spawn, UNE commande recale plan.md et recon.md,
sans la poser en question :
  node "<SK_SHARED>/fact-lines.mjs" "<FEATURE_DIR>" --ref HEAD --write
(INTROUVABLE = le symbole a disparu : corrige ce fait a la main.)
`task-creates-existing` = une autre feature a livre ce fichier depuis la
prep : la tache devient « Etendre / reutiliser » (Code:) avant le spawn ; si
le fichier livre differe de ce que la tache attend (champ nullable, defaut),
c est une question du GO (banc Miro F3 : worker en STOP preuve sur ce cas).
Banc Miro : F3 preparee avant la fusion de F2 avait 7 faits decales, que
chaque worker aurait relus faux.
UN SEUL AskUserQuestion (jusqu a 4 questions) : US retenues si plusieurs
restent, slot back si cross-repo, puis Lancer / Ajuster / Abandonner avec
slot, branche, US, n, fichiers vises, et CHAQUE finding qui porte sur une
US retenue (defauts de prep : « Ajuster » = les corriger dans tasks.md /
design.md avant le spawn). Ne repose pas une question deja tranchee.
Tant que ce n est pas approuve, n ecris rien.

## 4. Spawn

Le but du brief : que le worker ecrive sa premiere ligne sans recon. Tout
ce que tu sais et qu il chercherait y entre, avec sa source ; rien que tu
n aies verifie pour CETTE US. Ton jugement va dans un JSON par US, la
recopie a l outil :

  FEATURE_DIR/briefs/<US_ID>.json = { featureDir, slot, us, skShared,
    lecture, facts, standardsRoot?, prod?, tests?, standards?,
    contractPath?, contractHash?, workerNotes?, reviewNotes? }
  node "<SK_SHARED>/brief-fill.mjs" <ce json> --out FEATURE_DIR/briefs

Il recopie taches et scenarios d acceptation de l US, met les memes chemins
dans les trois briefs (worker, review, fix), retire les blocs design /
contrat sans objet, et sort en exit 1 sur un brief incomplet : corrige le
JSON, jamais le brief. Seule exception : un KO « tache qui ecrit le contrat
gele » ne se corrige pas dans le JSON ; c est un defaut de prep, donc
l US n est pas lancee et elle est renvoyee a /sk-prep (nouveau gel).
- prod / tests : DEDUITS par brief-fill des lignes de tache (chemins hors
  `Code:`, cibles `Monté dans:` sans (US<n>), `Test:`, et les fichiers
  LOCALES de recon.md si une tache touche une langue). N y ajoute que ce
  que les taches ne nomment pas ; un fichier cree par une tache et absent
  du resultat sort en KO. Tache sans `Test:` : signale le defaut de prep
  au GO.
- design : l extrait design-<US>.md est ECRIT par brief-fill depuis les
  ancres `Design: design.md#C<n>` des taches (sections + §3 + §5, sans
  reformulation) ; ne le decoupe plus a la main.
- lecture : les fichiers que tu as lus pour etablir les facts et que le
  worker va ouvrir, `chemin:lignes`, un par ligne.
- standards : les ids de la ligne `Standards:` de l US dans tasks.md
  (brief-fill les lit aussi tout seul) ; standardsRoot = le slot de l US
  (slot BACK pour une US backend : ses standards a lui). brief-fill ecrit
  `<US>-standards.md` (corps des alwaysInject + ancres, controles
  mecaniques) que worker et reviewer lisent au premier tour, et sort en 1
  sur un id inconnu de l index de ce depot : corrige tasks.md ou le JSON.
- facts : seulement ce que recon.md et la ligne de tache NE disent PAS deja
  (ils sont lus en entier par le worker : ne recopie pas, ne re-verifie pas
  ce que la prep a source sur la meme base). Un constat par ligne AVEC SA SOURCE (fichier + branche, ou
  table + colonne + resultat). Une action serveur porte l endpoint du
  contrat (methode + chemin + ligne) et la fonction du service front
  (chemin:ligne, ou « a creer dans <chemin> sur le modele de
  <chemin:ligne> »). Une phrase de plan.md vraie pour une autre US n est
  pas un fait ici ; une interdiction sans fait source ne se pose pas.
- design : jamais design.md complet au worker ni au reviewer : l extrait
  de brief-fill (ci-dessus) ; designConformance devient obligatoire dans la
  sortie du worker.
- contractPath + contractHash : si parallel.yml ou 2 repos.
Prompt de chaque agent, trois lignes : « Ton brief est dans
<FEATURE_DIR/briefs/US_ID-worker.md> (resp. -review, -fix) ; lis-le en
entier en premier ; cwd du slot <SLOT_CWD> ».

**n==1** : Agent({ subagent_type: "sk-worker", model: "sonnet", prompt }).
Experimental, ~20x moins cher au token : `model: "haiku", effort: "high"`
(n>=2 : `workerModel: "haiku"` dans les args du Workflow, high par defaut,
fix compris). Banc du 7 octobre : code et E2E aussi verts que Sonnet ; en
effort low/medium, tests de page d effet (annulation, echec serveur) oublies
3 fois sur 3, rattrapes par la revue ; en high, PASS. La carte AC (brief
3bis) les fait ecrire en medium. Haiku prend ~1,5x les tokens et le temps.
Pas de Workflow, pas de champ effort (il n existe que dans agent()).
Puis TOI (Opus parent) appliques le brief -review, « Qui corrige »
compris : ce qui est plus court a faire qu a expliquer, tu le corriges,
preuve a l appui (commit `sk-impl REVIEW(<US_ID>)`). Pas de spawn
reviewer. Ecarts restants (FAIL) : UN Agent sk-worker avec le brief -fix +
la passation du worker (commit, filesTouched, summary) + ce que tu as deja
corrige + les issues ; puis tu rejoues la revue. ESCALATE : pas de fix,
AskUserQuestion (corriger la prep / elargir le perimetre / accepter
l ecart) ; la decision va dans le fichier qui fait foi (design.md §5,
tasks.md, prod elargi), puis UN fix et ta revue partant de ses issues.
Fix en STOP : pas de nouvelle revue, tu remontes.

**n>=2** (hors parallel.md) : Workflow
scriptPath `<SK_SHARED>/speckit-us-loop.js` (chemin absolu resolu),
args.groups[] = [{id, prompt, reviewPrompt, fixPrompt, root}] dans l ordre de
tasks.md (fixPrompt dans CHAQUE groupe ; root = SLOT_CWD de l US). Le moteur
transmet les faits d un worker aux workers et fix suivants du MEME root dans
le run : les briefs etant remplis avant, sans lui US2 ignorait ce que US1
venait d etablir. Boucle : worker -> revue. PASS /
FIXED : US suivante. FAIL : fix (1 passe) puis review2 ; review2 FAIL ou
ESCALATE = STOP la chaine. Worker STOP (budget/WIP), fix STOP, revue sans
verdict lisible (relancee une fois) = STOP la chaine. Lis chaque ligne de
results[] : error, escalated, fixStopped, review2Fail, halt, issues,
notes, fixedByReview, reviewFixes, reviewCommits, facts.
Commit DONE en fin d US quand tout [X] ; WIP au plafond dur ~40 min.

## 4bis. Apres chaque US : recon.md s enrichit

Le worker (et le fix) rendent `facts: [{fact, source}]` (0-5) : results[]
en Workflow, sortie structuree en n==1. Apres CHAQUE worker ou fix, UNE
commande, sans relire ni recopier :
  node "<SK_SHARED>/facts-add.mjs" "<FEATURE_DIR>" <sortie du worker .json | -> --us <US_ID> --slot <SLOT_CWD de l US>
Avec `--slot`, elle les verse AUSSI dans la memoire du depot
(`<git common dir>/sk-facts.json`, 30 au plus, jamais commitee) : brief-fill
les rend aux features suivantes, en taisant ceux dont le fichier source a
disparu (banc : 10 workers sur 10 ont redecouvert le meme piege des tests).
Elle verse les faits dans FEATURE_DIR/facts.json (dedup par texte, 40 au
plus, les plus recents gardes) ; brief-fill les injecte dans tous les briefs
suivants. Ne les recopie plus dans le JSON du brief. Seule exception : un
fait `Corrige recon.md : ...` REMPLACE la ligne fausse que cite sa source
(Edit), car recon.md ne doit pas contredire facts.json. Mesure (banc jeu) :
recopier a la main perdait les faits ([object Object]) et coutait des
tokens Opus a chaque US.

## Worker perdu (session ou conteneur coupe en pleine US)

Pas de sortie, arbre du slot sale : ce travail n est pas prouve (aucune gate
vue verte). `git -C <slot> stash push -u -m "sk-lost-<US_ID>"` (consultable
ensuite), cases [X] de l US remises a [ ] si non commitees, puis UN nouveau
worker sur le meme brief, arbre propre. Un commit WIP de l US deja present
reste : le worker repart de ses [ ]. Banc Miro : redemarrage du conteneur
pendant F6-US4.

## Revue

Checklist : le brief -review (`<SK_SHARED>/us-reviewer.md` rempli). Le
reviewer recoit recon.md, les tests et le MEME extrait design que le
worker. n==1 : toi. n>=2 : sk-reviewer Opus medium dans le Workflow, qui
doit pouvoir editer, committer et rendre le schema (ne restreins pas ses
tools). Experimental : `reviewTier: "auto"` dans les args du Workflow
donne la PREMIERE revue a Sonnet quand le worker touche au plus 4
fichiers de prod et ne declare aucun ecart (retry et review2 restent
Opus). Banc A/B : Sonnet + diff-cover + grep des imports paresseux a
rattrape 3 defauts mecaniques sur 4, mais rate un ecart de conception
non declare. A n activer que sur un run S/M sans fichier PARTAGE. `reviewTier:
"auto-haiku"` : meme regle, PREMIERE revue a Haiku 5.5 (banc du 7 octobre :
8 defauts injectes sur 8 trouves et corriges, 0 faux positif, comme Sonnet
et Opus, sur une seule feature). Loupe tests (par defaut, `reviewLens: false` la coupe) : le moteur lance
EN PARALLELE de la revue un Haiku en lecture seule qui compare chaque test
a la spec et aux taches. Ses pistes vont au fix si la revue rend FAIL,
sinon a une revue Opus `review-lens` qui les juge. Banc du 10 octobre :
Haiku, Sonnet et Opus seuls ont tous rate un test supprime, la loupe l a
trouve ; sur TK-3 elle a vu les 2 trous de tests connus ; 0 fausse alerte
en 4 runs. Duree inchangee, ~80-100k tokens Haiku par US. n==1 (toi) :
lance-la aussi en sous-agent Haiku pendant ta revue. Pas de `yarn typecheck` ni de suite complete en revue : la
cloture le fait.

## Cloture du run (une fois, apres toutes les US retenues)

`tsc --noEmit -p tsconfig.json` complet (pas l incremental des workers) +
eslint sur `git diff --name-only <base>..HEAD` (.ts/.tsx), jamais
`yarn lint` dans un slot, jamais la suite complete. Rouge -> corrige.
Rejoue ensemble les tests cibles des US du run.
Commits du reviewer (`git log --format=%h --grep="^sk-impl REVIEW(" <base>..HEAD`) :
  git show <sha> --unified=0 -- "*.test.*" "*.spec.*" "*Test.cs" "*Tests.cs" | grep -nE '^-[^-]|^\+.*(\.(skip|only|todo)\(|\bxit\(|Skip *=)'
Une ligne de test retiree, ou un skip / only / todo ajoute : cite-la dans
la question de verdict.
Diff : `git -C <slot> diff --stat <base>..HEAD` et `log --oneline -n 20`.
Workflow : `node "<SK_SHARED>/run-metrics.mjs" "<dossier du workflow>"`,
une ligne par agent dans STATE.md.
Puis `<REF>/publish.md` : verdict Publier / Corriger / Abandonner.

## Garde-fous

- clean -fd SANS -x. Ne jamais supprimer un slot. STATUS_FILE : seulement
  via sk-pool.ps1 (find / free / claim / touch / release).
- Reprise : tasks.md / recon.md / STATE.md du slot ne s ecrasent jamais.
- Sonnet pour le code (sk-worker), Opus pour la revue. Zero Haiku.
- Standards : le pack de l US (depot de l US, front ou back) est MUST pour
  le worker, le fix et le reviewer (check 11) ; controles mecaniques par
  standards-pack.mjs check, jamais de grep a la main.
- [X] seulement si gate verte ET fichiers existants ; RED prouve avant la
  prod, test inchange ensuite (empreinte cmp), puis GREEN.
- FACTS sources ; un worker qui contredit un fait avec preuve a raison par
  defaut.
- FAIL : 1 fix puis review2. ESCALATE : arbitrage, sans fix. Revue sans
  verdict = 1 relance puis erreur, jamais un FAIL. review2 FAIL, fix STOP,
  STOP budget ou ESCALATE = pas d US suivante.
- Verrou DLL / crash Vitest : 3 retries worker, pas un FAIL revue.
- Parallelisme : parallel.yml, ou les vagues de lanes.mjs acceptees au GO ;
  un slot par US d une vague, jamais deux US dans le meme slot.
- Publication : jamais de merge dans le principal, jamais de push sur la
  branche par defaut, jamais --force, PR draft par GUID.
- Routage : `<SK_SHARED>/sk-routing.md`. Papier : /sk-prep puis /sk-impl.
  Trio : /sk-impl. Sans papier XS : /sk-xs.
