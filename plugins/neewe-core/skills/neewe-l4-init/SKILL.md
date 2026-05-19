---
name: neewe-l4-init
description: Use when initializing the MNEME L4 memory tiers for a new NEEWE project (greenfield) or onboarding NEEWE onto an existing codebase (brownfield). Scaffolds .neewe/{vault,graph,raw,handoffs}/ directories, seeds vault/index.md + log.md + schema.md, copies CLAUDE.md template if missing, and adds .gitignore entries for runtime files. Idempotent — safe to re-run.
license: MIT
disable-model-invocation: true
allowed-tools: Bash(neewe *) Bash(mkdir *) Bash(test *) Read Write Glob
---

# `/neewe-l4-init` — Bootstrap MNEME L4 Memory

User-only slash command (`disable-model-invocation: true`). Run once per project (or anytime to top up missing pieces — idempotent).

## What It Creates

```
<project-root>/
├── CLAUDE.md                     (copied from neewe-core template if missing)
├── .neewe/
│   ├── state.json                (created by `neewe init` if not present)
│   ├── vault/                    ★ MNEME T2 — Obsidian-compatible markdown
│   │   ├── index.md              content-oriented catalog
│   │   ├── log.md                chronological append-only journal
│   │   ├── schema.md             vault conventions (co-evolves with project)
│   │   ├── concepts/             LLM-maintained concept pages
│   │   ├── entities/             services, modules, classes, people
│   │   ├── decisions/            one ADR per file with [[backlinks]]
│   │   ├── specs/                mirrors of 00-OV / 01-FN / 02-PL spec docs
│   │   ├── gates/                governance verdicts per phase
│   │   ├── sources/              source summaries (papers, PRs, threads)
│   │   └── lint/                 lint pass outputs
│   ├── graph/                    ★ MNEME T3 — Graphify (initially empty)
│   │   └── .gitkeep
│   ├── raw/                      ★ Karpathy raw sources — immutable inputs
│   │   ├── papers/
│   │   ├── threads/
│   │   ├── clips/                (Obsidian Web Clipper output, when used)
│   │   └── assets/
│   ├── planning/                 ★ GSD-style plan state
│   │   ├── PROJECT.md            (created on first goal)
│   │   ├── REQUIREMENTS.md
│   │   ├── ROADMAP.md
│   │   ├── STATE.md
│   │   └── continue-here.md
│   ├── handoffs/                 ★ inter-squad / inter-session handoffs
│   ├── gates/                    ★ governance trio verdicts per phase
│   └── debug/                    ★ debug knowledge base (GSD pattern)
│       └── knowledge-base.md
└── .gitignore                    (entries added for .neewe runtime files)
```

## Execution

```bash
!bash ${CLAUDE_PLUGIN_ROOT}/bin/neewe l4-init
```

The CLI subcommand does the work:

1. **State check** — runs `neewe init` if `.neewe/state.json` missing
2. **Directory tree** — mkdir all paths above; idempotent
3. **Template seed** — copies `templates/CLAUDE.md.template` → `CLAUDE.md` ONLY if file doesn't exist; copies vault/{index,log,schema}.md seeds
4. **.gitignore** — appends NEEWE runtime entries (state.json, .cost-log, .state.lock, handoffs/, gates/, vault/.obsidian/) if missing
5. **First log entry** — appends `## [<date>] init | NEEWE L4 bootstrapped` to vault/log.md
6. **Report** — prints summary of what was created vs already-present

## Vault Seeds (what gets written)

### `.neewe/vault/index.md` (seed)

```markdown
# Vault Index

Content-oriented catalog of this project's knowledge. Add entries below as you create vault pages.

## Concepts
(empty — populate as you discover them)

## Entities
(services, modules, classes — link with [[wikilinks]])

## Decisions (ADRs)
(architectural decisions — one file per decision in decisions/)

## Specs
(00-OV / 01-FN / 02-PL spec docs mirrored from spec authoring)

## Gates
(governance trio verdicts per phase)

## Sources
(papers, threads, PRs, screenshots — summaries with provenance)
```

### `.neewe/vault/log.md` (seed)

```markdown
# Vault Log

Append-only chronological journal. Format: `## [YYYY-MM-DD] verb | subject`.

Parseable via: `grep "^## \[" log.md`.

---

## [<today>] init | NEEWE L4 bootstrapped
```

### `.neewe/vault/schema.md` (seed)

```markdown
# Vault Schema (NEEWE-MNEME-v1)

## Conventions

- **File naming**: kebab-case, lowercase, .md extension
- **Links**: `[[Page Name]]` (Obsidian-compatible bidirectional links)
- **Frontmatter** (YAML, required on every page):
  - `tags:` — array of tags for Dataview-style queries
  - `created:` — ISO-8601 date
  - `last_updated:` — ISO-8601 date
  - `confidence:` — EXTRACTED | INFERRED | AMBIGUOUS (provenance tier)
  - `sources:` — array of [[source/<id>]] references
- **Body conventions**:
  - Start with a 1-paragraph elevator pitch
  - Use H2 (##) for major sections
  - End with `## See also` block of [[wikilinks]]
- **Discipline**: every claim links to a raw source page (`.neewe/raw/`) where possible

## Lifecycle (Karpathy LLM-Wiki pattern)

1. **Ingest** — new raw source dropped → source page + 10-15 entity/concept page updates + log entry
2. **Query** — user question → relevant pages → synthesized answer FILED BACK into vault as a new page
3. **Lint** — periodic pass — find contradictions, stale claims, orphans, gaps, missing pages
4. **Schema-Evolve** — when conventions need updating, update THIS file

## See also
- [[index]] — content catalog
- [[log]] — chronological journal
```

## .gitignore Additions

```
# NEEWE runtime state (regenerated; never commit)
.neewe/state.json
.neewe/.cost-log
.neewe/.state.lock
.neewe/handoffs/
.neewe/gates/
.neewe/dashboard-token

# Obsidian metadata (per-user; not project-shared)
.neewe/vault/.obsidian/
```

## After Init

Optionally:

1. **Open in Obsidian** — `obsidian://open?vault=<path>/.neewe/vault` (no install required to USE the vault — it's plain markdown)
2. **Install Graphify** — `pip install graphifyy && graphify install` to enable T3 structural graph (auto-rebuilds on commit)
3. **First entity / decision** — create your first `entities/<service>.md` or `decisions/use-X-instead-of-Y.md`
4. **First gate** — run a NEEWE goal; governance trio writes to `vault/gates/<phase>-<date>.md`

## Idempotence

Re-running `/neewe-l4-init` is SAFE. It will:
- Skip directories that already exist
- NOT overwrite existing CLAUDE.md, vault/index.md, vault/log.md, vault/schema.md
- Append a NEW log entry (`## [<date>] init-run | re-initialized; N dirs created, M skipped`)
- Top up missing pieces only

## Anti-Patterns

- **Editing the runtime files directly** (`state.json`, `.cost-log`) — use the `neewe` CLI
- **Committing `.neewe/state.json`** — it's per-machine runtime; gitignored by default
- **Mass-creating empty vault pages** — pages should be born from real content; empty placeholders are noise
- **Using `@`-references for vault pages** — use Skill tool invocation or plain filename mention; `@` force-loads

## Tone

NEEWE Tone Spec. Init is a one-time setup; output is a structured report, not a tutorial.
