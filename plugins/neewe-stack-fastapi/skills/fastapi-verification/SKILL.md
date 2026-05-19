---
name: fastapi-verification
description: Use before claiming any FastAPI task DONE. Runs canonical pre-merge checks (ruff / pyright / pytest / bandit / pip-audit / openapi validation) and reports exit codes. Wires into NEEWE verifying-completion Iron Law — no DONE without just-run evidence in current message.
license: MIT
token_budget: frequent
---

# FastAPI Verification

NEEWE Iron Law: no DONE without exit-0 evidence shown in current message. This is the FastAPI checklist.

## The Pre-Merge Checklist

Run ALL and show output:

```bash
# 1. Lint (style + many anti-patterns)
ruff check .

# 2. Format check (separate from lint to avoid auto-fix churn)
ruff format --check .

# 3. Static type check (pyright is the default in this satellite; mypy alternative)
pyright

# 4. Tests pass
pytest -x --tb=short

# 5. Security audit (catches insecure patterns the linter misses)
bandit -r app/ -ll

# 6. Dependency CVE scan
pip-audit

# 7. OpenAPI schema valid (catches breaking API changes)
python -c "from app.main import app; import json; json.dumps(app.openapi())"
```

All seven exit 0 OR task is NOT DONE.

## Output Format (when reporting)

```
## FASTAPI_VERIFICATION

| Check | Command | Exit | Notes |
|---|---|---|---|
| Lint | `ruff check .` | 0 | clean |
| Format | `ruff format --check .` | 0 | clean |
| Types | `pyright` | 0 | 0 errors, 0 warnings |
| Tests | `pytest -x` | 0 | 124 passed |
| Security | `bandit -r app/ -ll` | 0 | no HIGH/MED findings |
| Deps | `pip-audit` | 0 | no known CVEs |
| OpenAPI | (python schema gen) | 0 | schema valid |

VERIFIED. Ready for governance-tech-lead.
```

Non-zero on ANY → do NOT claim DONE. Report the failure and the fix.

## Per-Check Notes

### `ruff check`

- Fast — typically <1s for small projects
- Configure in `pyproject.toml [tool.ruff]` — recommended ruleset: `E, F, I, B, UP, ASYNC, S` (style + bugbear + isort + pyupgrade + async + security)
- Don't auto-fix without reviewing diff — `ruff check --fix` can mangle in edge cases (especially ASYNC rules)

### `ruff format --check`

- Separate from lint to avoid auto-fix churn during dev
- Equivalent to `black --check` but ~10× faster
- If failing: run `ruff format .` to fix in-place, review diff, commit

### `pyright`

- Pyright (Pylance) is the recommended static type checker for FastAPI projects (faster than mypy, better Pydantic v2 support)
- Configure in `pyrightconfig.json` or `pyproject.toml [tool.pyright]`
- `reportMissingImports`, `reportUndefinedVariable` — errors, must be 0
- `strict` mode for new code; gradual adoption for legacy

### `pytest`

- `-x` exits on first failure (fast feedback)
- `--tb=short` for compact tracebacks
- Use `pytest -n auto` (pytest-xdist) for parallel runs in CI
- Coverage: `pytest --cov=app --cov-report=term-missing`; aim for behavioral coverage, not raw %

### `bandit`

- `-ll` = report only MEDIUM and HIGH severity (LOW is noisy)
- `-r app/` = recursive scan of app code only (not tests, not deps)
- Common HIGH findings worth listening to: SQL injection patterns, hardcoded secrets, `pickle.loads` on untrusted data, weak crypto (MD5/SHA1 for passwords)

### `pip-audit`

- Scans installed packages against the OSV vulnerability database
- Updates needed when new CVE published; run weekly
- Pin versions in `requirements.txt` / `pyproject.toml` to make this reproducible

### OpenAPI Schema Validation

- Generates the OpenAPI schema from FastAPI route definitions
- Catches: type errors in Pydantic models, broken `Depends()` chains, missing tags
- Optional: diff against a checked-in `openapi.json` to detect breaking API changes (use `openapi-diff` or similar)

## When This Fires

- Locally before commit (`pre-commit` hook if you set it up)
- In CI on every PR
- Before invoking `governance-release` for a FastAPI project

## What NOT to Skip

| Excuse | Reality |
|---|---|
| "Just a small change; skip pyright" | Pyright catches breaking changes fast; takes seconds |
| "bandit is too strict" | Configure `# nosec` per-line with rationale; don't disable entirely |
| "Pin versions in CI; pip-audit unnecessary" | New CVEs land daily; weekly scan catches what pin doesn't |

## Pair With

- `verifying-completion` (neewe-core) — universal Iron Law
- `governance-release` (neewe-core) — final gate
- `governance-cso` (neewe-core) — periodic deep audit
