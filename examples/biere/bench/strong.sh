#!/bin/bash
label=$1; SB=/home/user/biere/slots/I-${label}b; cd $SB || exit 1
f=src/__tests__/api/zz-strong-checkins.api.test.ts
cp /tmp/claude-0/-home-user-Kit/6d0ce183-8a0e-5e9b-8ccd-4301258ef079/scratchpad/bench/strong-checkins.api.test.ts $f
out=$(node node_modules/vitest/vitest.mjs run --coverage=false $f 2>&1 | sed 's/\x1b\[[0-9;]*m//g')
echo "== $label : $(echo "$out" | grep -E '^ +Tests ')"
echo "$out" | grep -E "^ *(FAIL|×)" | sed 's/^ *//' | cut -c1-170 | head -12
rm -f $f
