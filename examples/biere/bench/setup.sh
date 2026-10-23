#!/bin/bash
# prepare les slots du banc dev : <tache> x <variante>
cd /home/user/biere
for v in sl sm sh om hm fm; do
  for t in t1 t2; do
    label="$t$v"; SB=/home/user/biere/slots/I-${label}b; SF=/home/user/biere/slots/I-${label}f
    if [ "$t" = t1 ]; then base=1af4c94; feat=013-ergonomics-fixes; prep=/home/user/biere/slots/P-f13f; else base=2a7f1ab; feat=012-community-beers; prep=/home/user/biere/slots/P-f12f; fi
    [ -d $SB ] || { git -C back worktree add -q -b sk-impl-${label}b $SB $base && ln -s /home/user/biere/back/node_modules $SB/node_modules; }
    mkdir -p $SF
    python3 /home/user/Kit/examples/biere/mousse-impl.py $label $prep $feat US1 "" > /dev/null 2>&1
    echo "$label base=$(git -C $SB log --oneline -1 | cut -c1-40) briefs=$(ls $SB/specs/$feat/briefs 2>/dev/null | grep -c worker)"
  done
done
