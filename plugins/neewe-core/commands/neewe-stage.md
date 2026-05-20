---
description: Move to a specific stage. Usage: /neewe-stage <ground|plan|dispatch|orchestrate|code|finish>
allowed-tools: Bash(bash *)
---

Advance to the named stage (`$ARGUMENTS`) and show the new status. The CLI maps the stage name to its internal phase. Present the output directly.

!`bash ${CLAUDE_PLUGIN_ROOT}/bin/neewe stage $ARGUMENTS`
