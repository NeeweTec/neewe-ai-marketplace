# NEEWE AI Marketplace

The official Claude Code plugin marketplace for the **NEEWE Framework** — an 8-layer AI-assisted development system built on the principle *"Opus plans → Sonnet executes"*.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-0.6.0-blue)](https://github.com/NeeweTec/neewe-ai-marketplace/releases)
[![Plugins](https://img.shields.io/badge/plugins-5-green)](#plugins-published-here)

## Install (one-liner)

```bash
# In any Claude Code session:
/plugin marketplace add NeeweTec/neewe-ai-marketplace
/plugin install neewe-core@neewe
```

After install + session restart, every NEEWE-managed Claude Code session boots with:

- **Triple-gate governance** (QA + Tech Lead + PO at every stage transition)
- **Opus-plan / Sonnet-execute** routing → ~6× cheaper feature delivery
- **MNEME Three-Tier Memory** (CLAUDE.md hot + Obsidian vault + Graphify graph)
- **Goal Mode** continuous execution with hard cost caps (EP-OPUS-10)
- **Cost-Quality-Speed dial** (`neewe mode thrift|balanced|quality`, EP-OPUS-3)
- **Live Web Dashboard** at `localhost:7878` (EP-OPUS-13)
- **Statusline** showing phase / mode / model / context % / cost
- **Auto-context-monitor** — agent gets WARNING/CRITICAL when context low

## Plugins published here

| Plugin | Status | Purpose |
|---|---|---|
| `neewe-core` | ✅ v0.6.0 | The umbrella plugin — 19 agents, 22 skills, 6 hooks, 5 CLI tools, Dashboard, MNEME L4 |
| `neewe-stack-nextjs` | ✅ v0.6.0 | Next.js App Router stack pack (LSP + monitors + 5-axis pattern skills) |
| `neewe-stack-fastapi` | ✅ v0.6.0 | FastAPI async Python stack pack |
| `neewe-stack-django` | ✅ v0.6.0 | Django 4.2 LTS / 5.x stack pack |
| `neewe-enterprise-governance` | ✅ v0.6.0 | Strict managed marketplaces + audit pipes + provenance bonds (EP-OPUS-12) for regulated environments |

## Quick start

```bash
# 1. Install neewe-core
/plugin marketplace add NeeweTec/neewe-ai-marketplace
/plugin install neewe-core@neewe

# 2. (Optional) Add your stack satellite
/plugin install neewe-stack-nextjs@neewe   # or -fastapi, or -django

# 3. In your project terminal:
neewe init                            # creates .neewe/state.json
neewe l4-init                         # bootstraps MNEME L4 (vault + graph + ...)
neewe goal "Ship the /search endpoint" --budget 3.00

# 4. Open the dashboard
neewe-dashboard token                 # get the auth token
# Browser → http://127.0.0.1:7878/?token=<token>
```

## Architecture

The 8 layers:

| Layer | Mission |
|---|---|
| **L0 Foundation** | SessionStart bootstrap, Wizard Mode, project context absorption |
| **L1 Intelligence** | Opus planning, spec generation, architecture design |
| **L2 Orchestration** | Dynamic squad formation, task delegation, clean handoffs |
| **L3 Execution** | Goal-Mode continuous dev, TDD, Sonnet executors with worktree isolation |
| **L4 Memory (MNEME)** | CLAUDE.md hot + Obsidian vault + Graphify graph |
| **L5 Extensibility** | Skills, Hooks, MCP, Plugins, Marketplace |
| **L6 Governance** | Triple-gate (QA + Tech Lead + PO) at every transition |
| **L7 Efficiency** | Model routing, token compression, hard cost caps |

Source-of-truth + full docs: **[`NeeweTec/neewe-ai-fw`](https://github.com/NeeweTec/neewe-ai-fw)**.

## How to contribute

This is a **published artifact repo**. Plugin source lives in [`NeeweTec/neewe-ai-fw`](https://github.com/NeeweTec/neewe-ai-fw). CI pipelines in `-fw` publish here on release tags. **Don't edit plugins here directly — go upstream.**

To propose a new plugin (e.g., another stack satellite):
1. Open an issue in [`NeeweTec/neewe-ai-fw`](https://github.com/NeeweTec/neewe-ai-fw)
2. Discuss the design (architecture, dependencies, scope)
3. PR against `-fw` with the manifest + skill files
4. Reviewed by governance trio
5. On merge + tag, published here automatically

## Versioning

Semver. Major = breaking; Minor = additive; Patch = fix. Releases tagged in this repo (`v0.X.Y`).

Cross-plugin version compatibility:

- `neewe-stack-*` and `neewe-enterprise-governance` declare `neewe-core@>=X.Y.Z` dependency
- We aim to keep stack satellites compatible across at least one neewe-core major version

## License

MIT — see [LICENSE](./LICENSE).

---

*NEEWE Framework — built by NeeweTec*
