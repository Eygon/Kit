#!/bin/bash
# mkrev2.sh <branche> <feature> <US> <label> <slot source des specs> : slot de revue + prompts rev (rapport seul) et lens
B=/tmp/claude-0/-home-user-Kit/6d0ce183-8a0e-5e9b-8ccd-4301258ef079/scratchpad/nbench; H=$B/hk
br=$1; F=$2; US=$3; L=$4; SRC=$5
R=$(awk 'f;/^---$/{c++; if(c==2) f=1}' /home/user/Kit/agents/sk-reviewer.md)
S=$B/slots/V-$L; cd $B/front; git worktree remove --force $S 2>/dev/null; git branch -D v-$L >/dev/null 2>&1
git worktree add -q -b v-$L $S $br && ln -s $B/front/node_modules $S/node_modules; mkdir -p $S/specs/$F/briefs
for f in spec.md plan.md recon.md tasks.md checklists; do [ -e $SRC/specs/$F/$f ] && cp -r $SRC/specs/$F/$f $S/specs/$F/; done
python3 - "$SRC/specs/$F/briefs/$US.json" "$S" "$F" > $S/specs/$F/briefs/$US.json <<'PY'
import json,sys
j=json.load(open(sys.argv[1])); S=sys.argv[2]
j["featureDir"]=f"{S}/specs/{sys.argv[3]}"; j["slot"]=S; j["standardsRoot"]=S
j["facts"]=[x for x in j.get("facts",[]) if "repos.json" not in x and "audit-lint" not in x]
print(json.dumps(j,ensure_ascii=False,indent=1))
PY
node /home/user/Kit/skills/_shared/brief-fill.mjs $S/specs/$F/briefs/$US.json --out $S/specs/$F/briefs > /dev/null || echo "KO brief-fill $L"
C=$(git -C $S log --format=%h -1)
HEAD_MSG=$(printf '%s\n---\nTon brief est dans %s/specs/%s/briefs/%s-review.md ; lis-le en entier en premier ; cwd du slot %s.\nBanc : node_modules = lien vers le principal ; tests : node node_modules/vitest/vitest.mjs run --coverage=false <fichiers> ; aucun serveur Vite.\n\n## Passation du worker — ne refais pas sa recon\nCommit du worker : %s (sk-impl DONE(%s)). Commence par `git show --stat %s`. Revue de %s seulement.\nResume du worker : taches de %s livrees et cochees, RED puis GREEN, gates ciblees vertes.\n' "$R" $S $F $US $S $C $US $C $US $US)
printf '%s\n\n## MODE BANC « RAPPORT SEUL » (prime sur le brief)\nTu ne modifies AUCUN fichier et ne commites rien (arbre propre en sortie). Tu fais tous les checks du brief, mais au lieu de corriger, tu RAPPORTES chaque ecart.\nTon rapport final = uniquement ce JSON :\n{"verdict":"PASS|FAIL","issues":[{"file":"chemin:ligne","ecart":"attendu vs trouve","preuve":"ce que tu as vu"}]}\nUne issue = un defaut reel (code ou test), pas une preference. Va au bout de la grille.\n' "$HEAD_MSG" > $H/rev-$L.md
LB=$(node -e 'const s=require("fs").readFileSync("/home/user/Kit/skills/_shared/speckit-us-loop.js","utf8");const m=s.match(/const LENS_BRIEF = ([\s\S]*?)\nfunction lensOn/);console.log(eval(m[1]))')
printf '%s%s\n' "$HEAD_MSG" "$LB" > $H/lens-$L.md
echo "$L $C"
