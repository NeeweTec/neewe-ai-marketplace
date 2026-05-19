#!/usr/bin/env bash
# cost-cap-guard.sh — NEEWE Stop hook for EP-OPUS-10 hard cost cap
#
# Wired in hooks.json on Stop. After every Claude turn, checks
# .neewe/state.json#cost_budget. If spent >= cap, BLOCKS with exit 2 + a
# clear message. The user can then either (a) raise the cap via
# `neewe goal "<same>" --budget <new>` or (b) accept the pause.
#
# If spent >= 80% cap but < cap: emits additionalContext WARNING (non-blocking)
# so the model knows it's approaching the limit and can wrap up.
#
# Defensive: silent no-op if state.json missing.

set -uo pipefail

STATE_FILE=".neewe/state.json"
if [ ! -f "$STATE_FILE" ]; then exit 0; fi

# Read cap + spent (jq preferred, python fallback, raw cat as last resort).
CAP=""
SPENT=""
if command -v jq >/dev/null 2>&1; then
  CAP=$(jq -r '.cost_budget.cap_usd // 0' "$STATE_FILE")
  SPENT=$(jq -r '.cost_budget.spent_usd // 0' "$STATE_FILE")
elif command -v python3 >/dev/null 2>&1 || command -v python >/dev/null 2>&1; then
  PY="$(command -v python3 2>/dev/null || command -v python)"
  read -r CAP SPENT <<EOF
$("$PY" -c "
import json
d = json.load(open('$STATE_FILE'))
cb = d.get('cost_budget') or {}
print(cb.get('cap_usd', 0), cb.get('spent_usd', 0))
")
EOF
else
  exit 0   # can't enforce without jq or python
fi

# Defensive: treat missing/zero cap as "no cap configured" → no enforcement.
if [ -z "$CAP" ] || [ "$CAP" = "0" ] || [ "$CAP" = "null" ]; then exit 0; fi
if [ -z "$SPENT" ]; then SPENT=0; fi

# Compute spent >= cap (exit 2, BLOCK) and spent >= 80% cap (warning).
EXCEEDED=$(awk -v s="$SPENT" -v c="$CAP" 'BEGIN { print (s >= c) ? 1 : 0 }')
WARNING_THRESHOLD=$(awk -v s="$SPENT" -v c="$CAP" 'BEGIN { print (s >= c * 0.8) ? 1 : 0 }')

if [ "$EXCEEDED" = "1" ]; then
  cat >&2 <<EOF
[neewe-cost-cap] HARD CAP REACHED — pausing Goal Mode.

Budget cap: \$${CAP}
Spent:      \$${SPENT}

Goal Mode execution is paused per EP-OPUS-10 (cost-capped Goal Mode).

Options:
  (a) Raise cap and continue:
      neewe goal "<same goal text>" --budget <new-cap>
  (b) Show what was spent on:
      neewe cost-report
  (c) Accept pause and ship what's done so far.

The active goal text remains in state.json#active_goal.
The cost log is at .neewe/.cost-log (JSONL, append-only).
EOF
  exit 2   # block per Claude Code Stop hook contract
fi

if [ "$WARNING_THRESHOLD" = "1" ]; then
  # Non-blocking warning emitted as additionalContext.
  cat <<EOF
{"hookSpecificOutput":{"hookEventName":"Stop","additionalContext":"\n\n---\n\n## ⚠ Cost Budget Warning\n\nSpent: \$${SPENT} / \$${CAP} cap (≥ 80%). Wrap up current work; do not start new complex tasks. Use \`neewe cost-report\` for details. To extend: \`neewe goal \\\"<same>\\\" --budget <new-cap>\`."}}
EOF
  exit 0
fi

exit 0
