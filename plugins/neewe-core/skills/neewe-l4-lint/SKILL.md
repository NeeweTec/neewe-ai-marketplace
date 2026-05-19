---
name: neewe-l4-lint
description: Use periodically (weekly) or before a release-gate transition. Reconciles the NEEWE vault (.neewe/vault/) against the structural graph (.neewe/graph/) to detect orphans (vault pages with no backlinks), contradictions (vault claims that disagree), stale claims (last_updated > 60 days), unverified assertions (vault says X depends on Y but graph has no X-Y edge), and undocumented connections (graph has high-confidence edges with no vault page).
license: MIT
disable-model-invocation: true
allowed-tools: Bash(neewe-l4-mcp *) Bash(jq *) Read Write Glob Grep
---

# `/neewe-l4-lint` — Vault ↔ Graph Reconciliation

The L6 gate for L4 memory quality. Without lint, vault drifts: stale claims accumulate, orphans pile up, the structural graph and the human-prose vault disagree silently.

User-only slash command. Run weekly or before any release-gate.

## What It Detects (5 finding types)

| Finding | Definition | Severity |
|---|---|---|
| **Orphan** | Vault page exists but no other page (or no graph node) references it | Medium — usually safe to archive or merge |
| **Contradiction** | Two vault pages make incompatible claims about the same entity | High — must reconcile |
| **Stale claim** | Vault page `last_updated > 60 days` AND references actively-changing code | Medium — re-verify or mark stale explicitly |
| **Unverified assertion** | Vault says "X depends on Y" but `graph.json` has no `X-Y` edge | Medium — either vault is wrong OR graph extraction missed it |
| **Undocumented connection** | Graph has high-confidence (EXTRACTED) edge with no vault page narrating it | Low — opportunity to capture the knowledge |

## Workflow

1. **Snapshot** — capture `vault/` tree + `graph/graph.json` at run start
2. **Orphan pass** — for each vault page, check backlinks + graph node references
3. **Contradiction pass** — for entities with multiple vault pages, compare frontmatter `tags` + `last_updated`; LLM-judge same-entity contradiction
4. **Stale pass** — scan frontmatter `last_updated`; for pages > 60 days, check if referenced files in git have changed since
5. **Unverified pass** — for vault claims of form "X depends on Y" / "X calls Y" / "X uses Y", verify edge exists in graph
6. **Undocumented pass** — for graph edges with confidence=EXTRACTED and no vault page on either endpoint, surface as opportunity
7. **Emit findings** — one finding per file at `.neewe/vault/lint/<finding-type>-<date>-<id>.md`
8. **Update index** — append finding count summary to `vault/index.md` Lint section

## Output Format

```
## L4_LINT_REPORT

**Status:** PASS | DRIFT_DETECTED
**Run:** YYYY-MM-DD
**Vault pages scanned:** N
**Graph nodes scanned:** M
**Graph edges scanned:** E

### Findings Summary
| Type | Count | New since last run |
|---|---|---|
| Orphans | 3 | +1 |
| Contradictions | 1 | +1 |
| Stale claims | 7 | -2 (2 resolved) |
| Unverified assertions | 2 | 0 |
| Undocumented connections | 12 | +5 |

### Top 5 Findings (by severity)
1. CONTRADICTION (high): vault/entities/billing-service.md says "uses Stripe Connect" but vault/decisions/use-stripe-direct-charges.md says "direct charges only"
   → Reconcile in next architect-reviewer session
2. STALE (medium): vault/entities/auth-store.md last_updated 2026-02-14; src/auth/store.ts has 14 commits since
   → Re-verify or mark explicitly stale
3. UNVERIFIED (medium): vault/entities/search-service.md asserts "uses Redis for cache" but graph has no search-service → redis edge
   → Either vault is wrong OR graphify missed the import; run `graphify update --force`
4. ORPHAN (medium): vault/concepts/event-sourcing-pattern.md has 0 backlinks since creation 2025-12-01
   → Archive to vault/sources/ or merge into a related concept
5. UNDOCUMENTED (low): graph edge invoice-service ──calls──> billing-service (confidence: EXTRACTED) has no vault narrative
   → Opportunity: create vault/entities/invoice-service.md OR add to billing-service.md

### Full Findings
See `.neewe/vault/lint/*.md` files (one per finding).

### Recommended Actions
- Reconcile CONTRADICTION immediately (block next release-gate until resolved)
- Re-verify top 3 STALE claims (low-effort, high value)
- Run `graphify update --force` to re-extract; check if UNVERIFIED count drops
- Schedule next lint in 7 days

## L4_LINT_REPORT_COMPLETE
```

The completion marker `## L4_LINT_REPORT_COMPLETE` MUST be the FINAL line.

## When to BLOCK a Release-Gate

If any of these are present, governance-release should treat the lint as a BLOCK:

- ≥1 CONTRADICTION (high severity) — vault disagrees with itself; ship-blocking
- ≥5 UNVERIFIED assertions on touched modules — vault claims about this release's code surface aren't graph-verified

Otherwise: lint findings are tracked but don't block; they accumulate in `vault/lint/` for periodic cleanup.

## Required Infrastructure

This skill depends on:

- **`.neewe/vault/`** (MNEME T2) — bootstrapped by `neewe l4-init`
- **`.neewe/graph/graph.json`** (MNEME T3) — produced by Graphify (`graphify install` + `graphify update`)
- **`neewe-l4-mcp` server** OR direct file access for vault search + backlinks

Without `graph.json`, the lint skips UNVERIFIED + UNDOCUMENTED passes (gracefully) and reports only orphans + contradictions + stale.

## Adoption Roadmap

| Sprint | Capability |
|---|---|
| 5w4 (now) | Skeleton skill; manual run; basic orphan + stale detection via vault scan |
| 5.5 | LLM-judge for contradictions (uses Sonnet via Task tool on suspected pairs) |
| 6 | Full graph reconciliation (UNVERIFIED + UNDOCUMENTED passes) once Graphify is bundled |
| 6 | Auto-fire on release-gate via `governance-release` agent integration |

## Tone

NEEWE Tone Spec. Lint findings are concrete: cite file:line, suggest concrete fix, classify severity defensibly. No "could possibly be a problem".
