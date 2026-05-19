---
name: neewe-state
description: Use when you need to read or reason about the current NEEWE phase, mode, model routing, active squad, cost budget, or any other framework runtime state. Defines the .neewe/state.json schema and the `neewe` CLI contract.
license: MIT
---

# NEEWE Phase-State Primitive (EP-OPUS-2)

NEEWE keeps **all cross-cutting runtime state in a single JSON file** at `.neewe/state.json`. Every hook, skill, and agent reads from it; the `neewe` CLI is the only sanctioned writer (atomic, lockfile-protected).

**Why this exists:** R4 (phase-dependent posture) is the architectural rule that makes Phase 01 act like analysis-mode and Phase 03 act like execution-mode. Without a runtime mechanism, R4 stays aspirational. This file IS the mechanism.

---

## The `.neewe/state.json` Schema (v1)

```json
{
  "$schema": "neewe-state-v1",
  "neewe_version": "0.1.0",
  "phase": "00-intake",
  "phase_started_at": "2026-05-19T14:23:11Z",
  "mode": "balanced",
  "model_routing": {
    "main": "opusplan",
    "subagents": "sonnet",
    "background": "haiku"
  },
  "permission_mode": "default",
  "output_style": "NEEWE Startup",
  "context_mode_enabled": false,
  "caveman_mode": "off",
  "hook_profile": "standard",
  "active_goal": null,
  "active_squad": null,
  "cost_budget": {
    "cap_usd": 5.00,
    "spent_usd": 0.00
  }
}
```

### Field reference

| Field | Type | Allowed values | Meaning |
|---|---|---|---|
| `phase` | string | `00-intake` \| `01-spec` \| `02-plan` \| `03-execute` \| `04-validate` \| `05-goal-mode` | Current NEEWE workflow phase. Drives R4. |
| `phase_started_at` | ISO-8601 string | — | UTC timestamp of last `set-phase` call |
| `mode` | enum | `thrift` \| `balanced` \| `quality` | EP-OPUS-3 Cost-Quality-Speed dial (single user-facing knob) |
| `model_routing.main` | string | `opusplan` \| `opus` \| `sonnet` \| `haiku` \| custom alias | Primary model |
| `model_routing.subagents` | string | same as above | Default for Task tool spawns |
| `model_routing.background` | string | same as above | Summaries, file suggestion |
| `permission_mode` | enum | `default` \| `acceptEdits` \| `plan` \| `auto` \| `dontAsk` \| `bypassPermissions` | Current permission posture |
| `output_style` | string | name of installed style | Per-phase voice override |
| `context_mode_enabled` | boolean | — | Whether Context-Mode MCP sandbox is active (L7) |
| `caveman_mode` | enum | `off` \| `lite` \| `full` | Caveman output compression level |
| `hook_profile` | enum | `minimal` \| `standard` \| `strict` | L6 governance enforcement dial |
| `active_goal` | string \| null | — | Free-text description of current Goal Mode target |
| `active_squad` | string \| null | — | Name of current squad composition |
| `cost_budget.cap_usd` | number | — | Hard cost cap for current session/goal (EP-OPUS-10) |
| `cost_budget.spent_usd` | number | — | Cumulative cost since session start |

---

## The `neewe` CLI (atomic writer)

The CLI is shipped in `bin/neewe` (and `bin/neewe.cmd` polyglot wrapper for Windows). Add `${CLAUDE_PLUGIN_ROOT}/bin` to PATH via plugin install.

```
neewe init                  # create .neewe/state.json with defaults
neewe show                  # pretty-print state
neewe set-phase <phase>     # atomically update phase + timestamp
neewe get <dot.path>        # read a single field (e.g. neewe get model_routing.main)
neewe help                  # full reference
```

### Concurrency safety

All writes acquire `.neewe/.state.lock` via atomic `mkdir` (POSIX-portable, works on Git Bash). Stale locks older than 30s are auto-cleared. 20 attempts with 50-200 ms jittered sleep between retries.

---

## How to Use This Skill (for agents)

When you need to make a phase-dependent decision:

1. Run `neewe get phase` to read the current phase.
2. Run `neewe get mode` to read the cost-quality-speed dial.
3. Adjust your behavior accordingly. Examples:
   - Phase `01-spec` + mode `quality` → invest in deep thinking, multi-option presentation, no auto-edits.
   - Phase `03-execute` + mode `balanced` → action-bias, parallel tool calls, atomic commits, TDD.
   - Phase `05-goal-mode` + mode `thrift` → maximum compression, no clarifying questions unless BLOCKED.

When the user asks to transition phases, run:
```bash
neewe set-phase 02-plan
```

If a hook needs to inject phase-aware context (e.g., a phase-specific output style override), it should read `.neewe/state.json` directly via `jq` or `python -c 'import json; ...'`.

---

## Anti-Patterns

<HARD-GATE>
- **NEVER hand-edit `.neewe/state.json`** outside the `neewe` CLI. The lockfile + atomic mkdir contract is what prevents race conditions during parallel agent execution.
- **NEVER cache state.json reads across turns.** State changes mid-session; always re-read.
- **NEVER write to state.json from a hook.** Hooks are concurrent; only the CLI's lockfile-aware writer is safe.
</HARD-GATE>

---

## Roadmap

This is the **Sprint 1 minimum**. Future sprints add:

- **Sprint 4:** `neewe mode <thrift|balanced|quality>` (EP-OPUS-3) — cascades mode → model_routing/caveman_mode/hook_profile/output_style atomically
- **Sprint 4:** `neewe goal "<description>" --budget <usd>` (EP-OPUS-10) — sets active_goal + cost_budget cap; Stop hook enforces cap
- **Sprint 5:** `neewe cost report` — reads `.neewe/.cost-log` and surfaces per-agent/per-phase spend
- **Sprint 5:** Dashboard (EP-OPUS-13) reads state.json and renders the Settings + Phase + Cost panels from it
