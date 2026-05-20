---
description: Bootstrap a new NEEWE project in the current directory (creates .neewe/state.json, vault/, MNEME layout).
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/bin/neewe init), Bash(${CLAUDE_PLUGIN_ROOT}/bin/neewe l4-init), Bash(${CLAUDE_PLUGIN_ROOT}/bin/neewe inline)
---

Initialize NEEWE in the current working directory and show the result.

!`bash ${CLAUDE_PLUGIN_ROOT}/bin/neewe init && bash ${CLAUDE_PLUGIN_ROOT}/bin/neewe l4-init 2>&1 | tail -5 && echo "---" && bash ${CLAUDE_PLUGIN_ROOT}/bin/neewe inline`
