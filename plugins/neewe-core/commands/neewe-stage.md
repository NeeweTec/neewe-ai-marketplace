---
description: Move to a specific stage. Usage: /neewe-stage <ground|plan|dispatch|orchestrate|code|finish>
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/bin/neewe set-phase *), Bash(${CLAUDE_PLUGIN_ROOT}/bin/neewe inline)
---

Map the user-facing stage name (`$ARGUMENTS`) to the internal phase and transition.

Stage-name → internal-phase mapping:
- `ground`       → `discovery`
- `plan`         → `planning`
- `dispatch`     → `dispatch`
- `orchestrate`  → `orchestration`
- `code`         → `execution`
- `finish`       → `release`

After transitioning, show the new stage with the inline view.

!`bash -lc 'case "$ARGUMENTS" in ground) P=discovery ;; plan) P=planning ;; dispatch) P=dispatch ;; orchestrate) P=orchestration ;; code) P=execution ;; finish) P=release ;; *) echo "Unknown stage: $ARGUMENTS. Try: ground | plan | dispatch | orchestrate | code | finish" >&2; exit 1 ;; esac; bash ${CLAUDE_PLUGIN_ROOT}/bin/neewe set-phase "$P" && bash ${CLAUDE_PLUGIN_ROOT}/bin/neewe inline'`
