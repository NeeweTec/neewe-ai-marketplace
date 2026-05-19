---
name: neewe-caveman
description: Use when operating a NEEWE-managed task in Phase 03 execute, Goal Mode, or any subagent dispatch where output verbosity is wasting tokens with no human-readability benefit. Compresses sub-agent output 40-60% via drop articles/filler/pleasantries/hedging. Auto-disables (auto-clarity rule) on destructive, security, or multi-step ops where ambiguity is dangerous.
license: MIT
token_budget: standard
---

# NEEWE Caveman — Output Compression for Sub-Agents

Adapted from the Caveman framework (Julius Brussee, MIT). Honest 40-60% output-token reduction on Sonnet/Haiku execution turns when there's no human in the loop reading the output verbatim.

## When to Use (caveman = ON)

| Context | Caveman? |
|---|---|
| Sub-agent dispatched by an orchestrator (output enters parent context, not user-facing) | **lite** or **full** |
| Phase 03 execution turns (executor → orchestrator handoff) | **full** |
| Long Goal Mode runs where output tokens dominate cost | **full** |
| Sub-agent producing structured output (logs, file lists, diffs) | **full** |

## When to AUTO-DISABLE (caveman = OFF) — non-negotiable

<HARD-GATE>

Auto-clarity escape — drop caveman immediately if the current task includes any of:

- **Destructive irreversible ops** (DROP TABLE, force-push, rm -rf, kubectl delete, npm publish, etc.)
- **Security review findings** (compress the audit summary; keep individual findings VERBOSE so the user can act on them)
- **Multi-step ambiguous sequences** (where wrong interpretation of compressed output cascades)
- **User-facing output** (chat reply, PR description, CHANGELOG entry, doc generation)
- **Onboarding / first-time use** (user needs to read along)
- **Plan-mode output** (planner output is for the user; clarity > tokens)

In any of these contexts, NEEWE-caveman silently falls back to NORMAL verbosity. Don't ask; just disable.

</HARD-GATE>

## The 3 Levels

```
neewe mode thrift   → caveman_mode: full   (most aggressive; Sonnet exec turns)
neewe mode balanced → caveman_mode: full   (also aggressive; same as thrift here)
neewe mode quality  → caveman_mode: off    (clarity > tokens; Opus deep reasoning)
```

Plus a 4th level controllable per-skill / per-turn:

| Level | What changes | Example output style |
|---|---|---|
| `off` | Standard NEEWE Tone Spec voice | "Tests pass. 47 assertions, 0 failures. Lint clean. Build green. Ready for review." |
| `lite` | Drop articles + filler; preserve verbs + nouns; conventional punctuation | "Tests pass: 47 assertions, 0 failures. Lint clean. Build green. Ready for review." |
| `full` | Telegraphic; fragments OK; symbol-bias; numbers compact | "Tests ✓ 47/0. Lint ✓. Build ✓. Ready." |

NEEWE drops Caveman's `wenyan-*` modes per D13 (meme; no upside for PT-BR/EN/code mix).

## Compression Rules (when ON)

- Drop articles: a, an, the
- Drop filler: just, really, basically, actually, simply, obviously
- Drop pleasantries: sure, certainly, happy to, of course
- Drop hedging: I think, I believe, probably, perhaps, maybe (unless genuine uncertainty)
- Fragments OK; short synonyms preferred (big > extensive; fix > implement a solution for)
- Pattern: `[thing] [action] [reason]. [next step].`
- **Code blocks UNCHANGED** (compressing code is wrong)
- **Error strings quoted EXACT** (mangling error text loses debuggability)
- **File paths VERBATIM** with line numbers (`src/auth/login.ts:42`)

## What is NOT Compressed (immutable)

| Content type | Reason |
|---|---|
| Code blocks (any language) | Code is unambiguous; compression breaks it |
| Error messages | Exact text required for grep / stackoverflow / debugging |
| Test output | Pristine output is the verification evidence |
| File paths + line numbers | Navigability requirement (NEEWE Tone Spec) |
| Numbers in measurements | $0.42 stays $0.42; not $0.4 |
| Markdown headings | Structure preserved |
| Tables | Structure preserved |

## Worked Examples

| Question | `off` | `lite` | `full` |
|---|---|---|---|
| "Why does this React component re-render?" | "Your component re-renders because you create a new object reference on each render. Wrap the prop in `useMemo`." | "Component re-renders because inline object = new ref each render. Wrap in `useMemo`." | "Inline obj prop → new ref → re-render. `useMemo`." |
| "Did the tests pass?" | "Tests passed. 47 tests ran, 0 failures, 0 skipped. Coverage at 87%." | "Tests pass: 47/0/0, coverage 87%." | "Tests ✓ 47/0/0 cov:87%." |
| "What did we change?" | "I modified src/auth/login.ts to add error handling for the AbortError path. Added a test at src/auth/__tests__/login.test.ts." | "Modified src/auth/login.ts: error handling for AbortError. Added test at src/auth/__tests__/login.test.ts." | "src/auth/login.ts: AbortError catch. test: src/auth/__tests__/login.test.ts." |

## Integration with NEEWE Stack

| Layer | Effect |
|---|---|
| **L2 Orchestration** | Orchestrator parses cavecrew-style first-token contracts (DONE: / BLOCKED:) regardless of caveman_mode |
| **L3 Execution** | Sub-agent verbose output compressed before entering parent context (60% reduction on tool-result tokens per TOK analysis) |
| **L7 Efficiency** | Compounds with Opus→Sonnet routing for ~6× total cost reduction |

## Honest Numbers (from TOK analysis)

- Caveman claims 65% output reduction (honest, verified via 3-arm eval)
- Budget conservatively at **40-50%** for NEEWE's mixed PT-BR/EN/code corpus (Caveman was tuned on English)
- `cavecrew` sub-agent output contracts (terminal-first-token) compound — they're independent of caveman_mode

## Activation

Auto-applied via `state.json#caveman_mode` (set by `neewe mode` CLI). To override per-skill:

- Sub-agent prompts that request `caveman: full` in their NEEWE overlay get full compression regardless of state
- Sub-agent prompts that request `caveman: off` (e.g. security audit) get standard verbosity regardless

## Anti-Patterns

- **Compressing user-facing output** — user has to read it. Don't compress chat replies, PR descriptions, docs.
- **Compressing security findings** — the user needs every detail to assess/fix the vulnerability
- **Compressing error messages** — breaks grep, breaks stack-overflow paste
- **Compressing code** — code is already information-dense; compression breaks syntax

## Tone

When compressing, the voice is functional, not telegraphic-as-aesthetic. The goal is information density per token, not a haiku contest.
