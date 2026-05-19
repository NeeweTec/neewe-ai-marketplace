# neewe-stack-django

NEEWE stack-flavor satellite for **Django** (4.2 LTS / 5.x).

**Depends on:** `neewe-core@>=0.5.0`

## What this adds

- `.lsp.json` — pyright with django-stubs support
- `monitors/monitors.json` — tails runserver log
- 5 skills: django-patterns / -testing / -security / -tdd / -verification

## Install

```
/plugin install neewe-stack-django@neewe
```

## Auto-activates when

- Project has `django` in dependencies
- `manage.py` in project root
