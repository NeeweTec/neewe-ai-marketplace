#!/usr/bin/env bash
# cost-tracker.sh — NEEWE PostToolUse cost estimator (Sprint 4)
#
# Wired in hooks.json on PostToolUse for ALL tools. Reads hook input from stdin,
# estimates token cost from tool output size + current model, calls `neewe add-cost`.
#
# This is APPROXIMATE — actual costs come from the Claude API billing. NEEWE's
# tracker provides a continuous-running estimate so cost-cap-guard can enforce
# the EP-OPUS-10 hard cap. Reconcile with /usage periodically for ground truth.
#
# Defensive: silent no-op if state.json missing or `neewe` CLI not in PATH.

set -uo pipefail

# Read hook input JSON from stdin.
HOOK_INPUT=$(cat)

# Defensive: no state file, no tracking.
STATE_FILE=".neewe/state.json"
if [ ! -f "$STATE_FILE" ]; then exit 0; fi

# Locate neewe CLI — prefer plugin-relative, fall back to PATH.
NEEWE_BIN=""
if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && [ -x "${CLAUDE_PLUGIN_ROOT}/bin/neewe" ]; then
  NEEWE_BIN="${CLAUDE_PLUGIN_ROOT}/bin/neewe"
elif command -v neewe >/dev/null 2>&1; then
  NEEWE_BIN="$(command -v neewe)"
else
  # No CLI available — silent no-op rather than break the session.
  exit 0
fi

# Extract relevant fields (jq preferred, python fallback).
if command -v jq >/dev/null 2>&1; then
  TOOL_NAME=$(echo "$HOOK_INPUT" | jq -r '.tool_name // "unknown"')
  # Output size is the proxy for token count. Try tool_response.output first;
  # fall back to the whole input length as a noisier proxy.
  OUTPUT_SIZE=$(echo "$HOOK_INPUT" | jq -r '.tool_response.output // empty' | wc -c)
  if [ "$OUTPUT_SIZE" -eq 0 ]; then
    OUTPUT_SIZE=$(echo "$HOOK_INPUT" | wc -c)
  fi
  MODEL=$(jq -r '.model_routing.main // "sonnet"' "$STATE_FILE")
elif command -v python3 >/dev/null 2>&1 || command -v python >/dev/null 2>&1; then
  PY="$(command -v python3 2>/dev/null || command -v python)"
  read -r TOOL_NAME OUTPUT_SIZE MODEL <<EOF
$("$PY" - "$STATE_FILE" <<PYEOF
import json, sys
hi = json.loads(sys.stdin.read())
tn = hi.get('tool_name', 'unknown')
out = (hi.get('tool_response') or {}).get('output') or ''
size = len(out) if out else len(json.dumps(hi))
with open(sys.argv[1]) as f: d = json.load(f)
mdl = (d.get('model_routing') or {}).get('main', 'sonnet')
print(f"{tn} {size} {mdl}")
PYEOF
<<<"$HOOK_INPUT")
EOF
else
  exit 0   # can't estimate without jq or python
fi

# Cost estimate. Rough heuristic per-1K-output-chars based on typical model rates:
#   opus / opus[1m]: $0.075 / 1K chars output  (≈ $0.030/1K tokens × 2.5 char/token)
#   sonnet / opusplan: $0.015 / 1K chars output  (≈ $0.006/1K tokens × 2.5 char/token)
#   haiku: $0.003 / 1K chars output  (≈ $0.0012/1K tokens × 2.5 char/token)
# This is APPROXIMATE — Claude API billing is the ground truth.
case "$MODEL" in
  opus*|claude-opus*)
    RATE=0.000075   # $ per char
    ;;
  haiku*|claude-haiku*)
    RATE=0.000003
    ;;
  *)  # sonnet, opusplan, anything else
    RATE=0.000015
    ;;
esac

# Compute amount (using awk for float math without bc dependency).
AMOUNT=$(awk -v size="$OUTPUT_SIZE" -v rate="$RATE" 'BEGIN { printf "%.6f", size * rate }')

# Only record if amount is non-trivial (>= $0.0001).
SHOULD_RECORD=$(awk -v a="$AMOUNT" 'BEGIN { print (a >= 0.0001) ? 1 : 0 }')
if [ "$SHOULD_RECORD" = "1" ]; then
  bash "$NEEWE_BIN" add-cost "$AMOUNT" --tool "$TOOL_NAME" --model "$MODEL" >/dev/null 2>&1 || true
fi

# ── Threshold-deduped toast (25% / 50% / 80%) ─────────────────────────────────
# Only fire each threshold once per goal-mode session (state-stored flags).
if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/hooks/lib/toast.sh" ]; then
  . "${CLAUDE_PLUGIN_ROOT}/hooks/lib/toast.sh"
  if command -v node >/dev/null 2>&1; then
    node - "$STATE_FILE" <<'NODEEOF' || true
const fs = require('fs');
const path = process.argv[1];
let s; try { s = JSON.parse(fs.readFileSync(path,'utf8')); } catch(e){ process.exit(0); }
const cb = s.cost_budget || {};
const cap = Number(cb.cap_usd || 0);
const spent = Number(cb.spent_usd || 0);
if (cap <= 0) process.exit(0);
const pct = (spent / cap) * 100;
s.cost_budget.thresholds_fired = s.cost_budget.thresholds_fired || [];
const fired = s.cost_budget.thresholds_fired;
const crossed = [25, 50, 80].filter(t => pct >= t && !fired.includes(t));
if (crossed.length === 0) process.exit(0);
const hit = crossed[crossed.length - 1];
fired.push(...crossed);
fs.writeFileSync(path, JSON.stringify(s, null, 2));
process.stderr.write(`[neewe] Cost crossed ${hit}% of cap ($${spent.toFixed(2)} of $${cap.toFixed(2)})\n`);
NODEEOF
  fi
fi

# Always exit 0 — cost tracking never blocks tool execution.
exit 0
