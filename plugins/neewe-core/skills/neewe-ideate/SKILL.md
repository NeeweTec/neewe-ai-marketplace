---
name: neewe-ideate
description: Use when brainstorming new product ideas, validating a feature hypothesis, running market or competitor research, or stress-testing an idea with the YC office-hours forcing questions. Routes to L1 + L2 ideation sub-skills.
license: MIT
token_budget: frequent
---

# NEEWE Ideate Namespace

Namespace router for everything BEFORE planning starts. Brainstorming, validation, research, fatal-flaw hunting.

## Sub-Skill Routing

| If your intent is... | Invoke skill or agent |
|---|---|
| Open-ended brainstorm before any spec exists | `brainstorming` *(coming Sprint 3)* |
| Validate a feature/product idea with brutal honesty | agent `governance-po` (request ADVERSARIAL mode explicitly) |
| Run YC office-hours 6 forcing questions on an idea | `office-hours-questions` *(coming Sprint 3; or invoke `governance-po` adversarial)* |
| Market research / consumer insights | agent `market-researcher` *(coming Sprint 3 from SUB catalog)* |
| Competitor teardown / benchmarking | agent `competitive-analyst` *(coming Sprint 3 from SUB catalog)* |
| Trend forecasting (emerging-tech scan) | agent `trend-analyst` *(coming Sprint 3 from SUB catalog)* |
| Deep multi-source research (PDFs, papers, web) | `deep-research` *(coming Sprint 4)* |

## The Anti-Sycophancy Default

In ideate mode, NEEWE's default stance is **skeptical**. LLMs trained on agreeable patterns will rubber-stamp ideas the user wants validated — this is the primary failure mode `governance-po` ADVERSARIAL mode exists to prevent.

When the user brings an idea: assume it's wrong until it survives steelmanning. Run the 6 forcing questions:

1. Is the demand real? Cite evidence.
2. What do users do today instead?
3. Name 3 specific users (role + use case) who are desperate for this.
4. What's the narrowest wedge?
5. How would you OBSERVE that this worked if shipped?
6. Does this lock us into a future-regrettable path?

Only after surviving all 6 do we ACCEPT and move to `01-spec`.
