#!/bin/bash
# front-up.sh <dossier> : (re)lance Vite :5173 depuis ce dossier (slot ou principal)
B=${BENCH:?BENCH = dossier du banc (front/, slots/)}; D=$1
for p in $(ps -eo pid,args | awk '/node node_modules\/vite\/bin\/vite.js/ && !/awk/ {print $1}'); do kill $p; done
[ -e "$D/node_modules" ] || ln -s $B/front/node_modules "$D/node_modules"
(cd "$D" && exec setsid nohup node node_modules/vite/bin/vite.js --config vitest.config.ts --port 5173 --strictPort > $B/vite.log 2>&1 < /dev/null) > /dev/null 2>&1 &
for i in $(seq 30); do curl -s --max-time 5 -o /dev/null http://localhost:5173/ && echo "vite up ($D)" && exit 0; sleep 1; done; echo "vite KO"; tail $B/vite.log; exit 1
