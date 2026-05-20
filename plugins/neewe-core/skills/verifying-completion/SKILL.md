---
name: verifying-completion
description: Use before claiming any task is DONE — every time, no exceptions. Defines the claim→required-evidence contract that refuses to mark complete without exit-0 verification. Wired into the Stop hook for hard enforcement; agents must run the proof, not rely on memory.
license: MIT
token_budget: standard
---

# Verifying Completion (NEEWE)

The discipline that closes the last loophole. Without this skill, agents will claim DONE based on memory of a prior run, intent to have done the thing, or vibes. With it, every claim of DONE requires concrete evidence FROM THE CURRENT MESSAGE.

## The Iron Law

<HARD-GATE>

**No claim of DONE without just-run output of the verification command in the current message.**

- Memory of a prior run does NOT count.
- The CI badge from yesterday does NOT count.
- The fact that you remember the tests passing does NOT count.
- 'Should work' does NOT count.

Re-run. Now. In this message. Show the output.

</HARD-GATE>

## The Claim → Required-Evidence Table

Whenever you claim X, you must present Y as evidence in the same turn:

| Claim | Required evidence |
|---|---|
| Tests pass | Test command output: exit 0, X tests run, 0 failed (cite the output) |
| Build succeeds | Build command output: exit 0 |
| Lint clean | Lint command output: exit 0, 0 errors, 0 warnings |
| Typecheck pass | Typecheck command output: exit 0 |
| Agent completed (subagent) | VCS diff showing concrete changes + commit SHA |
| Requirements met (spec-level) | Line-by-line checklist mapping AC → tests/code (file:line refs) |
| Feature works in browser | Screenshot OR Playwright test output OR explicit manual verification statement (with limitation noted) |
| Deploy succeeded | Deploy command output: exit 0 + verification curl to the deployed URL |
| Fix applied | `git diff` showing the change + test that now passes (was RED, now GREEN) |
| Refactor preserved behavior | Tests pass BEFORE refactor AND AFTER (cite both runs) |

If you cannot produce the evidence: do NOT claim DONE. Output the truth: 'I cannot verify X because Y' — that's a legitimate response.

## The Pre-Completion Checklist (run every time)

Before emitting any statement containing the words 'done', 'complete', 'finished', 'shipped', 'works':

- [ ] Did I just run the verification command in THIS message?
- [ ] Did I see exit 0?
- [ ] Did I confirm no new test failures, no new lint errors, no new warnings?
- [ ] If a file was modified, can I show the diff?
- [ ] If a requirement was met, can I map it to specific evidence (test name, file:line)?
- [ ] If memory is involved ('I tested this earlier'), have I re-verified in this message?

If any box unchecked: do not claim DONE.

## The 'I Think It Works' Trap

The single most common failure mode: claiming DONE based on confidence rather than evidence.

| ❌ Wrong | ✅ Right |
|---|---|
| 'Tests should pass now' | (runs tests, sees output) 'Tests pass: 47 passed, 0 failed.' |
| 'The fix is applied' | (shows diff) 'Diff applied at src/foo.ts:42 — see commit a3b1c2.' |
| 'I refactored the auth module — behavior preserved' | 'Refactored. Tests before: 31 passed. Tests after: 31 passed. No behavior delta.' |
| 'Lint should be clean' | (runs lint) 'Lint: 0 errors, 0 warnings.' |
| 'Deployed' | (runs curl) '`curl https://app.example.com/health` returns 200, version v0.2.3.' |

## Hard Enforcement (Stop Hook)

NEEWE's Stop hook (configured in `hooks/hooks.json`) runs at the end of every agent turn. When the user has installed a NEEWE plugin that includes a `verifying-completion` Stop hook of type `prompt`, the harness will reject any turn that claims DONE without evidence in the transcript.

The hook prompt does a final scan: 'Did the agent emit a claim of completion? If yes, is there evidence of a just-run verification command in the same turn? If no evidence → return `{ok: false, reason: \"missing verification evidence — re-run the command and re-claim\"}`.'

This is the mechanical enforcement. You comply BEFORE the hook fires by doing it right the first time.

## When You Cannot Verify

Legitimate reasons to NOT claim DONE:

- The verification command requires user credentials you don't have (cite specifically)
- The test environment is unavailable (cite the error)
- The change is to a file you can't run (e.g., infra-as-code that requires apply)
- The verification is human-only (visual check on a live page; cite that you couldn't auto-verify)

For these: output a partial status — 'Code changes applied (diff shown). Verification requires <specific human action>. Awaiting confirmation.'

This is HONEST, not failure. The failure is claiming DONE without evidence.

## Anti-Patterns

- **'Should work'** — the most-banned phrase. Never use it in a completion claim.
- **'I already ran the tests'** — re-run in the current message.
- **'No code changes, so no need to test'** — but the diff says you changed src/foo.ts. Re-test.
- **Claiming partial verification as full** — 'tests pass' when you ran ONE test file out of twelve.
- **Hiding warnings** — `npm test 2>/dev/null | grep PASSED` is gaslighting. Show the full output.
- **Cherry-picking from old runs** — pasting last week's green output when today's code changed.

## Stop Hook Wiring Example

For NEEWE projects, ensure `hooks/hooks.json` includes:

```json
{
  "Stop": [
    {
      "hooks": [
        {
          "type": "prompt",
          "prompt": "Scan the just-completed turn. Did the agent claim DONE/complete/finished without showing just-run verification output? If yes, return {ok: false, reason: \"missing verification evidence\"}. If no, return {ok: true}.",
          "timeout": 30
        }
      ]
    }
  ]
}
```

(This is illustrative — the canonical Stop hook for NEEWE is `cost-cap-guard.sh`, wired on the `Stop` event for Goal Mode. Start Goal Mode with the `/neewe-goal` command.)

## Tone

NEEWE Tone Spec. This skill is the discipline that makes user trust possible. The tone is firm: no hedging, no 'I think', no 'should'. State facts with evidence; state limitations with honesty.

Speed of shipping ≠ skipping verification. Verification IS the ship.
