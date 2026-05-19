---
name: django-verification
description: Use before claiming any Django task DONE. Runs canonical pre-merge (ruff / pyright / pytest / manage.py check --deploy / bandit / pip-audit / migration sanity check) and reports exit codes. Wires into NEEWE verifying-completion Iron Law.
license: MIT
token_budget: frequent
---

# Django Verification

NEEWE Iron Law: no DONE without exit-0 evidence shown in current message.

## The Pre-Merge Checklist

```bash
# 1. Lint
ruff check .

# 2. Format check
ruff format --check .

# 3. Static type check
pyright

# 4. Django config audit (catches prod-readiness issues)
python manage.py check --deploy --fail-level WARNING

# 5. Migrations consistent with models (catches forgotten makemigrations)
python manage.py makemigrations --check --dry-run

# 6. Tests pass
pytest -x --tb=short

# 7. Security audit
bandit -r apps/ -ll

# 8. Dependency CVE scan
pip-audit
```

All eight exit 0 OR task is NOT DONE.

## Output Format

```
## DJANGO_VERIFICATION

| Check | Command | Exit | Notes |
|---|---|---|---|
| Lint | `ruff check .` | 0 | clean |
| Format | `ruff format --check .` | 0 | clean |
| Types | `pyright` | 0 | clean |
| Deploy check | `manage.py check --deploy` | 0 | no SECURITY warnings |
| Migrations | `makemigrations --check` | 0 | no pending |
| Tests | `pytest -x` | 0 | 156 passed |
| Security | `bandit -r apps/ -ll` | 0 | no HIGH/MED |
| Deps | `pip-audit` | 0 | no CVEs |

VERIFIED. Ready for governance-tech-lead.
```

## Per-Check Notes

### `manage.py check --deploy --fail-level WARNING`

This is the Django-specific high-value check. Catches:
- `DEBUG = True` in non-dev settings
- Missing `ALLOWED_HOSTS`
- Missing `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`
- Missing HSTS settings
- `SECRET_KEY` referenced from somewhere insecure

`--fail-level WARNING` makes warnings into failures (recommended for CI; default fails only on ERROR).

### `makemigrations --check --dry-run`

Detects model changes that haven't been captured in migrations. **Single most common Django dev mistake**: change a model, forget `makemigrations`, ship the code, DB doesn't match models, runtime errors.

`--check --dry-run` exits non-zero if migrations would be generated.

### `pytest`

- Use `pytest-django` (not `manage.py test`); better parallelism + fixtures
- `--reuse-db` keyword tip: test DB persists across runs (first run slow, subsequent fast)
- `-n auto` for parallel via `pytest-xdist`
- For coverage: `pytest --cov=apps --cov-report=term-missing`

### `bandit -r apps/ -ll`

- Recursive scan of app code only (not deps, not tests)
- `-ll` = MED + HIGH severity only (LOW is noisy)
- Django-specific patterns it catches: `mark_safe` with user input, `RawSQL` with f-strings, hardcoded passwords, weak crypto

### `pip-audit`

- Scans installed deps against OSV CVE database
- Output per-package CVE listing with severity
- Pin versions in `pyproject.toml` for reproducibility

### Migration Round-Trip Test (optional but recommended)

For high-stakes migrations:

```bash
# Apply forward
python manage.py migrate
# Roll back to previous
python manage.py migrate <app_name> <previous_migration_id>
# Apply forward again
python manage.py migrate
```

If any step fails, the migration is non-reversible — flag for review before deployment.

## What NOT to Skip

| Excuse | Reality |
|---|---|
| "Migrations are stable; skip the check" | `--check` takes <1s and catches the #1 Django dev mistake |
| "manage.py check is noisy" | Use `--fail-level WARNING` to focus on actionable items |
| "bandit gives false positives" | Per-line `# nosec` comments with rationale; don't disable globally |

## Pair With

- `verifying-completion` (neewe-core) — universal Iron Law
- `governance-release` (neewe-core) — final gate
- `governance-cso` (neewe-core) — periodic audit
