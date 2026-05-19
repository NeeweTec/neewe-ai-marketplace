---
name: context-restore
description: Use after /clear or at the start of a fresh session when resuming a NEEWE project that has previous `context-save` snapshots in .neewe/handoffs/. Loads the most recent (or named) save file, reads state.json + vault decisions + planning state, and emits a "you are here" briefing so the agent can continue without re-asking the user for context.
license: MIT
disable-model-invocation: true
allowed-tools: Bash(neewe *) Bash(git *) Bash(ls *) Bash(cat *) Read Glob
---

# `/context-restore` — Rehydrate from Saved Snapshot

User-only slash command. The mirror of `context-save`. Reads the latest (or named) handoff file and emits a structured briefing so a fresh session knows exactly what it's resuming.

## Usage

```
/context-restore                          # auto-selects most recent save
/context-restore <handoff-filename>       # specific file
/context-restore --cross-branch           # search ALL branches' .neewe/handoffs/ (cross-Conductor / git-worktree resume)
```

## What It Does

1. **Locate the save** — most recent file in `.neewe/handoffs/*.md` (or named arg)
2. **Read state.json** — current runtime state (phase, mode, active goal, cost budget)
3. **Read git state** — current branch, last 5 commits, working tree status
4. **Read planning state** — `.neewe/planning/STATE.md` if present
5. **Read recent decisions** — latest 5 ADRs from `.neewe/vault/decisions/`
6. **Read latest gate verdicts** — `.neewe/gates/<phase>/latest/aggregate.json`
7. **Diff save-vs-current** — surface what changed since the save (new commits, gate verdicts, cost spend)
8. **Emit briefing** — structured "you are here" doc the agent treats as ground truth

## Output Format

```
## CONTEXT_RESTORE_BRIEFING

**Restored from:** .neewe/handoffs/<timestamp>.md
**Save age:** 18 hours (Mon 2026-05-19 09:42 → Tue 2026-05-20 03:42)

### Current state (NOW vs at save)
| Field | At save | Now | Changed? |
|---|---|---|---|
| Phase | 03-execute | 03-execute | — |
| Mode | balanced | balanced | — |
| Active goal | "Ship the /search endpoint" | (same) | — |
| Cost spent | $1.42 | $1.58 | +$0.16 (likely background hooks) |
| Branch | feat/search-endpoint | feat/search-endpoint | — |
| HEAD | a3b1c2d | a3b1c2d | — |

### Open work
- Next task: Task 3 — "Add pagination params to /search endpoint" (from STATE.md)
- BLOCKED items: (none) / list with reproduction

### Recent decisions (still active)
- 2026-05-19 use-postgres-pgvector-over-pinecone — chosen for self-host requirement

### Latest governance verdict
- 03-execute / 2026-05-19T15:30Z: PASS (QA ok, TL approve, PO accept)

### Drift since save (read carefully — may invalidate the briefing)
- Any commits since save? <none / list>
- Any new gate runs? <none / list>
- Any new BLOCKED items? <none / list>

### Recommended Next Action
- Resume Task 3: <copy-paste-ready next step>

## CONTEXT_RESTORE_BRIEFING_COMPLETE
```

The completion marker `## CONTEXT_RESTORE_BRIEFING_COMPLETE` MUST be the FINAL line. The agent should now have everything needed to continue without asking the user "where were we?".

## Cross-Branch Resume

For long-running NEEWE projects with multiple parallel worktrees / Conductor workspaces:

```bash
# Find handoffs across all local branches
git worktree list | awk '{print $1}' | xargs -I{} ls -t {}/.neewe/handoffs/*.md 2>/dev/null | head -5
```

The skill body handles this when `--cross-branch` flag is present. Useful for "I started this in worktree A; resume in worktree B."

## Drift Detection

If the save is more than 24 hours old OR there are new commits / gate verdicts since the save, surface this prominently. The briefing might be stale.

When drift is significant (>24h OR >5 new commits OR phase changed): recommend re-running `/context-save` to capture the current state before continuing.

## Anti-Patterns

- **Trusting a 7-day-old save** — without checking what changed, may operate on stale assumptions
- **Restoring without reading the briefing** — the agent should read it before acting; the briefing IS the rehydration
- **Editing the save file post-restore** — saves are immutable snapshots; if state needs updating, update `.neewe/planning/STATE.md`
- **Skipping drift detection** — drift is the most common cause of "resume produced wrong output"

## Pair Skill

`context-save` writes the snapshot; `context-restore` reads it. The two are inseparable.

## Tone

Briefings are structured "you are here" docs, not stories. Tables, file:line refs, decisive. No "let me check..." prose.
