#!/bin/bash
# SessionStart (session cloud seulement) : installe les agents du kit (sk-worker, sk-reviewer, ...) dans ~/.claude/agents.
# Facultatif : le moteur Workflow s en passe grace a args.agentBodies (skills/_shared/agent-bodies.mjs).
# Idempotent : copie (pas de lien symbolique, plus sur entre systemes), n ecrase que si le fichier a change.
set -euo pipefail
[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0
src="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}/agents"
dst="$HOME/.claude/agents"
[ -d "$src" ] || exit 0
mkdir -p "$dst"
for f in "$src"/*.md; do
  b="$(basename "$f")"
  cmp -s "$f" "$dst/$b" || cp "$f" "$dst/$b"
done
