---
name: test-driven-development
description: Use whenever you are about to write production code in a NEEWE-managed project. Defines the Iron Law (no production code without a failing test first), the Red-Green-Refactor cycle, the rationalization table that closes every excuse, and the red-flags checklist. Required reading before any implementation task.
license: MIT
token_budget: reference
---

# Test-Driven Development (NEEWE)

The most-violated discipline in software, and the one with the highest payoff. NEEWE enforces it.

## The Iron Law

<HARD-GATE>

**NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST.**

Wrote code before the test? **Delete it. Start over.** No exceptions:

- Don't keep it as 'reference'
- Don't 'adapt' it
- Don't even look at it while writing the test

Violating the letter of this rule is violating the spirit of this rule.

</HARD-GATE>

## The Red-Green-Refactor Cycle

| Step | Action | Verify |
|---|---|---|
| 1. **RED** | Write ONE minimal failing test | Run it. Confirm it fails *for the expected reason* (not typo, not import error). |
| 2. **GREEN** | Minimal code to make the test pass — nothing more | Run the test. Pristine output (no warnings). Other tests still pass. |
| 3. **REFACTOR** | Remove duplication, improve names, extract helpers | Stay green. |
| 4. **REPEAT** | Next test. Smallest possible step. |

## The Rationalization Table (every excuse, pre-rebutted)

Every excuse you might invent for skipping the test, with the counter:

| Excuse you might think | Reality |
|---|---|
| 'Too simple to test' | If too simple to test, too simple to ship. Write the test in 30 seconds. |
| 'I'll test after' | You won't. The pressure to ship will eat 'after' every time. |
| 'Already manually tested' | Manual tests don't run in CI. They don't catch your next regression. |
| 'It's just a one-off script' | One-offs become two-offs. Write the test or delete the script. |
| 'The test would be more complex than the code' | Then the design is wrong. The test should drive the design. |
| 'Deleting X hours of work feels wasteful' | The X hours you spent without TDD bought you nothing testable. Delete. |
| 'The framework already tests this' | Then your code is a thin wrapper. Test the wrapper IS thin. |
| 'It's just a refactor' | Refactor means behavior unchanged. Prove it: tests pass before AND after. |
| 'I'll add tests when I have time' | You won't. See excuse #2. |
| 'The team doesn't write tests' | NEEWE does. |
| 'My code is obviously correct' | Famous last words. |
| 'I'll let QA catch it' | QA is the second line. Tests are the first. Don't make QA do tests' job. |

If any of these crosses your mind: STOP. Delete the code. Write the test.

## Red Flags (any thought matching → STOP)

- 'I'll add a quick fix without a test'
- 'This is the staging env; production rules don't apply'
- 'The PR is urgent; we can backfill tests later'
- 'I'm just adding logging' (still production code; still needs a test)
- 'The test would require mocking too much' (then refactor the seam)
- 'I already verified manually' (manual ≠ tested)
- 'It's friday afternoon' (especially then)
- 'It's the demo branch' (production today is yesterday's demo branch)
- 'It's the prototype' (prototypes become products)
- 'No one will read this code again' (you will, in 6 weeks)
- 'It's a one-character change' (one-character changes have shipped one-character bugs)
- 'I'm the only person who works on this' (you in 3 months is a different person)
- 'CI will catch it' (CI catches what tests test)

## Verification Checklist (before claiming GREEN)

- [ ] The failing test failed for the EXPECTED reason (not a typo / missing import / config issue)
- [ ] After implementation: target test passes
- [ ] After implementation: all previously-green tests still pass
- [ ] Test output is pristine — no warnings, no skipped tests, no `console.log` debris
- [ ] Test name describes WHAT it tests (verb-first, observable behavior)
- [ ] Test asserts on observable behavior, not internal state
- [ ] Test would FAIL if the implementation regressed (mutation-test in your head)

If any box unchecked: not GREEN.

## When Stuck (the decision table)

| Symptom | Action |
|---|---|
| Can't write a failing test because the design is unclear | Stop. Brainstorm the interface first. Code is the LAST step. |
| Failing test is failing for the wrong reason | Fix the test first. Then run it again. |
| GREEN, but other tests broke | The fix introduced a regression. Revert. Try a smaller step. |
| Code feels ugly after GREEN | REFACTOR step. Clean while green. |
| Refactor broke a test | Revert the refactor. Try a smaller refactor. |
| Test needs to mock half the world | The design is wrong. Refactor for testability before continuing. |
| No idea what to test next | Look at the spec's success criteria. Each one is a test. |

## Bug-Fix Integration

When you find a bug:

1. Write a failing test that REPRODUCES the bug (the test fails because the bug exists)
2. Verify the test fails *because of the bug* (not unrelated reasons)
3. Fix the bug
4. Verify the test passes
5. Run all other tests — they should still pass

**Never fix a bug without a regression test.** Without the test, the same bug will return in 6 months when someone else 'fixes' the symptom differently.

## Anti-Patterns (the testing-anti-patterns companion topic)

These are listed in detail in `anti-patterns.md` (when shipped). Headlines:

- Mocking what you don't own (mock the seam, not the framework)
- Testing the mock's behavior instead of the SUT
- Adding test-only methods to production classes
- Snapshot tests on rapidly-evolving UI without review discipline
- 'integration test' that mocks everything (it's a unit test in disguise)
- Tests that assert `expect(true).toBe(true)` (no, really, this happens)
- One giant `describe()` with 50 nested `it()`s — split by behavior, not by file

## Granular Steps in the Plan

When the `neewe-opus-planner` writes a plan, each task is split into TDD-shaped sub-steps:

1. Write the failing test (file path + test name)
2. Run the test, verify it fails for the expected reason
3. Write the minimal implementation
4. Run the test, verify it passes
5. Run all tests, verify still green
6. Refactor if needed; verify still green
7. Commit (atomic: one commit = one logical change)

Subagent executor MUST follow this granularity. If a step combines multiple of these, REJECT the plan and request a split.

## When the User Overrides

A user can override TDD for a specific task ('this is throwaway exploration; skip TDD'). NEEWE complies but:

1. Mark the deviation explicitly in the commit message (`[NO-TDD: <reason>]`)
2. Surface it in the next governance review
3. If TDD is overridden more than 2× in a sprint, the retro flags it as a process issue

User wins on individual overrides; system wins on patterns.

## Tone

NEEWE Tone Spec. TDD is non-negotiable; tone is firm but not preachy. Cite the empirical case (regressions caught, deploy confidence) over abstract principles.
