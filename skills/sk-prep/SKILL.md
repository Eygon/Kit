---
name: sk-prep
description: Variante PREPARATION-SEULE spec-kit. Produit le trio spec/plan/tasks (format spec-kit, ecrit directement depuis les gabarits du kit) sans implementer. Relais unique : /sk-impl. Use when the user invokes /sk-prep or wants spec-kit planning only.
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
| un contrat a ecrire dans contracts/ (endpoint appele, nouveau ou dicte par l humain), OU `backend` renseigne ET besoin qui touche l API, OU un champ d AC qui doit etre SERVI par une API ou une base et qui vient d un legacy, d un mockup ou d un autre systeme (un champ derive cote front d une donnee existante ne le declenche pas) | `<REF>/contracts.md` |

## 0. Sonde (UN appel Bash, avant toute autre action)

  node "<SK_SHARED>/sk-probe.mjs" --skill sk-prep

Elle rend en `cle=valeur` : AUDIT_MODE, superviseur (age du heartbeat,
calcule en UTC), branche par defaut (`origin/<defaut>`), cle `backend`
de .sk/repos.json, presence de agent-os/standards/index.yml, variante
des scripts spec-kit (ps1 / sh) et leur chemin, dossier i18n et test de
parite, alias tsconfig. Ce qu elle etablit ne se re-cherche pas.
Sonde absente ou en erreur : fais ces lectures a la main, une fois.
`standardsUnindexed` != none : ces standards existent mais aucune prep ne
peut les retenir ; dis-le en une ligne dans la question de clarify (a
ajouter a index.yml), sans les ancrer.

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
doublon de plan.md « Verified facts » : plan.md dit ce qui est vrai pour
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
AUCUN module design / legacy / code-search declenche : pas de 0quater,
SAUF besoin vague (ameliorer, optimiser, simplifier, « c est penible »,
sans comportement nomme) : alors 0quater = UNE question de perimetre apres
2-3 greps, avec 3-4 pistes concretes tirees du code, AVANT A.1bis (qui
ne peut pas juger la taille d un perimetre inconnu).
(Pourquoi pas de 0quater sinon : il ne poserait que « US retenues », or
les US n existent pas encore ; ce choix va dans la question de clarify A.2.)

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
  - une question de recon reste ouverte apres les 2-3 greps (point
    d insertion, source d une donnee) et touche un dossier que tu n as pas
    encore lu. Un besoin a plusieurs livrables dont les 2-3 greps ont
    trouve les points d entree ne fan-out PAS (cycles 1-2 du banc : 0 agent
    sur 13 preps, recon inline suffisante).

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
Chemins absolus interdits (les Verified facts doivent etre resolus par
/sk-impl et le lint). Hors format = relance UNE fois, puis model sonnet.

GARDE DE COUVERTURE avant specify : chaque question sans reponse, et
chaque zone ou une tache va ecrire sans qu aucun `searched` la couvre ->
un Grep/Glob cible ou UN agent de plus. Pas de specify avec une question
ouverte. Ce qui a ete comble va dans plan.md (Verified facts).
Chaque `path:lines` rendu se recopie tel quel dans les Verified facts :
audit-lint les confronte au depot (`verified-fact-*`).

### A.1bis Garde-fou de taille (APRES la recon, AVANT specify)

Seul moment ou renoncer au papier ne coute qu une minute. Criteres = ceux
de /sk-xs §-1, a l identique :

| Signal | Route |
|---|---|
| TOUS reunis : <= 2 fichiers de prod (LOCALES comptees pour un), ~10-30 lignes, 1 comportement, pas d ecran (ni ecran ni composant visuel CREE ; changer un format ou un libelle d un ecran existant n en est pas un), 0 decision d archi, 1 seul git root, aucun doc design / legacy fourni (un doc code-search ne compte pas : il reduit le risque), papier non demande explicitement | XS -> AskUserQuestion ci-dessous |
| un seul signal manquant | continue en A.2 : c est du papier |

AskUserQuestion, dans cet ordre :
  1. « Basculer vers /sk-xs (recommande) » -> STOP. Rien n est cree (pas
     de FEATURE_DIR, pas de create-new-feature). Annonce en UNE phrase :
     /sk-xs "<besoin>".
  2. « Garder le papier » -> continue. L humain garde la main.
Un XS qui passe ici sans question est le defaut mesure.

### A.2 Trio, ecrit DIRECTEMENT au format du kit, borne au perimetre du run

Le trio s ecrit depuis les gabarits `<TPL>` = `templates/` a cote de ce
fichier (spec.md, plan.md, requirements.md), aux titres de spec-kit : les
skills speckit-* ne s ouvrent PAS (leur machinerie generique — hooks,
branches, Setup/Foundational, taches de test separees — etait ensuite
defaite a la main, et leurs ~20 k tokens se relisaient a chaque tour).
Le trio reste lisible par /speckit-analyze et par les outils du kit.

**Dossier** — UN appel : le script create-new-feature de la sonde,
`--json --short-name "<slug>" "<besoin>"` (en audit : `<REF>/audit.md`
regle 2). Il cree FEATURE_DIR, .specify/feature.json et un spec.md de
gabarit spec-kit (tu l ecrases) ; rends-toi au
dossier qu il rend, VERIFIE qu il existe. Jamais de mkdir a la main.
Hook after_specify : SKIPPED (il reecrit AGENTS.md hors specs/).

**clarify + filet + US retenues : UNE AskUserQuestion, AVANT d ecrire
spec.md** (jusqu a 4 questions dans le meme appel). La recon et le besoin
suffisent a la poser : ecrire d abord la spec forcait a rediger des US et
des AC qu une reponse retirait ensuite (PDF, TVA). Passe le besoin au crible : perimetre exclu,
donnees et leur source, parcours et etats (vide, erreur, chargement),
regles et cas limites, contraintes non fonctionnelles, termes ambigus.
Une valeur, une option ou une donnee que le besoin nomme et que le depot
n a pas (enum sans la valeur, DTO sans le champ) : ni inventee, ni retiree
en silence — c est une question. Garde les 1-3 questions dont la reponse CHANGE une US, une AC ou une tache
(au moins une, sauf spec deja entiere), chacune avec 2-4 options et ta
recommandation en premier. Derniere question : le filet — les hypotheses
que tu as prises (portee, cas limites, regles), a valider ou corriger —
et, sans 0quater, les US retenues pour CE run (toutes par defaut ; deja
tranchees en 0quater : ne les repose pas).
AVANT de la poser, esquisse le decoupage (US -> fichiers de prod, LOCALES
pour un, types purs et compagnons « and its » pour zero) et confronte-le au cap (~6 fichiers dont
chaque fichier existant ETENDU, config comprise ; 8 au plus compagnons
compris ; ~6 taches ; au plus 2 composants crees par US) : le
decoupage propose fait partie de la question. Decouvrir le depassement au
lint, apres clarify, forcait a re-decouper contre la reponse de l humain
(banc, cycle 2 : 2 preps sur 5).
Reponses -> elles faconnent la spec que tu ecris ensuite, et s y tracent
sous `## Clarifications` (`### Session <date>`, une ligne `- Q: ... → A:
...` par question). Une US ecartee n est pas ecrite.

**spec.md** (gabarit `<TPL>/spec.md`, ecrit UNE fois, apres clarify) — le QUOI, sans
implementation. Une US = un livrable dont l Independent Test se joue SANS
les US suivantes, ~3-6 fichiers de prod (~20-40 min worker ; mesure : 6 fichiers = 2 a 5 min), ~3-6 taches.
Pas 1 fichier par US, pas toute la feature dans une US ; une petite US qui
reste un livrable a part (contrat, mapper, flag) se garde. Chaque US porte
des **Acceptance Scenarios** Given/When/Then : recopies au worker, le
reviewer juge dessus. INTERDIT : chemins API/backend ET pages/components
dans le meme [USn] (backend = code serveur : autre git root, Controllers,
Repositories, .cs ; dans un depot front, `src/api/` est la couche HTTP du
front, pas du backend : service + hook + ecran partagent une US si la
taille tient). Front sans backend modifiable qui appelle un endpoint :
le contrat (yaml/json dans contracts/) s ecrit TOI, en prep, avant les US ;
les US front codent contre lui et ne l inventent pas (`<REF>/contracts.md`).
Puis checklists/requirements.md (gabarit `<TPL>/requirements.md`) : coche
ce que la spec tient, laisse [ ] ce qu elle ne tient pas.

Ordre d ecriture : spec.md -> plan.md -> pack de standards (A.3) -> plan.md
`## Standards` -> recon.md (A.4bis) -> tasks.md.

**plan.md** (gabarit `<TPL>/plan.md`) — la synthese recon sous
`## Verified facts` (`chemin:lignes` + symbole + fait, recopies des
rapports), les standards (A.3), la table des fichiers touches par US, les
decisions. Artefacts conditionnels, fichiers vides INTERDITS : research.md
(decision qui demande plus de 3 lignes), data-model.md (entite ou champ
nouveau), contracts/ (interface qui change, chaque champ source),
quickstart.md (procedure manuelle non triviale).

**tasks.md** — ecrit UNE fois, directement dans ce format, que
brief-fill.mjs, audit-lint.mjs et mount-check.mjs lisent :

  # Tasks: <titre>
  ## [US1] <titre de l US>
  Standards: @agent-os/standards/react/hooks, @agent-os/standards/api/service-structure
  - [ ] T001 [US1] Creer `src/x/y.tsx` — <ce que fait la tache> — Test: `src/__tests__/x/y.test.tsx` — Monté dans: `src/pages/p/p.tsx`
  - [ ] T002 [US1] Etendre `src/api/a/aService.ts` (`createB`, POST /b de contracts/b.yaml) — Code: `src/api/a/aService.ts#getAll` — Test: `src/__tests__/api/a/aService.test.ts`
  - [ ] T003 [US1] Ajouter les cles `pages.x.*` dans `src/i18n/locales/fr.json`, `src/i18n/locales/en.json`, `src/i18n/locales/es.json` — <cle = fr / en / es> — Test: `<test de parite de recon.md>`

Une tache = une ligne = une action = UN fichier de prod + son `Test:`,
sauf les fichiers LOCALES : UNE tache pour toutes les langues (le lint les
compte pour un fichier), et un fichier de type pur (DTO, props, model,
enum et ses Record de libelles, entree qu un Record exhaustif exige pour un
nouveau membre d enum) qui se cree ou s etend DANS la tache de son premier
consommateur (« Creer `x.ts` et son
type `xProps.ts` ») : pas de tache ni de `Test:` a lui seul. La tache qui
cree un composant hote peut porter le montage de ce qu il consomme
(« ... et y monter `useX` (US1) »). Les tests ne sont PAS des taches separees (RED
puis GREEN dans la meme tache). Pas de phase Setup/Foundational sans
nouvelle API publique ; pas de tache pour lire les standards, baseline,
rituel RED, revue de diff, validation manuelle, verifier le design.
Une ligne dit QUOI, OU et AVEC QUOI (fichier, signature, endpoint, source
de la donnee, valeurs exigees) ; elle ne recopie pas le corps du code.
`Code:` = ce que la tache reutilise sans le modifier (hors cap de
fichiers). `Eviter: <symbole> (<raison>)` = un voisin qui ressemble mais ne
convient pas (ex. le formateur d affichage pour un export). MONTAGE (bloquant au sanity) : une tache qui CREE un composant,
un hook, un service ou un module de logique/systeme appele ailleurs porte
`Monté dans: <fichier>` (qui l importe et le rend ; sinon : qui l appelle),
touche par CETTE US. Point d entree non rendable en test (main.ts,
index.tsx) : garde-le a quelques lignes et monte dans un module
d orchestration extrait et testable (`src/engine/gameApp.ts`) ; une tache
CSS prend en `Test:` le test du module qui pose les classes. Parent d une autre
US ou pas encore cree : `Monté dans: <fichier> (US<n>)` ET, dans US<n>, une
tache « Monter <Nom> dans `<fichier>` » avec son test, qui rend <fichier>.
Rien a monter (utils, mapper, DTO, type, colonnes, route) : pas
d annotation. Une US qui ajoute une VARIANTE a un type deja consomme
(union d invites, d evenements, d etats) touche aussi le consommateur qui
l affiche ou la traite (HUD, director audio, switch), dans ses chemins ou
par une tache ; sinon la variante sort avec le texte d une autre (banc
jeu : invite de porte affichee comme un achat d arme). « Brancher / Cabler / Monter » cite le fichier cible.
`Slot : wt-N` nomme par l humain -> en-tete de plan.md.

### A.3 Standards AgentOS — appliques strictement, par depot, par US

Chaque git root a SES standards : `agent-os/standards/index.yml` du front
(sonde) et, pour une US back, celui de BACK_ROOT lu sur sa branche
d integration. Une US = un depot (API et UI jamais dans le meme [USn]), donc
UN jeu de standards par US.
1. Choisis, par US, les standards que ses fichiers vont reellement exercer
   (typiquement 3-5, ~10 au plus pour la feature, `_meta.maxPerGroup` fait
   foi), sans les `_meta.alwaysInject` : ils s appliquent d office et hors
   cap. Pas de standard « au cas ou » : chaque ancre est du contexte injecte
   au Sonnet et au reviewer.
2. UN appel, AVANT d ecrire tasks.md (les chemins et les noms des taches les
   appliquent : placement, nommage, enums, structure des services ; et une
   PARTIE de fichier qu un standard range ailleurs — textures, types,
   helpers, Record d enum — devient un compagnon « and its <x> `chemin` »
   de la tache : sinon le worker ne peut pas la placer et la revue escalade) :
     node "<SK_SHARED>/standards-pack.mjs" pack --root <depot> [--ref origin/<branche>] --ids <a,b,c>
   avec `--out "<FEATURE_DIR>/.standards-<depot>.md"` puis Read de ce
   fichier (le pack fait 30-40 Ko : sur stdout, Bash le tronque). Il rend
   le corps des alwaysInject + des standards choisis, et sort en 1 sur un
   id inconnu de l index de CE depot. Lis-le une fois ; ne recopie aucun
   corps dans le trio.
3. Ancres : sous chaque `## [USn]` de tasks.md, une ligne
   `Standards: @agent-os/standards/<a>, @agent-os/standards/<b>` (ids de
   l index du depot de l US), et la liste de la feature dans plan.md
   (`## Standards`). /sk-impl en tire le pack du worker et du reviewer.
Index absent du depot d une US = trio non livrable pour cette US.
4. Standard que le besoin contredit, ou qui exige une lib absente du depot
   (ex. `react/forms` impose react-hook-form + zod, absents de package.json ;
   l intent veut un 409 sous le champ la ou `api/error-handling` impose un
   toast) : c est une question de clarify, jamais une decision silencieuse.
   Ecart retenu par l humain -> plan.md `## Standards`, une ligne
   `- Ecart accepte : @agent-os/standards/<id> — <regle ecartee> — <raison> (clarify Qn)`.
   Le pack de l US le porte ; le reviewer ne le compte pas. Tout autre ecart
   au standard reste un defaut. Un standard qui cite un module absent du
   depot (helper, lib) : le depot prime, une ligne dans plan.md
   `## Standards` : `- Depot prime : @agent-os/standards/<id> — <module
   absent> -> <equivalent du depot>`, sans question. SAUF si cet
   equivalent change un AC (autre controle, autre comportement) : alors
   c est une question de clarify, comme ci-dessus.
### A.4 Gate checklists

Compte [ ] vs [X] dans FEATURE_DIR/checklists. Incomplete ->
AskUserQuestion : completer maintenant ou livrer en l etat. Recommande
(en premier) « completer » sauf si l item ouvert n est pas verifiable
depuis le code (valeur backend inconnue...) : alors « livrer en l etat »,
l item reste ouvert et cite en A.6.

### A.4bis recon.md

A ecrire juste APRES plan.md et AVANT tasks.md : les taches (`New:`, sources
des donnees) et la sanity s appuient dessus. Pars du squelette genere,
jamais d une page blanche :

  node "<SK_SHARED>/recon-seed.mjs" --root . --ref origin/<defaut> --out "<FEATURE_DIR>/recon.md"

Il ecrit les cinq titres fixes, la liste des composants partages (lue sur
origin/<defaut>, nom — chemin — props), la ligne LOCALES et le test de
parite, les alias tsconfig et les interdits grep-ables de depart, chaque
ligne avec sa source. Toi, ensuite (Edit) :
- sous « Composants partages reutilisables » (« Modules existants » sur un
  depot sans JSX : meme regle) : GARDE seulement ceux qui
  repondent a un mot de la spec (grille, etat vide, erreur, skeleton,
  modale, panneau, filtre, pastille...) ; supprime le reste ;
- sous « Helpers et hooks », « Pieges verifies », « Recettes de test » :
  ajoute ce que ta recon a etabli et qu un worker re-chercherait (source
  d une donnee transverse, format des nombres et son piege en test,
  comment les tests voisins mockent un service), une ligne par fait,
  `chemin:ligne` en source, 200 caracteres au plus ;
- sous « Pieges verifies », une ligne `- PARTAGE : \`a.ts\`, \`b.ts\` — ajout
  seulement` pour les fichiers EXISTANTS ou les standards rangent des
  entrees de toute US (config visuelle, registre d evenements, textes) :
  brief-fill les ouvre a chaque US en ajout seul. Sans elle, chaque US qui
  y range une valeur sort de ses chemins et la revue escalade (banc jeu) ;
- sous « Interdits grep-ables » : UNE regex par ligne, globale, rien
  d autre. Un piege qu on ne peut pas grep va dans « Pieges verifies ». Un
  interdit limite a un dossier (three.js dans src/logic) est deja porte par
  les controles mecaniques des standards (`metadata.checks`) : ne le
  recopie pas.
Chaque chemin cite existe sur origin/<defaut> : un module absent se dit
sans chemin (« aucun module audio »), sinon le lint le prend pour un
chemin perime (le working tree est
presque toujours sur une autre branche). Fichier < ~10 Ko : chaque worker
et chaque reviewer le relit en entier. Ne recopie pas le standard i18n :
la ligne LOCALES vient des fichiers, pas du standard.
Script absent : les memes cinq titres a la main, meme regles.

### A.5 Sanity tasks.md

D abord le linter, qui fait la partie mecanique :
  node "<SK_SHARED>/audit-lint.mjs" "<FEATURE_DIR>" --ref origin/<defaut>
(chemins en barres obliques, entre guillemets).
Bloquant : tout HIGH mount-*, wire-*, task-needs-search. story-too-many-*
est bloquant SAUF si l humain a retenu ce decoupage en clarify en voyant la
taille : alors signale-le en A.6, ne re-decoupe pas ; il ne compte pas comme
HIGH pour la validation 6 (ni pour un intent « approuver si aucun HIGH »). A corriger avant
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
  un alias transitoire NOMME qui couvre tout membre retire ; un
  consommateur que le changement ne force pas a modifier (prop optionnelle)
  se cite en `Code:` (relu, pas touche, hors cap de fichiers) ;
- pour « sur le modele de <jumeau> » : ce que le jumeau porte (etats,
  props, effets) et que la tache reprend ou ecarte, et ce qu un composant
  reutilise active par defaut (918 T032 : epinglage livre inerte).
Une tache pas prete est bloquante : corrige tasks.md, pas de validation 6.
Chaque US reste finissable en ~40 min : ~3-6 fichiers de prod (compagnons « and its » non comptes, 8 au plus avec eux), ~6 taches,
au plus 2 composants crees. Le lint fait le compte : un chemin cite hors
`Code:` compte, un modele a imiter se cite donc en `Code:`.
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
