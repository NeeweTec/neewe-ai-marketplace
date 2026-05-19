---
name: neewe-dashboard
description: Use when the user wants to start, open, or troubleshoot the NEEWE local web dashboard (EP-OPUS-13). The dashboard lives at http://127.0.0.1:7878/ and shows runtime state (phase, mode, goal, squad), cost budget with per-tool/per-model breakdown, governance verdicts per phase, and event log tail. Auto-started by the plugin's monitors.json; this skill helps when the user needs manual control or wants the auth token.
license: MIT
disable-model-invocation: true
allowed-tools: Bash(node *) Bash(cat *) Bash(neewe-dashboard *) Read
---

# `/neewe-dashboard` — Local Web UI Control

User-only slash command. The dashboard is auto-started by the plugin's `monitors/monitors.json` when `neewe-core` is enabled — but you may want to manually start it, get the auth token, or troubleshoot.

## What the Dashboard Shows

Open at `http://127.0.0.1:7878/?token=<token>` (auth required; localhost-only bind).

| Panel | Source | Refresh |
|---|---|---|
| **Runtime State** | `.neewe/state.json` | SSE push every 2s |
| **Cost Budget** | `.neewe/state.json#cost_budget` + `.neewe/.cost-log` (last 50 entries) | SSE push every 2s |
| **Cost by Tool / Model** | Aggregated from `.cost-log` | SSE push every 2s |
| **Model Routing** | `.neewe/state.json#model_routing` + `.effort` | SSE push every 2s |
| **Governance Gates** | `.neewe/gates/<phase>/latest/aggregate.json` for each phase | Poll every 10s |
| **Event Log** | `.neewe/vault/log.md` tail (last 30 entries) | Poll every 10s |

## Commands

### Get the auth token

```
!neewe-dashboard token
```

Prints the token (stored at `~/.neewe/dashboard-token`, mode 0600, auto-generated on first run).

### Start the server manually (if not auto-started)

```
!neewe-dashboard start --port 7878
```

Or to use a different port:

```
!neewe-dashboard start --port 9090
```

### Open the URL

After starting, the auth URL is:

```
http://127.0.0.1:7878/?token=<token>
```

The browser stores the token in `localStorage`. Subsequent visits to `/` work without the `?token=` query param.

### Health check

```
!curl http://127.0.0.1:7878/health
```

Returns `{"ok": true, "ts": "..."}` if alive. No auth required for this endpoint.

## Auto-Shutdown

The server auto-exits after **10 minutes idle** (no requests + no SSE clients connected). The `monitors.json` runner will restart it as needed when the plugin is active.

## Security

- **Bind:** `127.0.0.1` only (NEVER `0.0.0.0`)
- **Token auth:** 256-bit hex token at `~/.neewe/dashboard-token` (mode 0600 on POSIX)
- **CORS:** disabled by default
- **Health endpoint** (`/health`) is the only no-auth endpoint — returns nothing sensitive

For remote access (mobile / second machine), use SSH tunnel:

```
ssh -L 7878:127.0.0.1:7878 user@your-machine
```

Then open `http://127.0.0.1:7878/?token=<token>` on your phone's browser.

## API Endpoints (for advanced use / integrations)

All require `X-Token: <token>` header OR `?token=<token>` query param.

- `GET /api/state` → JSON of `.neewe/state.json`
- `GET /api/cost` → summary + last 10 entries + by-tool + by-model aggregates
- `GET /api/gates` → all phase latest aggregate verdicts
- `GET /api/events-snapshot` → vault/log.md tail as JSON
- `GET /api/events` → SSE stream (server-sent events); snapshot every 2s

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| "connection refused" | Server not running | `neewe-dashboard start` |
| "401 auth required" | Wrong/missing token | `neewe-dashboard token` then visit `/?token=<token>` |
| "UI dir not found" | Plugin not properly installed | Reinstall `neewe-core` |
| Statusline shows blanks | `.neewe/state.json` missing | `neewe init` |
| Cost panel all $0.00 | Cost-tracker hook not firing OR no tool calls yet | Run some Claude turns; check `.neewe/.cost-log` |
| Gates panel empty | No gate runs yet OR `.neewe/gates/` empty | Trigger a SubagentStop / TaskCompleted; check `governance-gate.sh` is wired |

## Tone

When invoked, return:
- The token (so the user can open the URL)
- The start command (if not auto-started)
- The expected URL

Concise. No tutorial mode unless the user asks "explain".
