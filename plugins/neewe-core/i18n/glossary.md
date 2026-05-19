# NEEWE Glossary — Internal Jargon → User-Facing Label

> This file is consumed by humans (developers of NEEWE) and by automated jargon-hygiene checks. Skill authors must NOT use the internal-only terms in user-facing copy (descriptions, error messages, dashboard labels). The TUI, dashboard, and CLI render the localized label instead.

## Stages (formerly "phases")

| Internal phase | User-facing stage label (EN) | Stage label (PT-BR) | Stage # |
|---|---|---|---|
| `init` / `bootstrap` | Initial | Inicial | 1 |
| `discovery` | Ground | Fundamentar | 2 |
| `planning` | Plan | Planejar | 3 |
| `dispatch` | Dispatch | Distribuir | 4 |
| `orchestration` | Orchestrate | Orquestrar | 5 |
| `execution` | Code | Codar | 6 |
| `verification` / `review` / `release` / `retro` | Finish | Finalizar | 7 |

## Roles (formerly "archetypes")

| Internal archetype | User-facing role |
|---|---|
| `planning` | Planner |
| `execution` | Builder |
| `research` | Researcher |
| `governance` | Reviewer |
| `meta` | Orchestrator |

## Gates (formerly "verdicts")

| Internal verdict | User-facing label (EN) | (PT-BR) |
|---|---|---|
| `PASS` / `APPROVE` / `ACCEPT` / `DONE` / `READY` | Pass | Aprovado |
| `FAIL` / `REJECT` / `NOT_READY` | Needs revision | Precisa revisão |
| `BLOCKED` / `CRITICAL` | Blocked | Bloqueado |

## Memory

| Internal term | User-facing label |
|---|---|
| `MNEME T1` (CLAUDE.md hot) | Hot memory |
| `MNEME T2` (vault) | Memory |
| `MNEME T3` (graph) | Knowledge graph |
| `vault/log.md` | Event log |

## Modes

| Internal mode | User-facing label (EN) | (PT-BR) |
|---|---|---|
| `caveman_mode` | Terse mode | Modo terse |
| `goal_mode` | Goal mode | Modo objetivo |
| `permission_mode: plan` | Plan mode | Modo plano |

## Governance

| Internal term | User-facing label |
|---|---|
| `triple-gate` / `septeto` | Governance review |
| `governance trio` | Core gate (QA + Tech Lead + PO) |
| `governance septeto` | Full review (7 gates) |

## Codes to Hide From Users

These NEVER appear in user-facing copy. They live only in CHANGELOG, source code comments, internal docs:

- `EP-OPUS-N` (enhancement proposal codes)
- `L0..L7` (layer numbers — referred to as "layers" without numbers in user copy)
- `NEEWE-LAW`, `NEEWE-FORBIDDEN`, `HARD-GATE` (rule markers)
- `archetype` (use "role")
- `verdict` (use "decision" or "gate result")
- `phase` (use "stage")

## Authoring Checklist

When writing a SKILL.md description, dashboard label, error message, or any string a user reads:

- [ ] No internal codes (EP-OPUS-N, L0-L7, MNEME T2)
- [ ] Uses "stage" not "phase", "role" not "archetype", "gate result" not "verdict"
- [ ] Available in both `en-US` and `pt-BR` in `strings.json`
- [ ] Localized via `t('key', locale)` — not hardcoded
