---
name: django-tdd
description: Use when about to write Django production code (model / view / form / serializer / admin / management command). Maps NEEWE TDD Iron Law to Django per-surface patterns. Always pair with test-driven-development (neewe-core) for the universal discipline.
license: MIT
token_budget: frequent
---

# Django TDD

Iron Law applies: **NO production code without a failing test first.** This skill is the HOW for Django.

## Per-Surface TDD Recipe

### Model Method

1. **RED:** Test the method with factory-created instance; assert expected state change OR exception
2. **GREEN:** Implement the method on the model

```python
@pytest.mark.django_db
def test_mark_paid_updates_status():
    inv = InvoiceFactory(status="open")
    inv.mark_paid(timezone.now(), "txn-1")
    inv.refresh_from_db()
    assert inv.status == "paid"
    assert inv.transaction_id == "txn-1"

@pytest.mark.django_db
def test_mark_paid_rejects_already_paid():
    inv = InvoiceFactory(status="paid")
    with pytest.raises(InvoiceAlreadyPaidError):
        inv.mark_paid(timezone.now(), "txn-2")
```

### View

1. **RED:** Use `client.get/post(...)`; assert status + content + side effects
2. **GREEN:** Minimal view function/class

```python
@pytest.mark.django_db
def test_create_invoice_requires_login(client):
    response = client.post("/invoices/new/", {"amount": "100"})
    assert response.status_code == 302
    assert "/login" in response.url

@pytest.mark.django_db
def test_create_invoice_persists(client):
    user = UserFactory()
    client.force_login(user)
    response = client.post("/invoices/new/", {"amount": "100"})
    assert response.status_code == 302  # redirect to detail
    assert Invoice.objects.count() == 1
    assert Invoice.objects.first().customer == user
```

### Form / Serializer Validator

```python
def test_email_normalization():
    form = UserForm(data={"email": "  A@B.COM  ", "name": "Alice"})
    assert form.is_valid(), form.errors
    assert form.cleaned_data["email"] == "a@b.com"

def test_password_strength_rule():
    form = UserForm(data={"email": "a@b.com", "password": "short"})
    assert not form.is_valid()
    assert "password" in form.errors
```

### Management Command

```python
from django.core.management import call_command
from io import StringIO

@pytest.mark.django_db
def test_cleanup_expired_sessions_command():
    expired = SessionFactory(expire_date=timezone.now() - timedelta(days=1))
    active = SessionFactory(expire_date=timezone.now() + timedelta(days=1))
    out = StringIO()
    call_command("cleanup_expired_sessions", stdout=out)
    assert "1 expired" in out.getvalue()
    assert not Session.objects.filter(id=expired.id).exists()
    assert Session.objects.filter(id=active.id).exists()
```

### QuerySet / Manager Method

```python
@pytest.mark.django_db
def test_overdue_invoices_excludes_paid():
    InvoiceFactory(status="open", due_date=timezone.now() - timedelta(days=10))
    InvoiceFactory(status="paid", due_date=timezone.now() - timedelta(days=10))
    overdue = Invoice.objects.overdue()
    assert overdue.count() == 1
```

## TDD Order for a New Feature

When adding "users can mark invoice as paid":

1. **Model method test** (RED) — `mark_paid()` happy + idempotent
2. **Model method impl** (GREEN)
3. **View test** (RED) — POST /invoices/{id}/mark-paid/ requires login, calls method, redirects
4. **View impl** (GREEN)
5. **URL conf** entry
6. **Template** with form pointing at the URL
7. **E2E test** (Playwright via live_server) — full user flow
8. **REFACTOR**

## Granularity Rule

Each step ≈ 5-15 min. For Django:

- 1 model method = 2-4 tests (happy + errors + edge)
- 1 view = 2-4 tests (auth + happy + invalid input + permission)
- 1 form = 1-3 tests per custom validator
- 1 manager method = 1-2 tests
- 1 e2e flow = 1 Playwright spec

## Anti-Patterns

- **Tests that don't use `@pytest.mark.django_db`** — silently pass without DB access OR fail with confusing error
- **Hitting external APIs in tests** — mock via `responses` (requests) or `respx` (httpx)
- **Assertions on raw HTML** — fragile; use `assertContains` or BeautifulSoup
- **Skipping CSRF in view tests** — CSRF middleware is on; tests should reflect production behavior
- **`User.objects.create(...)` instead of factories** — verbose; factories scale better
- **Testing Django built-ins** — Django is tested; test YOUR code

## Pair With

- `test-driven-development` (neewe-core) — Iron Law
- `django-testing` (this satellite) — stack + patterns
- `django-verification` — pre-merge checks
