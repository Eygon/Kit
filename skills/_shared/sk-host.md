# Hote d execution du kit sk-* (source unique)

Le kit tourne sur DEUX hotes : **Claude Code** et **Cursor**. La doctrine
metier — regimes, micro-cycles TDD, STOP, contrats de fichiers — est la meme
partout et vit dans les `SKILL.md`. Seul le RUNTIME change : noms d outils,
slugs de modeles, sous-agents, worktrees, CLI non interactive, navigateur.

**Ce fichier est la seule table de correspondance.** Une skill ne code jamais
un nom d outil Cursor ni un slug de modele Cursor en dur : elle renvoie ici.

## 0. Detecter l hote — une seule fois, au demarrage

| Indice | Hote |
|---|---|
| L outil `Task` existe, `Agent` n existe pas | **Cursor** |
| Le repertoire courant de skills est `~/.cursor/skills/` | **Cursor** |
| `$env:CURSOR_AGENT` est defini | **Cursor** |
| Sinon | **Claude Code** |

Hote incertain = **demande**, ne devine pas : un run lance avec la mauvaise
table de modeles depense sur les mauvais slugs et echoue tard.

Le reste de ce fichier se lit en COLONNE : la colonne de ton hote fait foi,
l autre colonne n est pas une alternative a essayer en cas d echec.

## 1. Outils

| Claude Code | Cursor | Note |
|---|---|---|
| `Bash` / `PowerShell` | `Shell` | cf. §6, contrainte de shell |
| `Read` | `Read` | identique |
| `Write` | `Write` | identique |
| `Edit` | `StrReplace` | meme semantique : ancre unique, remplacement exact |
| `Glob` | `Glob` | identique |
| `Grep` | `Grep` | identique |
| `AskUserQuestion` | `AskQuestion` | **attendre la reponse**, elle n est pas rendue en ligne |
| `Agent(...)` | `Task(...)` | cf. §3 |
| `Skill(nom)` | lire puis executer `<SKILL_ROOT>/<nom>/SKILL.md` | Cursor n a pas d invocation de skill par outil |
| `ToolSearch` | — | tous les outils Cursor sont deja charges, rien a selectionner |
| `Workflow` | — | **pas d equivalent**, cf. §4 |
| `EnterWorktree` / `ExitWorktree` | — | **pas d equivalent**, cf. §5 |
| `DesignSync` | — | **pas d equivalent**, cf. §8 |
| `mcp__claude-in-chrome__*` | `mcp__playwright__*` | cf. §7 |
| `mcp__azure__*` | `mcp__azure__*` | meme serveur MCP des deux cotes |

Un outil marque « pas d equivalent » ne se contourne pas en silence : la
section indiquee dit quoi faire a la place, ou prescrit un STOP.

## 2. Modeles

Cursor sert Opus 5 et Sonnet 5 NATIVEMENT : la doctrine « Sonnet pour le code,
Opus pour la revue » se transpose sans perte. Seul Haiku n a pas d equivalent.

| Role dans le kit | Claude Code | Cursor |
|---|---|---|
| Orchestrateur (parent) | Opus | `claude-opus-5-medium` |
| Revue (`us-reviewer.md`) | Opus medium | `claude-opus-5-medium` |
| Dev TDD (`us-sonnet.md`, `tdd-dev`) | Sonnet | `claude-sonnet-5-high` |
| Recon read-only (`Explore` de `/sk-prep` A.1) | Haiku | `gemini-3.8-flash-low` |
| Sessions d audit (`/sk-audit`) | slug du plan | meme slug, colonne Cursor |

Le slug Cursor se passe TOUJOURS explicitement (`Task.model`, `--model`) :
omis, il herite du modele de session, qui n est pas une decision du kit.

**Il n y a pas de Haiku dans Cursor.** La recon read-only bascule sur
`gemini-3.8-flash-low`, meme regle de declenchement (2 roots, > 1 sous-systeme,
regime >= M) — jamais sur un XS, ou la recon reste inline.

Verifier la liste avant une campagne : `cursor-agent --list-models`. Un slug
absent de cette liste ne s invente pas.

## 3. Sous-agents

Cursor a un outil `Task` dont les champs sont ceux de l outil `Agent` de
Claude Code : `description`, `prompt`, `subagent_type`, `model`, `name`.

| Agent du kit | Claude Code | Cursor |
|---|---|---|
| `tdd-dev` | `Agent(subagent_type: "tdd-dev")` | subagent **custom** `tdd-dev`, depuis `~/.cursor/agents/tdd-dev.md` |
| `tdd-reviewer` | `Agent(subagent_type: "tdd-reviewer")` | subagent **custom** `tdd-reviewer` |
| recon read-only | `Agent(subagent_type: "Explore")` | subagent natif `explore` |
| tache generique | `Agent(subagent_type: "general-purpose")` | subagent generique (defaut) |

Les definitions `agents/tdd-dev.md` et `agents/tdd-reviewer.md` du depot sont
installees a l identique dans `~/.cursor/agents/` : meme frontmatter
(`name`, `description`), meme corps. Il n y a rien a reecrire.

Si Cursor refuse un `subagent_type` custom, **n abandonne pas le brief** :
relance le meme `Task` sans `subagent_type` et colle le corps de
`agents/<nom>.md` en tete du `prompt`. Le brief est la substance, le type
n est qu un raccourci.

## 4. Boucle N US — le remplacant de `Workflow`

`Workflow` et `_shared/speckit-us-loop.js` sont un runtime Claude Code. Dans
Cursor, **la boucle se rejoue a la main**, sequentiellement, avec exactement
le meme enchainement :

```
pour chaque US de tasks.md, dans l ordre :
  Task(tdd-dev,      claude-sonnet-5-high,  brief = us-sonnet.md)
  Task(tdd-reviewer, claude-opus-5-medium,  brief = us-reviewer.md)
  si FAIL : Task(tdd-dev, claude-sonnet-5-high, brief = fix des bloqueurs)
```

`speckit-us-loop.js` et `speckit-us-after-parallel.js` se LISENT alors comme
une specification de l enchainement, ils ne s executent pas. Une US ne demarre
jamais avant que la revue de la precedente soit rendue.

n == 1 : un seul `Task` dev, puis **toi** (l orchestrateur) appliques
`us-reviewer.md` sans spawner de reviewer. Identique aux deux hotes.

## 5. Worktrees

Le pool `<POOL_BASE>/<REPO_SLUG>/wt-1..4` de `_shared/sk-config.md` est
commun aux deux hotes : meme racine, meme nommage, meme `STATUS_FILE`.

| | Claude Code | Cursor |
|---|---|---|
| Entrer dans un slot | `EnterWorktree` | rester dans le principal ; passer `working_directory` = chemin du slot a chaque `Shell` et `Task` d ecriture |
| Sortir | `ExitWorktree` | rien a faire |
| Merge | squash depuis le principal | idem |

**N utilise pas `cursor-agent -w`** pour les slots du kit : il cree ses
propres worktrees sous `~/.cursor/worktrees/`, hors du pool, invisibles de
`STATUS_FILE` et jamais nettoyes par `/sk-pool-init`.

Occupant a ecrire dans `STATUS_FILE` : `agent CURSOR` (le format de ligne est
dans `_shared/sk-config.md`, il ne change pas).

Deux depots = deux worktrees, sequentiels, jamais deux `git add -A` en
parallele sur la meme racine. Vrai des deux cotes.

## 6. Shell — contrainte Windows verifiee

Sur Windows, l outil `Shell` de Cursor est evalue par un shell POSIX ou par
PowerShell selon l environnement de lancement, et **les hooks sont generes en
PowerShell dans les deux cas**.

Consequence mesuree le 2026-09-14 : `cursor-agent` lance depuis **Git Bash**
voit chacun de ses appels shell rejete par ses propres hooks
(`eval: syntax error near unexpected token '&'`) — aucun outil shell ne passe,
le run entier est inexploitable. Lance depuis **PowerShell**, le meme appel
rend `exitCode: 0`.

**Regle : sur Windows, `cursor-agent` se lance depuis PowerShell.** Un lancement
depuis Git Bash, MSYS ou un `sh -c` est un STOP, pas un avertissement.

Dans Cursor, les scripts `_shared/*.ps1` du kit s appellent comme sous Claude
Code : `pwsh -File <SKILL_ROOT>/_shared/<script>.ps1`.

## 7. Navigateur — `/sk-test`

| | Claude Code | Cursor |
|---|---|---|
| Serveur | `mcp__claude-in-chrome__*` | `mcp__playwright__*` (`@playwright/mcp --browser chrome`) |
| Contexte onglets | `tabs_context_mcp` | `browser_tabs` |
| Ouvrir | `tabs_create_mcp` + `navigate` | `browser_navigate` |
| Lire la page | `read_page` / `get_page_text` | `browser_snapshot` |
| Chercher un element | `find` | `browser_snapshot` (les refs y sont) |
| Cliquer / saisir | `computer` | `browser_click` / `browser_type` / `browser_fill_form` |
| Preuve | `computer` screenshot | `browser_take_screenshot` |
| Console | `read_console_messages` | `browser_console_messages` |
| Reseau | `read_network_requests` | `browser_network_requests` |
| JS dans la page | `javascript_tool` | `browser_evaluate` |

**Le piege d authentification.** L application s authentifie via MSAL sur une
origine unique (cf. `_shared/sk-runtime.md`). Playwright MCP demarre par
defaut un profil Chrome **isole** : la session authentifiee de l utilisateur
n y est pas, et tous les scenarios tombent en `BLOQUE : non authentifie`.

Deux sorties, dans cet ordre :

1. Attacher Playwright au Chrome deja authentifie — Chrome lance avec
   `--remote-debugging-port=9222`, puis serveur MCP configure avec
   `--cdp-endpoint http://127.0.0.1:9222`. C est la voie prescrite.
2. A defaut, profil isole et authentification manuelle par run : meme
   `AskQuestion` que sous Claude Code (« Connecte-toi dans l onglet ouvert,
   puis Continuer / Abandonner »), aucun identifiant saisi par l agent.

Le reste de la section 4 de `sk-test/SKILL.md` — un scenario a la fois, verdict
au moment de l oracle, verrou `mysepteo.master.lock`, trois echecs d affilee =
BLOQUE, aucun `alert`/`confirm` — ne change pas d un hote a l autre.

## 8. Import de design — `/sk-prep` section 0

`DesignSync` lit un canevas `claude.ai/design/p/<uuid>`. C est un outil Claude
Code, et **aucun serveur MCP de Cursor ne sait lire ce format**.

| Source de design | Claude Code | Cursor |
|---|---|---|
| `claude.ai/design/p/<uuid>` | `DesignSync` (§0.1) | **STOP** |
| Fichier Figma | — | `mcp__figma__get_design_context`, `get_variable_defs`, `get_screenshot` |

Lien `claude.ai/design` dans un prompt `/sk-prep` sous Cursor : arrete-toi et
dis-le en une ligne — « l import Claude Design n existe que sous Claude Code ;
rejoue `/sk-prep` depuis Claude Code, ou donne un lien Figma ». Ne remplace
jamais l import par un `WebFetch` ni par une lecture d ecran : le contrat
visuel se perd et le Sonnet code des approximations.

Lien Figma : meme livrable, meme exigence. `FEATURE_DIR/design.md` reste un
contrat au pixel, `get_variable_defs` remplit la table de correspondance
tokens design -> tokens projet (§3), et les valeurs illisibles se DEMANDENT.
Les taches UI restent ancrees `Design: design.md#C<n>`.

Aucune source de design = pas de `design.md`, et c est un cas normal.

## 9. Sessions non interactives — `/sk-audit`

| | Claude Code | Cursor |
|---|---|---|
| Binaire | `claude` | `cursor-agent` |
| Invocation | `-p --output-format json --permission-mode bypassPermissions --session-id <uuid>` | `-p --output-format stream-json --model <slug> --force --trust` |
| Reprise | `--resume <sessionId>` | `--resume <chatId>` |
| Racines additionnelles | `--add-dir <path>` | `--add-dir <path>` |
| Identifiant de session | impose par `--session-id` | **rendu** par l evenement `{"type":"system","subtype":"init","session_id":...}` |
| Transcript | `~/.claude/projects/**/<sessionId>.jsonl` | **le flux stream-json de stdout**, a ecrire tel quel |
| Sous-agents | fichiers `<sessionId>/subagents/**.jsonl` separes | dans le MEME flux stdout |

La difference qui compte : Cursor range ses conversations dans une base
**SQLite** (`~/.cursor/chats/**/store.db`), illisible sans dependance — et le
kit n en installe aucune. Le flux `stream-json` de stdout porte deja tout ce
que l analyse demande, il EST le transcript. `audit-run.mjs --host cursor`
l ecrit en `.jsonl` et l analyse repart de la.

Forme d un appel d outil shell dans le flux Cursor, pour les marques
`AUDIT_MARK` :

```json
{"type":"tool_call","subtype":"started",
 "tool_call":{"shellToolCall":{"args":{"command":"echo AUDIT_MARK sk-impl bootstrap start"}}},
 "timestamp_ms":1789372790647}
```

L horodatage est en millisecondes (`timestamp_ms`), pas en ISO 8601 comme chez
Claude Code : l analyse convertit, elle ne compare jamais les deux formats.

`CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS` n a pas d equivalent Cursor ; le
plafond au temps s obtient par le `timeoutMs` du runner, qui existe des deux
cotes.

Rappel §6 : sous Windows, ces sessions se lancent depuis PowerShell.

## 10. Ce qui ne change jamais

Les STOP prescrits, les regimes, le grain de tache, les gates
(lint / typecheck / tests cibles), le format des livrables
(`spec.md`, `plan.md`, `tasks.md`, `design.md`, `e2e.md`, les rapports), les
contrats `_shared/*.md`, le pool et `STATUS_FILE`, l interdiction de deviner
un chemin, l interdiction de sauter une US en silence.

Un desaccord entre ce fichier et un `SKILL.md` sur la DOCTRINE : le `SKILL.md`
gagne. Sur le RUNTIME : ce fichier gagne.
