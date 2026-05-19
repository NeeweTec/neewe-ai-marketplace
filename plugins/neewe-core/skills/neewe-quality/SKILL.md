---
name: neewe-quality
description: Use when reviewing code, gating a stage transition, writing tests, or validating that an implementation matches its spec. Routes to specific quality sub-skills (TDD, verification, code review, governance trio, anti-pattern enforcement).
license: MIT
token_budget: frequent
---

# NEEWE Quality Namespace

Namespace router for everything related to quality, governance, and verification.

## Sub-Skill Routing

| If your intent is... | Invoke skill or agent |
|---|---|
| Author tests (TDD with failing test first) | `test-driven-development` *(coming Sprint 3)* |
| Verify a claim of DONE before accepting it | `verifying-completion` *(coming Sprint 3)* |
| Trigger the governance trio review | `governance-gate.sh` (auto-fires on SubagentStop / TaskCompleted hooks) |
| Manually invoke the Tech Lead alone | agent `governance-tech-lead` |
| Manually invoke QA alone | agent `governance-qa` |
| Manually invoke PO alone (PRIMARY mode) | agent `governance-po` |
| Adversarial second-voice review (fatal-flaw hunt) | agent `governance-po` (request ADVERSARIAL mode explicitly) |
| Security audit (daily fast pass) | agent `governance-cso` (DAILY mode, default) |
| Security audit (comprehensive monthly sweep) | agent `governance-cso` (COMPREHENSIVE mode, request explicitly) |
| Lint a NEEWE skill or manifest before publish | skill `neewe-validate` (`/neewe-validate`) |
| Adversarial outside-voice (cross-LLM review) | `neewe-outside-voice` *(coming Sprint 4)* |

## The Governance Trio Contract

Every stage transition runs QA + Tech Lead + PO in parallel via `governance-gate.sh`. Any verdict in `{FAIL, REJECT, CRITICAL, MISSING}` blocks the transition.

Verdict aggregates live at `.neewe/gates/<phase>/<timestamp>/aggregate.json`. A `latest` symlink points to the most recent run.

## TDD Iron Law

> NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.

Wrote code before the test? Delete it. Start over. (Karpathy K4.2 + Superpowers Iron Law.) See `test-driven-development` skill for the full rationalization table.
