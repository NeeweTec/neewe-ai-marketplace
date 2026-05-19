# neewe-core

The umbrella plugin of the NEEWE Framework.

**Status:** Sprint 1 scaffold — not yet functional. Track progress at [`NeeweTec/neewe-ai-fw`](https://github.com/NeeweTec/neewe-ai-fw).

## What ships in `neewe-core` (when complete)

```
neewe-core/
├── .claude-plugin/plugin.json
├── skills/                            ← ~30 skills
│   ├── using-neewe/SKILL.md           ← bootstrap (SessionStart payload)
│   ├── neewe-goal/SKILL.md            ← Goal Mode orchestrator
│   ├── neewe-doctrine/SKILL.md        ← background knowledge (user-invocable: false)
│   ├── writing-neewe-skills/SKILL.md  ← TDD-for-prose meta-skill
│   ├── neewe-squad-composer/SKILL.md  ← squad assembly
│   ├── neewe-l4-init/SKILL.md         ← MNEME bootstrap
│   └── ...
├── agents/
│   ├── governance/{qa,tech-lead,po,cso,release,doc,retro}.md
│   ├── planning/{opus-planner,assumptions-analyzer,pattern-mapper}.md
│   ├── execution/{sonnet-implementer,cavecrew-builder,debugger}.md
│   └── meta/{squad-composer,phase-orchestrator,cost-guard}.md
├── hooks/
│   ├── hooks.json
│   ├── session-start                  ← polyglot bootstrap
│   ├── run-hook.cmd                   ← polyglot wrapper (Win/Unix)
│   ├── governance-gate.sh             ← triple-gate spawn
│   ├── neewe-context-monitor.js       ← 35%/25% warnings
│   ├── neewe-pre-tool-gate.js         ← GateGuard adaptation
│   └── neewe-package-legitimacy.js    ← slopcheck
├── .mcp.json                          ← Obsidian + GitHub + Linear + neewe-l4-mcp
├── monitors/
│   └── monitors.json                  ← auto-starts Dashboard at :7878
├── dashboard/                         ← EP-OPUS-13 Web UI
├── settings.json                      ← NEEWE recommended defaults (opusplan, etc.)
└── bin/
    ├── neewe                          ← CLI wrapper (phase set, cost report, mode dial)
    └── neewe-dashboard                ← Bun HTTP+WebSocket server
```

See the [NEEWE Framework Master Extraction](https://github.com/NeeweTec/neewe-ai-fw/blob/main/docs/MASTER-EXTRACTION.md) for the full design.
