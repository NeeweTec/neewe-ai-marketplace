---
name: nextjs-verification
description: Use before claiming any Next.js task is DONE. Runs the canonical Next.js pre-merge verification checklist (tsc --noEmit / next lint / next build / vitest run / playwright test) and reports exit codes. Wires into the NEEWE verifying-completion contract — no claim of DONE without the exit-0 evidence shown in the current message.
license: MIT
token_budget: frequent
---

# Next.js Verification

NEEWE's universal `verifying-completion` Iron Law applies: no claim of DONE without just-run evidence. This skill is the Next.js-specific checklist.

## The 5-Step Pre-Merge Checklist

Run ALL of these and show output in the current message:

```bash
# 1. TypeScript: no type errors
npx tsc --noEmit

# 2. Lint: no errors (warnings acceptable if pre-existing)
npx next lint

# 3. Build: succeeds end-to-end (catches a lot that dev mode hides)
npx next build

# 4. Unit + component tests pass
npx vitest run

# 5. E2E pass (production-mode server) — only if e2e suite exists
npx playwright test
```

All five must exit 0 OR the task is NOT DONE.

## Output Format (when reporting)

```
## NEXTJS_VERIFICATION

| Check | Command | Exit | Notes |
|---|---|---|---|
| TypeScript | `npx tsc --noEmit` | 0 | clean |
| Lint | `npx next lint` | 0 | 0 errors, 3 pre-existing warnings (unchanged) |
| Build | `npx next build` | 0 | bundle: 142KB / 89KB gzip |
| Unit/component | `npx vitest run` | 0 | 47 passed, 0 failed |
| E2E | `npx playwright test` | 0 | 12 passed, 0 failed |

VERIFIED. Ready for governance-tech-lead review.
```

If ANY exit is non-zero: do NOT claim DONE. Report the failure and the specific fix needed.

## Per-Check Notes

### `tsc --noEmit`

- Run with `--noEmit` to type-check without producing output (Next.js handles the actual build)
- If you have `tsconfig.json` paths, ensure `baseUrl` is set correctly
- Errors in `node_modules` are NOT your responsibility; if blocking, add to `tsconfig.exclude` (uncommon)

### `next lint`

- Next.js bundles ESLint with a Next.js-specific config (next/core-web-vitals)
- Warnings about `<a>` vs `<Link>`, `<img>` vs `<Image>` are usually real performance signals
- Don't auto-fix with `--fix` without reviewing — `next lint --fix` can mangle valid code in edge cases

### `next build`

- Catches issues dev mode hides:
  - Server-only modules accidentally imported into Client Components
  - Server Action exports without `"use server"`
  - Static generation failures (`generateStaticParams` returning bad data)
  - Bundle-size regressions (warn at >250KB initial chunk)
- If build hangs > 5 min, kill it and investigate (usually a circular dep or huge dynamic import)

### `vitest run`

- Use `run` (not just `vitest`) for one-shot CI-mode execution
- Mock Service Worker assertions: `onUnhandledRequest: 'error'` per `nextjs-testing` — surface unmocked fetches
- Coverage NOT required to be green, but behavioral coverage IS: every error path tested?

### `playwright test`

- Run against `next start` (production build), not `next dev`
- Use `--workers=N` if test execution is slow (default is half of CPUs)
- Headless by default; for debugging: `--headed --debug`
- Trace on failure: enabled by default; trace files in `test-results/`

## Pre-Merge Gate (when this fires)

Before invoking `governance-release` for a Next.js project, this checklist MUST pass. The Release agent will refuse to ship if any check failed.

## What NOT to Skip

| Excuse | Reality |
|---|---|
| "Build takes 2 minutes; skip in dev" | Build catches RSC/Client boundary errors dev mode masks |
| "TypeScript is just a warning" | `tsc --noEmit` exit 0 is non-negotiable; warnings in lint are OK, type errors are NOT |
| "Tests pass locally" | CI matters; run `vitest run` (not `vitest`) and show CI-mode output |
| "E2E is flaky" | Investigate the flakiness; flaky tests = no tests |

## Pair With

- `verifying-completion` (neewe-core) — universal Iron Law
- `governance-release` (neewe-core) — final gate
- `governance-cso` (neewe-core) — security checks (separate from verification but co-required)
