# NEEWE AI Marketplace

The official Claude Code plugin marketplace for the **NEEWE Framework** — an 8-layer AI-assisted development system built on the principle *"Opus plans → Sonnet executes"*.

## Install

```bash
# In any Claude Code session:
/plugin marketplace add NeeweTec/neewe-ai-marketplace
/plugin install neewe-core@neewe
```

After install, every NEEWE-managed Claude Code session boots with:

- **Triple-gate governance** (QA + Tech Lead + PO at every stage transition)
- **Opus-plan / Sonnet-execute** routing for ~6× cheaper feature delivery
- **MNEME Three-Tier Memory** (CLAUDE.md hot + Obsidian vault + Graphify graph)
- **Goal Mode** continuous execution with hard cost caps
- **Live Web Dashboard** at `localhost:7878`

## Plugins published here

| Plugin | Status | Purpose |
|---|---|---|
| `neewe-core` | 🟡 Sprint 1 | The umbrella plugin — skills, agents, hooks, MCP, settings |
| `neewe-stack-nextjs` | 🔲 Sprint 6 | Next.js-flavored stack pack (5-axis pattern) |
| `neewe-stack-fastapi` | 🔲 Sprint 6 | FastAPI-flavored stack pack |
| `neewe-stack-django` | 🔲 Sprint 6 | Django-flavored stack pack |
| `neewe-dev-kit` | 🔲 Sprint 6 | Agent/skill/plugin authoring tools |
| `neewe-enterprise-governance` | 🔲 Sprint 6 | Stricter hooks, audit pipes, signed-only MCP |

## How to contribute

This is a **published artifact repo**. Plugin source lives in [`NeeweTec/neewe-ai-fw`](https://github.com/NeeweTec/neewe-ai-fw). CI pipelines in `-fw` publish here on release tags. **Don't edit plugins here directly — go upstream.**

## License

MIT — see [LICENSE](./LICENSE).

---

*NEEWE Framework — built by NeeweTec*
