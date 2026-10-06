# /sk-impl — Publication (branche + PR draft) et arret

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
toi-meme ; le reste part a UN Agent Sonnet sk-worker sur ce
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
