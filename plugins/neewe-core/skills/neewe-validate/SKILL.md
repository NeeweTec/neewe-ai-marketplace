---
name: neewe-validate
description: Use before publishing any new NEEWE skill or manifest, when reviewing a NEEWE skill PR, or in CI as a pre-merge gate. Runs the SKILL.md linter (Description=WHEN heuristic, token budget, @-reference detection, HARD-GATE inflation check) and the manifest schema validator. Exits non-zero on any error so CI can block the merge.
license: MIT
disable-model-invocation: true
allowed-tools: Bash(node *) Bash(echo *) Read Glob Grep
---

# `/neewe-validate` — Pre-Publish Gate

Runs the NEEWE skill linter + manifest schema validator. Use before publishing a new skill or in CI as a pre-merge gate.

**This is a slash-command skill** (`disable-model-invocation: true`) — only the user invokes it. Claude does NOT auto-invoke during normal conversation.

## What it Checks

### SKILL.md files (all skills/* directories)

| Rule | Severity | What it catches |
|---|---|---|
| **L1** | error | Frontmatter missing `name` or `description` |
| **L2** | error / warn | Description starts with WHAT verb (`Runs/Implements/...`) → error. Description doesn't start with WHEN trigger (`Use when/after/whenever/...`) → warn. |
| **L3** | warn | Description summarizes multi-step workflow ("and then ..." pattern with length > 150 chars) — the Superpowers empirical bug: workflow-summary descriptions cause Claude to skip the body. |
| **L4** | warn | Body word count exceeds budget for skill type (`getting-started` 300 / `frequent` 500 / `standard` 1000 / `reference` ∞). |
| **L5** | error | Body contains `@file.md` cross-references — force-loads the other file on every skill invocation. Use Skill tool or plain filename mention instead. |
| **L6** | warn | Body has multiple `<HARD-GATE>` markers — inflation breaks the signal. |

### Manifests (src/manifests/* — only in fw repo)

Delegates to `node build/compile-manifests.js --check`. Validates:

- kebab-case lowercase name
- Required fields present (name, version, layer, archetype, description, identity, model)
- Enum field values
- `tools` XOR `tools_archetype` exclusivity
- Description=WHEN heuristic on agent descriptions

## Run

Inline shell to invoke both linters and report:

```bash
!node ${CLAUDE_PLUGIN_ROOT}/bin/neewe-validate-skills.js
```

If invoked from within the `neewe-ai-fw` repo, also run the manifest check:

```bash
!if [ -f build/compile-manifests.js ]; then node build/compile-manifests.js --check; fi
```

## Exit Codes

- **0** — all SKILL.md and manifests pass; safe to publish.
- **1** — one or more errors; merge BLOCKED. Fix issues then re-run.

Warnings do NOT block merge but signal future tech debt; address them when feasible.

## When to Run

| Context | When |
|---|---|
| **Authoring a new skill** | Before commit, locally |
| **Reviewing a skill PR** | Tech Lead invokes via `/neewe-validate` |
| **CI pipeline** | On every PR; gate merge on exit code 0 |
| **Pre-release** | Before tagging `v*` (CI workflow already wires this in `publish-marketplace.yml`) |

## Reading the Output

```
[neewe-validate-skills] scanning <path>
  ✓ using-neewe: OK
  ⚠ neewe-state: 0 error(s), 1 warning(s)
      [L4 warn] body word count 1283 exceeds standard budget (1000). Extract examples to a companion file ...
  ✗ bad-skill: 1 error(s), 0 warning(s)
      [L2 error] description starts with a WHAT verb ("Runs the verification ..."). Rewrite as "Use when ..."
[neewe-validate-skills] scanned=3  errors=1  warnings=1
```

Exit 1 in this example (one L2 error). Fix the description, re-run, ship.

## Adding New Lint Rules

Edit `bin/neewe-validate-skills.js`. The lint functions are pure (input = SKILL.md path; output = `[{rule, sev, msg}]` array). Add a new rule:

1. Define the regex/check
2. Push to the `issues` array in `lintSkill(skillPath)`
3. Update the rule table above
4. Add a failing-case test fixture under `pressure-scenarios/bad-skill-rule-LN/SKILL.md`

NEEWE-LAW: every new lint rule needs a pressure-test fixture (Iron Law applies to lint rules too).
