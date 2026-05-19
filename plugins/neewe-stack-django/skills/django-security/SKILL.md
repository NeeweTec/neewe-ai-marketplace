---
name: django-security
description: Use when adding auth, forms, ORM queries, file uploads, or any code touching trust boundaries in a Django app. Covers the Django security middleware stack, CSRF/XSS/SQL injection defaults, file-upload validation, and the canonical permission patterns. Pair with governance-cso for periodic audit.
license: MIT
token_budget: frequent
---

# Django Security

Django ships strong defaults. Most security bugs come from **circumventing** the defaults, not from Django itself.

## The Security Middleware Stack (don't disable these)

```python
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",      # HSTS, X-Content-Type, etc.
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",          # CSRF protection
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
```

**`@csrf_exempt` is a code smell.** If you need it (webhook from external service), document why and verify the request signature in the view.

## settings.py Production Hardening

```python
# Required in production
DEBUG = False
ALLOWED_HOSTS = ["app.example.com"]
SECRET_KEY = env("DJANGO_SECRET_KEY")          # ENV, never hardcoded
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")  # behind reverse proxy
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
X_FRAME_OPTIONS = "DENY"
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
```

Run `python manage.py check --deploy` — Django audits your settings for prod-readiness.

## SQL Injection — Stay With the ORM

```python
# ✅ safe — ORM parameterizes
User.objects.filter(email=user_email)

# ✅ safe — raw with placeholders
User.objects.raw("SELECT * FROM users WHERE email = %s", [user_email])

# ❌ catastrophic
User.objects.raw(f"SELECT * FROM users WHERE email = '{user_email}'")

# ❌ also catastrophic
cursor.execute(f"SELECT * FROM users WHERE email = '{user_email}'")
```

Never f-string user input into SQL. Period.

## XSS — Auto-Escaping is On (don't disable)

Templates auto-escape variables by default. `{% autoescape off %}` or `{{ x|safe }}` should be used only for trusted content (output of your own markdown renderer, e.g.).

```html
<!-- ✅ safe (auto-escaped) -->
<h1>{{ user.name }}</h1>

<!-- ❌ XSS vector if user_html is user-supplied -->
<div>{{ user_html|safe }}</div>
```

For rich-text user content: use a sanitizer (`bleach`) BEFORE saving, not at render time.

## CSRF — Default On, Verify on Webhooks

Forms via Django automatically include `{% csrf_token %}`. AJAX requests need the token in the `X-CSRFToken` header.

For webhook endpoints (external services posting to you), you can't have CSRF — but you MUST verify the request signature:

```python
@csrf_exempt
def stripe_webhook(request):
    signature = request.META.get("HTTP_STRIPE_SIGNATURE", "")
    try:
        event = stripe.Webhook.construct_event(
            request.body, signature, settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        return HttpResponse(status=400)
    # process event
```

## Authentication Patterns

```python
# Login required (function view)
from django.contrib.auth.decorators import login_required

@login_required
def my_view(request):
    return render(request, "private.html")

# Login required (class view)
from django.contrib.auth.mixins import LoginRequiredMixin

class MyView(LoginRequiredMixin, ListView):
    ...

# Permission required
from django.contrib.auth.decorators import permission_required

@permission_required("invoices.can_view_all", raise_exception=True)
def admin_invoices(request):
    ...
```

For row-level permissions (this user can view THIS object), check inside the view:

```python
def invoice_detail(request, invoice_id):
    invoice = get_object_or_404(Invoice, id=invoice_id)
    if invoice.customer != request.user:
        raise PermissionDenied
    return render(request, ...)
```

## File Uploads

```python
class UploadForm(forms.Form):
    file = forms.FileField()

    def clean_file(self):
        file = self.cleaned_data["file"]
        if file.size > 5 * 1024 * 1024:  # 5 MB
            raise ValidationError("file too large")
        if file.content_type not in {"image/jpeg", "image/png"}:
            raise ValidationError("invalid file type")
        # NOTE: content_type is client-supplied; for high-security validate magic bytes
        return file
```

**Storage:** `FileSystemStorage` (default) writes to MEDIA_ROOT. In production, use cloud storage (`django-storages` → S3 / GCS) to avoid coupling app servers to local disk.

**NEVER serve user uploads from your Django MEDIA_URL** — they can contain HTML/SVG → XSS. Serve via CDN with `Content-Disposition: attachment` or via a separate sandbox domain.

## Common Vulnerabilities (priority order)

1. **`DEBUG = True` in production** — leaks stack traces, env vars, settings
2. **Hardcoded `SECRET_KEY` in git** — session forgery, password reset bypass
3. **Raw SQL with f-strings** — injection
4. **`@csrf_exempt` without signature verification** — replay / forgery
5. **`get_object_or_404` without ownership check** — IDOR
6. **File uploads accepted without size/type validation** — DoS, malware
7. **No rate limit on auth endpoints** — credential stuffing
8. **`X_FRAME_OPTIONS` not set / disabled** — clickjacking

## Pair With

- `governance-cso` (neewe-core) — periodic deep audit (OWASP + Django-specific)
- `django-verification` — pre-merge runs `manage.py check --deploy` + bandit
