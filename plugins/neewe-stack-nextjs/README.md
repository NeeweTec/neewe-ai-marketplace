# neewe-stack-nextjs

NEEWE stack-flavor satellite for **Next.js** (App Router + Server Components).

**Depends on:** `neewe-core@>=0.5.0`

## What this satellite adds

| Surface | Purpose |
|---|---|
| `.lsp.json` | typescript-language-server config — live diagnostics in agent context |
| `monitors/monitors.json` | tails `.next/build.log` + `node_modules/.cache/` errors |
| `skills/nextjs-patterns/SKILL.md` | App Router conventions, Server vs Client Components, data fetching patterns |
| `skills/nextjs-testing/SKILL.md` | Vitest/Playwright/RSC testing patterns |
| `skills/nextjs-security/SKILL.md` | Middleware auth, env exposure, RSC trust boundary, route handlers |
| `skills/nextjs-tdd/SKILL.md` | Failing-test-first patterns specific to RSC/Server Actions/Route Handlers |
| `skills/nextjs-verification/SKILL.md` | Pre-merge verification: `tsc --noEmit`, `next lint`, Playwright pass |

## Install

```
/plugin install neewe-stack-nextjs@neewe
```

## Activates automatically when

- Project root contains `next.config.{js,mjs,ts}`
- Project `package.json` has `"next"` in dependencies

`neewe-squad-composer` (from neewe-core) detects these signals and auto-recommends loading this satellite.
