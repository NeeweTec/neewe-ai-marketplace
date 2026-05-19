---
name: nextjs-tdd
description: Use whenever you are about to write Next.js production code (Server Component / Server Action / Route Handler / Client Component / middleware). Maps the NEEWE TDD Iron Law to Next.js-specific test patterns. Always pair with test-driven-development (from neewe-core) for the universal discipline; this skill adds the Next.js specifics.
license: MIT
token_budget: frequent
---

# Next.js TDD

The Iron Law applies: **NO production code without a failing test first.** This skill is the HOW for Next.js surfaces specifically.

## Per-Surface TDD Recipe

### Server Component

1. **RED:** Write test rendering the component with mock data; assert on the rendered output.
2. **GREEN:** Minimal Server Component that produces expected output for the test inputs.
3. **REFACTOR:** Extract data fetching to a helper; split sub-components if rendering > 50 lines.

```ts
// 1. RED — test first
import { render, screen } from '@testing-library/react';
import UserCard from './user-card';

it('renders user name and avatar', async () => {
  const Card = await UserCard({ userId: 'u-1' });
  render(Card);
  expect(screen.getByRole('heading')).toHaveTextContent('Alice');
  expect(screen.getByRole('img')).toHaveAttribute('alt', 'Alice');
});

// 2. GREEN — minimal impl
export default async function UserCard({ userId }: { userId: string }) {
  const user = await db.user.findUnique({ where: { id: userId } });
  return (<div>
    <h2>{user.name}</h2>
    <img src={user.avatar} alt={user.name} />
  </div>);
}
```

### Server Action

1. **RED:** Call the action with invalid input; assert specific error returned.
2. **RED:** Call the action with valid input but missing auth; assert auth error.
3. **RED:** Call with valid input + auth; assert success + DB side effect.
4. **GREEN:** Implement the auth check, validation, and side effect.

Each branch (invalid input / unauth / success) is a separate failing test.

### Route Handler

1. **RED:** Construct `NextRequest`; call exported method; assert status + body shape.
2. **RED:** Auth + validation paths separately.
3. **GREEN:** Implement the handler with all branches.

### Client Component (interactive)

1. **RED:** Render; `userEvent.click(...)`; assert resulting state via `findBy*` (async).
2. **GREEN:** Implement the handler + state update.

### Middleware

1. **RED:** Construct request; call middleware; assert returned response (redirect / next / rewrite).
2. **GREEN:** Implement the matcher + decision.

## Granularity Rule

Per `test-driven-development` skill, each TDD step ≈ 5-15 min senior-dev work. For Next.js, that usually means:

- 1 Route Handler = 1 test file with 3-5 test cases (happy + 2-4 error paths)
- 1 Server Action = 1 test file with 3-5 cases (input validation + auth + business logic + side effect)
- 1 component = 1 test file with 1-3 cases (renders correctly + 1-2 interactions if client)
- 1 e2e flow = 1 Playwright spec with 1 happy path + 1-2 critical alt paths

## TDD Order for a New Feature (typical sequence)

When implementing a new feature (e.g., "users can edit their post title"):

1. **e2e first** (Playwright) — failing because UI doesn't exist yet
2. **Server Action test** — failing because action doesn't exist yet
3. **Server Action implementation** — minimal to make action test pass
4. **Page component test** — failing because page doesn't render edit UI
5. **Page component implementation** — minimal to render
6. **Verify all tests green** — including the e2e
7. **REFACTOR** — extract shared validation logic, clean up

Each step is one commit. e2e is FIRST because it forces you to design the URL + form shape before getting lost in implementation.

## Anti-Patterns

- **Implementing the Server Action before the test** — Iron Law violation
- **Testing only the happy path** — Server Actions are public endpoints; auth + validation paths matter MORE than happy
- **Mocking next/navigation in client tests** — usually a smell; test via Playwright instead
- **`expect(true).toBe(true)` as a placeholder** — that's not a test; that's a lie
- **Skipping the e2e because "the unit tests cover it"** — they don't; unit tests don't catch routing / data-fetching / Suspense issues

## Pair With

- `test-driven-development` (neewe-core) — universal discipline
- `nextjs-testing` (this satellite) — test stack + patterns
- `nextjs-verification` (this satellite) — pre-merge verification
