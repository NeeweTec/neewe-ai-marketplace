---
name: neewe-replay
description: Use after completing a NEEWE Goal Mode run, before a stakeholder review, or whenever a stakeholder asks "what did the agent do last night?". Generates a self-contained HTML timeline replay of all session events (cost calls / governance gates / vault log / handoff snapshots) from .neewe/* data. Output is shareable via simple file send; no server required to view (EP-OPUS-6).
license: MIT
disable-model-invocation: true
allowed-tools: Bash(neewe-replay *) Bash(open *) Bash(start *) Bash(xdg-open *) Read
---

# `/neewe-replay` — Goal Mode HTML Timeline

User-only slash command. EP-OPUS-6 Replay-as-First-Class-Output: every Goal Mode run produces a stakeholder-grade visual replay.

## What It Produces

A **self-contained HTML file** at `.neewe/replays/run-<timestamp>.html` containing:

- **Header** — goal, phase, mode, squad, total events, total cost, duration
- **Timeline** — 4 horizontal rows (Cost / Gates / Vault / Handoffs) with colored bars per event positioned on the time axis
- **Legend** — color coding for event types + pass/fail
- **Detail panel** — click any event bar to see full details
- **All-events table** — flat sortable view with all events + their data

Single HTML file, zero external dependencies, zero server required to view. Open with any browser; share via email / Slack / S3 / wherever.

## Usage

```bash
# All available events (since project start)
!neewe-replay

# Filter to a date range
!neewe-replay --since 2026-05-19

# Custom output path
!neewe-replay --out /tmp/sprint-7-replay.html

# Open the result automatically (Windows / macOS / Linux):
!neewe-replay && start .neewe/replays/run-*.html      # Windows
!neewe-replay && open .neewe/replays/run-*.html        # macOS
!neewe-replay && xdg-open .neewe/replays/run-*.html    # Linux
```

## Event Sources Read

| Source file | Event type | What gets captured |
|---|---|---|
| `.neewe/.cost-log` (JSONL) | `cost` | Per-tool-call cost estimate (from `cost-tracker.sh` PostToolUse hook) |
| `.neewe/vault/log.md` | `vault` | Chronological project journal (per Karpathy LLM-Wiki format) |
| `.neewe/gates/<phase>/*/aggregate.json` | `gate` | Governance trio verdict aggregates (PASS/FAIL/REJECT per phase) |
| `.neewe/handoffs/precompact-*.md` and `.neewe/handoffs/*.md` | `handoff` | Pre-compact / context-save snapshots |

## When to Generate

| Trigger | Why |
|---|---|
| End of a Goal Mode run | Capture the full session for review |
| Before a stakeholder review | Visual "what happened" beats parsing logs |
| After a release | Permanent artifact for compliance / postmortem |
| Investigating a long-running failure | See where time + money went |
| Weekly retrospective | Aggregate insights across multiple runs |

## Share + Archive

Replays are HTML files — share them like any other file:

- **Slack / email / pastebin** — drop the file
- **Object storage** — upload to S3 / GCS / Azure Blob; share signed URL
- **Wiki / Confluence** — attach as artifact to a project page
- **Git** — commit to a `/replays/` branch (large files; consider git-lfs)

The HTML has **no external dependencies** (no CDN, no fonts, no analytics). Pure file viewing experience.

## Privacy

Replays may contain:
- Tool names + model names (e.g., "Bash via sonnet")
- Cost amounts
- Vault log entry titles (NOT body content)
- Gate verdict tokens
- Handoff filenames (NOT body content)

Replays do NOT contain:
- API keys, secrets, env values
- Actual code diffs
- Vault page body content
- Handoff body content (only filename)
- User prompts or agent responses

**Before sharing externally**, scan for any sensitive event titles you might've logged. The vault log is the only free-form-text source.

## Sprint 7+ Enhancements (planned)

- **Per-agent attribution** when subagent transcripts are correlated
- **Cost breakdown by phase** in a sidebar chart
- **Compare 2 replays** side-by-side (regression vs baseline)
- **Live mode** that re-generates as new events arrive (currently it's a snapshot)
- **Markdown export** for embedding in retrospectives / PR descriptions

## Anti-Patterns

- **Generating replay on every turn** — replay is a milestone artifact; one per Goal Mode run is right
- **Sharing without privacy scan** — vault log entries are the only free-form text source; double-check before external share
- **Treating as ground truth for cost** — cost-tracker is approximate; reconcile with `/usage`
- **Editing the HTML manually** — re-run `neewe-replay` if you need different filtering / output

## Tone

CLI wrapper — concise. Print the output path; suggest opening.
