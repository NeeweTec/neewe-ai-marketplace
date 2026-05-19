#!/usr/bin/env bash
# governance-gate.sh — fires the NEEWE governance trio (QA + Tech Lead + PO) in parallel
# at every stage transition. Aggregates verdicts. Blocks transition on any FAIL/REJECT.
#
# Wired via hooks.json:
#   - SubagentStop matcher: "executor-*" → this script
#   - TaskCompleted (any) → this script
#
# Reads hook input from stdin (Claude Code provides JSON with session_id, tool_name, etc.).
# Reads .neewe/state.json to know current phase.
# Spawns 3 claude -p sessions in parallel:
#   - claude -p --agent governance-qa
#   - claude -p --agent governance-tech-lead
#   - claude -p --agent governance-po
# Each writes its verdict log to .neewe/gates/<phase>/{qa,tech-lead,po}.log
# Aggregates: extracts verdict from each log, decides exit code.
#
# Exit codes (Claude Code hook contract):
#   0  → allow the transition
#   2  → block + stderr text gets fed to Claude as feedback
#
# This is the L6 enforcement primitive — without it, the trio is just three
# .md files that nobody runs.

set -uo pipefail   # NOTE: no `e` — we want to handle individual claude failures gracefully

# ────────────────────────────────────────────────────────────────────────────
# Setup
# ────────────────────────────────────────────────────────────────────────────

HOOK_INPUT=$(cat)

STATE_FILE=".neewe/state.json"
PHASE="unknown"
if [ -f "$STATE_FILE" ]; then
  if command -v jq >/dev/null 2>&1; then
    PHASE=$(jq -r '.phase // "unknown"' "$STATE_FILE")
  elif command -v python3 >/dev/null 2>&1 || command -v python >/dev/null 2>&1; then
    PY="$(command -v python3 2>/dev/null || command -v python)"
    PHASE=$("$PY" -c "import json; print(json.load(open('$STATE_FILE')).get('phase','unknown'))")
  fi
fi

GATE_DIR=".neewe/gates/${PHASE}"
mkdir -p "$GATE_DIR"

TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
RUN_DIR="${GATE_DIR}/${TIMESTAMP}"
mkdir -p "$RUN_DIR"

# Save the triggering hook input for audit.
echo "$HOOK_INPUT" > "${RUN_DIR}/hook-input.json"

# ────────────────────────────────────────────────────────────────────────────
# Spawn trio in parallel
# ────────────────────────────────────────────────────────────────────────────

# Defensive: if `claude` CLI is unavailable, log and pass-through (don't break the user's session).
if ! command -v claude >/dev/null 2>&1; then
  echo "[governance-gate] WARN: claude CLI not in PATH. Skipping triple-gate (pass-through)." >&2
  exit 0
fi

CONTEXT_PROMPT=$(cat <<EOF
A NEEWE stage transition was just triggered (phase=${PHASE}).
The hook payload is at: ${RUN_DIR}/hook-input.json
Inspect the recent changes (git diff, last commit, current state.json) and
emit your verdict per your defined output format. Use Read, Grep, Glob, Bash
as needed. Do not exceed 60 seconds wall time.
EOF
)

run_agent() {
  local name="$1"   # qa | tech-lead | po
  local agent_id="governance-${name}"
  local out="${RUN_DIR}/${name}.log"
  local marker="$2" # e.g. QA_VERDICT
  {
    if claude -p --agent "$agent_id" "$CONTEXT_PROMPT" > "$out" 2>&1; then
      :
    else
      echo "[governance-gate] ${agent_id} claude exit nonzero" >> "$out"
    fi
  } &
  echo $!   # return PID
}

QA_PID=$(run_agent qa "QA_VERDICT")
TL_PID=$(run_agent tech-lead "TECH_LEAD_VERDICT")
PO_PID=$(run_agent po "PO_VERDICT")

# Wait for all (no per-PID timeout — wait honors process exit; the agent itself caps at 60s via prompt).
wait "$QA_PID" "$TL_PID" "$PO_PID"

# ────────────────────────────────────────────────────────────────────────────
# Aggregate verdicts
# ────────────────────────────────────────────────────────────────────────────

# Extract verdict tokens from each log via regex on the `**Verdict:** X` line that follows the marker.
extract_verdict() {
  local log="$1"
  local marker="$2"
  if [ ! -f "$log" ]; then echo "MISSING"; return; fi
  # Find the line `**Verdict:** SOMETHING` within 10 lines after the marker.
  awk -v marker="## ${marker}" '
    $0 ~ marker { capture=1; next }
    capture && /\*\*Verdict:\*\*/ {
      sub(/^.*\*\*Verdict:\*\*[ \t]*/, "");
      sub(/[ \t]*$/, "");
      # Take first word (in case multiple are listed pipe-separated as examples)
      n = split($0, parts, /[ \t|]+/);
      if (n > 0) { print parts[1]; exit }
      exit
    }
  ' "$log" 2>/dev/null || echo "UNPARSEABLE"
}

QA_VERDICT=$(extract_verdict "${RUN_DIR}/qa.log" "QA_VERDICT")
TL_VERDICT=$(extract_verdict "${RUN_DIR}/tech-lead.log" "TECH_LEAD_VERDICT")
PO_VERDICT=$(extract_verdict "${RUN_DIR}/po.log" "PO_VERDICT")

# Write structured aggregate.
cat > "${RUN_DIR}/aggregate.json" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "phase": "${PHASE}",
  "verdicts": {
    "qa": "${QA_VERDICT}",
    "tech_lead": "${TL_VERDICT}",
    "po": "${PO_VERDICT}"
  },
  "logs": {
    "qa": "${RUN_DIR}/qa.log",
    "tech_lead": "${RUN_DIR}/tech-lead.log",
    "po": "${RUN_DIR}/po.log"
  }
}
EOF

# Maintain a stable "latest" symlink for the dashboard / human review.
ln -sfn "${TIMESTAMP}" "${GATE_DIR}/latest" 2>/dev/null || true

# ────────────────────────────────────────────────────────────────────────────
# Decision
# ────────────────────────────────────────────────────────────────────────────

# FAIL terms: any verdict in {FAIL, REJECT, MISSING, UNPARSEABLE, CRITICAL}.
fail() {
  case "$1" in
    FAIL|REJECT|MISSING|UNPARSEABLE|CRITICAL) return 0 ;;
    *) return 1 ;;
  esac
}

BLOCKED=0
BLOCK_REASONS=()

if fail "$QA_VERDICT"; then
  BLOCKED=1
  BLOCK_REASONS+=("QA: ${QA_VERDICT} (see ${RUN_DIR}/qa.log)")
fi
if fail "$TL_VERDICT"; then
  BLOCKED=1
  BLOCK_REASONS+=("Tech Lead: ${TL_VERDICT} (see ${RUN_DIR}/tech-lead.log)")
fi
if fail "$PO_VERDICT"; then
  BLOCKED=1
  BLOCK_REASONS+=("PO: ${PO_VERDICT} (see ${RUN_DIR}/po.log)")
fi

# Toast helper (verbosity-aware) — sourced from plugin
if [ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && [ -f "${CLAUDE_PLUGIN_ROOT}/hooks/lib/toast.sh" ]; then
  # shellcheck source=lib/toast.sh
  . "${CLAUDE_PLUGIN_ROOT}/hooks/lib/toast.sh"
else
  toast() { printf '[neewe] %s\n' "$1" >&2; }
fi

verdict_icon() {
  case "$1" in
    PASS|APPROVE|ACCEPT|DONE|READY|RESOLVED) printf '✓' ;;
    *) printf '✗' ;;
  esac
}

if [ "$BLOCKED" = "1" ]; then
  toast "Governance review: BLOCKED at stage=${PHASE}"
  for r in "${BLOCK_REASONS[@]}"; do toast "  - $r"; done
  toast "Aggregate: ${RUN_DIR}/aggregate.json"
  exit 2
fi

# Toast each verdict on PASS so the user sees the trio approved
toast "Governance review (stage=${PHASE}):"
toast "  $(verdict_icon "$QA_VERDICT") QA: ${QA_VERDICT}"
toast "  $(verdict_icon "$TL_VERDICT") Tech Lead: ${TL_VERDICT}"
toast "  $(verdict_icon "$PO_VERDICT") PO: ${PO_VERDICT}"
exit 0
