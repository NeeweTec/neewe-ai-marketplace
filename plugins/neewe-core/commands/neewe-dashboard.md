---
description: Generate the dashboard auth token and print the URL to open in the browser.
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/bin/neewe-dashboard *)
---

Get the dashboard token and tell the user how to open the live web dashboard. Do not auto-open a browser; print the URL.

!`bash ${CLAUDE_PLUGIN_ROOT}/bin/neewe-dashboard token | awk '{print "Token: "$1; print "Open: http://127.0.0.1:7878/?token="$1; print ""; print "If the server is not running, start it in a separate terminal:"; print "  bash ${CLAUDE_PLUGIN_ROOT}/bin/neewe-dashboard start"}'`
