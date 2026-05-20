# NEEWE — 5-Minute Quick Start

> Opus plans. Sonnet executes. You stay in flow.

NEEWE has **three surfaces**. Pick whichever fits your moment:

| Surface | When | Command |
|---|---|---|
| **Slash commands** (in this chat) | Day-to-day work inside Claude Code | `/neewe`, `/neewe-start`, `/neewe-stage <name>` |
| **Web dashboard** (browser) | Live cost / gates / events visualization | `/neewe-dashboard` then open the URL |
| **Ink TUI** (separate terminal) | Premium visual interface, ambient monitor | `neewe` in a 2nd terminal window |

> The Ink TUI does **not** run inside Claude Code chat — it would fight Claude Code for the terminal. Use slash commands here; open the TUI in Windows Terminal / iTerm2 / etc.

## The 7-Step Flow

| # | Step | Slash command | What happens |
|---|---|---|---|
| 1 | **Initial** | `/neewe-start` | Project bootstrap. Language auto-detected. |
| 2 | **Ground** | `/neewe-stage ground` | Research, validate the idea, gather requirements. |
| 3 | **Plan** | `/neewe-stage plan` | Design architecture. Opus writes the plan. |
| 4 | **Dispatch** | `/neewe-stage dispatch` | Build a squad. Plan breaks into tasks. |
| 5 | **Orchestrate** | `/neewe-stage orchestrate` | Squads hand off cleanly. |
| 6 | **Code** | `/neewe-stage code` + `/neewe-goal "..." --budget 5.00` | Execution with TDD and a hard cost cap. |
| 7 | **Finish** | `/neewe-stage finish` | Governance review runs. Replay HTML generated. |

## Your First 60 Seconds

In this chat:

```
/neewe-start
/neewe
```

You'll see the stage stepper, your active goal, cost meter, and last events as inline markdown. From there, advance stages with `/neewe-stage <name>` or open the dashboard with `/neewe-dashboard`.

## What You Don't Need to Memorize

- **Phases, modes, archetypes, verdicts** — internal vocabulary. Slash commands use the natural names (stages).
- **Hook events, gate names, EP-OPUS codes** — automation surface. You see results, not internals.
- **JSON schemas** — `/neewe` renders a table. `neewe show --json` exists if you script.

## When You Get Stuck

- `/neewe-help` — full reference
- `/neewe` — what stage you're in, cost so far, last gate result
- `/neewe-dashboard` — URL for the live web view

## Three Things Worth Knowing

1. **You can stop anytime.** Goal mode (step 6) has a hard cost cap. When hit, it stops — you decide to extend, ship, or roll back.
2. **Everything is recoverable.** Every run produces a `replays/run-<ts>.html` you can open offline and share. Generate with `neewe-replay` in a terminal.
3. **Squads are reusable across projects.** `neewe-squad save <name>` then `neewe-squad load <name>` elsewhere.

## Next: Pick One

- **New product idea?** → `/neewe-start`, then `/neewe-stage ground`.
- **Existing repo, want NEEWE governance?** → `/neewe-start`, then `/neewe-stage plan`.
- **Want the full visual?** → Open a 2nd terminal, run `neewe` — the Ink TUI takes over.
