---
name: sk-prep
description: Variante PREPARATION-SEULE spec-kit. Produit le trio spec/plan/tasks (specify, clarify, plan, tasks) sans implementer. Relais unique : /sk-impl. Use when the user invokes /sk-prep or wants spec-kit planning only.
argument-hint: "<besoin> [chemin d un doc docs/legacy-search/*.md et/ou docs/code-search/*.md a exploiter]"
disable-model-invocation: true
allowed-tools: Agent Bash Read Write Edit Glob Grep AskUserQuestion Skill ToolSearch DesignSync ListAgents SendMessage mcp__azure mcp__claude-in-chrome
---

# Orchestrateur SPEC-KIT — PREPARATION SEULE (`/sk-prep`)

Besoin utilisateur : **$ARGUMENTS**

Aucun Workflow, aucun code de production, aucun [X]. La commande
s arrete apres validation humaine du trio. Relais unique : /sk-impl.
Conversation deja chargee d un autre travail : propose `/clear` puis la
meme commande AVANT 0quater (chaque tour de prep relit ce contexte).

`<SK_SHARED>` = `~/.claude/skills/_shared` (SK_HOME, `_shared/sk-config.md`),
`<REF>` = le dossier `ref/` a cote de ce fichier.

## Carte du run — les modules ne se lisent QUE declenches

Ce fichier est le coeur. Le detail des cas rares vit dans `<REF>/` et ne
se lit que si son declencheur est vrai : un module non declenche ne
s ouvre pas, un module declenche se lit EN ENTIER avant l etape qu il
modifie (il ajoute des regles a specify, plan, tasks et sanity).

| Declencheur (sonde §0 ou $ARGUMENTS) | Module |
|---|---|
| `AUDIT_MODE=1` | `<REF>/audit.md` (juste apres la sonde) |
| URL `claude.ai/design/p/...` ou lien Figma | `<REF>/design.md` (remplace la section 0) |
| chemin `docs/legacy-search/*.md` | `<REF>/legacy.md` (0bis) |
| chemin `docs/code-search/*.md` | `<REF>/code-search.md` (0ter) |
| `backend` renseigne ET besoin qui touche l API, OU un champ de contrat a ecrire (contracts/ ou AC) qui vient d un legacy, d un mockup ou d un autre systeme | `<REF>/contracts.md` |

## 0. Sonde (UN appel Bash, avant toute autre action)

  node "<SK_SHARED>/sk-probe.mjs" --skill sk-prep

Elle rend en `cle=valeur` : AUDIT_MODE, superviseur (age du heartbeat,
calcule en UTC), branche par defaut (`origin/<defaut>`), cle `backend`
de .sk/repos.json, presence de agent-os/standards/index.yml, variante
des scripts spec-kit (ps1 / sh) et leur chemin, dossier i18n et test de
parite, alias tsconfig. Ce qu elle etablit ne se re-cherche pas.
Sonde absente ou en erreur : fais ces lectures a la main, une fois.

Superviseur (contrat `<SK_SHARED>/sk-supervisor.md`) : heartbeat < 30 min
ET ListAgents montre ce nom ET SK_NO_SUPERVISOR != 1 ET AUDIT_MODE != 1 ->
CHAQUE AskUserQuestion de cette skill devient un SendMessage [SK-QUESTION]
(type du contrat, memes options, meme ordre, contexte = besoin
`$ARGUMENTS` en clair + ce que l ecran aurait montre), puis FIN DE TOUR :
« En attente de <SUPERVISOR> — ou reponds ici. ». [SK-ANSWER] vaut choix
humain ; une reponse tapee ici prime ; `escalade` -> AskUserQuestion ;
aucun [SK-ANSWER] sous 5 min -> repli local (contrat §Timeout et repli).
Apres 0quater : [SK-START] skill=sk-prep slot=prep. Trio « Editer » avec
motif = corrections a appliquer avant de reposer la question 6. Derniere
action : [SK-DONE] issue=trio-approved|trio-rejected.

Work item : le besoin cite un id Azure DevOps (5 chiffres, ou lien
_workitems/edit/<id>) -> `Work item: <id>` en tete de spec.md, sous le
titre. Aucun id cite = aucune ligne, ne pas chercher.

## Livrable

specs/<NNN>-<nom>/ : spec.md + plan.md + tasks.md +
checklists/requirements.md. Fichiers vides interdits. research.md,
data-model.md, contracts/, quickstart.md seulement s ils ont du vrai
contenu. design.md OBLIGATOIRE si un lien design est fourni, interdit
sinon. Un doc legacy ou code-search ne produit AUCUN fichier : on le cite.
recon.md OBLIGATOIRE, meme a 1 US (A.4bis, squelette genere) : l inventaire
de l existant que chaque worker /sk-impl lit en premier (LOCALES, alias,
composants reutilisables). Ce n est PAS un
doublon de plan.md « Faits verifies » : plan.md dit ce qui est vrai pour
specifier, recon.md dit ou est le code reutilisable pour implementer.

Ordre : d abord LIRE (modules design / legacy / code-search declenches),
puis UNE seule AskUserQuestion de perimetre (0quater) qui recapitule tout.

## 0quater. Perimetre du RUN (UNE AskUserQuestion)

Apres les lectures des modules declenches, avant toute recon. Une seule
question, qui recapitule dans cet ordre (omets les blocs non declenches) :
- design : variante retenue et autres ; zones in/out ; ecarts lib<->design
  (a)/(b)/(c) ; valeurs illisibles a fournir ;
- legacy : pour chaque F<n> — reprendre / moderniser / abandonner ; zones
  incertaines a trancher ;
- code-search : les E<n> consideres acquis et les ecarts ;
- les User Stories retenues pour CE run.
Seule autre question permise avant : le choix du fichier design sans
?file= (module design §0.1.3). Pas d US inventee ; le trio est cape a
cette tranche. Sans reponse : pas de design.md, pas de specify.
AUCUN module design / legacy / code-search declenche : pas de 0quater.
La question n aurait qu un bloc (« US retenues ») pose avant la recon,
la ou A.1bis peut encore tout arreter ; le choix des US part dans la
question de clarify (A.2), quand les US existent.

## A. Preparation (toi, inline)

### A.1 Recon (lecture pure, pas de gate humaine)

D ABORD 2-3 Grep/Glob inline. Point d entree trouve et aucun declencheur
ci-dessous vrai : AUCUN agent (5 sessions XS sur 5, la recon inline a
suffi ; chaque appel d outil coute 3,5-8 s).
Fan-out SEULEMENT si :
  - 2 git roots (`backend` renseigne ET le besoin touche l API) ;
  - la recon inline touche >= 2 pages (src/pages/<a> ET src/pages/<b>) ;
    une page plus un composant partage qu elle consomme reste UN
    sous-systeme ;
  - les 2-3 greps montrent >= 2 livrables independants (ex. data layer ET
    ecran) sans doc code-search frais. Le nombre d US n est fixe qu en
    specify : on juge ici sur les livrables, pas sur des US qui n existent
    pas encore.

Avant de repartir, ECRIS la liste des QUESTIONS de recon (point
d insertion, montage du composant, source de la donnee, construction de la
requete, existence d un test). UN agent = UNE question, jamais une zone
(« explore le front » n a pas de critere d arret). Deux questions sur le
meme fichier = un agent. 4-6 agents au plus : au-dela, le perimetre est
trop large. En parallele, en arriere-plan, synthetises avant le plan :
  Agent { subagent_type: "Explore", model: "haiku",
          description: "<la question>", prompt: "<la question> + format" }
L outil Agent n a pas de champ `schema` : le format s impose DANS le
prompt, qui finit par :
  « Rends exactement trois sections, rien d autre :
    files:    une ligne par fait, `<chemin RELATIF a la racine du depot>:<lignes> — <symbole> — <fait>`
    notFound: la question restee sans reponse, en clair, ou `none`
    searched: les dossiers REELLEMENT balayes, un par ligne »
Chemins absolus interdits (les Faits verifies doivent etre resolus par
/sk-impl et le lint). Hors format = relance UNE fois, puis model sonnet.

GARDE DE COUVERTURE avant specify : chaque question sans reponse, et
chaque zone ou une tache va ecrire sans qu aucun `searched` la couvre ->
un Grep/Glob cible ou UN agent de plus. Pas de specify avec une question
ouverte. Ce qui a ete comble va dans plan.md (Faits verifies).
Chaque `path:lines` rendu se recopie tel quel dans les Faits verifies :
audit-lint les confronte au depot (`verified-fact-*`).

### A.1bis Garde-fou de taille (APRES la recon, AVANT specify)

Seul moment ou renoncer au papier ne coute qu une minute. Criteres = ceux
de /sk-xs §-1, a l identique :

| Signal | Route |
|---|---|
| TOUS reunis : <= 2 fichiers de prod, ~10-30 lignes, 1 comportement, pas d ecran, 0 decision d archi, 1 seul git root, aucun doc design / legacy / code-search fourni, papier non demande explicitement | XS -> AskUserQuestion ci-dessous |
| un seul signal manquant | continue en A.2 : c est du papier |

AskUserQuestion, dans cet ordre :
  1. « Basculer vers /sk-xs (recommande) » -> STOP. Rien n est cree (pas
     de FEATURE_DIR, pas de create-new-feature). Annonce en UNE phrase :
     /sk-xs "<besoin>".
  2. « Garder le papier » -> continue. L humain garde la main.
Un XS qui passe ici sans question est le defaut mesure.

### A.2 Trio spec-kit, dans l ordre, borne au perimetre du run

FEATURE_DIR : resous via .specify/feature.json ou le script setup-tasks
de la sonde, et VERIFIE que le dossier existe (feature.json peut pointer
sur un dossier supprime). Absent -> relance create-new-feature, jamais de
mkdir a la main.

**specify** — Skill(speckit-specify) -> spec.md + checklists/requirements.md.
Hook after_specify : SKIPPED (il reecrit AGENTS.md hors specs/).
Une US = un livrable dont l Independent Test se joue SANS les US suivantes,
~3-5 fichiers de prod (~20-40 min worker), ~3-6 taches. Pas 1 fichier par
US, pas toute la feature dans une US. Une petite US qui reste un livrable
a part (contrat, mapper, flag) se garde. Une feature dont TOUTES les US
seraient minuscules est le cas A.1bis.
INTERDIT : chemins API/backend ET pages/components dans le meme [USn]
(meme repo, deux dossiers = meme interdiction). Front sans backend
modifiable qui appelle un endpoint : le contrat (yaml/json dans
contracts/) s ecrit TOI, en prep, avant les US — les US front codent
contre lui, jamais contre une implementation, et ne l inventent pas
(regles de source : `<REF>/contracts.md`).
Chaque US porte des **Acceptance Scenarios** (Given/When/Then) : ils sont
recopies au worker et le reviewer juge dessus.

**clarify** — Skill(speckit-clarify) SYSTEMATIQUEMENT, au moins une
question sauf spec deja entiere. PUIS le filet, dans la MEME
AskUserQuestion si possible : recapitule les hypotheses (portee, cas
limites, regles) a valider ou corriger. Correction -> reinsere dans spec.md.
Sans 0quater : la meme AskUserQuestion porte aussi les US retenues pour CE
run (toutes par defaut) ; une US ecartee sort de spec.md.

**plan** — Skill(speckit-plan) -> plan.md + artefacts JUSTIFIES. Injecte
ICI la synthese recon sous `## Faits verifies` (chemin:lignes, source).
Ancre les standards (A.3). Artefacts conditionnels, fichiers vides
INTERDITS : research.md (vraies decisions), data-model.md (entite/champ
nouveau), contracts/ (interface qui change, chaque champ source),
quickstart.md (procedure manuelle non triviale). « aucune entite » = le
fichier ne doit pas exister ; supprime-le s il a ete cree vide.

**tasks** — Skill(speckit-tasks) -> tasks.md. Puis REECRIS-le au format du
kit, que brief-fill.mjs, audit-lint.mjs et mount-check.mjs lisent :

  ## [US1] <titre de l US>
  - [ ] T001 [US1] Creer `src/x/y.tsx` — <ce que fait la tache> — Test: `src/__tests__/x/y.test.tsx` — Monté dans: `src/pages/p/p.tsx`
  - [ ] T002 [US1] Etendre `src/api/a/aService.ts` (`createB`, POST /b du contrat contracts/b.yaml) — Test: `src/__tests__/api/a/aService.test.ts`

Une tache = une ligne = une action = UN fichier de prod + son `Test:`.
Les tests ne sont PAS des taches separees (le worker fait RED puis GREEN
dans la meme tache). PAS de tache pour : lire les standards, baseline,
rituel RED, revue de diff, validation manuelle, verifier le design.
STRIP : phases Setup/Foundational sans nouvelle API publique, toute US
hors du perimetre de CE run.
MONTAGE (bloquant au sanity) : une tache qui CREE un composant, un hook ou
un service porte `Monté dans: <fichier>` (le fichier qui l importe et le
rend ; un service : celui qui l appelle), touche par CETTE US. Parent qui
n existe pas encore ou qui appartient a une autre US : `Monté dans:
<fichier> (US<n>)` ET, dans US<n>, une tache « Monter <Nom> dans
`<fichier>` » avec son test, qui rend <fichier>. Rien a monter (utils,
mapper, DTO, type, colonnes, route) : pas d annotation.
Une tache « Brancher / Cabler / Monter » cite le fichier cible, existant
sur origin/<defaut> ou cree par une tache.
`Slot : wt-N` nomme par l humain -> en-tete de plan.md.

### A.3 Standards AgentOS — autant que le besoin l exige, must

agent-os/standards/index.yml (sonde). Ancre les `@agent-os/standards/...`
dans plan.md et tasks.md : ceux que les fichiers cibles vont reellement
exercer, typiquement 3-5 par US, jusqu a ~10 si les US traversent
plusieurs groupes. `_meta.maxPerGroup` fait foi ; `_meta.alwaysInject` ne
compte pas dans le cap. Pas de standard « au cas ou » : chaque ancre est
du contexte injecte au Sonnet. Aucun corps recopie. Absent = trio non
livrable.

### A.4 Gate checklists

Compte [ ] vs [X] dans FEATURE_DIR/checklists. Incomplete ->
AskUserQuestion : completer maintenant ou livrer en l etat.

### A.4bis recon.md

Pars du squelette genere, jamais d une page blanche :

  node "<SK_SHARED>/recon-seed.mjs" --root . --ref origin/<defaut> --out "<FEATURE_DIR>/recon.md"

Il ecrit les cinq titres fixes, la liste des composants partages (lue sur
origin/<defaut>, nom — chemin — props), la ligne LOCALES et le test de
parite, les alias tsconfig et les interdits grep-ables de depart, chaque
ligne avec sa source. Toi, ensuite (Edit) :
- sous « Composants partages reutilisables » : GARDE seulement ceux qui
  repondent a un mot de la spec (grille, etat vide, erreur, skeleton,
  modale, panneau, filtre, pastille...) ; supprime le reste ;
- sous « Helpers et hooks », « Pieges verifies », « Recettes de test » :
  ajoute ce que ta recon a etabli et qu un worker re-chercherait (source
  d une donnee transverse, format des nombres et son piege en test,
  comment les tests voisins mockent un service), une ligne par fait,
  `chemin:ligne` en source, 200 caracteres au plus ;
- sous « Interdits grep-ables » : UNE regex par ligne, rien d autre. Un
  piege qu on ne peut pas grep va dans « Pieges verifies ».
Chaque chemin cite existe sur origin/<defaut> (le working tree est
presque toujours sur une autre branche). Fichier < ~10 Ko : chaque worker
et chaque reviewer le relit en entier. Ne recopie pas le standard i18n :
la ligne LOCALES vient des fichiers, pas du standard.
Script absent : les memes cinq titres a la main, meme regles.

### A.5 Sanity tasks.md

D abord le linter, qui fait la partie mecanique :
  node "<SK_SHARED>/audit-lint.mjs" "<FEATURE_DIR>" --ref origin/<defaut>
(chemins en barres obliques, entre guillemets).
Bloquant : tout HIGH mount-*, wire-*, task-needs-search. A corriger avant
la validation 6 : les MEDIUM recon-*, design-*, task-without-prod-path,
test-without-subject. Les autres HIGH se confrontent au critere ci-dessous.
contract-field-without-source (MEDIUM) : ne regarde que les champs que la
feature AJOUTE.
Puis UN critere, a la main : une tache est prete quand un worker qui ne
lit que sa ligne et recon.md peut ecrire sa premiere ligne sans chercher.
Elle nomme donc :
- son fichier de prod ET son `Test: <chemin>` ;
- ce qu elle reutilise ou etend (`Code: <chemin>#E<n>`), ou `New: aucun
  equivalent dans src/components/{elements,widgets}` (confronte a la liste
  de recon.md, pas a ta memoire) pour tout « Creer » d un etat, bandeau,
  skeleton, modale, panneau, pastille ou filtre ;
- pour une action serveur (mutation, PATCH/POST, export genere par le
  serveur ; un export construit cote client n en est pas une) : l endpoint du
  contrat ET la fonction du service front (existante avec son chemin, ou
  « a creer dans <chemin> ») ;
- pour toute donnee qu une AC affiche ou propose : sa source (service
  existant, endpoint du contrat, ou US qui la cree). Sans source, le worker
  code une liste de demonstration en dur (917 US5, 3 workers sur 3) ;
- pour un changement de surface publique (hook, type partage, export) :
  chaque consommateur (`grep -rl "<nom du module>" src`) dans CETTE US, ou
  un alias transitoire NOMME qui couvre tout membre retire ;
- pour « sur le modele de <jumeau> » : ce que le jumeau porte (etats,
  props, effets) et que la tache reprend ou ecarte, et ce qu un composant
  reutilise active par defaut (918 T032 : epinglage livre inerte).
Une tache pas prete est bloquante : corrige tasks.md, pas de validation 6.
Chaque US reste finissable en ~40 min : ~3-5 fichiers de prod, ~6 taches,
au plus 2 composants crees (un composant compte pour 2 fichiers).
Signale ce que tu corriges, ne corrige pas en silence.
Modules declenches : leur section « sanity 5 » s ajoute ici.

### A.6 Validation humaine du trio

AskUserQuestion (Approuver / Editer / Rejeter), avec le resume : US,
taches par US, fichiers vises, findings du lint restants. Avec design.md :
quatuor valide en meme temps. Point d arrivee. STOP.

## Relais

Trio approuve -> /sk-impl uniquement, dans une session NEUVE (`/clear`
puis `/sk-impl <FEATURE_DIR>`) : le trio, recon.md et design.md portent
tout. Dis-le dans ton message final, avec le slot demande par l humain
s il en a nomme un. Table de routage exhaustive :
`<SK_SHARED>/sk-routing.md` ; ne recommande aucune commande qui n y
figure pas. /sk-xs seulement si l humain n a PAS besoin du papier.

## Garde-fous

- Trio seulement : pas de code, pas de Workflow, pas de [X].
- Modules `<REF>/` : lus si et seulement si declenches, en entier.
- Une seule AskUserQuestion de perimetre (0quater), apres les lectures.
- A.1bis apres la recon : XS = question, jamais de specify direct.
- US choisies seulement, artefacts vides interdits, after_specify SKIPPED.
- Tache = une ligne = un fichier prod + `Test:` ; `Monté dans:` pour tout
  composant, hook, service cree ; audit-lint : HIGH mount/wire bloquants.
- recon.md toujours, depuis recon-seed.mjs, verifie sur origin/<defaut>, < 10 Ko.
- Relais ferme : /sk-impl.
