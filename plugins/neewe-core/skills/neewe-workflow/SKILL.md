---
name: neewe-workflow
description: Use when planning, executing, or transitioning through NEEWE phases (intake / spec / plan / execute / validate / goal-mode). Routes to specific workflow sub-skills. Read this first when you need to know HOW NEEWE moves work forward.
license: MIT
token_budget: frequent
---

# NEEWE Workflow Namespace

Namespace router for phase transitions, plan execution, and Goal Mode. Pick the sub-skill matching your intent — do not improvise the workflow.

## Sub-Skill Routing

| If your intent is... | Invoke skill |
|---|---|
| Read or change the current phase | `neewe-state` (or run `neewe set-phase <phase>` directly) |
| Activate Goal Mode (continuous execution to a target condition) | `neewe-goal` *(coming Sprint 4)* |
| Execute a NEEWE plan task-by-task with subagent dispatch | `subagent-driven-development` *(coming Sprint 4)* |
| Brainstorm before specing | `brainstorming` *(coming Sprint 3)* |
| Run the final pre-ship verification | `verifying-completion` *(coming Sprint 3)* |
| Wave-based parallel task execution | `parallel-wave-dispatch` *(coming Sprint 4)* |

## Phase Reference

| Phase | When | Default model | Default permission_mode |
|---|---|---|---|
| `00-intake` | New project / new feature request | opusplan | default |
| `01-spec` | Requirements + acceptance criteria | opus | plan |
| `02-plan` | Architecture + task breakdown | opus | plan |
| `03-execute` | Implementation + TDD | sonnet | acceptEdits |
| `04-validate` | Triple-gate review | sonnet+opus | plan |
| `05-goal-mode` | Continuous unattended execution to target | opusplan | auto (Max plan) or acceptEdits |

To check current phase: `neewe get phase`. To transition: `neewe set-phase <phase>`.

## Continuous Execution Rule

In Goal Mode and subagent-driven mode: **do NOT pause to check in between tasks.** Execute all tasks without stopping. "Should I continue?" prompts waste the user's time. Stop only on `BLOCKED` or `DONE`.
