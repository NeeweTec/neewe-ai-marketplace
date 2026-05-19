#!/usr/bin/env bash
# toast.sh — tiny helper sourced by other NEEWE hooks for verbosity-aware output.
#
# Usage:
#   source "${CLAUDE_PLUGIN_ROOT}/hooks/lib/toast.sh"
#   toast "message text"          → stderr (model sees it as feedback)
#   ctx_toast "message text"      → emits hookSpecificOutput.additionalContext (model + user surface)
#
# Verbosity is read from .claude/settings.local.json#neewe.hook_verbosity
# (silent | toast | verbose). Default = toast.

_neewe_verbosity_cache=""

neewe_verbosity() {
  if [ -n "$_neewe_verbosity_cache" ]; then
    echo "$_neewe_verbosity_cache"; return
  fi
  local v="toast"
  if [ -f ".claude/settings.local.json" ] && command -v node >/dev/null 2>&1; then
    v=$(node -e "try{const s=require('./.claude/settings.local.json');process.stdout.write((s.neewe&&s.neewe.hook_verbosity)||'toast')}catch(e){process.stdout.write('toast')}" 2>/dev/null || echo "toast")
  fi
  _neewe_verbosity_cache="$v"
  echo "$v"
}

# stderr toast — visible to the model as feedback only (not to the user inline).
toast() {
  local msg="$1"
  local v
  v=$(neewe_verbosity)
  if [ "$v" = "silent" ]; then return 0; fi
  printf '[neewe] %s\n' "$msg" >&2
}

# Emit a non-blocking additionalContext block (visible to model on next turn).
# Use sparingly — these compete with real conversation context.
ctx_toast() {
  local msg="$1"
  local event="${2:-PostToolUse}"
  local v
  v=$(neewe_verbosity)
  if [ "$v" = "silent" ]; then return 0; fi
  # Escape for JSON
  local esc
  if command -v node >/dev/null 2>&1; then
    esc=$(printf '%s' "$msg" | node -e "let b='';process.stdin.on('data',c=>b+=c);process.stdin.on('end',()=>process.stdout.write(JSON.stringify(b)))")
  else
    esc="\"${msg//\"/\\\"}\""
  fi
  printf '{"hookSpecificOutput":{"hookEventName":"%s","additionalContext":"\\n\\n[neewe] %s"}}' "$event" "$msg"
}
