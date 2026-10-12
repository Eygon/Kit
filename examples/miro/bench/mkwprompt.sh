#!/bin/bash
# mkwprompt.sh <slot> <featureDir-name> <US> <out> : prompt worker (corps sk-worker.md + 3 lignes de brief)
S=$1; F=$2; US=$3; OUT=$4
R=$(awk 'f;/^---$/{c++; if(c==2) f=1}' /home/user/Kit/agents/sk-worker.md)
printf '%s\n---\nTon brief est dans %s/specs/%s/briefs/%s-worker.md ; lis-le en entier en premier ; cwd du slot %s.\nBanc : node_modules du slot = lien vers le principal ; tests : node node_modules/vitest/vitest.mjs run --coverage=false <fichiers> ; ne lance aucun serveur Vite. Ta sortie finale = le JSON de sortie du brief, rendu comme rapport final.\n' "$R" "$S" "$F" "$US" "$S" > $OUT
