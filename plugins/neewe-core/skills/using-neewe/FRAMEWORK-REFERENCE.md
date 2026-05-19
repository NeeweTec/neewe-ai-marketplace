# NEEWE Framework — Reference Doctrine

> This is the deep dive. New users should read `QUICK-START.md` first. This file is loaded on demand when an agent needs to reason about layers, gates, or routing internals.

## The 8 Layers

| Layer | Mission |
|---|---|
| **L0 Foundation** | Bootstrap, project context absorption |
| **L1 Intelligence** | Opus planning, spec generation, architecture design |
| **L2 Orchestration** | Dynamic squad formation, task delegation, clean handoffs |
| **L3 Execution** | Goal Mode continuous dev, TDD, Sonnet executors with worktree isolation |
| **L4 Memory (MNEME)** | CLAUDE.md hot + vault + knowledge graph |
| **L5 Extensibility** | Skills, hooks, MCP, plugins, marketplace |
| **L6 Governance** | Gates at every stage transition (QA + Tech Lead + PO core; full septeto for releases) |
| **L7 Efficiency** | Model routing, token compression, hard cost caps |

> User-facing surfaces never expose `L0..L7` codes. The TUI calls them "layers" without numbers; the dashboard hides them entirely.

## Karpathy Core Principles (NEEWE adopts verbatim)

1. **Think Before Coding** — surface assumptions, ask when unclear, present tradeoffs.
2. **Simplicity First** — minimum code, no speculative features.
3. **Surgical Changes** — every changed line traces to the user's request.
4. **Goal-Driven Execution** — verifiable success criteria, then loop independently.

**Founding axiom:** Strong success criteria let you loop independently; weak criteria require constant clarification.

## Model Routing Doctrine

Default alias: `opusplan`.

- **Plan mode** → Opus 4.7 (deep reasoning, architecture, spec writing)
- **Standard mode** → Sonnet 4.6 (execution, edits, tests, reviews)
- **Background** → Haiku 4.5 (docs, summarization, file suggestion)

Per-agent overrides via the `model:` field in `src/manifests/<role>/<name>/manifest.json`.

Subagent default: Sonnet via env `CLAUDE_CODE_SUBAGENT_MODEL=sonnet` (conditional per stage).

## Stage → Internal Phase Mapping

The user sees 7 steps. Internally these map to existing phases:

| Step (user) | Internal phase(s) |
|---|---|
| Initial | `init` / `bootstrap` |
| Ground | `discovery` |
| Plan | `planning` |
| Dispatch | (logical — squad-composer + task breakdown) |
| Orchestrate | (logical — phase-orchestrator runs handoffs) |
| Code | `execution` (and goal mode if invoked) |
| Finish | `verification` → `review` → `release` → `retro` |

## Governance — The Septeto

Seven independent gate agents run at stage transitions:

| Gate | What it audits | Blocks release? |
|---|---|---|
| QA | Tests + coverage + acceptance criteria | Yes |
| Tech Lead | Architecture + code quality + refactor governance | Yes |
| PO | Business intent + anti-sycophancy | Yes |
| CSO | OWASP top 10 + secrets + input sanitization | Yes (high severity) |
| Release | CHANGELOG + version bump + tag readiness | Yes |
| Docs | README/docs reflect the change | Warning only |
| Retro | Postmortem in `vault/postmortems/` | Warning only |

The **core gate** (QA + Tech Lead + PO) runs on every stage transition. The **full septeto** runs at Finish (step 7).

All seven write verdicts to `.neewe/gates/<phase>/aggregate.json`. The dashboard renders these as color-coded badges.

## MNEME — Three-Tier Memory

| Tier | Storage | Access |
|---|---|---|
| Hot (T1) | `CLAUDE.md` | Always in context |
| Vault (T2) | `vault/log.md`, `vault/decisions/`, `vault/postmortems/` | On demand |
| Graph (T3) | `vault/graph/` via MCP | Semantic query |

## File References Convention

Always use `file_path:line_number` format (e.g., `src/auth/login.ts:42`). Clickable in modern terminals and VS Code.

## Continuous Execution Rule

In subagent-driven and Goal Mode tasks: do NOT pause to check in between tasks. Execute all tasks without stopping. "Should I continue?" prompts waste the user's time. Stop only on `BLOCKED` or `DONE`.

## What NEEWE Is Not

- Not a code generator (you write code; NEEWE structures the work).
- Not an autonomous agent (you collaborate with the user; NEEWE coordinates).
- Not magic (failures are still failures; NEEWE just structures the recovery).
