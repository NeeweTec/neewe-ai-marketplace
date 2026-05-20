---
description: Generate the dashboard auth token and print the URL to open in the browser.
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/bin/neewe-dashboard *)
---

Print this project's dashboard URL (actual bound port) below, then tell the user to open it in a browser. If the server is not running, they start it with `neewe-dashboard start` in a separate terminal. Do not auto-open a browser.

!`bash ${CLAUDE_PLUGIN_ROOT}/bin/neewe-dashboard url`
