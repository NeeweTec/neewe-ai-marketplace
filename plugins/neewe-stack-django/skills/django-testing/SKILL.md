---
name: django-testing
description: Use whenever writing or modifying Django tests. Covers pytest-django setup, the transactional DB-rollback pattern, model factories with factory_boy, view testing via Client, and Playwright/Selenium for true e2e. Pair with test-driven-development for the Iron Law discipline.
license: MIT
token_budget: frequent
---

# Django Testing

Canonical stack: **pytest** + **pytest-django** + **factory_boy** + **Faker**. (Django ships its own TestCase, but pytest-django gives better fixtures, parameterization, and parallelism.)

## Setup (pyproject.toml)

```toml
[tool.pytest.ini_options]
DJANGO_SETTINGS_MODULE = "config.settings.test"
python_files = ["test_*.py", "*_test.py"]
addopts = "--reuse-db --nomigrations"  # fast: reuse DB across runs; skip migrations
```

`--reuse-db` makes tests start in <1s after first run. `--nomigrations` uses model definitions directly for the test DB (works for ORM-only schemas; switch off if you have data migrations with seed data tests depend on).

## Transactional DB Rollback

Each test runs in a DB transaction that's rolled back at teardown. **Free isolation; no manual cleanup.**

```python
import pytest

@pytest.mark.django_db
def test_user_creation():
    user = User.objects.create(email="test@example.com")
    assert User.objects.count() == 1
    # Rolled back at test end; next test starts clean
```

If you need persistent data across tests in a class, use `pytest.mark.django_db(transaction=True)` — but this is slow; avoid unless necessary.

## Factory Boy

Replace verbose fixtures with factories:

```python
# tests/factories.py
import factory
from factory.django import DjangoModelFactory

class UserFactory(DjangoModelFactory):
    class Meta:
        model = User
    email = factory.Faker("email")
    name = factory.Faker("name")

class InvoiceFactory(DjangoModelFactory):
    class Meta:
        model = Invoice
    customer = factory.SubFactory(UserFactory)
    total = factory.Faker("pydecimal", left_digits=4, right_digits=2, positive=True)
    status = "open"

# In tests:
def test_invoice_total(db):
    inv = InvoiceFactory(total=Decimal("100.00"))
    assert inv.total == Decimal("100.00")
```

Factories make test data SETUP readable; the variation that matters is explicit, the rest is auto-generated.

## View Testing (Django Client)

```python
from django.test import Client

@pytest.mark.django_db
def test_login_redirects_authed_user(client):
    user = UserFactory(email="a@b.com")
    user.set_password("password123!")
    user.save()

    response = client.post("/login/", {"email": "a@b.com", "password": "password123!"})
    assert response.status_code == 302
    assert response.url == "/dashboard/"

@pytest.mark.django_db
def test_dashboard_requires_login(client):
    response = client.get("/dashboard/")
    assert response.status_code == 302  # redirect to login
    assert "login" in response.url
```

For DRF, use `APIClient` from `rest_framework.test`.

## DRF Serializer Testing

Don't test DRF's built-in field validation (it's tested upstream). Test YOUR custom serializer logic:

```python
def test_user_serializer_normalizes_email(db):
    serializer = UserSerializer(data={"email": "  A@B.COM  ", "name": "Alice"})
    assert serializer.is_valid(), serializer.errors
    assert serializer.validated_data["email"] == "a@b.com"  # whitespace stripped, lowercased
```

## Model Method Testing

```python
@pytest.mark.django_db
def test_invoice_mark_paid_idempotent():
    inv = InvoiceFactory(status="paid", transaction_id="txn-1")
    with pytest.raises(InvoiceAlreadyPaidError):
        inv.mark_paid(timezone.now(), "txn-2")
    assert inv.transaction_id == "txn-1"  # unchanged
```

## E2E (Playwright preferred)

Selenium is the historical Django choice; Playwright is faster and more reliable. Both work via `pytest-playwright` (or `pytest-selenium`).

```python
def test_user_can_create_invoice(page, live_server):
    page.goto(f"{live_server.url}/login/")
    page.fill('input[name="email"]', "owner@example.com")
    page.fill('input[name="password"]', "password123!")
    page.click('button[type="submit"]')
    page.click('a:has-text("New Invoice")')
    page.fill('input[name="amount"]', "100.00")
    page.click('button:has-text("Create")')
    expect(page.locator(".invoice-detail .total")).to_contain_text("$100.00")
```

`live_server` is the pytest-django fixture that runs the Django app in a background thread for browser tests.

## Performance: Run Tests in Parallel

```bash
pytest -n auto  # uses pytest-xdist; auto = (CPU count)
```

`--reuse-db` is per-worker, so parallel runs each get their own DB clone. For typical Django apps this gives 4-8× speedup.

## Anti-Patterns

- **`TestCase` with manual `setUp/tearDown`** — verbose; pytest fixtures are cleaner
- **Tests that depend on test order** — should fail. Use factories + transactional rollback per test
- **Hitting external APIs** — mock at `requests.get` / `httpx.get` boundary via `responses` or `respx`
- **Asserting on raw HTML strings** — fragile; use `assertContains` or BeautifulSoup
- **No factory; verbose `User.objects.create(...)` in every test** — factory_boy saves dozens of lines
- **`@pytest.mark.django_db` missing** — test silently passes because no DB access; or fails with confusing error

## Pair With

- `test-driven-development` (neewe-core) — Iron Law
- `django-tdd` (this satellite) — per-surface TDD
- `django-verification` — pre-merge checks
