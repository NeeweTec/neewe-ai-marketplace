---
name: brainstorming
description: Use when the user has stated a goal, idea, or problem but NO spec or plan exists yet. Drives socratic Q&A to surface scope, constraints, and tradeoffs. Produces a spec document at .neewe/vault/specs/YYYY-MM-DD-<topic>-design.md. Forbids any implementation skill until the user explicitly approves the design.
license: MIT
token_budget: standard
---

# Brainstorming

You are in brainstorming mode. The user has an idea or a goal; no spec or plan exists yet. Your job is to **probe, present options, capture decisions, and produce a spec document** — not to start coding.

<HARD-GATE>

You MUST NOT invoke any implementation skill (`writing-plans`, `subagent-driven-development`, `test-driven-development`, `verifying-completion`) until:

1. A spec document is written to `.neewe/vault/specs/YYYY-MM-DD-<topic>-design.md`, AND
2. The user has explicitly approved the spec ("approved", "ship it", "let's plan it", or similar affirmative).

The terminal state of brainstorming is invoking `writing-plans` (Sprint 4) or `neewe-opus-planner` (current). Do NOT invoke any other skill before then.

</HARD-GATE>

## The Brainstorming Workflow (9 steps, in order)

1. **Restate the goal** in your own words. Confirm with the user. Surface the obvious-but-unstated assumptions.
2. **Surface the audience** — who uses this? When? Under what constraints?
3. **Probe the constraints** — what's NOT allowed? What's already decided? What's the budget / deadline / scope ceiling?
4. **Propose 2-3 approaches** with explicit tradeoffs. Each approach gets: 1-sentence description, key tradeoff, why it might be the right choice. NEVER silently pick one (Karpathy K1.2).
5. **Recommend an approach** with the reasoning. Let the user choose A / B / C / "C: <alternative I haven't mentioned>".
6. **Present design in sections** — get section-by-section approval. Don't dump a 5K-word design and ask 'thoughts?' — present 'data model' first, get OK, then 'API surface', etc.
7. **Capture decisions in `<decisions>` block** for the spec doc — each decision gets: question, options-considered, chosen, rationale, who-decided, when.
8. **Spec self-review** — placeholder scan (any TODOs?), consistency (do all sections agree?), scope (are we still on goal?), ambiguity (any 'TBD' that should be decided now?).
9. **User reviews spec** — present the full spec, give the user a chance to edit, then mark `status: approved`.

## Socratic Question Discipline

- **One question per turn** in Opus (model-overlay rule from GST). Batched in Sonnet (multi-question is OK).
- Each question advances the spec, not the conversation. If the answer doesn't change the spec, don't ask.
- Prefer concrete options over open-ended ("Postgres or SQLite?" beats "What database should we use?").
- When the user is uncertain, present 2-3 options + recommendation. Never just ask "what do you want?" — that's lazy.

## The `<decisions>` Block Format

In the spec doc, capture every load-bearing choice:

```markdown
<decisions>
- decision: use-postgres-not-sqlite
  question: Which database for v1?
  options: [postgres@16, sqlite, mysql@8]
  chosen: postgres@16
  rationale: PIX integration requires JSONB + advisory locks; SQLite lacks both
  decided_by: user
  decided_on: 2026-05-19
</decisions>
```

This block is hard-gated downstream — both `neewe-opus-planner` (BLOCKING decision coverage check) and `governance-tech-lead` (NON-BLOCKING decision verification) read it.

## Modes Within Brainstorming

| Mode | When | Behavior |
|---|---|---|
| **default** | Standard | Progressive-depth dialogue (9 steps above). |
| **power** | User says 'power mode' or new product area with many unknowns | Exhaustive dimension sweep — cover all major design axes before recommending. |
| **auto** | User says 'auto' or has limited time | Read codebase + spec; produce 3-5 evidence-backed assumptions; user confirms/edits in one round. |
| **advisor** | User has multiple gray areas | Spawn a parallel `neewe-outside-voice` per gray area; produce 5-column comparison table (Option / Pros / Cons / Complexity / Recommendation). |
| **batch** | Multiple ideas at once | Process one at a time; checkpoint between each. |

## Spec Document Path Convention

Always write to: `.neewe/vault/specs/YYYY-MM-DD-<kebab-topic>-design.md`

(Sprint 5 MNEME L4 will scaffold `.neewe/vault/` automatically; for now create the dir if missing.)

## Spec Self-Review Checklist (run BEFORE handing to user)

- [ ] No `TBD` / `TODO` / `???` placeholders unless explicitly deferred
- [ ] Every section heading delivers — no empty sections
- [ ] Cross-references resolve (links to other sections work)
- [ ] Scope is consistent — every section advances the stated goal
- [ ] No ambiguity that should have been decided now
- [ ] Decisions block contains every load-bearing choice
- [ ] At least one open question is acknowledged (rarely is everything decided)

## Anti-Patterns

- **Silent picking** when spec is ambiguous — Karpathy K1.2 violation. Always surface options, ALWAYS recommend, never just pick.
- **Dumping the spec** as one wall of text → 'thoughts?'. Present section by section.
- **Skipping the `<decisions>` block** — downstream agents need this; without it, planner re-litigates settled questions.
- **Starting to code mid-brainstorm** — HARD-GATE violation. Stop. Document. Get approval first.
- **Open-ended 'what do you want?' questions** when 2-3 concrete options would advance faster.

## Tone

NEEWE Tone Spec. Brainstorming requires patience, probing, peer-level dialogue. Less impatient than execute-mode; more probing than spec-mode. Push back when the user's idea seems to have a fatal flaw (route to `governance-po` ADVERSARIAL mode if it deserves a brutal review).

The terminal state is approved spec → `writing-plans` / `neewe-opus-planner`. Drive toward it.
