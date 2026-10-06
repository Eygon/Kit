# /sk-impl — Cross-repo : US backend et slot backend (lu seulement si une US retenue porte des chemins backend)

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

## Trio dans le slot backend, et retour des cases

Le worker back travaille dans SON slot : copie le trio (FEATURE_DIR) dans
`<slot back>/specs/<NNN>-<nom>/` exactement comme pour le slot front (neuf :
copie ; reprise : seulement l absent). Ses briefs ont `featureDir` = cette
copie, `slot` = le slot back, `standardsRoot` = le slot back (standards du
back). Chaque voie coche SA copie de tasks.md : deux workers paralleles qui
editeraient le meme fichier par `sed -i` peuvent perdre une case.
Apres chaque US back (et a la fin du Workflow) :
  node "<SK_SHARED>/tasks-merge.mjs" <slot front>/specs/<NNN>-<nom>/tasks.md <slot back>/specs/<NNN>-<nom>/tasks.md
(union des [X] par id, jamais de decoche), puis recon.md : les facts de l US
back vont dans le recon.md du slot front, qui fait foi.
