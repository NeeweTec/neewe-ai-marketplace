---
name: context-save
description: Use before /clear, before /compact when context is high (≥80%), when transitioning ownership between sessions or squads, or when the user explicitly wants to pause work for resume later. Captures git state + active decisions + outstanding TODOs + cost budget snapshot to .neewe/handoffs/<timestamp>.md so context-restore can rehydrate cleanly.
license: MIT
disable-model-invocation: true
allowed-tools: Bash(neewe *) Bash(git *) Read Write Glob Grep
---

# `/context-save` — Cross-Session Handoff Snapshot

User-only slash command. Captures everything needed to resume the project from a fresh session (or different developer) without losing momentum.

Adapted from GStack `context-save` with NEEWE overlay (MNEME-aware, state.json snapshot, governance verdict refs).

## When to Use

| Trigger | Why |
|---|---|
| About to run `/clear` | Survive the wipe |
| Context utilization ≥ 80% | Pre-compact insurance — compaction loses fidelity |
| End of working session | Resume tomorrow morning |
| Squad swap / dev handoff | New owner can pick up cleanly |
| Before extended `claude --resume` interval | Cold start needs a warm doc to read |
| Active goal paused (cost-cap-guard fired) | Pause-state must be resumable |

## What It Captures

A single markdown file at `.neewe/handoffs/<YYYYMMDD-HHMMSS>.md` containing:

```markdown
# NEEWE Context Save — 2026-05-19T15:42Z

## Current State (from .neewe/state.json)
- Phase: 03-execute
- Mode: balanced
- Active goal: "Ship the /search endpoint"
- Active squad: squad-search-2026-05-19
- Cost: $1.42 / $3.00 cap (47%)
- Mode routing: opusplan / sonnet / haiku

## Git State
- Branch: feat/search-endpoint
- HEAD: a3b1c2d (3 commits ahead of origin/main)
- Working tree: clean / dirty (count + list)
- Untracked: <files>
- Stashes: <names>

## Last 5 Commits
- a3b1c2d — feat(api): add /search endpoint validation
- b4d2e3f — test(api): add /search integration tests
- ...

## Active Plan Tasks (from .neewe/planning/STATE.md if present)
- [x] Task 1: ...
- [x] Task 2: ...
- [ ] Task 3: ... (in progress)
- [ ] Task 4: ... (next)

## Recent Decisions (last 5 from .neewe/vault/decisions/)
- 2026-05-19: use-postgres-pgvector-over-pinecone — chosen for self-host requirement
- ...

## Governance Verdicts (latest per phase)
- 03-execute / 2026-05-19T15:30Z: PASS (QA ok, TL approve, PO accept)
- ...

## Open BLOCKED Items
- (none) / list with reproduction steps

## Open Questions for Next Owner
- <question 1>
- <question 2>

## Continuation Prompt

`/clear` then:

```
NEEWE project: <project>. Continuation from save 2026-05-19T15:42Z.

Run `/context-restore .neewe/handoffs/<filename>.md` to rehydrate.

Active phase: 03-execute. Active goal: "Ship the /search endpoint".
Next task: Task 3 (cite from STATE.md).
```
```

## Execution

The skill body runs these commands inline (via `!`) and assembles the markdown:

```bash
!neewe show
!git status --short
!git log --oneline -5
!git branch --show-current
!cat .neewe/planning/STATE.md 2>/dev/null || echo "(no STATE.md)"
!ls -t .neewe/vault/decisions/*.md 2>/dev/null | head -5
!ls -t .neewe/gates/*/latest/aggregate.json 2>/dev/null | head -3
```

Then writes the assembled markdown to `.neewe/handoffs/<timestamp>.md` and prints the file path.

## Anti-Patterns

- **Saving and NOT clearing** — context-save is for handoff; if you don't `/clear` or `/compact` after, the save is unused
- **Editing the save file** — it's a snapshot, not a working doc. Edit `.neewe/planning/STATE.md` or `.neewe/vault/` instead, then re-save
- **Saving every turn** — saves should be milestones (phase end, session end, blocker), not heartbeats. Log noise is bad
- **Trusting save vs state.json** — `state.json` is source-of-truth runtime. Save files are point-in-time snapshots; if they conflict with state.json, state.json wins

## Pair Skill

`context-restore` reads the save file and rehydrates the session. The two are designed to be used together.

## Tone

Saves are structured snapshots, not prose. Tables, file:line refs, no narration.
