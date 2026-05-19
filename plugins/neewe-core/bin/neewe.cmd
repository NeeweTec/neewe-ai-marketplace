: << 'CMDBLOCK'
@echo off
REM Polyglot wrapper: Windows cmd dispatcher for `neewe` CLI.
REM Same polyglot trick as hooks/run-hook.cmd — locate Git Bash, forward args
REM to the extensionless `neewe` script in the same dir.

set "SCRIPT_DIR=%~dp0"
for /f "tokens=*" %%i in ('where bash 2^>nul') do set "BASH_PATH=%%i" & goto :found
echo [neewe] ERROR: bash not found in PATH. Install Git for Windows (includes Git Bash). 1>&2
exit /b 1
:found
"%BASH_PATH%" "%SCRIPT_DIR%neewe" %*
exit /b %errorlevel%
CMDBLOCK

# === Unix bash path ===
# When invoked as bash (e.g. accidental `bash neewe.cmd`), forward to neewe.
exec bash "$(dirname "${BASH_SOURCE[0]}")/neewe" "$@"
