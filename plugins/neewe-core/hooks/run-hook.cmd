: << 'CMDBLOCK'
@echo off
REM Polyglot wrapper: Windows cmd dispatcher
REM On Windows, cmd.exe ignores the lines between : << 'CMDBLOCK' ... CMDBLOCK and executes this block.
REM On Unix (bash), the : << 'CMDBLOCK' ... CMDBLOCK lines are treated as a no-op heredoc and the bash block below runs.
REM This file works as BOTH .cmd (Windows) and a bash script (Unix) — same content, two interpreters.

REM Locate Git Bash and forward all args to the same-named extensionless script in this dir
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_NAME=%~n0"
for /f "tokens=*" %%i in ('where bash 2^>nul') do set "BASH_PATH=%%i" & goto :found
echo {"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":""}} & exit /b 0
:found
"%BASH_PATH%" "%SCRIPT_DIR%%SCRIPT_NAME%" %*
exit /b %errorlevel%
CMDBLOCK

# === Unix bash path ===
# When invoked as bash, this is the executable section.
# Forwards to session-start (or whatever extensionless script shares this name).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_NAME="$(basename "${BASH_SOURCE[0]}" .cmd)"

# If a sibling extensionless script exists with the same name (minus .cmd), exec it.
if [ -f "${SCRIPT_DIR}/${SCRIPT_NAME}" ]; then
  exec bash "${SCRIPT_DIR}/${SCRIPT_NAME}" "$@"
fi

# Fallback: emit empty hook output so we don't break the harness.
printf '{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":""}}'
exit 0
