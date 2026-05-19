---
name: neewe-project
description: Use when initializing a new NEEWE project, onboarding into an existing brownfield codebase, scanning for project conventions, or wiring per-stack defaults (Next.js, FastAPI, Django, etc.). Routes to L0 foundation sub-skills.
license: MIT
token_budget: frequent
---

# NEEWE Project Namespace

Namespace router for project bootstrap, brownfield onboarding, and stack-specific setup.

## Sub-Skill Routing

| If your intent is... | Invoke skill or agent |
|---|---|
| Initialize a new NEEWE project from scratch (greenfield) | `neewe-init` *(coming Sprint 5)* |
| Onboard NEEWE onto an existing codebase (brownfield) | `neewe-map-codebase` *(coming Sprint 5; spawns 4 parallel mappers per GSD pattern)* |
| Detect the project stack + auto-install matching defaults | `neewe-stack-detect` *(coming Sprint 5; uses ECC `project-stack-mappings.json`)* |
| Initialize MNEME L4 memory tiers for this project | `neewe-l4-init` (also in `neewe-context` namespace) |
| Activate the stack-flavor satellite plugin | `/plugin install neewe-stack-<name>@neewe` (Sprint 6 satellites) |
| Run the wizard for missing manifesto/briefing/overview/stack/UI | `neewe-wizard` *(coming Sprint 5)* |
| Generate the per-feature doc trinity (00-OV / 01-FN / 02-PL) | `neewe-doc-trinity` *(coming Sprint 4)* |

## Brownfield Onboarding Protocol

For a brownfield project (existing codebase you're inheriting), the canonical sequence is:

1. `neewe-map-codebase` — 4 parallel mappers produce `.neewe/codebase/{STACK,ARCHITECTURE,CONVENTIONS,CONCERNS,STRUCTURE,TESTING,INTEGRATIONS}.md`
2. `neewe-l4-init` — scaffolds vault + graph; ingests the codebase mappings as initial vault entries
3. `neewe-stack-detect` — finds the framework signatures + recommends a `neewe-stack-*` satellite
4. `governance-po` (ADVERSARIAL mode) — runs a fatal-flaw analysis on the current codebase to surface what to fix vs what to leave
5. `neewe set-phase 01-spec` — start the first NEEWE-managed feature

## Stack Satellites (Sprint 6)

Stack-flavor satellite plugins ship with `.lsp.json` (LSP for live diagnostics), monitors (tail build logs), and a 5-axis pattern library (`<fw>-patterns + <fw>-testing + <fw>-security + <fw>-tdd + <fw>-verification`).

Planned satellites: `neewe-stack-nextjs`, `neewe-stack-fastapi`, `neewe-stack-django`. Install via `/plugin install neewe-stack-<name>@neewe`.

## Foundation Files NEEWE Expects

Per-project minimum:

```
CLAUDE.md                  # T1 schema + active focus
AGENTS.md                  # cross-tool spec (cursor, windsurf, claude)
.claude/settings.json      # team-shared settings (NEEWE Recommended Bundle)
.claude/settings.local.json # gitignored dev overrides
.neewe/state.json          # phase + mode + budget runtime
.neewe/vault/              # MNEME T2 (Obsidian markdown)
.neewe/graph/              # MNEME T3 (Graphify)
```

NEEWE refuses to operate without `CLAUDE.md` and `.neewe/state.json` minimum.
