#!/usr/bin/env bash
# audit-permission-request.sh — log every permission decision request to .neewe/audit.log (JSONL).
# Defensive: silent no-op if .neewe missing; never blocks the request.

set -uo pipefail

HOOK_INPUT=$(cat)
LOG_FILE="${NEEWE_AUDIT_LOG:-.neewe/audit.log}"

if [ ! -d ".neewe" ]; then exit 0; fi

NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if command -v jq >/dev/null 2>&1; then
  TOOL_NAME=$(echo "$HOOK_INPUT" | jq -r '.tool_name // "unknown"')
  SESSION_ID=$(echo "$HOOK_INPUT" | jq -r '.session_id // "unknown"')
  TOOL_INPUT=$(echo "$HOOK_INPUT" | jq -c '.tool_input // {}' | head -c 500)
else
  TOOL_NAME=$(echo "$HOOK_INPUT" | grep -oE '"tool_name"[ ]*:[ ]*"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/')
  SESSION_ID=$(echo "$HOOK_INPUT" | grep -oE '"session_id"[ ]*:[ ]*"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/')
  TOOL_INPUT="{}"
fi

printf '{"ts":"%s","session_id":"%s","event":"permission_request","tool_name":"%s","tool_input_preview":%s}\n' \
  "$NOW" "${SESSION_ID:-unknown}" "${TOOL_NAME:-unknown}" "${TOOL_INPUT:-{}}" >> "$LOG_FILE"

exit 0
