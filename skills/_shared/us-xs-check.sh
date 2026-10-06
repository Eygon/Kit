#!/usr/bin/env bash
# Mechanical TDD check for an XS user story. Replaces the Opus reviewer
# when the US is tagged `Size: xs` by /sk-prep.
#
# Usage:
#   us-xs-check.sh <SLOT_CWD> <US_ID> [--gate "<command>"] [--tasks <tasks.md>] <test file>...
#
# Checks (all blocking):
#   1. a commit `sk-impl DONE(<US_ID>)` exists on HEAD's history
#   2. at least one commit `sk-impl RED(<US_ID>) ...` precedes DONE
#   3. between each RED commit and the next RED (or DONE), the test files
#      only GAIN lines: a removed line means a test was weakened in GREEN
#   4. no `it.skip` / `xit` / `it.only` / `.todo` / `[Fact(Skip` in the
#      test files at DONE
#   5. if --gate is given, the targeted gate is still green at HEAD
#   6. if --tasks is given, every component, hook or service ADDED by the
#      US has a consumer in src at DONE, unless its task line hands the
#      mounting to another US (`Monté dans: <file> (US<n>)`)
#
# Output: first line `verdict: PASS` or `verdict: FAIL`, then one
# `issue: ...` line per blocker. Exit code 0 on PASS, 1 on FAIL,
# 2 on usage error.

set -u

if [ "$#" -lt 3 ]; then
  echo "verdict: FAIL"
  echo "issue: usage: us-xs-check.sh <SLOT_CWD> <US_ID> [--gate <cmd>] [--tasks <tasks.md>] <test file>..."
  exit 2
fi

slot="$1"; shift
us_id="$1"; shift
gate=""
tasks_file=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    --gate) gate="$2"; shift 2 ;;
    --tasks) tasks_file="$2"; shift 2 ;;
    *) break ;;
  esac
done
tests=("$@")

issues=()
add_issue() { issues+=("$1"); }

git_slot() { git -C "$slot" "$@"; }

done_sha="$(git_slot log --format='%H' --grep="sk-impl DONE(${us_id})" -n 1 2>/dev/null)"
if [ -z "$done_sha" ]; then
  add_issue "no commit 'sk-impl DONE(${us_id})' found"
fi

# RED commits, oldest first, up to DONE (or HEAD when DONE is missing).
range_end="${done_sha:-HEAD}"
mapfile -t red_shas < <(git_slot log --reverse --format='%H' --grep="sk-impl RED(${us_id})" "$range_end" 2>/dev/null)
if [ "${#red_shas[@]}" -eq 0 ]; then
  add_issue "no commit 'sk-impl RED(${us_id})' before DONE: RED was not proven"
fi

# 3. tests only grow between RED_k and RED_k+1 (or DONE).
if [ -n "$done_sha" ] && [ "${#red_shas[@]}" -gt 0 ] && [ "${#tests[@]}" -gt 0 ]; then
  for ((k = 0; k < ${#red_shas[@]}; k++)); do
    from="${red_shas[$k]}"
    if [ $((k + 1)) -lt "${#red_shas[@]}" ]; then
      to="${red_shas[$((k + 1))]}"
    else
      to="$done_sha"
    fi
    for t in "${tests[@]}"; do
      removed="$(git_slot diff "$from" "$to" -- "$t" 2>/dev/null | grep -E '^-' | grep -vE '^(---|-\s*$)' | head -n 5)"
      if [ -n "$removed" ]; then
        add_issue "test weakened in GREEN (${from:0:7}..${to:0:7}) in ${t}: $(echo "$removed" | head -n 1)"
      fi
    done
  done
fi

# 4. no skipped / focused / todo tests at DONE.
if [ -n "$done_sha" ] && [ "${#tests[@]}" -gt 0 ]; then
  for t in "${tests[@]}"; do
    content="$(git_slot show "${done_sha}:${t}" 2>/dev/null)"
    if [ -z "$content" ]; then
      add_issue "test file missing at DONE: ${t}"
      continue
    fi
    hit="$(printf '%s\n' "$content" | grep -nE '\b(it|test|describe)\.(skip|only|todo)\(|\bx(it|test|describe)\(|\[Fact\(Skip|\[Theory\(Skip' | head -n 1)"
    if [ -n "$hit" ]; then
      add_issue "skipped/focused test in ${t}: ${hit}"
    fi
  done
fi

# 5. targeted gate still green.
if [ -n "$gate" ]; then
  if ! (cd "$slot" && bash -c "$gate" > /dev/null 2>&1); then
    add_issue "targeted gate is red at HEAD: ${gate}"
  fi
fi

# 6. mounting: an xs US has no reviewer, so nobody else checks that what it
#    created is used. The judgement is _shared/mount-check.mjs, the same one the
#    reviewer and the worker run: a value import resolved to the created file (not
#    an `import type`, not a namesake in another feature), and a call for a hook.
if [ -n "$tasks_file" ] && [ -n "$done_sha" ]; then
  case "$tasks_file" in
    /*|[A-Za-z]:*) tasks_path="$tasks_file" ;;
    *) tasks_path="$slot/$tasks_file" ;;
  esac
  mount_check="$(cd "$(dirname "$0")" && pwd)/mount-check.mjs"
  if [ ! -f "$tasks_path" ]; then
    add_issue "tasks file not found for the mounting check: ${tasks_file}"
  elif [ ! -f "$mount_check" ]; then
    add_issue "mount-check.mjs not found next to us-xs-check.sh: ${mount_check}"
  else
    base="${red_shas[0]:-$done_sha}~1"
    mount_out="$(node "$mount_check" --root "$slot" --range "${base}..${done_sha}" --tasks "$tasks_path" 2>&1)"
    mount_rc=$?
    unmounted=0
    while IFS= read -r line; do
      case "$line" in
        UNMOUNTED*)
          unmounted=$((unmounted + 1))
          rest="${line#UNMOUNTED }"
          add_issue "created ${rest%% : *} is mounted nowhere: ${rest#* : }; its task does not hand the mounting to another US"
          ;;
      esac
    done <<< "$mount_out"
    # A crash also exits non-zero, without any UNMOUNTED line: never read it as a pass.
    if [ "$mount_rc" -ne 0 ] && [ "$unmounted" -eq 0 ]; then
      add_issue "mounting check could not run (exit ${mount_rc}): $(printf '%s' "$mount_out" | head -n 1)"
    fi
  fi
fi

if [ "${#issues[@]}" -eq 0 ]; then
  echo "verdict: PASS"
  exit 0
fi

echo "verdict: FAIL"
for i in "${issues[@]}"; do
  echo "issue: $i"
done
exit 1
