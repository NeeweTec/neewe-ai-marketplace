---
name: neewe-goal
description: Use whenever the user states an outcome they want NEEWE to achieve unattended (e.g. "ship the auth endpoint", "fix the failing tests", "build a dashboard"). Activates NEEWE Goal Mode — cost-capped continuous execution that runs governance trio at every gate, fires the cost-cap-guard Stop hook on every turn, and pauses cleanly when the budget exhausts or the condition is met. Wraps `/goal` with NEEWE-specific orchestration.
license: MIT
disable-model-invocation: true
allowed-tools: Bash(neewe *) Bash(claude *) Read Glob Grep
arguments:
  - goal
  - budget
---

# `/neewe-goal` — Activate NEEWE Goal Mode

This is the **slash-command skill** users invoke to start cost-capped autonomous execution. It is `disable-model-invocation: true` — only the user fires this; Claude does not auto-invoke it during normal conversation.

## Usage

```
/neewe-goal "Ship the /search endpoint" --budget 3.00
```

Or in a Claude Code session:

```
/neewe-goal "Build the auth-v2 spec, plan, implement, and validate" --budget 8.00 --mode quality
```

## What It Does

1. **Sets up state** — calls `neewe goal "<text>" --budget <usd>` to write `active_goal`, reset `spent_usd: 0`, and set `cap_usd`.
2. **(Optional) cascades mode** — if `--mode` provided, runs `neewe mode <m>` to apply the EP-OPUS-3 dial.
3. **Activates `/goal`** — invokes the native `/goal` Claude Code feature with NEEWE-formatted condition.
4. **Hands off to Phase Orchestrator** — `neewe-phase-orchestrator` drives Phase 01→02→03→04 with triple-gate at every transition.
5. **Continuous execution** — `cost-tracker` PostToolUse hook + `cost-cap-guard` Stop hook + `governance-gate.sh` SubagentStop/TaskCompleted hooks all fire automatically; do not check in between tasks.
6. **Pauses cleanly on cap or completion** — when `cost-cap-guard` exits 2 (budget exhausted) OR `/goal` condition is met OR user interrupts, emits a Continuation Prompt and stops.

## Pre-Flight Checks

Before activating Goal Mode, run:

```bash
!neewe show
```

Verify:
- [ ] `.neewe/state.json` exists (run `neewe init` if not)
- [ ] Phase is appropriate for goal type (use `00-intake` for ideation; `01-spec` for new feature; `03-execute` for implementation goal)
- [ ] No conflicting `active_goal` already running
- [ ] Squad assembled (run `neewe-squad-composer` first if needed)

## Activation

```bash
!neewe goal "$GOAL" --budget $BUDGET
```

If `$BUDGET` is unset, default is $5.00. If `--mode` arg present:

```bash
!neewe mode $MODE
```

Then activate the native goal mode (substitute the actual stop condition for your goal):

```
/goal <observable condition that ends execution>
       or stop after <N> turns
```

Example expanded:

```
/goal All tests in test/auth pass, lint exits 0, governance trio verdict file
      .neewe/gates/04-validate/latest/aggregate.json contains "PASS" for all three,
      or stop after 50 turns
```

## During Goal Mode

The following hooks fire automatically:

| Hook | When | What |
|---|---|---|
| `cost-tracker.sh` | PostToolUse (every tool call) | Estimates cost from output size + current model; appends to `.neewe/.cost-log`; updates `state.json#cost_budget.spent_usd` |
| `cost-cap-guard.sh` | Stop (every turn end) | Reads cap vs spent; exit 2 (BLOCK) if `spent >= cap`; warning if `spent >= 80% cap` |
| `governance-gate.sh` | SubagentStop (`executor-*` matcher) + TaskCompleted | Spawns governance trio (QA + Tech Lead + PO) in parallel; aggregates verdicts; exit 2 if any FAIL/REJECT/CRITICAL |
| `session-start` | SessionStart | Re-injects NEEWE manifest + current state on resume/compact |

The agent operates per the Continuous Execution Rule: **do NOT pause to check in between tasks. Stop only on BLOCKED, DONE, cost-cap, or user interrupt.**

## Continuation Prompt (on pause)

When Goal Mode pauses (any reason), emit:

```
---

## ▶ Goal Mode Paused

**Goal:** <goal text>
**Reason:** <cost-cap | gate-failure | user-interrupt | condition-met>
**Spent:** $X / $Y cap
**Phase:** <current>
**Gate verdicts:** see .neewe/gates/<phase>/latest/aggregate.json

### Resume options

(a) Continue (raise budget):
`/neewe-goal "<same goal>" --budget <new-cap>`

(b) Investigate the pause:
`/neewe-cost-guard`  (if cost-related)
Read `.neewe/gates/<phase>/latest/aggregate.json`  (if gate-failure)

(c) Ship what's done:
`/agent governance-release`

---
```

## Stop Conditions

NEEWE Goal Mode stops on ANY of:

1. **Cost cap reached** (`cost-cap-guard` exit 2) — cleanest stop; resume by raising cap.
2. **Governance trio FAIL** (`governance-gate.sh` exit 2) — investigate verdicts; fix; resume.
3. **Goal condition met** (native `/goal` evaluator) — emit completion summary.
4. **Max turns reached** (per `/goal ... or stop after N turns`) — emit partial progress.
5. **User interrupt** (Esc) — emit current state + resume options.
6. **Unrecoverable BLOCKED** (executor reports BLOCKED with no auto-recovery) — surface for human.

## Anti-Patterns

- **Goal too vague** — "ship something good" is not goal-mode-compatible. Goals must be OBSERVABLE: tests pass, file exists, deploy succeeded, lint clean. If you can't write the success condition as a checkable predicate, refine the goal before activating.
- **No budget cap** — running Goal Mode without `--budget` defaults to $5. For long goals, set explicit caps. Cost overrun is the #1 trust-killer.
- **Activating in wrong phase** — `/neewe-goal` in Phase 00 with intent to implement is wrong. Use Phase 01-spec → 02-plan → 03-execute escalation.
- **Squad-less goal** — without an active squad, Goal Mode has no executor lineup. Run `neewe-squad-composer` first OR rely on the governance trio + default planner.

## Tone

NEEWE Tone Spec. The user activated Goal Mode to STOP supervising. Don't narrate every step; emit only on pause/completion/blocker. Honor the Continuous Execution Rule.
