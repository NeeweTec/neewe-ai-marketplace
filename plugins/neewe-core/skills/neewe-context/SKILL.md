---
name: neewe-context
description: Use when reading or writing NEEWE memory (CLAUDE.md hot tier, Obsidian vault, Graphify graph), saving session state for handoff, restoring after a /clear or compaction, or querying prior decisions and entity pages. Routes to L4 MNEME sub-skills.
license: MIT
token_budget: frequent
---

# NEEWE Context Namespace (L4 MNEME)

Namespace router for the Memory layer. NEEWE uses the **MNEME Three-Tier model**:

- **T1 Hot** — `CLAUDE.md` hierarchy (always loaded; 10–50 KB total)
- **T2 Vault** — `.neewe/vault/` (Obsidian-compatible markdown; human + LLM browseable)
- **T3 Graph** — `.neewe/graph/` (Graphify knowledge graph; MCP-queryable)

## Sub-Skill Routing

| If your intent is... | Invoke skill |
|---|---|
| Read or update the current runtime state | `neewe-state` |
| Initialize MNEME for a new project | `neewe-l4-init` *(coming Sprint 5)* |
| Save session state for cross-session handoff | `context-save` *(coming Sprint 5)* |
| Restore from a saved session state | `context-restore` *(coming Sprint 5)* |
| Query the vault for a concept / entity / decision | `vault-query` *(coming Sprint 5; uses MCP `vault_search`)* |
| Query the structural graph (who calls X, what depends on Y) | `graph-query` *(coming Sprint 5; uses Graphify MCP `query_graph`)* |
| Run the L4 lint pass (vault ↔ graph reconciliation) | `neewe-l4-lint` *(coming Sprint 5)* |
| Promote a recurring memory pattern to a versioned rule | `memory-promote` *(coming Sprint 5)* |

## Before Grepping Code, Consult MNEME

NEEWE's L4 consultation rule: when you need to know something about the project, the order is:

1. **CLAUDE.md (T1)** — already loaded; check if the rule lives in your active context.
2. **Vault (T2)** — for prose answers ("why was X decided?"), entities, ADRs, source summaries.
3. **Graph (T3)** — for structural answers ("what depends on X?", "who calls Y?"). Sub-second via MCP.
4. **Raw code** — only as last resort.

After answering: **fold the answer back into the vault** (Karpathy `[GOLD]` compounding-queries rule). Future sessions don't need to re-derive it.
