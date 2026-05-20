---
description: Generate the dashboard auth token and print the URL to open in the browser.
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/bin/neewe-dashboard *)
---

Print this project's dashboard URL (actual bound port) and how to open it. Do not auto-open a browser; print the URL.

!`bash ${CLAUDE_PLUGIN_ROOT}/bin/neewe-dashboard url | awk '{print "Open: "$1; print ""; print "If the server is not running, start it in a separate terminal:"; print "  bash ${CLAUDE_PLUGIN_ROOT}/bin/neewe-dashboard start"}'`
