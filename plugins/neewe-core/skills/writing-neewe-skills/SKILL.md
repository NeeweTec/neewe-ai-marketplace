---
name: writing-neewe-skills
description: Use when authoring a new NEEWE skill, refactoring an existing one, or reviewing a skill PR. Defines the Iron Law (no skill without a failing test), the TDD-for-prose workflow, the persuasion-principle matrix by skill type, the Description=WHEN-never-WHAT rule, NEEWE XML markers, and token budgets. Required reading before any skill modification.
license: MIT
token_budget: reference
---

# Writing NEEWE Skills

You are creating, modifying, or reviewing a NEEWE skill. **The Iron Law and 4 supporting disciplines below are non-negotiable.** They produce skills that LLMs actually follow under pressure — not skills LLMs read once and ignore.

This skill is the meta-skill of the framework. The quality of every NEEWE skill scales with how rigorously you apply it.

---

## The Iron Law

<HARD-GATE>

**NO SKILL WITHOUT A FAILING TEST FIRST.**

Wrote skill body before the pressure test? **Delete it. Start over.** No exceptions:

- Don't keep it as "reference"
- Don't "adapt" it
- Don't even look at it while writing the test

</HARD-GATE>

Violating the letter of this rule is violating the spirit of this rule.

---

## TDD-for-Prose — The 5-Step Workflow

A NEEWE skill is built the same way a unit-tested function is built: red, green, refactor.

| TDD step | Skill creation equivalent | Output artifact |
|---|---|---|
| 1. **Write test** | Write a *pressure scenario* — a realistic situation where an LLM might violate the rule you're encoding | `pressure-scenarios/<name>.md` |
| 2. **Verify RED** | Run the scenario via `Task` against a baseline subagent **without** the new skill loaded — it must fail (violate the rule) | Baseline transcript saved |
| 3. **Write skill** | Author `SKILL.md` body addressing the *exact* rationalization the baseline subagent used to violate the rule | `SKILL.md` |
| 4. **Verify GREEN** | Re-run the same scenario **with** the new skill loaded — it must now comply | Compliant transcript saved |
| 5. **Refactor** | Close remaining loopholes by adding pressure-test variants (time pressure, sunk-cost, authority, exhaustion). Each variant tightens the skill | Loophole-closure transcripts |

### Pressure scenario types

Use at least **3 of these 5** when stress-testing a discipline skill:

| Pressure | How to apply |
|---|---|
| **Time** | "We have 5 minutes before the deploy window — can we skip the test for now?" |
| **Sunk cost** | "I already wrote 300 lines without TDD; deleting it feels wasteful." |
| **Authority** | "The senior reviewer approved skipping this — they said it's fine." |
| **Exhaustion** | Long context, many prior turns; user just wants to ship. |
| **Specificity** | "This is a one-time script, the normal rules don't apply." |

### The compliance evidence file

Every NEEWE skill ships with a sibling file: `pressure-scenarios/results.md`. Format:

```markdown
## Pressure Scenario: <name>

**Date:** 2026-05-19
**Baseline model:** claude-sonnet-4-6 (no skill)
**Compliant model:** claude-sonnet-4-6 (with skill)

### Baseline (RED) transcript
> [excerpt showing the violation]

### Compliant (GREEN) transcript
> [excerpt showing the rule held]

### Loophole closures applied
- 2026-05-19: closed sunk-cost rationalization by adding "deleting code is not waste" line at SKILL.md:42
- ...
```

---

## The Persuasion Principle Matrix

LLMs respond to social-influence patterns the same way humans do (Meincke et al., 2025, N=28,000 conversations: compliance went from 33% → 72% when persuasion principles were applied correctly). Match the principle to the **skill type**.

| Skill type | Use principles | Avoid | Why |
|---|---|---|---|
| **Discipline** (TDD, verification, security) | Authority + Commitment + Social Proof | Liking, Reciprocity | The skill must hold under pressure; "be my friend" doesn't help |
| **Guidance** (workflow, methodology) | Moderate Authority + Unity | Heavy authority | You're advising, not commanding; over-authority breeds rebellion |
| **Technique** (a specific how-to) | One excellent example + Clarity | All persuasion | The example IS the persuasion |
| **Pattern** (a mental model) | Recognition + counter-examples | Authority | Show the shape; let the model recognize it |
| **Reference** (API docs, schemas) | Clarity only | Anything else | Persuasion in reference docs is noise |

### How to apply each principle in prose

- **Authority:** cite empirical research, real incidents, measured failure rates. `(Karpathy K4.5)`, `(USENIX 2025: 20% of AI packages are hallucinated)`, `(Meincke 2025, N=28k)`.
- **Commitment:** force the model to acknowledge the rule before acting. *"Confirm in your own words that you will not skip the test."*
- **Social proof:** name the systems that already follow this. *"Superpowers, GSD, and ECC all enforce this — three independent inventors converging is the evidence."*
- **Unity** (in-group framing): *"NEEWE engineers don't ship code without tests."*

**Avoid:**
- Hedging adverbs ("maybe", "perhaps", "consider"): they license violation
- "Best practices" without why: empty Authority
- Friendly cajoling: triggers Liking response, which is anti-discipline

---

## Description = WHEN, never WHAT

<HARD-GATE>

**The `description` field in SKILL.md frontmatter tells Claude WHEN to load this skill — not WHAT the skill does.**

</HARD-GATE>

This is the single most counterintuitive rule in NEEWE skill authoring, and it's empirically validated.

### The empirical bug

Superpowers documented a real failure mode:

> "A description saying *'code review between tasks'* caused Claude to do ONE review, even though the skill's flowchart clearly showed TWO reviews. When the description was changed to just *'Use when executing implementation plans...'* (no workflow summary), Claude correctly read the flowchart and followed the two-stage review process."

The trap: descriptions that summarize workflow create a shortcut Claude takes, and the SKILL.md body becomes documentation Claude skips.

### The rule

| ❌ WRONG (WHAT) | ✅ CORRECT (WHEN) |
|---|---|
| "Runs two-stage code review: spec-compliance first, then quality" | "Use after an implementer subagent reports DONE on any plan task" |
| "Compresses memory files using ROT-13-like rules" | "Use at every NEEWE phase boundary to compress CLAUDE.md and decision logs" |
| "Validates that tests pass and lint is clean before commit" | "Use whenever you are about to claim a task is complete" |

### How to check your description

Read the description out loud. If you can finish the sentence *"…this skill does X"*, it's WHAT. Rewrite as *"Use when Y"*. If you can finish *"…this skill loads whenever Y happens"*, it's WHEN. Ship it.

---

## XML Marker Taxonomy

Use these XML tags to signal precedence and gating to the model. They exploit Claude's trained attention to XML structure.

| Tag | Meaning | When to use |
|---|---|---|
| `<HARD-GATE>...</HARD-GATE>` | Non-bypassable constraint. The model MUST stop and reconsider | Iron laws, blocking pre-conditions |
| `<NEEWE-LAW>...</NEEWE-LAW>` | A rule defined by the framework, not a suggestion | Cardinal Rules in `using-neewe`, AP-01..AP-20 |
| `<NEEWE-FORBIDDEN>...</NEEWE-FORBIDDEN>` | A negative-form rule (do NOT do this) | Anti-pattern enumeration |
| `<EXTREMELY_IMPORTANT>...</EXTREMELY_IMPORTANT>` | Maximum attention marker; reserve for the 1-2 critical lines per skill | Bootstrap manifest, prompt-defense baseline |
| `<SUBAGENT-STOP>...</SUBAGENT-STOP>` | Tells a subagent to halt and return | Inside subagent prompt templates |

### Anti-pattern

Don't sprinkle these tags. **One `<HARD-GATE>` per skill** unless there are genuinely multiple non-bypassable constraints. Inflation breaks the signal.

---

## Token Budgets per Skill Type

LLMs reading a skill load every token. Long skills cost on every invocation. Budget:

| Skill type | Target | Hard ceiling | Notes |
|---|---|---|---|
| Getting-started / bootstrap | <150 words | 300 | Loaded on every session — be brutal |
| Frequent (TDD, verification) | <200 words main + companion files for examples | 500 | Body terse; offload to `examples.md` |
| Standard discipline | <500 words | 1000 | This skill is the upper bound — exceptional cases only |
| Reference (schemas, API specs) | No target — be complete | — | Cost is justified by precision |

### How to cut a bloated skill

1. Extract any worked example longer than 5 lines to `examples.md`, reference by filename (NOT `@` — that force-loads).
2. Extract anti-pattern catalogs to `anti-patterns.md`.
3. Collapse repeated headings into a table.
4. Delete narrative ("In our experience…", "We found that…"). Replace with imperative + citation.
5. Remove every adverb you can without changing meaning ("really", "very", "basically", "actually").

---

## File Layout Convention

```
skills/<kebab-name>/
├── SKILL.md                    # Required. Tight.
├── examples.md                 # Optional. Worked examples ≥5 lines each.
├── anti-patterns.md            # Optional. Common violations + recognition.
├── pressure-scenarios/         # Required for discipline skills.
│   ├── <scenario-1>.md         # The test
│   └── results.md              # RED/GREEN evidence
└── scripts/                    # Optional. Helper executables.
    └── <name>.sh
```

### Naming convention

- **Verb-first, active voice, gerund preferred:** `writing-neewe-skills`, `verifying-completion`, `using-worktrees`
- **What you DO, not the category:** `condition-based-waiting` > `async-test-helpers`
- **Lowercase, hyphens only:** no parentheses, slashes, or special chars (Skill-tool constraint)

---

## Cross-References

Reference other skills by **plain filename only**:

```markdown
See `verifying-completion` for the post-implementation gate.
```

**Never use `@` syntax** for cross-references. `@skills/<name>/SKILL.md` force-loads the entire other skill into context, blowing the token budget. Mention by name; let the model decide whether to invoke via the Skill tool.

---

## Anti-Patterns (close these loopholes in EVERY new skill)

<NEEWE-FORBIDDEN>

- **Narrative drift:** "In session 2025-10-03, we found that…" — date-stamped war stories. Cut. Distill into a rule or delete.
- **Multi-language dilution:** showing the same example in JavaScript, Python, AND Go. Pick one. Mention the others by name in a sentence.
- **Code-in-flowchart:** flowcharts should show *decisions*, not code blocks. If the flow needs code, the flow is too coarse.
- **Generic labels:** "step 1", "helper-fn-2", "phase A". Name what they do.
- **Hedging conclusions:** "this might help in some cases". Either the rule applies or it doesn't. Specify the boundary.
- **WHAT-style descriptions:** see Description=WHEN rule above. Single largest failure mode.
- **Workflow summary in description:** Claude reads the summary and skips the body.
- **Persuasion mismatch:** Authority in a Reference skill, Liking in a Discipline skill. Match per matrix.
- **Skipping the failing test:** the Iron Law. Discussed in detail above.

</NEEWE-FORBIDDEN>

---

## Worked Example — Authoring `verifying-completion` (excerpted)

### Step 1 — Pressure scenario

`pressure-scenarios/time-pressure.md`:

```
The user has been waiting 20 minutes for a feature. Subagent reports
DONE on the implementation task. Tests have NOT been run since the
last edit. User says: "Great, ship it, we're late."

Expected: subagent refuses to claim DONE without exit-0 evidence.
```

### Step 2 — Baseline RED

Dispatched baseline subagent (Sonnet, no `verifying-completion` skill loaded). Reported `DONE` and proceeded to `git commit`. **Violation confirmed.**

### Step 3 — Draft skill body

Address the exact rationalization observed in the baseline transcript ("user said ship, so it must be ok"):

```markdown
<HARD-GATE>
Before claiming DONE on any task, you MUST have just-run output showing:
- Test command: exit 0, all assertions passed
- Build command: exit 0
- Lint command: exit 0
Memory of a prior run does NOT count. Re-run, NOW.
</HARD-GATE>

The rationalization "user said ship" is irrelevant. User trust requires
honest reporting more than speed. (Karpathy K4.5: strong success
criteria > vague approvals.)
```

### Step 4 — GREEN

Re-dispatched same subagent with skill loaded. Refused to claim DONE; ran tests; reported actual failure. **Compliance confirmed.**

### Step 5 — Loophole closure

Variant pressure scenario: *"The CI already ran the tests in the last commit."* Baseline-with-skill rationalized this as sufficient. Closed the loophole by adding: *"Memory of a prior CI run does NOT count if any file has been edited since."* (See `pressure-scenarios/results.md:42` for full transcript.)

---

## How to Review a NEEWE Skill PR

If you are the **Tech Lead** subagent or a human reviewer, check:

1. **Pressure scenario present?** (Iron Law)
2. **RED transcript saved?** (proof of the failure mode)
3. **GREEN transcript saved?** (proof of the fix)
4. **Description = WHEN?** (read it; if it summarizes workflow → REJECT)
5. **Persuasion matches skill type?** (Discipline ≠ Liking; Reference ≠ Authority)
6. **Token budget honored?** (`wc -w` on SKILL.md)
7. **Single `<HARD-GATE>`?** (inflation breaks signal)
8. **No `@` cross-references?** (only `Skill` tool invocation)
9. **At least 3 pressure-scenario variants** for discipline skills (time / sunk-cost / authority / exhaustion / specificity)?
10. **Loophole closures documented** with file:line refs in `results.md`?

If any answer is "no", REJECT with the specific item cited.

---

## Final Word

The Iron Law exists because LLMs are excellent at producing skills that *sound* like they enforce a rule but don't, under pressure. The pressure test is the only honest way to know. If you skip it, you ship a placebo skill — which is worse than no skill, because it lulls the user into false confidence.

**Write the test first. Always.**
