# neewe-stack-fastapi

NEEWE stack-flavor satellite for **FastAPI** (async Python).

**Depends on:** `neewe-core@>=0.5.0`

## What this adds

- `.lsp.json` — pyright for live type-check + import navigation
- `monitors/monitors.json` — tails uvicorn logs + last pytest failure
- 5 skills (fastapi-patterns / fastapi-testing / fastapi-security / fastapi-tdd / fastapi-verification)

## Install

```
/plugin install neewe-stack-fastapi@neewe
```

## Auto-activates when

- Project has `fastapi` in `requirements.txt`, `pyproject.toml`, or `Pipfile`
- `neewe-squad-composer` detects and recommends loading
