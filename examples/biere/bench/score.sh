#!/bin/bash
# usage: score.sh <label>   (ex: t1sm)
label=$1; t=${label:0:2}; SB=/home/user/biere/slots/I-${label}b; cd $SB || exit 1
if [ "$t" = t1 ]; then base=1af4c94; feat=013-ergonomics-fixes; ref="ee643ad:src/__tests__/api/checkins.api.test.ts"; hid=src/__tests__/api/zz-hidden-checkins.api.test.ts; else base=2a7f1ab; feat=012-community-beers; ref="f45d98e:src/__tests__/api/breweries.api.test.ts"; hid=src/__tests__/api/zz-hidden-breweries.api.test.ts; fi
echo "== $label"
echo "commits: $(git log --oneline $base..HEAD | wc -l) ; done: $(git log --oneline $base..HEAD | grep -c 'DONE(US1)')"
git diff --shortstat $base HEAD | sed 's/^ */diff: /'
prod=$(git diff --numstat $base HEAD -- src ':!src/__tests__' | awk '{a+=$1} END{print a+0}'); tst=$(git diff --numstat $base HEAD -- src/__tests__ | awk '{a+=$1} END{print a+0}'); echo "lignes ajoutees: prod=$prod tests=$tst"
tsc=$(node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json 2>&1 | grep -c "error TS"); echo "tsc erreurs: $tsc"
files=$(git diff --name-only $base HEAD -- src | grep -E "\.ts$"); lint=$(node node_modules/eslint/bin/eslint.js $files 2>&1 | grep -cE "error|warning"); echo "eslint problemes: $lint"
sc=$(node /home/user/Kit/skills/_shared/standards-pack.mjs check --root . --pack $SB/specs/$feat/briefs/US1-standards.md --range $base..HEAD 2>&1 | grep -c "—"); echo "standards-pack ecarts: $sc"
git show "$ref" > $hid 2>/dev/null
hres=$(node node_modules/vitest/vitest.mjs run --coverage=false $hid 2>&1 | grep -E "Tests " | sed 's/\x1b\[[0-9;]*m//g'); echo "TESTS CACHES (reference): $hres"
own=$(git diff --name-only $base HEAD -- src/__tests__ | grep -v zz-hidden | tr '\n' ' '); ores=$(node node_modules/vitest/vitest.mjs run --coverage=false $own 2>&1 | grep -E "Tests " | sed 's/\x1b\[[0-9;]*m//g'); echo "tests du worker: $ores"
rm -f $hid
