---
name: fastapi-patterns
description: Use when writing or refactoring FastAPI code. Defines async-first conventions, dependency-injection patterns, Pydantic v2 model design (request/response separation), error-handling via exception handlers, and the canonical project layout (routers + services + repositories). Required reading before any feature in a FastAPI codebase.
license: MIT
token_budget: frequent
---

# FastAPI Patterns

## Async-First Rule

FastAPI is async-native. **Every route handler is `async def`** unless you have a specific reason otherwise. The reason should be documented inline.

```python
# ✅ default
@router.get("/users/{user_id}")
async def get_user(user_id: int) -> User:
    return await user_service.fetch(user_id)

# ⚠ acceptable only if the entire chain is blocking AND fast
@router.get("/health")
def health() -> dict:
    return {"ok": True}
```

If you `await` any blocking call (sync `requests.get`, sync DB driver) inside `async def`, you starve the event loop. Use the async equivalents (`httpx.AsyncClient`, `asyncpg` / SQLAlchemy 2.0 async, etc.) OR wrap with `asyncio.to_thread(...)` for unavoidable blocking I/O.

## Project Layout (canonical)

```
app/
├── main.py                       # FastAPI() instance + include_routers
├── routers/
│   ├── __init__.py
│   ├── users.py                  # APIRouter(prefix="/users")
│   └── posts.py
├── services/                     # business logic (no HTTP knowledge)
│   ├── user_service.py
│   └── post_service.py
├── repositories/                 # DB access (no business logic)
│   ├── user_repo.py
│   └── post_repo.py
├── schemas/                      # Pydantic models
│   ├── user.py                   # UserCreate / UserUpdate / UserOut
│   └── post.py
├── models/                       # SQLAlchemy / ORM models
│   └── user.py
├── deps.py                       # FastAPI dependencies (DI)
├── config.py                     # pydantic-settings
└── tests/
    ├── conftest.py
    └── test_users.py
```

The 3-layer split (router → service → repository) keeps HTTP concerns out of business logic and DB concerns out of services. This makes testing tractable (mock at the boundary you care about).

## Dependency Injection — the FastAPI Way

Use `Depends()` for everything that crosses a layer boundary:

```python
from fastapi import Depends
from app.deps import get_db, get_current_user
from app.services.user_service import UserService

async def get_user_service(db = Depends(get_db)) -> UserService:
    return UserService(db)

@router.get("/users/me")
async def me(
    current_user = Depends(get_current_user),
    service: UserService = Depends(get_user_service),
) -> UserOut:
    return await service.full_profile(current_user.id)
```

Benefits: testable (override dependencies in tests), DRY (no manual session passing), clean signatures.

## Pydantic v2 Model Separation

**Separate models per direction**:

```python
# schemas/user.py
class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str  # never sent back

class UserUpdate(BaseModel):
    name: str | None = None
    password: str | None = None  # explicit nullable; PATCH semantics

class UserOut(UserBase):
    id: int
    created_at: datetime
    # NO password field — never leaks out
```

**Never reuse the ORM model as a Pydantic request/response model.** It's a leaky abstraction that exposes internal fields and breaks under schema evolution.

## Error Handling

Define custom exceptions that the global handler maps to HTTP responses:

```python
# app/exceptions.py
class NotFoundError(Exception):
    def __init__(self, what: str):
        self.what = what

# app/main.py
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(NotFoundError)
async def not_found_handler(req: Request, exc: NotFoundError):
    return JSONResponse(status_code=404, content={"error": f"{exc.what} not found"})
```

This keeps routers clean — they raise domain exceptions; the handler translates to HTTP.

## Background Tasks vs Real Background Jobs

```python
# Light, in-process, OK to lose on crash:
@router.post("/email-notification")
async def notify(payload: NotifyIn, bg: BackgroundTasks):
    bg.add_task(send_email, payload.to, payload.body)  # runs after response sent
    return {"queued": True}

# Heavy, must-not-lose, retry-able:
# Use a real queue (Celery, ARQ, Dramatiq, RQ). NOT BackgroundTasks.
```

## Anti-Patterns

- **Sync `def` route handlers** in an async app (starve the event loop on slow IO)
- **`async def` calling sync `requests.get(...)`** (same — starve the loop)
- **ORM model as Pydantic response** (leaks internal fields)
- **Logic in routers** (untestable; HTTP-coupled)
- **`HTTPException` raised from services** (couples service layer to HTTP)
- **Global mutable state** (FastAPI workers don't share memory in production; rely on DB/Redis)
- **`async def` health-check that awaits DB query** (timeouts cascade; gate behind a shorter timeout)

## Reference

FastAPI: <https://fastapi.tiangolo.com/>
Pydantic v2: <https://docs.pydantic.dev/2/>
