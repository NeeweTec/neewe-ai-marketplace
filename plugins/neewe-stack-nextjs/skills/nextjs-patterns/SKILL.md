---
name: nextjs-patterns
description: Use when writing or refactoring Next.js code in a NEEWE-managed project. Defines App Router conventions, Server vs Client Component decision rules, canonical data-fetching patterns (RSC + Server Actions + Route Handlers), and routing/layout idioms. Required reading before any new feature in a Next.js codebase.
license: MIT
token_budget: frequent
---

# Next.js Patterns (App Router + RSC era)

## Server vs Client Component — the decision rule

Default to **Server Component**. Only mark `"use client"` when you need ONE of:

- `useState` / `useReducer` / `useEffect` / refs
- Event handlers (`onClick`, `onChange`, etc.)
- Browser-only APIs (`window`, `localStorage`, `IntersectionObserver`)
- Third-party libraries that depend on the above

If the component just renders data → Server. If it just renders children → Server. Push `"use client"` to the LEAVES of the tree, never the trunk.

## Data Fetching — pick one per surface

| Need | Mechanism | Why |
|---|---|---|
| Read data for initial render | `async` Server Component + `await fetch(...)` | Streams; cacheable; no client bundle cost |
| Mutate from a form | Server Action (`"use server"`) | Co-locates UI + logic; type-safe; works without JS |
| Read data on user interaction (client) | `fetch` in client component OR Route Handler | When you need response from non-form interaction |
| Long-lived realtime | Server-Sent Events from Route Handler OR external WS server | Native to App Router |
| Webhook | Route Handler (`app/api/<name>/route.ts`) | Stateless HTTP |

**Never use** `getStaticProps` / `getServerSideProps` — those are Pages Router. App Router is fundamentally different.

## Routing Conventions

```
app/
├── layout.tsx           # root layout, must include <html> and <body>
├── page.tsx             # /
├── about/
│   └── page.tsx         # /about
├── blog/
│   ├── layout.tsx       # nested layout for /blog/*
│   ├── page.tsx         # /blog
│   └── [slug]/
│       └── page.tsx     # /blog/:slug
├── (marketing)/         # route group, no URL segment
│   └── pricing/page.tsx # /pricing
└── api/
    └── webhook/
        └── route.ts     # GET/POST/PUT/PATCH/DELETE handlers
```

- **`page.tsx`** = leaf route
- **`layout.tsx`** = wraps all children at that level (persisted across navigation)
- **`loading.tsx`** = Suspense boundary (shown while page loads)
- **`error.tsx`** = error boundary (must be Client Component)
- **`not-found.tsx`** = 404 for that segment
- **`(group)`** = organizational folder (parens hide from URL)
- **`[param]`** = dynamic segment
- **`[...catch]`** = catch-all
- **`[[...catch]]`** = optional catch-all

## Cardinal Anti-Patterns

- **Marking `"use client"` on layouts** — kills server-side data fetching for the entire subtree
- **`window` in Server Components** — runtime error; gate with `typeof window !== 'undefined'` only at leaves
- **Fetching the same data in parent + child** — hoist to parent and pass via props
- **Mixing Pages Router and App Router** — pick one per app; mixing yields strange auth / data behavior
- **Default-exporting non-component from `page.tsx`** — must be a component; check the function signature

## NEEWE Overlay

- Per `neewe-stack-nextjs` LSP: TypeScript errors surface in agent context automatically (no need to ask "did it compile?")
- Pair with `nextjs-tdd` for failing-test-first discipline on Server Actions and Route Handlers
- Use `nextjs-verification` before declaring DONE on any Next.js task

## Reference

Authoritative docs: <https://nextjs.org/docs/app> — for any pattern not covered here, defer to the official docs (they change frequently with each Next.js minor release).
