---
name: nextjs-security
description: Use when adding auth, env handling, route handlers, middleware, or any code touching trust boundaries in a Next.js project. Covers the RSC vs Client trust boundary, env exposure rules (NEXT_PUBLIC_* leakage), middleware vs route handler vs Server Action security model, and Server Actions auth/CSRF posture. Pair with governance-cso for periodic deep audit.
license: MIT
token_budget: frequent
---

# Next.js Security

The RSC trust model is subtly different from classic SPAs. This skill captures the patterns that actually matter for production safety.

## The RSC Trust Boundary

Server Components and Server Actions run on the SERVER. Client Components run in the BROWSER. **Anything that crosses the boundary is reachable by the user.**

| What you do | Where it runs | User can see / call? |
|---|---|---|
| `await db.query(...)` in Server Component | Server | NO — code never ships |
| `const KEY = process.env.STRIPE_SECRET` in Server Component | Server | NO — value never ships |
| `const KEY = process.env.NEXT_PUBLIC_X` anywhere | Bundled in client | **YES — full client visibility** |
| Export `async function foo()` with `"use server"` | Server, but callable from client | **YES — every Server Action is a public RPC endpoint** |

**The trap:** Server Actions FEEL like normal function calls but they're public endpoints. Treat every Server Action exactly like a Route Handler: validate input, check auth, rate-limit if exposed.

## Env Var Exposure Rules

```
NEXT_PUBLIC_*    → bundled into client JS  (THIS IS THE LEAK VECTOR)
<anything else>  → server-only, never bundled
```

**Rules:**

- API keys, secrets, tokens → NEVER `NEXT_PUBLIC_*`
- Public IDs (analytics IDs, public URLs, feature flags users see anyway) → OK as `NEXT_PUBLIC_*`
- When in doubt: leave the prefix off. Audit later if you actually need it in the browser.

**Common bugs:**

```ts
// ❌ WRONG — Stripe SECRET key in client bundle
const stripe = new Stripe(process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY!);

// ✅ RIGHT — Stripe SECRET stays server-only
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
```

## Auth in Server Actions (CSRF + identity)

Server Actions are **automatically CSRF-protected** when invoked via React's form mechanism (Next.js verifies the action ID + origin). **They are NOT auto-CSRF-protected when invoked via fetch from arbitrary clients.**

**Rule:** every Server Action must:

1. **Authenticate** the caller (session lookup) — Server Action gets no implicit user context
2. **Authorize** the operation (does THIS user have permission for THIS action on THIS resource?)
3. **Validate** the input (schema validation via Zod / Valibot; never trust client-shaped data)

Pattern:

```ts
"use server";

import { z } from "zod";
import { auth } from "@/lib/auth";

const InputSchema = z.object({ postId: z.string().uuid(), title: z.string().min(1).max(200) });

export async function updatePost(rawInput: unknown) {
  // 1. AUTH
  const session = await auth();
  if (!session?.userId) return { error: "unauthenticated" };

  // 2. VALIDATE
  const input = InputSchema.safeParse(rawInput);
  if (!input.success) return { error: "invalid input" };

  // 3. AUTHORIZE
  const post = await db.post.findUnique({ where: { id: input.data.postId } });
  if (!post || post.authorId !== session.userId) return { error: "not authorized" };

  // 4. EXECUTE
  await db.post.update({ where: { id: input.data.postId }, data: { title: input.data.title } });
  revalidatePath(`/posts/${input.data.postId}`);
  return { ok: true };
}
```

## Middleware vs Route Handler vs Server Action

| Surface | When to use | Trust default |
|---|---|---|
| **Middleware** (`middleware.ts`) | Cheap pre-route checks: auth redirect, geoblock, rate limit, i18n | Runs on EVERY matching request; keep it lean (10ms p95 budget) |
| **Route Handler** (`app/api/.../route.ts`) | Public HTTP endpoints: webhooks, SDK integrations, JSON APIs | Untrusted — assume external callers |
| **Server Action** (`"use server"`) | Form submissions + interactive mutations from your own UI | Untrusted — assume malicious clients (still validate + auth) |

**Trap:** Middleware runs in the Edge Runtime (Web API only) — no Node APIs like `fs`, `crypto.createHmac`, etc. If you need them, defer to a Route Handler.

## Security Headers

Set in `next.config.js`:

```js
module.exports = {
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        // CSP: build a proper one per app; the default is permissive
      ],
    }];
  },
};
```

## Common Vulnerabilities (in priority order)

1. **Secrets in `NEXT_PUBLIC_*`** — bundled into client. Audit on every env addition.
2. **Server Actions without auth check** — every action is a public endpoint. No exceptions.
3. **Trusting `searchParams` / `params` without validation** — SQL injection, path traversal vectors.
4. **Open redirects** in `redirect()` calls with user-controlled URLs — validate against an allowlist.
5. **Missing rate limiting** on Server Actions called from forms (cost-of-service attacks).
6. **CSP missing or `unsafe-inline`** — XSS hardening.
7. **`dangerouslySetInnerHTML`** with non-sanitized content — XSS direct.
8. **Webhook signature not verified** in Route Handlers — anyone can forge.

## Pair With

- `governance-cso` (from neewe-core) — daily 8/10-confidence security pass + comprehensive monthly OWASP audit
- `nextjs-verification` — pre-merge runs `next build`, `tsc --noEmit`, `next lint`
