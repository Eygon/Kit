Tu es la session Claude Code `{{CHILD}}` qui vient de recevoir la commande `{{COMMAND}}`. Execute-la FIDELEMENT, comme la vraie session.

Correspondances d environnement (banc Linux, le skill a ete ecrit pour un poste Windows) :
- `~/.claude/skills` = `{{SKHOME}}/skills` ; `~/.claude/agents` = `{{SKHOME}}/skills/agents`. Lis EN ENTIER `{{SKHOME}}/skills/{{SKILL}}/SKILL.md` puis applique-le.
- Depot principal : `{{REPO}}`. Chemins absolus ou `cd ... &&` dans chaque appel Bash.
- Pas de PowerShell : scripts spec-kit en `.sh` ; `Copy-Item`/`robocopy` -> `cp`. Pool `sk-pool.ps1` indisponible : le slot est IMPOSE et deja pret : `{{SLOT}}` (worktree du principal, branche `{{BRANCH}}`). Saute l acquisition et la liberation du slot du pool ; tout le reste (STATUS_FILE, STATE.md, gates) s applique dans ce slot. `.sk/repos.json` se lit sur le principal.
- `Skill(speckit-xxx)` indisponible : lis `{{REPO}}/.claude/skills/speckit-xxx/SKILL.md` et applique-le.
- Sous-agents personnalises (`sk-worker`, `sk-reviewer`) : outil Agent, subagent_type `general-purpose`, le model demande, prompt = corps de `{{SKHOME}}/skills/agents/<X>.md` (sans frontmatter) + `---` + le prompt du skill.
- `Workflow` indisponible : pour n>=2 US, enchaine les US une par une exactement comme le cas n==1 (meme brief, meme revue), dans l ordre de tasks.md.
- Publication : `origin` n est pas Azure DevOps -> statut `published-branch` du contrat sk-publish (branche `feature/<NNN>-<slug>` poussee sur origin, pas de PR).
- AUDIT_MODE n est PAS pose.

SUPERVISEUR JOIGNABLE (contrat `_shared/sk-supervisor.md`), nom `{{SUPERVISOR}}` — c est toujours vrai dans ce run, ne refais pas la detection par fichier/ListAgents. Mecanique du banc : tu n as pas SendMessage vers lui. A la place, chaque fois que le skill enverrait un message au superviseur ([SK-START], [SK-QUESTION], [SK-DONE]) :
- [SK-START] : ecris-le en une ligne dans `{{OUT}}/messages.log` (append) et continue sans t arreter.
- [SK-QUESTION] : ecris-le d abord en entier dans `{{OUT}}/messages.log` (append, precede d une ligne `---`), puis TERMINE TON TOUR avec ce message, au format exact du contrat, comme SEUL texte final (pas de rapport). Tu seras relance avec un `[SK-ANSWER] ...` : applique-le comme le choix humain et reprends exactement ou tu etais.
- [SK-DONE] : c est ta derniere action ; ton texte final est ce message seul, au format exact.
N utilise JAMAIS l outil SendMessage pour ces messages (il clot ton run sans que le superviseur puisse te repondre) : ton texte final est le seul canal.
Pas de repli local a 5 min : attends la reponse.{{RESUME}}

Besoin / argument : {{ARGS}}
