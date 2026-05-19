---
name: fastapi-security
description: Use when adding auth, validation, dependencies, or routes touching trust boundaries in a FastAPI app. Covers OAuth2/JWT patterns, Pydantic validation as the trust boundary, dependency-injection for auth, CORS / security headers, rate limiting, and the SQL-injection-resistant query patterns. Pair with governance-cso for periodic deep audit.
license: MIT
token_budget: frequent
---

# FastAPI Security

## The Pydantic Trust Boundary

FastAPI validates request bodies against Pydantic models BEFORE your handler runs. **This is your primary defense.** Use it aggressively.

```python
# ✅ Untrusted input is validated + coerced
class CreateUserIn(BaseModel):
    email: EmailStr
    age: int = Field(ge=0, le=150)
    role: Literal["user", "admin"]

@router.post("/users")
async def create(data: CreateUserIn):  # FastAPI rejects invalid before this line runs
    ...

# ❌ Bypasses validation
@router.post("/users-bad")
async def create(req: Request):
    body = await req.json()
    age = body["age"]  # arbitrary value; no validation
```

If you accept arbitrary JSON, you've given up Pydantic's protection. Only do this if you're proxying to another service that will validate downstream.

## Auth — OAuth2 + JWT (canonical)

```python
# app/auth.py
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError

oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/token")

async def get_current_user(token: str = Depends(oauth2)) -> User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = payload.get("sub")
        if user_id is None: raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = await db.get(User, user_id)
    if user is None: raise credentials_exception
    return user

# Use everywhere protected:
@router.get("/users/me")
async def me(current: User = Depends(get_current_user)):
    return current
```

**Cardinal rules:**

- `SECRET_KEY` from env, never hardcoded
- Short JWT lifetimes (15 min access, 7d refresh) — long lifetimes amplify breach impact
- Verify `exp` claim (jose does this automatically) AND check user still exists/active
- Don't put sensitive data in JWT payload (it's base64, not encrypted)
- Refresh tokens stored server-side (Redis), revocable; access tokens stateless

## Authorization (vs Authentication)

Authentication = who is this? Authorization = can they do this?

```python
async def require_role(role: str):
    async def checker(current: User = Depends(get_current_user)) -> User:
        if current.role != role:
            raise HTTPException(403, "forbidden")
        return current
    return checker

@router.delete("/admin/users/{uid}")
async def delete_user(uid: int, _: User = Depends(require_role("admin"))):
    ...
```

For resource-level authorization (this user can edit THIS post): check ownership inside the handler:

```python
@router.patch("/posts/{post_id}")
async def update_post(post_id: int, data: PostUpdate, current: User = Depends(get_current_user)):
    post = await post_repo.get(post_id)
    if post is None: raise HTTPException(404)
    if post.author_id != current.id: raise HTTPException(403)
    return await post_repo.update(post_id, data)
```

## SQL Injection Resistance

ALWAYS use parameterized queries. Never string-interpolate user input into SQL:

```python
# ❌ catastrophic
await db.execute(f"SELECT * FROM users WHERE email = '{email}'")

# ✅ safe via ORM
await db.execute(select(User).where(User.email == email))

# ✅ safe via raw SQL with bindings
await db.execute(text("SELECT * FROM users WHERE email = :email"), {"email": email})
```

Pydantic validation catches obviously-malformed input but does NOT prevent SQL injection if you concat strings.

## CORS

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://app.example.com"],  # NEVER ["*"] in production
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

**Trap:** `allow_origins=["*"]` + `allow_credentials=True` = browser silently ignores; you think it works in dev, breaks in production.

## Rate Limiting

Built-in FastAPI doesn't ship rate limiting. Use `slowapi`:

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@router.post("/auth/login")
@limiter.limit("5/minute")
async def login(...):
    ...
```

Apply rate limits at minimum to: login, password reset, forgot-password, send-email-verification, anything that triggers external service calls.

## Security Headers

```python
from starlette.middleware.base import BaseHTTPMiddleware

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

app.add_middleware(SecurityHeadersMiddleware)
```

## Common Vulnerabilities (priority order)

1. **JWT secret in code / committed** — disclose = full breach. ALWAYS env var.
2. **String-interpolated SQL** — instant catastrophic data loss. Use ORM or bind params.
3. **`allow_origins=["*"]` with credentials** — silent CORS bypass.
4. **No rate limit on auth** — credential stuffing trivial.
5. **Resource access without ownership check** — IDOR (Insecure Direct Object Reference). Always verify ownership.
6. **Long JWT TTL without refresh** — breach amplification.
7. **Sensitive logging** — passwords / tokens / PII in logs.
8. **Missing exception handlers** — stack traces leak in 500s. Always set a global handler.

## Pair With

- `governance-cso` (neewe-core) — periodic deep audit
- `fastapi-verification` — pre-merge security checks (bandit / safety / pip-audit)
