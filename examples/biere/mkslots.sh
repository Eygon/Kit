#!/bin/bash
# mkslots.sh <label> : worktrees de prep du projet Mousse (front + back) depuis dev, node_modules relies, .sk/repos.json du front -> back.
# Banc seulement. Resultat : /home/user/biere/slots/P-<label>f et P-<label>b
set -e
L=$1; W=/home/user/biere
git -C $W/front worktree add -q -b p-${L}f $W/slots/P-${L}f dev
git -C $W/back worktree add -q -b p-${L}b $W/slots/P-${L}b dev
ln -s $W/front/node_modules $W/slots/P-${L}f/node_modules
ln -s $W/back/node_modules $W/slots/P-${L}b/node_modules
printf '{"backend":"%s/slots/P-%sb","legacyBackend":null,"legacyFrontend":null}\n' $W $L > $W/slots/P-${L}f/.sk/repos.json
(cd $W/slots/P-${L}f && git add -A && git -c user.email=b@b -c user.name=bench commit -qm "bench repos")
echo "slots P-${L}f / P-${L}b prets"
