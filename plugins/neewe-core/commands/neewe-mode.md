---
description: Switch cost/quality/speed mode. Usage: /neewe-mode <thrift|balanced|quality>
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/bin/neewe mode *), Bash(${CLAUDE_PLUGIN_ROOT}/bin/neewe inline)
---

Set the NEEWE mode to `$ARGUMENTS` and show the resulting state.

!`bash -lc 'bash ${CLAUDE_PLUGIN_ROOT}/bin/neewe mode "$ARGUMENTS" && bash ${CLAUDE_PLUGIN_ROOT}/bin/neewe inline'`
