#!/usr/bin/env bash
# audit-config-change.sh — append every settings.json mutation to .neewe/audit.log (JSONL).
# Defensive: silent no-op if .neewe missing; never blocks the change.

set -uo pipefail

HOOK_INPUT=$(cat)
LOG_FILE="${NEEWE_AUDIT_LOG:-.neewe/audit.log}"

# Bail if NEEWE not initialized.
if [ ! -d ".neewe" ]; then exit 0; fi

NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Extract event fields (jq preferred, fallback to grep).
if command -v jq >/dev/null 2>&1; then
  SOURCE=$(echo "$HOOK_INPUT" | jq -r '.source // "unknown"')
  FILE_PATH=$(echo "$HOOK_INPUT" | jq -r '.file_path // "unknown"')
  SESSION_ID=$(echo "$HOOK_INPUT" | jq -r '.session_id // "unknown"')
else
  SOURCE=$(echo "$HOOK_INPUT" | grep -oE '"source"[ ]*:[ ]*"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/')
  FILE_PATH=$(echo "$HOOK_INPUT" | grep -oE '"file_path"[ ]*:[ ]*"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/')
  SESSION_ID=$(echo "$HOOK_INPUT" | grep -oE '"session_id"[ ]*:[ ]*"[^"]*"' | sed 's/.*"\([^"]*\)"$/\1/')
fi

# Append audit entry.
printf '{"ts":"%s","session_id":"%s","event":"config_change","source":"%s","file_path":"%s","change_summary":"<see settings diff>"}\n' \
  "$NOW" "${SESSION_ID:-unknown}" "${SOURCE:-unknown}" "${FILE_PATH:-unknown}" >> "$LOG_FILE"

exit 0
