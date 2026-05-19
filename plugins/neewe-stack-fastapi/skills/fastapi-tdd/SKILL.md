---
name: fastapi-tdd
description: Use whenever about to write FastAPI production code (router / service / repository / Pydantic model). Maps NEEWE TDD Iron Law to FastAPI per-layer patterns. Always pair with test-driven-development (neewe-core) for the universal discipline; this skill adds the FastAPI specifics.
license: MIT
token_budget: frequent
---

# FastAPI TDD

The Iron Law applies: **NO production code without a failing test first.** This skill is the HOW for FastAPI surfaces.

## Per-Layer TDD Recipe

### Router (HTTP boundary)

1. **RED:** AsyncClient call against the endpoint → assert status, body shape
2. **GREEN:** Minimal `@router.get/post/...` with Pydantic models + dependency injection

```python
# 1. RED — test first
async def test_create_user_returns_201(client):
    res = await client.post("/users", json={"email": "a@b.com", "name": "Alice"})
    assert res.status_code == 201
    assert res.json()["email"] == "a@b.com"

async def test_create_user_rejects_invalid_email(client):
    res = await client.post("/users", json={"email": "not-an-email", "name": "Alice"})
    assert res.status_code == 422  # Pydantic validation catches this
    # NO need to test Pydantic itself; just verify the integration

# 2. GREEN — minimal impl
@router.post("/users", status_code=201)
async def create_user(data: UserCreate, service: UserService = Depends(get_user_service)):
    return await service.create(data)
```

### Service (business logic)

1. **RED:** Call the service method directly with a mocked repo
2. **GREEN:** Minimal service method

```python
# 1. RED
@pytest.mark.asyncio
async def test_user_service_rejects_duplicate_email():
    mock_repo = AsyncMock()
    mock_repo.find_by_email.return_value = User(id=1, email="exists@example.com")
    service = UserService(mock_repo)
    with pytest.raises(DuplicateEmailError):
        await service.create(UserCreate(email="exists@example.com", name="Bob"))

# 2. GREEN
class UserService:
    def __init__(self, repo: UserRepo): self.repo = repo

    async def create(self, data: UserCreate) -> User:
        if await self.repo.find_by_email(data.email) is not None:
            raise DuplicateEmailError(data.email)
        return await self.repo.create(data)
```

### Repository (DB boundary)

1. **RED:** Hit a REAL test DB; assert persistence happens
2. **GREEN:** Minimal `INSERT/SELECT/UPDATE/DELETE` via ORM

Don't mock the ORM. Mock at the SERVICE→REPO boundary, not at the REPO→DB boundary. ORM behavior is too easy to fake-pass; real test DB catches drift.

### Pydantic Models

Don't write tests for Pydantic field validation (Pydantic is well-tested). Test your CUSTOM validators:

```python
class UserCreate(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    def strong_password(cls, v: str) -> str:
        if len(v) < 12: raise ValueError("password must be ≥12 chars")
        if not re.search(r"\d", v): raise ValueError("must contain a digit")
        return v

# Test your validator:
def test_password_validator_rejects_short():
    with pytest.raises(ValidationError):
        UserCreate(email="a@b.com", password="short1")
```

## TDD Order for a New Feature

When adding "users can update their email":

1. **Router test** (RED) — PATCH /users/me/email with valid + invalid + unauth
2. **Service test** (RED) — `user_service.update_email(user, new_email)` — happy + duplicate-email
3. **Repository test** (RED) — `user_repo.update_email(user_id, new_email)` against test DB
4. **GREEN** — implement repository → service → router in that order (bottom-up; each layer tested as you go)
5. **REFACTOR** — extract shared validation, clean up
6. **Verify all green** — `pytest -x` on fresh shell; CI mode

Top-down (router → service → repo) also works; whichever matches your mental model. Just be consistent within a feature.

## Granularity Rule

Each test ≈ 5-15 min senior-dev work. For FastAPI:

- 1 endpoint = 4-7 tests (happy + 2-4 error paths + 1 auth case)
- 1 service method = 2-4 tests (happy + edge + error)
- 1 repository method = 1-3 tests (CRUD basics)
- 1 custom validator = 1 test per rejection rule

## Anti-Patterns

- **Mocking the ORM** — service tests get fake-passes; switch to real test DB or use repo mocks
- **Skipping unauth path tests** — every protected endpoint needs at least one 401 test
- **Testing Pydantic's built-in validators** — Pydantic is tested; test YOUR validators
- **No 422 test on endpoints with validation** — integration testing of validation is fast and high-value
- **`@pytest.mark.asyncio` per test** — set `asyncio_mode = "auto"` in pyproject.toml; cleaner
- **Mixing real-DB and mock-DB in one test file** — pick one approach per file

## Pair With

- `test-driven-development` (neewe-core) — Iron Law
- `fastapi-testing` (this satellite) — stack + patterns
- `fastapi-verification` — pre-merge checks
