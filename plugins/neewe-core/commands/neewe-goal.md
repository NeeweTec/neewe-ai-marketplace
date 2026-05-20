---
description: Start Goal mode with a goal text and budget. Usage: /neewe-goal "<text>" --budget 5.00
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/bin/neewe goal *), Bash(${CLAUDE_PLUGIN_ROOT}/bin/neewe inline)
---

Run the goal command with $ARGUMENTS, then show the inline status.

!`bash -lc 'bash ${CLAUDE_PLUGIN_ROOT}/bin/neewe goal $ARGUMENTS && bash ${CLAUDE_PLUGIN_ROOT}/bin/neewe inline'`
