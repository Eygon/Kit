#!/bin/bash
# mkrevbk.sh <label> : slot de revue back (branche r-bk2) + prompts rev (rapport seul) et lens
B=/tmp/claude-0/-home-user-Kit/6d0ce183-8a0e-5e9b-8ccd-4301258ef079/scratchpad/nbench; H=$B/hk; L=$1; F=001-lock-item-m11-r1; US=US2
R=$(awk 'f;/^---$/{c++; if(c==2) f=1}' /home/user/Kit/agents/sk-reviewer.md)
S=$B/slots/V-$L; cd $B/back; git worktree remove --force $S 2>/dev/null; git branch -D v-$L >/dev/null 2>&1
git worktree add -q -b v-$L $S r-bk2; mkdir -p $S/specs/$F/briefs
cp -r /home/user/Kit/examples/miro/specs/$F/{spec.md,plan.md,recon.md,tasks.md,contracts} $S/specs/$F/ 2>/dev/null
printf '{"featureDir":"%s/specs/%s","slot":"%s","us":"US2","skShared":"/home/user/Kit/skills/_shared","standardsRoot":"%s","lecture":[],"facts":[]}\n' $S $F $S $S > $S/specs/$F/briefs/US2.json
node /home/user/Kit/skills/_shared/brief-fill.mjs $S/specs/$F/briefs/US2.json --out $S/specs/$F/briefs > /dev/null || echo "KO brief-fill $L"
C=$(git -C $S log --format=%h -1)
HEAD_MSG=$(printf '%s\n---\nTon brief est dans %s/specs/%s/briefs/US2-review.md ; lis-le en entier en premier ; cwd du slot %s.\nBanc : depot back .NET 8 ; tests : dotnet test Tableau.sln --filter <classe> (pas de serveur). Le depot n a que les US back (T001-T006) : ignore les taches front (US3/US4).\n\n## Passation du worker — ne refais pas sa recon\nCommit du worker : %s (sk-impl DONE(US2)). Commence par `git show --stat %s`. Revue de US2 (T004-T006) seulement ; US1 (c6219a0) est deja revue.\nResume du worker : T004-T006 livrees, RED puis GREEN, dotnet test vert.\n' "$R" $S $F $S $C $C)
printf '%s\n\n## MODE BANC « RAPPORT SEUL » (prime sur le brief)\nTu ne modifies AUCUN fichier et ne commites rien (arbre propre en sortie). Tu fais tous les checks du brief, mais au lieu de corriger, tu RAPPORTES chaque ecart.\nTon rapport final = uniquement ce JSON :\n{"verdict":"PASS|FAIL","issues":[{"file":"chemin:ligne","ecart":"attendu vs trouve","preuve":"ce que tu as vu"}]}\nUne issue = un defaut reel (code ou test), pas une preference. Va au bout de la grille.\n' "$HEAD_MSG" > $H/rev-$L.md
LB=$(node -e 'const s=require("fs").readFileSync("/home/user/Kit/skills/_shared/speckit-us-loop.js","utf8");const m=s.match(/const LENS_BRIEF = ([\s\S]*?)\nfunction lensOn/);console.log(eval(m[1]))')
printf '%s%s\n' "$HEAD_MSG" "$LB" > $H/lens-$L.md
echo "$L $C"
