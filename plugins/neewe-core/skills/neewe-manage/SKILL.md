---
name: neewe-manage
description: Use when forming a squad, checking status of a running NEEWE project, reporting cost / token usage, or transitioning ownership between squads. Routes to L2 orchestration sub-skills.
license: MIT
token_budget: frequent
---

# NEEWE Manage Namespace

Namespace router for squad orchestration, status reporting, and ownership management.

## Sub-Skill Routing

| If your intent is... | Invoke skill or agent |
|---|---|
| Assemble a squad for the current project / phase | agent `neewe-squad-composer` *(coming Sprint 3)* |
| Drive multi-phase orchestration (Phase 01 → 02 → 03 ...) | agent `neewe-phase-orchestrator` *(coming Sprint 3)* |
| Check current status (phase, active squad, cost spent, blockers) | `neewe show` (reads `.neewe/state.json`) |
| Report cost / token usage for the current session or goal | agent `neewe-cost-guard` *(coming Sprint 4)* |
| Hand off the project to a new squad / new dev | `context-save` + `context-restore` *(coming Sprint 5)* |
| Compose an inter-agent handoff message | `handoff-journal` *(coming Sprint 3)* |
| Pause Goal Mode (save state + emit continuation prompt) | `/gsd-pause-work`-style skill *(coming Sprint 4)* |

## Active Squad Awareness

`.neewe/state.json` tracks the current active squad in the `active_squad` field. Squad composition + history live at `~/.neewe/squads/<squad-id>/` (EP-OPUS-5 Squad-as-Service, Sprint 6).

When in doubt about who is doing what: `neewe show` first, then check `.neewe/squads/active.json` for the current member roster.

## Cost-Aware Orchestration

Every squad operation must respect the active `cost_budget.cap_usd`. The `neewe-cost-guard` agent (Sprint 4) monitors `cost_budget.spent_usd` against `cap_usd` and surfaces alerts when the burn rate threatens to exceed cap before the goal completes.

In Goal Mode, exceeding cap auto-pauses execution (EP-OPUS-10).
