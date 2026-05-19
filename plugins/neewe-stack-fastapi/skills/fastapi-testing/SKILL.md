---
name: fastapi-testing
description: Use whenever writing or modifying FastAPI tests. Defines the canonical stack (pytest + httpx AsyncClient + pytest-asyncio + factory-boy / Faker for fixtures), dependency override patterns for DB / auth mocking, and the per-layer testing strategy (router / service / repository tests).
license: MIT
token_budget: frequent
---

# FastAPI Testing

Canonical stack: **pytest** + **pytest-asyncio** + **httpx.AsyncClient** for in-process HTTP testing.

## Per-Layer Strategy

| Layer | Test type | Tool | Mock what? |
|---|---|---|---|
| Repository | Unit | pytest, real test DB | Nothing — hit a real (test) DB |
| Service | Unit | pytest, mocked repos | Repos (the DB boundary) |
| Router | Integration | pytest + AsyncClient | Auth dep (override); maybe service (override) |
| End-to-end | Integration | pytest + AsyncClient | Nothing; real DB + real auth |

## In-Process HTTP Testing with httpx

The recommended way (replaces the older `TestClient` for async apps):

```python
# conftest.py
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

# test_users.py
async def test_get_user(client):
    res = await client.get("/users/1")
    assert res.status_code == 200
    assert res.json()["id"] == 1
```

## Dependency Overrides (test-only)

Override expensive or external dependencies for tests:

```python
# conftest.py
from app.main import app
from app.deps import get_current_user

class FakeUser:
    id = 1
    email = "test@example.com"

def fake_current_user():
    return FakeUser()

@pytest_asyncio.fixture(autouse=True)
def override_auth():
    app.dependency_overrides[get_current_user] = fake_current_user
    yield
    app.dependency_overrides.clear()
```

This is the canonical pattern — works for DB sessions, external APIs, anything injected via `Depends()`.

## Test DB Setup

Two acceptable approaches:

**A. Real test DB (recommended for confidence):**

```python
# conftest.py — uses a real Postgres or SQLite for each test
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

TEST_DB_URL = "postgresql+asyncpg://test:test@localhost/test_db"

@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with SessionLocal() as session:
        yield session
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
```

**B. Transactional rollback (faster):**

Each test runs inside a transaction that rolls back at teardown. Use `pytest-postgresql` or similar.

## Async Test Discovery

In `pyproject.toml`:

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
```

This makes every `async def test_*` auto-discovered without needing `@pytest.mark.asyncio` per-test.

## Fixtures Hierarchy

- `client` (function-scoped) — fresh AsyncClient per test
- `db_session` (function-scoped) — clean DB per test
- `authed_client` (function-scoped) — client with auth dep overridden
- `factory_user` (module-scoped) — Faker / factory-boy producer

Keep teardown in `yield` fixtures.

## Coverage Strategy

- Aim for behavioral coverage, not raw %:
  - Happy path: 1 test per endpoint
  - Auth required: 1 test (401 case)
  - Validation: 1 test per non-trivial validation rule (Pydantic catches most; you test integration)
  - Authorization (ACL): 1 test per protected operation
  - Error paths (404, 409, 422): 1 test each when applicable

A 30-endpoint API has ~80-120 tests at minimum. Less = under-tested.

## Anti-Patterns

- **`TestClient` for async apps** — deprecated for async; use `httpx.AsyncClient` + `ASGITransport`
- **Patching DB sessions with mock.patch** — use `dependency_overrides`; cleaner, scoped, doesn't leak
- **Real network calls in tests** — mock at the boundary (httpx `MockTransport`); never let tests hit prod
- **`sleep` to wait for async** — use proper `await` patterns; sleep masks race conditions
- **One giant `test_users.py` with 80 tests** — split by route or by behavior; faster collection + easier scope
- **Forgetting to clear `dependency_overrides`** — leaks between tests; always `yield` + `.clear()`

## Pair With

- `test-driven-development` (neewe-core) — Iron Law
- `fastapi-tdd` (this satellite) — per-surface TDD recipes
- `fastapi-verification` — pre-merge checks
