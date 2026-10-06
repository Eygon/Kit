# Routage sk-* (source unique)

Standards Agent-OS = must. Cap 2-5 chemins.
Ancres dans plan.md et tasks.md.
Done = lint typecheck tests cibles.

## Surface utilisateur

| Situation | Commande |
|---|---|
| Projet neuf, rien d installe | `/sk-init` |
| Pool a preparer a l avance | `/sk-pool-init` |
| Petit changement sans papier | `/sk-xs` |
| Papier spec-kit a produire | `/sk-prep`, puis `/clear` et `/sk-impl` (session neuve) |
| Trio spec/plan/tasks deja la | `/sk-impl` |
| Verifier a l ecran une feature livree dans un slot, avant merge | `/sk-test` |
| Faire faire : lancer /sk-prep et /sk-impl en fond, repondre a leurs questions, verifier les slots livres (standards + Chrome), faire publier la PR draft | `/mon-developpeur` (session dediee ; contrats `_shared/sk-supervisor.md`, `_shared/sk-publish.md`) |
| Relire une PR Azure DevOps | `/sk-review` |
| Comprendre un existant dans un monolithe legacy | `/sk-legacy-search` |
| Etat des lieux du depot courant avant une prep | `/sk-code-search` |
| Verifier un trio avant de l implementer | `/sk-audit specs/<NNN>-<nom>` |
| Mesurer ou eprouver la chaine prep -> impl | `/sk-audit` |

US : ~3-5 fichiers prod, jamais API+UI dans le meme [USn].
2 repos : US1 = contrat API. 1 tache = 1 fichier (pas 1 US = 1 fichier).

## Docs legacy-search / code-search dans /sk-prep

Tout se resout EN PREP. Une regle R<n> retenue est recopiee
litteralement dans l AC (spec.md) et en clair dans la ligne de tache ;
`Legacy: <doc>#F<n>,R<n>` et `Code: <doc>#E<n>` ne sont que des ancres
de tracabilite. `/sk-impl` ne lit jamais `docs/` : le Sonnet recoit
`tasks.md`, le reviewer `spec.md` + `tasks.md` (`us-reviewer.md` check 6
couvre les AC sources `#R<n>`). Plus de ~5 regles par US = `rules.md` +
`RULES_PATH` a cabler d abord (pas encore fait).

## Design Claude Design

Un lien `claude.ai/design/p/<uuid>` dans le prompt de `/sk-prep` declenche
sa section 0 : import via DesignSync (jamais WebFetch) et ecriture de
`FEATURE_DIR/design.md` = contrat visuel au pixel (valeurs exactes, table
tokens design->projet, arbitrages lib<->design tranches par l humain).
Taches UI ancrees `Design: design.md#C<n>`.

`/sk-impl` transmet `DESIGN_PATH` au Sonnet (`us-sonnet.md`) et au reviewer
(`us-reviewer.md` check 8). Un ecart ne passe jamais : le reviewer le
corrige (FIXED) ou le renvoie en fix (FAIL).
Aucune approximation, aucun hex, aucun token design.
Table de base des tokens : `_shared/design-tokens.md` (source unique,
copiee dans design.md §3 par `/sk-prep`).

## Parallelisme annote

`/sk-prep` peut ecrire FEATURE_DIR/parallel.yml
(contrat : `_shared/sk-parallel.md`) si 2 git
roots, US1 = contrat API, US back+front sur
roots distincts. `/sk-impl` l execute apres
US1. Absent = sequentiel. Impl ne devine
JAMAIS le parallelisme.

## Moteur d implementation

1 US ou N US enchainees : le detail (qui revoit, qui corrige, verdicts
PASS / FIXED / FAIL / ESCALATE) vit dans `sk-impl/SKILL.md` §4, pas ici.

Zero Haiku pour le code et la revue : Sonnet pour le code, Opus pour la
revue. Haiku UNIQUEMENT pour la recon de `/sk-prep` (A.1) : agents
`Explore` read-only, sous `schema` impose, declenches sur critere (2 roots,
> 1 sous-systeme, regime >= M) — jamais sur un XS, ou la recon reste inline.

## Test E2E d un slot

`/sk-test <feature>` ne code rien : il cible le slot qui porte
`sk-impl-<slug>` ou `sk-xs-<slug>`, ecrit FEATURE_DIR/e2e.md (un scenario
par Acceptance Scenario de spec.md, contrat `_shared/sk-e2e.md`), le fait
valider, puis demarre back et front DEPUIS les slots sur le port authentifie
(`_shared/sk-runtime.ps1`, contrat `_shared/sk-runtime.md`) et joue le
cahier dans Claude in Chrome. Rapport : FEATURE_DIR/e2e-report.md
(PASS/FAIL/BLOQUE). Un FAIL revient a `/sk-impl` ou `/sk-xs`.
Configuration locale (credentials gitignores) : hardlinks du principal vers
le slot par `_shared/link-local-config.ps1`, jamais lue, jamais nommee dans
un tool call. Web seulement.

## Audit du kit

`/sk-audit` fait tourner la chaine pour de vrai : sessions `claude -p` non
interactives dans un pool `wt-audit-N` qui lui est PROPRE (jamais `wt-1..4`),
fautes injectees pour verifier que les STOP prescrits tiennent, temps mesure
sur le transcript de session et non sur un journal auto-redige.

L ampleur vient du prompt : une mesure de temps, un regime precis, une
mecanique (parallelisme, revue, design) ou tout le catalogue. Le plan est
valide par l humain avant la moindre depense.

`/sk-audit specs/<NNN>-<nom>` ne lance AUCUNE session : lint seul du trio,
gratuit, a glisser entre `/sk-prep` et `/sk-impl`.

Contrat : `_shared/sk-audit.md`. Fautes : `_shared/sk-audit-faults.md`.
Scripts : `_shared/audit-run.mjs` (capture), `audit-analyze.mjs` (analyse,
rejouable a volonte sur un run deja capture), `audit-lint.mjs` (autonome).
Corpus GELE dans `<PROJECT_DIR>/.sk/audit/corpus/` : jamais modifie, jamais
ecrase — pour le changer, `<item>-v2`. C est ce qui rend deux campagnes
comparables.

## Hote d execution — Claude Code ou Cursor

Le kit tourne sur les DEUX. La doctrine ci-dessus est la meme partout ; seul
le runtime change (outils, slugs de modeles, sous-agents, worktrees,
navigateur, CLI non interactive). Table de correspondance unique :
`_shared/sk-host.md`. Detecte l hote AVANT le premier appel d outil (§0).

Ce qui n existe pas dans Cursor et ce qui le remplace : `Workflow` -> boucle
`Task` sequentielle (§4) ; `EnterWorktree` -> `working_directory` sur le slot
(§5) ; Claude in Chrome -> Playwright MCP (§7) ; `DesignSync` -> Figma MCP, et
STOP sur un lien `claude.ai/design` (§8) ; `claude -p` -> `cursor-agent -p`
(§9). Aucune skill ne code un nom d outil ou un slug de modele Cursor en dur.

Sous Windows, `cursor-agent` se lance depuis PowerShell, jamais depuis Git
Bash : ses hooks y bloquent tous les appels shell (`sk-host.md` §6).

## Chemins et configuration

`POOL_BASE`, `REPO_SLUG`, `STATUS_FILE`, `SK_HOME` : `_shared/sk-config.md`.
Prendre, marquer, rendre ou reparer un slot : `_shared/sk-pool.md` (`sk-pool.ps1`), seule
porte d ecriture de `STATUS_FILE`. Etat et entretien a la main : `/sk-pool`.
Aucune skill ne code un chemin absolu en dur.

Depots voisins (backend actuel, legacy backend, legacy frontend) :
`<PROJECT_DIR>/.sk/repos.json`, contrat dans `_shared/sk-repos.md`.
`/sk-init` seul l ecrit — une question par chemin manquant, jamais
redemande une cle a `null`. `/sk-code-search` (backend),
`/sk-legacy-search` (legacy), `/sk-prep` et `/sk-impl` (cross-repo) le
lisent. Cle absente = STOP et renvoi vers `/sk-init`, jamais un defaut.
