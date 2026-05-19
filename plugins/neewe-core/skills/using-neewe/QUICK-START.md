# NEEWE — 5-Minute Quick Start

> Opus plans. Sonnet executes. You stay in flow.

NEEWE structures every project as a 7-step flow. Each step has one command. Everything between is automated and transparent.

## The 7 Steps

| # | Step | Command | What happens |
|---|---|---|---|
| 1 | **Initial** | `neewe start` | Project bootstrap. Language auto-detected. |
| 2 | **Ground** | `neewe ground` | Research the problem, validate the idea, gather requirements. |
| 3 | **Plan** | `neewe plan` | Design architecture. Opus writes the plan. ADR generated. |
| 4 | **Dispatch** | `neewe dispatch` | Build a squad. Plan breaks into tasks automatically. |
| 5 | **Orchestrate** | `neewe orchestrate` | Squads hand off cleanly. You watch from the TUI. |
| 6 | **Code** | `neewe code --budget 5.00` | Execution with TDD and a hard cost cap. |
| 7 | **Finish** | `neewe finish` | Governance review runs. Replay HTML is generated. |

## Your First 60 Seconds

```bash
cd ~/my-new-project
neewe start              # detects language, creates .neewe/
neewe                    # opens the TUI (v0.9+) — your home base
```

The TUI shows where you are in the 7 steps and what the one next action is. If you don't like the TUI, every step also works as a plain CLI command.

## What You Don't Need to Memorize

- **Phases, modes, archetypes, verdicts** — internal vocabulary. The TUI labels everything in your language.
- **Hook events, gate names, EP-OPUS codes** — automation surface. You see results, not internals.
- **JSON schemas** — `neewe show` renders a table. `neewe show --json` exists if you script.

## When You Get Stuck

- `neewe help` — table of commands with one-line descriptions
- `neewe show` — what stage you're in, cost so far, last gate result
- The TUI's `Ctrl+K` — command palette (search anything)

## Three Things Worth Knowing

1. **You can stop anytime.** Goal mode (step 6) has a hard cost cap. When hit, it stops — you decide to extend, ship, or roll back.
2. **Everything is recoverable.** Every run produces a `replays/run-<ts>.html` you can open offline and share.
3. **Squads are reusable.** A squad that shipped one feature can be loaded into another project: `neewe-squad save <name>` then `neewe-squad load <name>` elsewhere.

## Next: Pick One

- **New product idea?** → Start at step 1.
- **Existing repo, want NEEWE governance?** → `neewe start` then jump to step 3.
- **Want to see what NEEWE feels like first?** → Open the TUI: `neewe`.
