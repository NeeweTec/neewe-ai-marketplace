---
name: django-patterns
description: Use when writing or refactoring Django code. Covers the canonical app structure (apps/ vs monolithic project/), the Fat-Models thin-Views convention, QuerySet patterns (select_related / prefetch_related / annotate), and Class-Based vs Function-Based view decisions. Required reading before any new feature.
license: MIT
token_budget: frequent
---

# Django Patterns (4.2 LTS / 5.x)

## Project Structure (canonical)

```
project_root/
├── manage.py
├── pyproject.toml
├── config/                       # settings + URL conf (NOT an app)
│   ├── __init__.py
│   ├── settings/
│   │   ├── base.py
│   │   ├── dev.py
│   │   ├── prod.py
│   │   └── test.py
│   ├── urls.py
│   └── wsgi.py / asgi.py
└── apps/                         # business apps; each is a Django app
    ├── users/
    │   ├── apps.py
    │   ├── models.py
    │   ├── views.py
    │   ├── urls.py
    │   ├── serializers.py        # (if using DRF)
    │   ├── admin.py
    │   ├── migrations/
    │   └── tests/
    └── billing/
        └── ...
```

The `apps/` namespace + per-environment settings keeps prod/dev/test cleanly separated.

## Fat Models, Thin Views (Django doctrine)

Business logic lives on the model OR in a `services/` module (split when models grow). Views are thin: parse request → call model/service → render response.

```python
# ✅ Good — logic on model
class Invoice(models.Model):
    ...
    def mark_paid(self, paid_at: datetime, transaction_id: str):
        if self.status == "paid":
            raise InvoiceAlreadyPaidError(self.id)
        self.status = "paid"
        self.paid_at = paid_at
        self.transaction_id = transaction_id
        self.save(update_fields=["status", "paid_at", "transaction_id"])
        InvoicePaidEvent.fire(self)

# View just dispatches:
def mark_paid_view(request, invoice_id):
    invoice = get_object_or_404(Invoice, id=invoice_id)
    invoice.mark_paid(timezone.now(), request.POST["txn_id"])
    return redirect("invoice-detail", invoice_id)
```

When models exceed ~300 lines OR logic spans multiple models, extract a `services.py` module per app.

## QuerySet Performance (the N+1 trap)

Default Django ORM behavior triggers N+1 queries on related-field access. Use `select_related` (FK / 1-1) and `prefetch_related` (M2M / reverse FK):

```python
# ❌ N+1 — 1 query for invoices + N queries for customer
invoices = Invoice.objects.filter(status="open")
for inv in invoices:
    print(inv.customer.name)  # query per iteration

# ✅ 2 queries (SELECT invoice JOIN customer)
invoices = Invoice.objects.filter(status="open").select_related("customer")

# ✅ 2 queries (SELECT order, SELECT item WHERE order_id IN (...))
orders = Order.objects.prefetch_related("items").filter(date__gte=last_week)
```

Use `django-debug-toolbar` or `django-silk` in dev to surface N+1 patterns.

## Aggregations + Annotations

Push computation to the DB whenever possible:

```python
# ✅ DB does the work
from django.db.models import Count, Sum, Q
totals = User.objects.annotate(
    order_count=Count("orders"),
    revenue=Sum("orders__total", filter=Q(orders__status="paid")),
).filter(order_count__gt=0)

# ❌ Python does the work (slow for large querysets)
for user in User.objects.all():
    user.order_count = user.orders.count()
    user.revenue = sum(o.total for o in user.orders.filter(status="paid"))
```

## Class-Based vs Function-Based Views

- **Function-based** — simple, explicit, fewer abstractions. Use for unique endpoints.
- **Class-based** — when behavior is reusable (mixins) or follows a pattern (CRUD via generics).

```python
# Function-based — clear, no magic
def invoice_detail(request, invoice_id):
    invoice = get_object_or_404(Invoice, id=invoice_id)
    return render(request, "invoices/detail.html", {"invoice": invoice})

# Class-based — when reuse matters
class InvoiceDetailView(LoginRequiredMixin, DetailView):
    model = Invoice
    template_name = "invoices/detail.html"
    context_object_name = "invoice"
```

Default to function-based for new code; refactor to CBV when you find yourself copying the same view shape 3+ times.

## Migrations

- **Always** generate via `makemigrations`; never hand-write
- **Always** test migrations on a copy of prod data before deploying
- **Squash old migrations** periodically (`squashmigrations`) to keep `migrate` startup fast
- **Data migrations** (RunPython) — wrap in transactions; make them idempotent

## Anti-Patterns

- **Logic in templates** (Django Template Language is intentionally limited; move logic to view/model)
- **Raw SQL via `cursor.execute(f"... {input}")`** (SQL injection vector; use ORM or bind params)
- **Caching the entire QuerySet** (memory bomb; cache materialized lists with explicit pagination)
- **`get_or_create` in a tight loop** (race condition; use `bulk_create(..., ignore_conflicts=True)` or DB constraints)
- **Importing models across apps in circular patterns** (refactor via signals or services)
- **`DEBUG = True` in production** (info disclosure; check via deployment health endpoint)

## Reference

Django docs: <https://docs.djangoproject.com/en/stable/>
Django REST Framework: <https://www.django-rest-framework.org/>
