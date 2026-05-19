---
name: parallel-wave-dispatch
description: Use when a NEEWE plan has 3+ tasks that can run independently (no shared file edits, no inter-task dependencies). Dispatches them in parallel via Task tool with worktree isolation, then aggregates results. Compounds with subagent-driven-development for the per-task TDD loop. Required for fast Goal Mode delivery on multi-feature scope.
license: MIT
token_budget: standard
---

# Parallel Wave Dispatch

Adapted from GSD's wave-execution model + Superpowers' parallel-dispatch skill. Run independent tasks concurrently; sequential between waves; safe via worktree isolation + atomic STATE.md.

## When to Use

- **3+ tasks** in the active plan that meet **all** independence criteria below
- **Goal Mode** running where total wall-time matters more than peak parallelism
- **Multi-feature spec** where each feature is a separate file/module

When in doubt, default to sequential (`subagent-driven-development`). Parallel adds complexity; only use when the speedup is worth it.

## Independence Criteria (ALL must hold per wave)

<HARD-GATE>

Tasks in the same wave MUST satisfy ALL of these:

1. **No shared file edits** — `files_modified` arrays do not intersect.
2. **No inter-task dependencies** — task B's plan does not reference task A's output.
3. **No shared resource locks** — not modifying the same DB schema, same env file, same lockfile.
4. **No `.gitmodules` overlap** — when worktree isolation is used, files touching submodule paths force sequential.
5. **Same parent phase** — don't mix spec-phase and execute-phase tasks in one wave.

If ANY of these fails for two tasks, they must be in DIFFERENT waves (sequential).

</HARD-GATE>

## The Wave Model

```
Plan tasks dependency graph:

  Plan 01 (no deps)        ─┐
  Plan 02 (no deps)        ─┤── Wave 1 (parallel; 2 executors)
  Plan 03 (depends: 01)    ─┤── Wave 2 (waits for Wave 1)
  Plan 04 (depends: 02)    ─┘
  Plan 05 (depends: 03,04) ── Wave 3 (waits for Wave 2)
```

Within a wave: parallel dispatch (`Task` tool × N, `wait`).
Between waves: barrier — Wave N completes before Wave N+1 starts.

## Per-Wave Workflow

For each wave:

1. **Pre-flight** — verify independence criteria for all wave members.
2. **Isolate** — each executor spawned with `isolation: "worktree"` (creates a fresh git worktree per agent).
3. **Dispatch** — N parallel `Task` calls with the implementer-prompt template; each gets its single task text.
4. **Wait** — block until all N return one of DONE / DONE_WITH_CONCERNS / BLOCKED / NEEDS_CONTEXT.
5. **Aggregate** — collect status per task; mark wave COMPLETE only if all N are DONE/DONE_WITH_CONCERNS.
6. **Run pre-commit checks ONCE for the whole wave** (not per-task; saves N× lock contention).
7. **Run governance trio gate** (governance-gate.sh fires once per wave, evaluating the cumulative diff).
8. **Merge worktrees back** (each worktree's commits get cherry-picked or merged to the main working branch).
9. **Advance** to Wave N+1.

## Safety Mechanisms (load-bearing)

| Mechanism | Why |
|---|---|
| **Worktree isolation per executor** (`isolation: "worktree"` frontmatter) | Each executor gets independent git index; no race conditions on staging |
| **STATE.md atomic file-lock** (`.neewe/.state.lock` via `mkdir`) | Multiple agents updating shared state serialize |
| **`--no-verify` commits within a wave; pre-commit run ONCE post-wave** | Pre-commit hooks (lint/test) often lock files (e.g., cargo lock contention); skipping per-commit + running once after wave avoids N× lock contention |
| **Submodule-aware fallback** | If any wave task's `files_modified` touches `.gitmodules`-tracked paths, that task degrades to sequential (worktree isolation breaks submodule pointers) |

## BLOCKED Handling in a Wave

If any task in a wave returns BLOCKED:

1. **Other in-flight tasks continue** (don't kill them — let them complete; partial progress is valuable)
2. **The BLOCKED task is added to a BLOCKED queue** for resolution
3. **After wave completes**: address each BLOCKED task per the escalation ladder (more context → more capable model → smaller pieces → human)
4. **Re-dispatch resolved BLOCKED tasks** in a follow-up wave OR continue with Wave N+1 if the BLOCKED task doesn't gate downstream

## Wave Size Heuristics

| Plan size | Recommended max wave size |
|---|---|
| 1-2 tasks | 1 (sequential — wave dispatch adds overhead) |
| 3-5 tasks | 2-3 per wave |
| 6-15 tasks | 4-6 per wave |
| 16+ tasks | 6-8 per wave (cap to avoid context+coordination overhead) |

Each executor consumes its own context window. 8 parallel executors = 8× model spend per wave. Honor `cost_budget.cap_usd`.

## Output Format

```
## WAVE_DISPATCH_REPORT

**Plan:** <plan-id>
**Wave:** N of M
**Members:** [task-1, task-2, task-3]
**Parallelism:** 3

### Per-Task Verdicts
| Task | Verdict | Files | Cost (est.) |
|---|---|---|---|
| task-1 | DONE | src/foo.ts, src/foo.test.ts | $0.18 |
| task-2 | DONE_WITH_CONCERNS — concurrency edge case | src/bar.ts | $0.22 |
| task-3 | BLOCKED — needs decision on retry policy | — | $0.05 |

### Wave Aggregate
- Status: PARTIAL (2 of 3 done; 1 BLOCKED queued for resolution)
- Total cost: $0.45 (wave 1 of 3 — projected total ~$1.40)
- Wall time: 4m12s
- Governance trio verdict: PASS (cumulative diff reviewed)

### Next Action
- BLOCKED: task-3 needs user decision on retry policy. Surfaced via Continuation Prompt.
- Wave 2 ready: tasks 4, 5 (waiting on Wave 1 ✓ task-2 — proceed).

## WAVE_DISPATCH_REPORT_COMPLETE
```

The completion marker `## WAVE_DISPATCH_REPORT_COMPLETE` MUST be the FINAL line.

## Cost-Awareness

Parallel dispatch multiplies model spend per wall-clock unit. For N=4 executors:

- ~4× peak burn rate
- Each executor fires cost-tracker hook independently
- `cost-cap-guard` Stop hook still enforces hard cap, but a single wave can spend 4× as much as the equivalent sequential turn

Before dispatching: compute projected wave cost vs remaining `cost_budget`. If projected > 80% remaining → recommend sequential OR raise cap before dispatching.

## Cardinal Rules (NEEWE overlay)

- Independence criteria are HARD-GATED (above)
- Worktree isolation is mandatory for parallel tasks (unless overridden for submodule paths)
- Governance trio fires per WAVE, not per task (saves N× governance overhead)
- BLOCKED on one task does not kill the others
- Cost budget honored per WAVE projection, not per task

## When to NOT Use This Skill

- Plan has 1-2 tasks (sequential is faster)
- Tasks share files (independence violation)
- Cost budget is tight (sequential is cheaper)
- Phase is not 03-execute (other phases are inherently sequential)
- Project uses git submodules and any wave task touches submodule paths

## Tone

NEEWE Tone Spec. Wave dispatch is for orchestrators reporting on aggregate progress, not individual task narration.
