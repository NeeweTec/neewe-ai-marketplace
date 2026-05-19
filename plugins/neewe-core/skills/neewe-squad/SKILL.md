---
name: neewe-squad
description: Use when saving the current squad composition for cross-project reuse, loading a previously-saved squad into the current project, listing the user's squad pool, or inspecting a squad's run history (EP-OPUS-5 Squad-as-Service). Wraps the `neewe-squad` CLI with NEEWE doctrine — squads are versioned, lineage-tracked assets, not one-off compositions.
license: MIT
disable-model-invocation: true
allowed-tools: Bash(neewe-squad *) Bash(neewe *) Read
---

# `/neewe-squad` — Cross-Project Squad Pool

User-only slash command. EP-OPUS-5 Squad-as-Service: squads become reusable team templates with cross-project lineage.

## The Pool

Per-user squad pool at `~/.neewe/squads/<name>/`:

```
~/.neewe/squads/
├── squad-auth-v2/
│   ├── manifest.json     # composition snapshot (immutable per save)
│   ├── lineage.jsonl     # append-only per-run log
│   └── README.md
├── squad-saas-mvp/
└── squad-brownfield-rescue/
```

When `neewe-squad-composer` (the agent) is invoked, it consults this pool FIRST — if a saved squad matches the new project's signals (stack/domain/budget), it recommends reuse.

## Usage

```bash
# Save the current project's squad composition for future reuse
!neewe-squad save squad-auth-v2

# List all saved squads
!neewe-squad list

# Show details + last 5 runs of a squad
!neewe-squad show squad-auth-v2

# Load a saved squad into the current project
!neewe-squad load squad-auth-v2

# View full lineage (every run ever)
!neewe-squad lineage squad-auth-v2

# Remove a squad from the pool (asks confirm)
!neewe-squad delete obsolete-squad
```

## Lineage Schema

Each run logged to `lineage.jsonl` (one line per run):

```json
{
  "ts": "2026-05-19T14:23:11Z",
  "outcome": "pass",
  "cost_usd": 1.24,
  "duration_sec": 7560,
  "project": "/home/user/projects/auth-revamp"
}
```

Outcomes: `pass` (governance trio all PASS), `fail` (any FAIL/REJECT/CRITICAL), `unknown` (incomplete run).

`governance-release` automatically calls `neewe-squad log-run` on every release, capturing the per-feature run record. The Squad Composer reads aggregate stats from `lineage.jsonl` to score each squad's reliability.

## Reputation Score (computed by Squad Composer)

For each squad, the Composer derives:

- **Success rate** = `pass / (pass + fail)` over last 30 days
- **Mean cost per run** = average `cost_usd`
- **Mean duration** = average `duration_sec`
- **Recency-weighted reliability** = recent runs weighted higher than old ones

When recommending a squad for a new project, the Composer surfaces the top 3 by recency-weighted reliability that match the project's signals.

## When to Save

| Trigger | Why |
|---|---|
| After a successful goal completion in 03-execute | Capture what worked |
| At the end of a successful project phase | Preserve the proven composition |
| Before experimenting with a new squad variant | Keep the known-good as fallback |
| When you find a composition you'll re-use across projects | THE point of Squad-as-Service |

Don't save every random composition. Save the ones that **worked** and you'd want to reuse.

## When to Load

| Trigger | Why |
|---|---|
| Starting a new project with similar stack/domain | Skip squad-composition deliberation; use proven template |
| Squad Composer recommends one from the pool | Take the recommendation if signals align |
| Returning to a project after long hiatus | Restore the known-good composition |

## Anti-Patterns

- **Saving every transient composition** → pool bloats; reputation signal degrades
- **Loading without checking lineage** → past success ≠ future fit if project signals differ
- **Editing `manifest.json` directly** → use `save` again to capture a new version; manifests are immutable per save
- **Manually editing `lineage.jsonl`** → auditability requires immutability; only the CLI appends

## Pair With

- `neewe-squad-composer` (agent) — consults this pool when recommending
- `governance-release` (agent) — auto-logs run outcomes here
- `governance-retro` (agent) — aggregates lineage data into retrospectives

## Tone

CLI wrapper — concise. Print the saved/loaded confirmation; let the user run `show` for details.
