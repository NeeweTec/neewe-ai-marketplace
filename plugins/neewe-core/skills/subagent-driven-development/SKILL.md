---
name: subagent-driven-development
description: Use when executing a NEEWE plan task-by-task with parallel-safe subagent dispatch. Loops one task at a time: spawn implementer subagent → spec-compliance reviewer → code-quality reviewer → re-loop on FAIL → next task. Implements the load-bearing pattern from Superpowers (two-stage review, four-status protocol, do-not-trust-the-report). Required during Phase 03 execution.
license: MIT
token_budget: reference
---

# Subagent-Driven Development

The canonical NEEWE pattern for Phase 03 (execute). One task at a time, spawned to fresh-context subagents, gated by two-stage review.

<HARD-GATE>

When using this skill, you (the controller) do NOT write production code directly. You spawn subagents for it. Your job is dispatch + review + handoff — not implementation.

</HARD-GATE>

## The Loop (canonical)

For each task in the plan, in order:

```
1. Extract task text from PLAN.md (once, fully)
2. Spawn implementer subagent with implementer-prompt template + task text
3. Wait for implementer to return one of: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
4. If DONE/DONE_WITH_CONCERNS:
   a. Spawn spec-compliance-reviewer subagent (do NOT trust implementer's report)
   b. If reviewer FAILs → spawn implementer again with reviewer feedback → re-loop
   c. If reviewer PASSes → spawn code-quality-reviewer subagent
   d. If quality-reviewer FAILs → spawn implementer with feedback → re-loop
   e. If both PASS → mark task complete → next task
5. If BLOCKED → escalate per BLOCKED protocol (below)
6. If NEEDS_CONTEXT → controller provides context, re-dispatch
```

**Do NOT check in with the user between tasks.** This is the Continuous Execution Rule. Stop only on BLOCKED or full DONE.

## The Three Prompt Templates

Templates live as separate files; reference them by filename, never `@`-load (force-load anti-pattern).

### `implementer-prompt.md` (sketch — full template ships in Sprint 4.5)

```
You are implementing a single NEEWE plan task. Operate in isolation:
- Do not read the plan file. The task text is provided below in full.
- Apply TDD: failing test first, then minimal impl.
- Atomic commits per logical change (conventional commit format).
- Output contract: terminate with `DONE:` | `DONE_WITH_CONCERNS:` | `BLOCKED:` | `NEEDS_CONTEXT:`
- Self-review before claiming DONE: tests run? exit 0? lint clean? diff matches task scope?

Task:
<<<
{task_text}
>>>
```

### `spec-compliance-reviewer-prompt.md` (sketch)

```
A subagent just claimed DONE on a NEEWE task. Your job: VERIFY the claim by reading
the actual code + diff. DO NOT trust the implementer's report.

Spec requirement (from plan):
<<<
{task_text}
>>>

Files changed: {file_list}

Read the actual code. Map each acceptance criterion to a specific file:line.
Run the verification commands the spec specifies. Show exit codes.

Output:
- PASS — every AC mapped + verified
- FAIL — list specific ACs unmapped/unverified with concrete fixes
```

### `code-quality-reviewer-prompt.md` (sketch)

```
The spec-compliance reviewer just PASSED a NEEWE task. Now review the code QUALITY.
This is a different question from "does it work" — it's "is this maintainable".

Apply the 4-question Pre-Report Gate before any finding:
1. Can I cite the exact line?
2. Can I describe the concrete failure mode (not 'might be')?
3. Have I read the surrounding context?
4. Is the severity defensible?

Apply the False-Positive Catalog (don't flag style preferences, framework-handled
paths, fixtures, etc.).

Output:
- PASS — no Critical or Important findings
- FAIL — list with severity tiers (Critical / Important / Minor) + concrete fixes
```

## The Four-Status Protocol

Implementer subagents MUST report exactly one of:

| Status | Meaning | Controller action |
|---|---|---|
| `DONE:` | All AC met, tests pass, self-review passed | Proceed to spec-compliance review |
| `DONE_WITH_CONCERNS:` | Functionally complete but with concerns the implementer surfaced | Proceed to review; controller notes concerns in handoff journal |
| `BLOCKED:` | Cannot proceed without help | Apply BLOCKED protocol (below) |
| `NEEDS_CONTEXT:` | Spec ambiguity or missing info | Controller provides; re-dispatches |

Parse the FIRST TOKEN of the subagent's response (cavecrew-style contract). If no match → treat as malformed; re-dispatch with a reminder of the contract.

## BLOCKED Protocol (escalation ladder)

When implementer returns BLOCKED, walk this ladder in order:

1. **More context** — re-dispatch with additional files / spec sections / decisions referenced. (~50% of BLOCKEDs resolve here.)
2. **More capable model** — re-dispatch on Opus instead of Sonnet. (~25% resolve here.)
3. **Smaller pieces** — split the task into 2-3 sub-tasks; dispatch each. (~15% resolve here.)
4. **Escalate to human** — surface the blocker with reproduction + what's been tried.

Document the blocker + resolution path in the handoff journal (`.neewe/handoffs/<phase>.md`).

## Context Economy (load-bearing)

| Rule | Why |
|---|---|
| **Subagent gets ONLY the task text, never the plan file** | Saves 5-50K tokens per dispatch (the plan is for the controller; the task is for the subagent) |
| **Heavy references in companion files, not `@`-loaded** | `@`-syntax force-loads on every dispatch; mention by name instead |
| **TodoWrite as single source of truth for task state** | Controller maintains the todo; subagents don't see it |
| **Continuous execution: no check-ins between tasks** | Each check-in costs a controller cold-start (10-30K tokens) |

## Parallel Dispatch (separate skill)

For 3+ failing tests in different files with different root causes, switch to `parallel-wave-dispatch` (Sprint 4.5). Wave-based parallel dispatch is for INDEPENDENT tasks; the canonical sequence above is for DEPENDENT tasks.

## Cardinal Rules (NEEWE overlay)

<NEEWE-LAW>

1. The controller does NOT implement. Only dispatches + reviews + decides.
2. The implementer does NOT see the plan file. Only the task text.
3. The spec-compliance reviewer does NOT trust the implementer's report. Reads the code.
4. The code-quality reviewer fires AFTER spec-compliance, not before.
5. Atomic commits — one task = one logical commit. Never batch.
6. TDD applies to implementer: failing test FIRST.
7. Continuous Execution Rule: no check-ins between tasks. Only stop on BLOCKED / DONE / cap.

</NEEWE-LAW>

## Stop Conditions

| Condition | Action |
|---|---|
| All plan tasks DONE | Emit summary + invoke `governance-release` if appropriate |
| Any task BLOCKED beyond escalation ladder | Halt; surface to user via Continuation Prompt |
| Cost cap reached (cost-cap-guard fires) | Pause; emit Continuation Prompt with resume options |
| Governance trio FAIL on a task | Re-dispatch implementer with verdict feedback |
| User interrupt | Save state to `.neewe/handoffs/<phase>.md`; emit summary |

## Tone

NEEWE Tone Spec. The controller is a conductor — concise, dispatch-oriented. Don't narrate the loop; report only on transitions (task complete, BLOCKED escalation, governance verdict change).
