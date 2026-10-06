# Protocole superviseur — `/mon-developpeur` <-> orchestrateurs sk-* (source unique)

Contrat lu par `/sk-prep`, `/sk-impl`, `/sk-xs` et `/mon-developpeur`. Il remplace, quand un
superviseur est joignable, chaque `AskUserQuestion` d un orchestrateur par un
echange de messages inter-sessions (`SendMessage`). Sans superviseur, rien ne
change : l orchestrateur pose sa question a l humain comme avant.

## Pourquoi des messages et pas un sous-agent

Un sous-agent n a ni `AskUserQuestion`, ni `Workflow`, ni `ScheduleWakeup` :
`/sk-impl` lance en sous-agent serait mutile. Et une session ne peut PAS repondre
au selecteur `AskUserQuestion` d une autre session : un message inter-sessions
arrive en texte, jamais en frappe clavier. Donc : l orchestrateur reste une
session interactive normale, et quand un superviseur existe il lui ENVOIE sa
question au lieu de l afficher, puis attend la reponse en fin de tour.

Limite connue : les **demandes d autorisation d outil** (« Do you want to… ») ne
passent pas par ce protocole et ne peuvent pas etre approuvees a distance. Une
session orchestratrice destinee a tourner sous superviseur se lance avec un mode
de permission adapte (`claude --permission-mode acceptEdits "/sk-impl 913"`,
ou le reglage `implCommand` de Claude Fleet).

## Registre du superviseur

`<SUPERVISOR_DIR>/supervisor.json` — ecrit par `/mon-developpeur` seul. `SUPERVISOR_DIR` se
resout dans `_shared/sk-config.md` (`C:\tmp\mon-developpeur` par defaut sous Windows) :

```json
{ "session": "mysepteoweb-b8", "ref": "779997", "startedAt": "2026-09-21T08:00:00Z", "heartbeatAt": "2026-09-21T08:40:00Z" }
```

`session` est le nom que `ListAgents` affiche pour la session superviseur (la
ligne « This session is <nom> [<ref>] »). `heartbeatAt` est reecrit a chaque
reveil du superviseur.

## Detection par un orchestrateur (a CHAQUE question, pas seulement au demarrage)

```bash
sup="${SK_SUPERVISOR_DIR:-}"  # _shared/sk-config.md §SUPERVISOR_DIR
[ -n "$sup" ] || case "$(uname -s)" in MINGW*|MSYS*|CYGWIN*) sup=/c/tmp/mon-developpeur ;; *) sup="$HOME/.cache/mon-developpeur" ;; esac
hb=$(jq -r .heartbeatAt "$sup/supervisor.json" 2>/dev/null)
now=$(date -u +%s)
hbEpoch=$(date -u -d "$hb" +%s 2>/dev/null)
echo "age_minutes=$(( (now - hbEpoch) / 60 ))"
```

Superviseur **joignable** si les quatre sont vrais :

1. le fichier existe et se parse ;
2. `heartbeatAt` (UTC, cf. Patch 1) date de moins de **30 minutes** ;
3. `ListAgents` liste une session portant exactement ce `session` ;
4. la variable d environnement `SK_NO_SUPERVISOR` n est PAS a `1`.

Par defaut (rien de pose), un superviseur detecte joignable est TOUJOURS sollicite :
c est lui qui decide, pas l humain. `SK_NO_SUPERVISOR=1`, pose par l humain dans son
propre terminal avant d invoquer `/sk-impl`, `/sk-prep` ou `/sk-xs`, est la seule
echappatoire pour garder la main sur un run qu il lance lui-meme.

Sinon : **absent**.

**La detection est refaite avant CHAQUE question**, pas une fois au demarrage du run :
un superviseur absent au demarrage et joignable plus tard doit pouvoir reprendre la main
des la question suivante ; un superviseur mort en cours de run doit cesser d etre
sollicite sans attendre la fin du run. Une question deja tranchee (AskUserQuestion
repondue localement, ou [SK-ANSWER] deja applique) ne change pas retroactivement de
destinataire — voir §Timeout et repli.

`SendMessage` est un outil differe : `ToolSearch select:SendMessage` avant le
premier envoi. `ListAgents` est direct.

## Messages — orchestrateur vers superviseur

Trois types, reconnaissables a leur premiere ligne. Un message = un seul type.

### `[SK-START]` — un run commence (apres le GO, avant tout Agent/Workflow)

```
[SK-START] projet=<REPO_SLUG> feature=<NNN>-<slug> skill=sk-impl slot=wt-2 slotBack=wt-1|aucun branche=sk-impl-<slug> session=<nom ListAgents de l orchestrateur> principal=<PROJECT_DIR>
```

`/sk-prep` l envoie apres la question de perimetre : `skill=sk-prep slot=prep`.

### `[SK-QUESTION]` — la question que l humain aurait recue

```
[SK-QUESTION] projet=<REPO_SLUG> feature=<NNN>-<slug> skill=sk-impl slot=wt-2 type=<type>
Contexte :
<3 a 12 lignes : exactement ce que l AskUserQuestion aurait montre — slot, branche,
US retenues, fichiers vises, gates, diff stat, ou hypotheses / variantes / perimetre
pour sk-prep. Chemins absolus des fichiers utiles (tasks.md du slot, STATE.md…).>
Options :
1. <libelle exact de l option 1>
2. <libelle exact de l option 2>
3. <libelle exact de l option 3>
Reponse attendue : [SK-ANSWER] <n> — <motif>
```

Types admis : `go` (Lancer/Ajuster/Abandonner), `verdict` (Publier/Corriger/
Abandonner), `slot` (attendre/forcer/abandon, reset d un slot sale, reuse vs neuf
backend), `feature` (plusieurs FEATURE_DIR candidats), `perimetre` (sk-prep
0quater), `xs` (sk-prep A.1bis), `design` (variante, fichier, ecart lib<->design),
`hypotheses` (sk-prep apres clarify), `trio` (Approuver/Editer/Rejeter), `autre`.

Une question qui attend une **phrase** et non un choix : pas de bloc Options,
et `Reponse attendue : [SK-ANSWER] texte: <phrase>`.

**Apres l envoi, l orchestrateur arme une attente bornee puis TERMINE SON TOUR** sur une
seule ligne : « En attente de <session superviseur> (repli auto dans 5 min) — ou reponds
directement ici. »

## Timeout et repli

Delai : **5 minutes**. Verifie dans `mon-developpeur/SKILL.md` (Phase 1 — La veille) :
le superviseur reecrit `heartbeatAt` sur un `TICK` emis « toutes les 10 min ». 5 min est
donc bien plus court que ce cycle : une session superviseur occupee (verification Chrome,
sous-agent) garde le temps de repondre sans geler le run une demi-heure ; c est aussi
plus long qu un echange inter-sessions normal (quasi immediat quand la session est
libre).

Mecanisme CONCRET (verifie par ToolSearch dans cette session, voir Incertitudes pour ce
qui reste a prouver en conditions reelles) : il n existe PAS d outil nomme
`ScheduleWakeup` dans cet environnement — ce nom a ete propose dans une version anterieure
de ce patch et n a jamais ete confirme ; il est retire. Le mecanisme retenu s appuie sur
un outil deja accorde aux trois skills (Bash figure dans leurs `allowed-tools` actuels,
aucune modification de `allowed-tools` n est donc necessaire pour ce patch) :

1. Juste apres l envoi du `[SK-QUESTION]`, l orchestrateur lance
   `Bash({ command: "sleep 300", run_in_background: true, description: "repli SK-QUESTION <id>" })`.
   Un Bash lance avec `run_in_background: true` rend la main immediatement et notifie la
   session, comme un evenement de fond, quand la commande se termine — c est le
   comportement documente de ce mode pour « une seule notification quand X est pret ».
2. L orchestrateur termine son tour normalement (comme avant ce patch).
3. Deux evenements peuvent le reveiller ensuite, dans n importe quel ordre :
   - `[SK-ANSWER]` arrive avant l expiration du `sleep` : traiter normalement (§Ce que
     l orchestrateur fait en recevant [SK-ANSWER]). Le `sleep` de fond devient sans objet ;
     l annuler avec `TaskStop` s il est encore documente comme actif (voir Incertitudes :
     le mode d appel exact de `TaskStop` sur une tache Bash `run_in_background` n a pas
     ete verifie).
   - La notification de fin du `sleep` arrive sans `[SK-ANSWER]` recu entre-temps :
     reposer EXACTEMENT la meme question en `AskUserQuestion` local, memes options, meme
     ordre. Si l humain repond ici, sa reponse prime. Un `[SK-ANSWER]` qui arrive APRES ce
     repli est ignore, meme regle que la reponse humaine anticipee (§Ce que l
     orchestrateur fait en recevant [SK-ANSWER], point 5) : « deja tranche localement :
     <choix> ».

### `[SK-DONE]` — le run est clos (derniere action de la skill)

```
[SK-DONE] projet=<REPO_SLUG> feature=<NNN>-<slug> skill=sk-impl slot=wt-2 issue=<published|kept|abandoned|trio-approved|trio-rejected|stopped> pr=<url ou aucun> state=<chemin STATE.md ou aucun> motif=<une phrase>
```

`published` = branche `feature/<NNN>-<slug>` poussee et PR draft creee
(`_shared/sk-publish.md`) ; `kept` = « Corriger » ou « Abandonner » avec slot conserve ;
`stopped` = STOP garde-fou (hash contrat, review2 FAIL, budget, conflit de squash, push
refuse). Toujours envoye, meme en echec : un superviseur qui ne recoit pas de `SK-DONE`
croit le run vivant.

## Messages — superviseur vers orchestrateur

```
[SK-ANSWER] <n> — <motif en une phrase>
```

`<n>` est le numero d option **tel que lu dans le message SK-QUESTION**. Le
motif est obligatoire : il est journalise des deux cotes.

Variantes :

- `[SK-ANSWER] texte: <phrase>` pour une question ouverte.
- `[SK-ANSWER] 1 — Publier · pr=<chemin absolu de pr.md>` : verdict « Publier » avec
  la description de PR preparee par le superviseur (scenarios verifies a l ecran,
  findings traites). `/sk-impl` l utilise comme corps de la PR draft.
- `[SK-ANSWER] 2 — Corriger · findings=<chemin absolu de findings.md>` : verdict
  « Corriger » assorti d une liste d ecarts. `/sk-impl` traite alors les ecarts
  dans le meme run (voir sa section Publication) au lieu de s arreter.
- `[SK-ANSWER] escalade — <motif>` : le superviseur ne tranche pas et a pose la
  question a l humain de son cote. L orchestrateur **re-affiche** alors sa
  question avec `AskUserQuestion` (l humain repondra dans l un ou l autre
  terminal ; la premiere reponse recue vaut).

## Sessions lancees par le superviseur (`claude --bg`)

Le superviseur ne peut pas ouvrir un terminal, mais il peut demarrer une **session de
fond** : `claude --bg -n <nom> --permission-mode acceptEdits "/sk-impl <feature>"`,
depuis le dossier du depot principal. C est une session interactive complete (pas un
`-p`) : elle vit, apparait dans `ListAgents`, recoit et envoie des messages — le
protocole ci-dessus s applique sans rien changer. `claude agents --json` la liste,
`claude logs <id>` montre sa fin d ecran, `claude attach <id>` la donne a l humain,
`claude stop <id>` l arrete en gardant la conversation.

Nom impose : `sk-impl-<NNN>`, `sk-prep-<NNN>` ou `sk-xs-<slug>` (`-n`). L orchestrateur lit son propre
nom dans `ListAgents` et le met dans `session=` de `[SK-START]`.

Une demande d autorisation d outil qui survit au mode de permission bloque la session
sans passer par le protocole : le superviseur la voit dans `claude logs` (« Do you want
to… ») et demande a l humain d attacher. **Mecanisme a eprouver** : la premiere fois,
verifier que la session `--bg` apparait bien dans `ListAgents` et que `Workflow` y tourne.

## ATTENTION - claude --bg depuis Bash convertit les slash-commands (piege MSYS2)

Le lancement d un `claude --bg` portant une slash-command en argument (`"/sk-impl 916"`,
`"/sk-prep <besoin>"`, `"/sk-xs <demande>"`) DOIT se faire depuis PowerShell 7, jamais
depuis Git Bash. Git Bash (MSYS2) convertit tout argument commencant par `/` en chemin
Windows avant l exec, meme quand ce n est pas un chemin de fichier : la slash-command
devient un chemin absurde, n atteint jamais la session, et le run est perdu sans erreur
visible cote appelant (le process demarre, `claude agents` le liste, mais rien n arrive
jamais en `[SK-START]`). Deja constate en pratique (perte de la feature 916).

## Ce que l orchestrateur fait en recevant `[SK-ANSWER]`

1. Verifier que le message vient bien de la session `supervisor.json.session`
   (`from-name` du message). Autre expediteur → ignorer, le dire.
2. Appliquer la reponse exactement comme si l humain avait choisi cette option.
3. Journaliser une ligne dans la sortie : « Superviseur : <n> — <motif> ».
4. Reprendre la skill la ou elle attendait. Rien d autre ne change.
5. **Une question, une reponse.** Si l humain a deja repondu dans le terminal, un
   `[SK-ANSWER]` qui arrive ensuite pour la meme question est ignore (une ligne : « deja
   tranche par l humain : <choix> »). Inversement, une reponse humaine apres un
   `[SK-ANSWER]` applique ne rouvre rien.

## Compaction et reprise

Une session longue est compactee ; `SUPERVISOR`, la question en attente et le run en
cours ne survivent que s ils sont **ecrits**. Cote orchestrateur : `STATUS_FILE` porte
deja slot et branche ; apres une compaction, relire `supervisor.json` et refaire la
detection (une ligne). Cote superviseur : `runs.json` est la seule memoire — apres une
compaction, relire `supervisor.json` et `runs.json` avant de repondre a quoi que ce soit,
ne rien deduire d un souvenir.

## Ce que l orchestrateur ne fait jamais

- Envoyer un `SK-QUESTION` puis continuer sans reponse (« par defaut je lance »).
- Reformuler ou reordonner les options entre l ecran et le message.
- Poser deux questions dans un message.
- Envoyer a un superviseur non verifie par `ListAgents`.
- Attendre un `[SK-ANSWER]` au-dela du delai de repli sans reposer la question
  localement.

## Transition

**Transition** : le contrat charge est fige au demarrage d une skill (`Skill` lit le
fichier une fois, au lancement de `/sk-impl`, `/sk-prep` ou `/sk-xs`). Un run deja en
cours a charge l ancien texte — detection unique au demarrage, sans UTC forcee, sans
repli borne — et le garde jusqu a sa fin (`[SK-DONE]`) ; il n y a aucun mecanisme pour lui
faire relire ce fichier en route. Un run lance APRES la mise a jour de ce fichier suit
integralement les nouvelles regles des son premier tour. Consequence pratique : un run
qui a envoye une `[SK-QUESTION]` juste avant la mise a jour de ce patch restera bloque
sans repli automatique si le superviseur ne repond pas — c est a l humain de repondre
dans ce terminal-la, comme avant ce patch.
