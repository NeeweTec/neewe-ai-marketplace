---
description: Show all NEEWE commands and how to use them.
---

Present the NEEWE command reference to the user. Do not add commentary unless the user asks a follow-up.

# NEEWE — Command Reference

## Inside Claude Code chat (slash commands)

| Command | What it does |
|---|---|
| `/neewe` | Show current stage + cost + gates + recent events (inline markdown view) |
| `/neewe-start` | Bootstrap NEEWE in the current directory |
| `/neewe-stage <name>` | Advance to a stage (`ground`, `plan`, `dispatch`, `orchestrate`, `code`, `finish`) |
| `/neewe-goal "<text>" --budget 5.00` | Start Goal mode with a budget cap |
| `/neewe-mode <thrift\|balanced\|quality>` | Cost/quality/speed dial |
| `/neewe-cost` | Cost report (spent, top by tool, top by model) |
| `/neewe-dashboard` | Print URL to the live web dashboard |
| `/neewe-help` | This reference |

## In a separate terminal (interactive TUI)

```bash
neewe       # opens the Ink TUI (full visual interface)
```

The TUI takes over the terminal — it does NOT run inside Claude Code chat. Open a second terminal window (Windows Terminal, iTerm2, etc.) and run `neewe` there for the premium visual interface alongside the chat.

## In any terminal (scripts / automation)

| Command | What it does |
|---|---|
| `neewe init` | Same as `/neewe-start` |
| `neewe show` | Pretty-print state (`--json` for raw) |
| `neewe set-phase <phase>` | Internal phase transition |
| `neewe goal "<text>" --budget N` | Start Goal mode |
| `neewe mode <m>` | Switch mode |
| `neewe cost-report` | Cost report |
| `neewe-dashboard token` | Generate dashboard token |
| `neewe-dashboard start` | Start the dashboard server |
| `neewe-squad save\|list\|load\|lineage` | Squad pool |
| `neewe-replay [--since DATE]` | Generate HTML timeline of the latest run |

## The 7-step user flow

1. **Initial** — `/neewe-start`
2. **Ground** — `/neewe-stage ground`
3. **Plan** — `/neewe-stage plan`
4. **Dispatch** — `/neewe-stage dispatch`
5. **Orchestrate** — `/neewe-stage orchestrate`
6. **Code** — `/neewe-stage code` (often paired with `/neewe-goal`)
7. **Finish** — `/neewe-stage finish`
