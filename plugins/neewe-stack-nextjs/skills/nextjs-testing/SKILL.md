---
name: nextjs-testing
description: Use whenever writing or modifying tests in a Next.js project. Defines the canonical test stack (Vitest for unit + Playwright for e2e + React Testing Library for components), patterns for testing Server Components / Server Actions / Route Handlers, and the Mock Service Worker setup for API mocking. Pair with test-driven-development (Iron Law) for the discipline.
license: MIT
token_budget: frequent
---

# Next.js Testing

Canonical stack: **Vitest** (unit) + **React Testing Library** (component) + **Playwright** (e2e). Mock Service Worker for API mocks. Test files co-located with source.

## File Naming Convention

```
app/
├── components/
│   ├── search-bar.tsx
│   └── search-bar.test.tsx        # unit test, co-located
├── api/search/
│   ├── route.ts
│   └── route.test.ts              # Route Handler unit test
└── search/
    ├── page.tsx
    └── page.test.tsx              # page-level Server Component test
e2e/
└── search.spec.ts                 # Playwright e2e (browser-driven)
```

## Testing Patterns by Surface

### Server Components

Test by **rendering with React Testing Library** (it handles async SC since React 19):

```ts
import { render, screen } from '@testing-library/react';
import SearchPage from './page';

it('renders search results', async () => {
  const Page = await SearchPage({ searchParams: { q: 'foo' } });
  render(Page);
  expect(await screen.findByText(/results for foo/i)).toBeInTheDocument();
});
```

If the Server Component does network IO, mock at the `fetch` boundary with MSW.

### Server Actions

Test by **calling them directly as functions** (they ARE functions; the `"use server"` directive only changes how Next.js wires them):

```ts
import { submitForm } from './actions';

it('rejects empty title', async () => {
  const result = await submitForm({ title: '' });
  expect(result.error).toBe('title is required');
});
```

For end-to-end form-submit behavior (including redirect + revalidatePath effects), use Playwright.

### Route Handlers

Test by **calling the exported HTTP method functions directly** with constructed `NextRequest`:

```ts
import { GET } from './route';
import { NextRequest } from 'next/server';

it('returns 200 for valid query', async () => {
  const req = new NextRequest('http://localhost/api/search?q=foo');
  const res = await GET(req);
  expect(res.status).toBe(200);
});
```

### Client Components

Standard React Testing Library — `userEvent` for interactions, `findBy*` for async-rendered content.

## Mock Service Worker (MSW) Setup

```ts
// vitest.setup.ts
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

export const server = setupServer(
  http.get('https://api.example.com/users/:id', () => HttpResponse.json({ id: 1, name: 'Test' }))
);
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

`onUnhandledRequest: 'error'` is critical — surface accidental real network calls in tests.

## Playwright e2e Conventions

```ts
import { test, expect } from '@playwright/test';

test('user can search and click a result', async ({ page }) => {
  await page.goto('/search');
  await page.getByLabel('Search').fill('Next.js');
  await page.getByRole('button', { name: /search/i }).click();
  await expect(page.getByRole('heading', { name: /results/i })).toBeVisible();
  await page.getByRole('link', { name: /first match/i }).click();
  await expect(page).toHaveURL(/\/blog\//);
});
```

- Prefer **getByRole / getByLabel / getByText** (accessibility-driven) over getByTestId
- Prefer **assertions on visible behavior** (URL change, text shown) over implementation details
- Run e2e against `next start` (production build), not `next dev` (dev mode behavior differs)

## TDD Integration

This skill is the **HOW**; `test-driven-development` (in neewe-core) is the **WHY + discipline**:

1. Failing test FIRST (Iron Law)
2. Minimal Server Action / Route Handler / component to pass
3. Other tests still green
4. Atomic commit per logical change

For Next.js features, the granularity is usually: 1 Route Handler = 1 test file; 1 page = 1 test file (+ Playwright e2e for the user flow it serves).

## Anti-Patterns

- **Testing implementation details** (internal state, private functions) — fragile; couples test to refactor pain
- **Snapshot tests on entire pages** — too coarse; tests nothing specific; obscures regressions
- **Mocking `next/navigation`** in unit tests — usually a smell; if your component depends heavily on routing, test it via Playwright instead
- **Running tests against `next dev`** — different from production build behavior
- **Ignoring MSW `onUnhandledRequest: 'error'`** — masks accidental real network calls that bite in CI

## Reference

Vitest + Next.js: <https://nextjs.org/docs/app/guides/testing/vitest>
Playwright: <https://playwright.dev/docs/intro>
MSW: <https://mswjs.io/docs>
