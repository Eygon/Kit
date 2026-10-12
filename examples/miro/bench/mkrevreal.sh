#!/bin/bash
# mkrevreal.sh <slot> <F> <US> <label> <commit> <summary> : prompts de revue reelle (reviewer peut corriger) + loupe (rapport seul)
S=$1; F=$2; US=$3; L=$4; C=$5; SUM=$6
H=/tmp/claude-0/-home-user-Kit/6d0ce183-8a0e-5e9b-8ccd-4301258ef079/scratchpad/nbench/hk
R=$(awk 'f;/^---$/{c++; if(c==2) f=1}' /home/user/Kit/agents/sk-reviewer.md)
BASE=$(printf '%s\n---\nTon brief est dans %s/specs/%s/briefs/%s-review.md ; lis-le en entier en premier ; cwd du slot %s.\nBanc : node_modules = lien vers le principal ; tests : node node_modules/vitest/vitest.mjs run --coverage=false <fichiers> (front) ou dotnet test --filter <classe> (back) ; aucun serveur.\n\n## Declare par le worker — a verifier, pas a croire\nCommit : %s\nResume : %s\n' "$R" "$S" "$F" "$US" "$S" "$C" "$SUM")
printf '%s\n' "$BASE" > $H/rrev-$L.md
LB=$(node -e 'const s=require("fs").readFileSync("/home/user/Kit/skills/_shared/speckit-us-loop.js","utf8");const m=s.match(/const LENS_BRIEF = ([\s\S]*?)\nfunction lensOn/);console.log(eval(m[1]))')
printf '%s%s\n' "$BASE" "$LB" > $H/rlens-$L.md
