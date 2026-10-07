---
name: sk-notion
description: Superviseur pilote par Notion. Ecoute un tableau de taches Notion, prend les taches « À faire » par priorite, lance /sk-prep puis /sk-impl (ou /sk-xs pour une petite tache) en sessions de fond, repond seul a ce qui se deduit de la tache, pose le reste en commentaire Notion, joue le cahier E2E dans Claude in Chrome avant de publier, puis ecrit la PR et le compte rendu dans la ligne. Use when the user invokes /sk-notion or wants Claude to work through a Notion task board automatically.
argument-hint: "[setup | status | stop]"
disable-model-invocation: true
allowed-tools: Agent Bash PowerShell Read Write Edit Glob Grep AskUserQuestion ToolSearch ListAgents SendMessage mcp__Notion mcp__claude-in-chrome
---

# Superviseur Notion (`/sk-notion`)

Argument : **$ARGUMENTS** (vide = ecouter le tableau).

Cette session est le superviseur du contrat `<SK_SHARED>/sk-supervisor.md`
(`/mon-developpeur` dont la boite de reception est Notion). Elle ne code pas :
elle lance, repond, verifie et rend compte. Les sessions enfants sont des
`/sk-prep`, `/sk-impl`, `/sk-xs` ordinaires, qui la detectent par
`supervisor.json` et lui envoient leurs `[SK-QUESTION]` au lieu de les afficher.

`<SK_SHARED>` = `~/.claude/skills/_shared` ; `<SUP>` = SUPERVISOR_DIR
(`_shared/sk-config.md`). Le cerveau est `<SK_SHARED>/notion-plan.mjs` : il
decide (qui prendre, quoi repondre seul, quoi demander), toi tu executes ses
actions. Ne redecide pas a sa place ; s il te semble faux, dis-le dans le
Journal de la tache et suis-le quand meme, sauf action irreversible.

## Le tableau Notion (contrat)

Proprietes exactes (la casse et les accents comptent) :

| Propriete | Type | Role |
|---|---|---|
| `Tâche` | titre | le besoin en une ligne ; le DETAIL est le corps de la page |
| `Statut` | select | `Brouillon`, `À faire`, `Claude prépare`, `Question pour toi`, `Réponse donnée`, `Plan à valider`, `Plan validé`, `Claude implémente`, `Claude teste`, `Terminé`, `Bloqué` |
| `Priorité` | select | `Urgente` > `Haute` > `Normale` (vide = Normale) > `Basse` |
| `Projet` | select | cle de `projects` dans notion.json (un seul projet : peut rester vide) |
| `Taille` | select | `Auto` (tu choisis), `Petite (XS)` -> /sk-xs, `Feature` -> /sk-prep + /sk-impl |
| `Validation du plan` | select | `Je valide` (defaut : tu attends `Plan validé`) ou `Auto` |
| `Résultat` | url | la PR (ou la branche publiee) |
| `Tests navigateur` | texte | `PASS n · FAIL n · BLOQUE n` du dernier passage Chrome |
| `Journal` | texte | ta derniere nouvelle, une phrase datee `HH:MM` |
| `Feature`, `Session`, `Démarré`, `Fini`, `Num` | texte, texte, date, date, id | dossier specs, verrou, horodatage, numero `TK-n` |

Vue de lecture : `File Claude (ne pas modifier)`, table filtree sur les statuts
actifs, triee par `Num`. Tu la lis en mode `view` de
`notion-query-data-sources` (sans quota, contrairement au SQL).

`/sk-notion setup` : cree la page, la base (ce schema, DDL dans
`<SK_SHARED>/notion-schema.sql`), la vue tableau de bord (board par Statut) et la
vue de lecture, puis ecrit notion.json. Demande seulement les chemins des depots.

## Configuration : `<SUP>/notion.json`

```json
{ "view": "https://www.notion.so/<db>?v=<vue File Claude>", "dataSource": "collection://...",
  "session": "<ton nom ListAgents>", "projects": { "Tableau": "C:/dev/tableau-front" },
  "maxParallel": 2, "pollMinutes": 5, "staleMinutes": 45, "e2eRounds": 2, "launcher": "bg" }
```

`maxParallel` borne les enfants qui TRAVAILLENT (une tache qui attend l humain
ne compte pas : elle ne bloque pas la suivante). `launcher` : `bg` (defaut,
`claude --bg`) ou `agent` (banc, voir §Lanceur).

## 0. Demarrage (une fois)

1. `ListAgents` -> ton nom. Ecris `<SUP>/supervisor.json`
   (`{session, ref, startedAt, heartbeatAt}`, UTC) : c est ce qui fait de toi le
   superviseur des enfants. Lis `<SUP>/runs.json` (memoire, cree vide sinon).
2. Absent notion.json -> `setup` d abord.
3. Un autre superviseur vivant (heartbeat < 30 min, autre nom) -> STOP : deux
   superviseurs se voleraient les reponses. Un ancien supervisor.json MORT (heartbeat
   > 30 min, autre nom : redemarrage du conteneur, nouvelle session) -> ajoute son nom a
   `adopt` dans notion.json avant de l ecraser : ses taches deviennent les tiennes
   (`reclaim`) au lieu de rester verrouillees a jamais.

`stop` : supprime supervisor.json, annule le sommeil de fond, dis combien de
runs restent vivants (ils retombent sur leurs questions locales). `status` :
une ligne par run de runs.json (tache, phase, attente, age).

## 1. Un tick (au demarrage, puis a chaque reveil)

1. Heartbeat : reecris `heartbeatAt`.
2. Lis la vue (mode view, toutes les pages) -> `<SUP>/rows.json`, une ligne par
   page : `url` + chaque propriete sous son nom exact (`Num` en nombre).
3. `node <SK_SHARED>/notion-plan.mjs tick --rows <SUP>/rows.json --state <SUP>/runs.json --config <SUP>/notion.json`
4. Execute CHAQUE action, dans l ordre (§2), en mettant runs.json a jour apres
   chacune (une compaction ne doit rien perdre).
5. Reveil : `Bash({ command: "sleep <pollMinutes*60>", run_in_background: true })`
   puis fin de tour, une ligne : « Notion : n en cours, m en attente de toi —
   prochain passage HH:MM ». Un message d enfant te reveille avant : traite-le
   (§3) sans relancer de sommeil s il en reste un.

## 2. Actions du tick

Chaque ecriture Notion touche `Journal` (« HH:MM <quoi> »). Commentaires :
`notion-create-comment` sur la page de la tache, **toujours prefixes `🤖 Claude — `**
(`CLAUDE_PREFIX` de notion-plan.mjs). Dans Notion tes commentaires sont postes sous le
compte de l humain : le prefixe est la seule facon de les distinguer. Une reponse
humaine = un commentaire SANS ce prefixe, posterieur a la question (`humanReply`) ; ne
lis jamais tes propres commentaires comme une reponse.

| Action | Ce que tu fais |
|---|---|
| `claim` | `Statut` = `Claude prépare` (`Claude implémente` si route xs), `Session` = ton nom, `Démarré` = maintenant. Lis le corps de la page (`notion-fetch`) et les commentaires. Ecris `<repo>/.sk/notion/TK-<num>.md` : titre, detail integral, priorite, et « Reponses deja donnees » (vide). Ajoute `.sk/notion/` a `<repo>/.git/info/exclude` (sinon le brief apparait en fichier non suivi et un enfant peut le commiter). Route `judge` : XS si le detail tient en 1 fichier, ~10-30 lignes, 1 comportement, pas d ecran neuf, 0 decision d archi (critere de /sk-xs) ; sinon feature ; dis ton choix dans le Journal. Lance l enfant (§Lanceur) et ajoute le run : `{num, child, phase, repo, brief, startedAt, validation}`. |
| `queued` | rien (Journal « en file, n devant » une seule fois) |
| `block` | `Statut` = `Bloqué`, commentaire = la raison et quoi corriger |
| `relay-answer` | `notion-get-comments` -> `<SUP>/comments.json` (`[{text, at}]`) puis `notion-plan.mjs answer --comments-file <SUP>/comments.json --state ... --page <url>` (garde les commentaires humains posterieurs a `pending.askedAt`) ; aucun -> commentaire « je ne vois pas ta reponse : ecris-la en commentaire » ; `null` (ambigu) -> nouveau commentaire « je n ai pas compris : reponds par le numero » et `Statut` = `Question pour toi`. Sinon SendMessage a l enfant, ajoute la reponse au brief (« Reponses deja donnees »), `pending` = null, `Statut` = phase en cours. |
| `send` | SendMessage `text` a l enfant, `Statut` = `status`, `pending` = null |
| `cancel` | `claude stop <child>` (ou TaskStop en banc), run `finished`, `Session` vide, commentaire « arrete : <raison> » |
| `check-alive` | `claude agents --json` : enfant absent -> `Bloqué` « session perdue » ; present et `claude logs <id>` finit sur « Do you want » -> `Question pour toi` : « autorisation a donner : `claude attach <id>` » ; sinon rien (travail long). |
| `reclaim` | reprise apres redemarrage (l enfant est perdu, la ligne reste a toi ou a un superviseur mort adopte) : relis la page et les commentaires, ajoute au brief `<repo>/.sk/notion/TK-<num>.md` les reponses humaines deja donnees (`humanReply` sans date), `Session` = ton nom, `Statut` = `Claude prépare` (`Claude implémente` si `phase` impl ou xs), commentaire « reprise apres redemarrage : <phase> relancee avec tes reponses ». Relance l enfant : `phase` prep -> `/sk-prep` (il n a pas a reposer une question deja tranchee dans le brief), impl -> `/sk-impl <feature>` (reprend sur STATE.md). Run `reclaimed: true`. |
| `orphan` | `Bloqué` « reprise impossible apres redemarrage du superviseur : remets À faire pour relancer » (taille non tranchee, ou phase impl sans `Feature`) |

## 3. Message d un enfant

1. Ecris le texte dans `<SUP>/msg.txt` puis
   `node <SK_SHARED>/notion-plan.mjs message --text-file <SUP>/msg.txt --from <from-name> --state <SUP>/runs.json --rows <SUP>/rows.json --config <SUP>/notion.json`
   Expediteur inconnu de runs.json -> ignore, une ligne.
2. `lastMsgAt` = maintenant. Puis selon `decision.type` :

| Decision | Ce que tu fais |
|---|---|
| `log` | Journal seulement (`[SK-START]` : note le slot dans le run) |
| `answer` | SendMessage `text` tel quel ; Journal « repondu seul : <option> » |
| `judge` | relis le brief : la reponse y est ECRITE (le detail tranche, ou une reponse deja donnee) -> SendMessage `[SK-ANSWER] <n> — d apres la tache : <citation courte>`. Sinon c est une decision produit : `relay`. Jamais d invention, jamais « par defaut ». |
| `relay` | commentaire : contexte en 3-8 lignes lisibles par un non-dev, options numerotees, « Reponds par le numero ou une phrase, puis mets le statut sur Réponse donnée ». `Statut` = `Question pour toi`, run `pending` = `{kind:"question", type, options, expectsText, askedAt}` |
| `plan` | `Statut` = `Plan à valider`. Ajoute en fin de page une section « Plan proposé par Claude » : objectif, une ligne par US (ce que l utilisateur pourra faire), fichiers touches (nombre), risques, chemin du trio. Commentaire « Plan pret : mets Plan validé, ou commente ce qu il faut changer puis Réponse donnée ». `pending` = `{kind:"trio", approve, edit, options, askedAt}` |
| `launch-impl` | `Feature` = la feature, `Statut` = `Claude implémente`, run `phase` = impl, nouvel enfant `/sk-impl <feature>` (session neuve : le contexte de prep ne la suit pas) |
| `e2e` | §4 |
| `done` | `Statut` = `Terminé`, `Résultat` = pr (sinon la branche), `Fini`, `Session` vide ; section « Compte rendu » : US livrees, verdicts de revue, passage Chrome, duree. Run `finished`. |
| `block` | `Statut` = `Bloqué`, commentaire = la raison + la commande pour reprendre a la main ; run `finished` |

## 4. Passage navigateur avant publication (Claude in Chrome)

Declenche par le verdict de /sk-impl ou /sk-xs quand la revue est verte : rien
ne se publie sans avoir ete VU fonctionner. `Statut` = `Claude teste`.

1. Cahier : `FEATURE_DIR/e2e.md` selon `<SK_SHARED>/sk-e2e.md` (un scenario par
   Acceptance Scenario de spec.md, oracles observables, oracles transverses).
   Tache XS : 1 a 3 scenarios tires du detail de la tache. Pas de validation
   humaine du cahier ici : la tache Notion EST la commande.
2. Serveurs : depuis le slot de l enfant (`slot=` du [SK-START]), via
   `<SK_SHARED>/sk-runtime.ps1` (`up`, ports du slot ; jamais `yarn dev` a la
   main). Back de la meme branche s il existe (contrat sk-runtime).
3. Joue le cahier dans Claude in Chrome (skill chrome-browser : nouvel onglet,
   `read_console_messages`, `read_network_requests`), preuve par scenario.
   Claude in Chrome absent : script Playwright du poste, 3 runs, `e2e-oracles.mjs`
   (sk-e2e §Mode lot) — dis-le dans le rapport.
4. Rapport `FEATURE_DIR/e2e-report.md` (ligne de synthese `PASS n · FAIL n · BLOQUE n`),
   `Tests navigateur` = cette ligne, captures en commentaire si possible. Arrete
   les serveurs (`sk-runtime.ps1 down`).
5. `node -e` sur `decideE2E` de notion-plan.mjs (rapport, pending, round,
   e2eRounds) :
   - `answer` + `withPr` : ecris `FEATURE_DIR/pr.md` (resume, scenarios verifies
     dans Chrome, findings de revue) et envoie `text` + ` · pr=<chemin pr.md>` ;
   - `answer` + `withFindings` : ecris `findings.md` (un FAIL = AC vise, observe,
     attendu, preuve) et envoie `text` + ` · findings=<chemin>` ; `Statut` =
     `Claude implémente`, run `e2eRound` = nextRound. Le verdict suivant
     redeclenche ce §4.
   - `relay` : la question de verdict part dans Notion (§3 relay) avec le
     resume des FAIL/BLOQUE et le lien du rapport.

## Faux Notion (banc, poste sans connecteur, ou humain qui ne veut aucune invite)

`notion.json` avec `"board": "<chemin>/board.json"` : tu ne fais AUCUN appel MCP Notion ;
chaque operation passe par `node <SK_SHARED>/notion-sim.mjs` (meme tableau, memes
proprietes, memes regles) :

| MCP Notion | notion-sim.mjs |
|---|---|
| vue en mode view -> rows.json | `view --board B --out <SUP>/rows.json` |
| `notion-fetch` d une tache | `fetch --board B --page TK-n` |
| `notion-update-page` proprietes | `set --board B --page TK-n Statut="..." Journal="..."` |
| section ajoutee en fin de page | `append --board B --page TK-n --file section.md` |
| `notion-create-comment` | `comment --board B --page TK-n --file c.txt` (prefixe ajoute seul) |
| `notion-get-comments` | `comments --board B --page TK-n` (sortie = comments.json) |

`render --board B --out board.md` donne le tableau lisible pour l humain. Une reponse
humaine s y ecrit avec `comment ... --as human` (sans prefixe).

## Lanceur

`bg` (poste du developpeur) : depuis le depot du projet, **en PowerShell 7 sous
Windows** (piege MSYS2 de sk-supervisor.md) :
`claude --bg -n sk-<prep|impl|xs>-TK<num> --permission-mode acceptEdits "/sk-prep <titre> — besoin complet : <chemin du brief>"`.
Verifie au tick suivant que le nom apparait dans `ListAgents` ; sinon `Bloqué`
« lancement echoue » avec la commande.

`agent` (banc sans `claude --bg`) : Agent `general-purpose`, `run_in_background`,
prompt = « Tu es la session `<child>` qui vient de recevoir `/sk-<x> <args>` ;
lis `<SK_HOME>/skills/sk-<x>/SKILL.md` et applique-le. Superviseur joignable :
au lieu de SendMessage, TERMINE ton tour avec le message `[SK-...]` comme seul
texte final ; tu seras relance avec la reponse. » La fin de l agent = un message
d enfant (§3) ; repondre = SendMessage a l agent. Un agent ne parle qu a toi.
Constate au banc : un agent envoie parfois quand meme son `[SK-...]` par SendMessage
(handback) au lieu de son texte final ; c est le MEME message, traite-le pareil (§3),
une seule fois. Un agent ne survit pas a un redemarrage du conteneur (`claude --bg`,
oui) : la reprise passe alors par `reclaim` (prompt de reprise :
`examples/miro/bench/mkresume.py`, historique questions/reponses inclus). Un agent n a pas l outil Agent : son
« worker » et sa revue sont faits par lui-meme (revue moins independante qu en
`bg`) — le lanceur `agent` sert au banc, pas a la production.

## Ce que tu ne fais jamais

- Coder ou corriger toi-meme dans un slot (c est le role des enfants).
- Repondre a une question produit que la tache ne tranche pas.
- Publier sans passage navigateur, ou requalifier un BLOQUE en PASS.
- Prendre une tache verrouillee par une autre `Session`.
- Modifier le titre ou le detail ecrits par l humain (tu ajoutes des sections a la fin).
