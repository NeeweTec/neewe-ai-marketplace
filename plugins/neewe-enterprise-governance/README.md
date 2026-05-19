# neewe-enterprise-governance

NEEWE **Enterprise Governance Overlay** — hardened defaults for regulated environments.

**Depends on:** `neewe-core@>=0.5.0`

## What this plugin does

Layers strict policies on top of `neewe-core`:

| Policy | Source | Effect |
|---|---|---|
| `strictKnownMarketplaces` | settings.json | Lock to approved marketplaces only — block community marketplace installs |
| `allowManagedHooksOnly` | settings.json | Refuse user/project hooks; only enterprise-managed hooks fire |
| `allowManagedMcpServersOnly` | settings.json | Same for MCP servers |
| `allowManagedPermissionRulesOnly` | settings.json | Project-level allow/ask/deny rules cannot widen the managed allow-list |
| `disableBypassPermissionsMode` | settings.json | `--dangerously-skip-permissions` refused |
| `disableAutoMode` | settings.json | Auto mode refused (manual permission acceptance required) |
| Audit hook | hooks.json (ConfigChange) | Every settings mutation logged to `.neewe/audit.log` (JSONL) |
| Hook profile | state.json | Forces `hook_profile: strict` (no override) |
| Provenance trailers | governance-release overlay | Every commit/PR carries plan/spec/decision/squad citations (EP-OPUS-12) |

## Install

```
/plugin install neewe-enterprise-governance@neewe
```

After install, **restart Claude Code session** to apply managed settings.

## Compliance Profiles (post-install configuration)

In your project's `.claude/managed-settings.json` (root-only; not under user `.claude/`), add the compliance profile:

```jsonc
{
  // ... NEEWE core managed settings ...
  "neewe": {
    "compliance_profile": "lgpd"  // or "soc2", "hipaa", "pci", "custom"
  }
}
```

Each profile maps to additional skill auto-loads + permission policies. See `scripts/profiles/*.json` in this plugin.

## Audit Log Format

`.neewe/audit.log` is append-only JSONL. Each entry:

```json
{
  "ts": "2026-05-19T14:23:11Z",
  "session_id": "<sid>",
  "event": "config_change",
  "source": "user_settings | project_settings | local_settings | policy_settings | skills",
  "actor": "<user-id or 'agent'>",
  "file_path": ".claude/settings.local.json",
  "change_summary": "added permissions.allow rule: Bash(docker *)"
}
```

Send this log to your SIEM via your normal log shipping (fluentd, vector, etc.).

## Provenance Bonds (EP-OPUS-12)

This plugin extends `governance-release` (from neewe-core) to require provenance trailers on every commit. Format:

```
feat(auth): add 2FA endpoint

Implements /auth/2fa per spec .neewe/vault/specs/02-PL-auth.md#L43-L88
Decision basis: .neewe/vault/decisions/use-totp-not-sms.md
Squad: squad-auth-v2 (members: governance-tech-lead, executor-be, governance-qa)
Plan: .neewe/planning/plans/02-auth-2fa-2026-05-19.md
Gate verdicts: .neewe/gates/02/{qa,tech-lead,po}.json
Cost: $0.31, Duration: 4m22s, Wave: 2

NEEWE-version: 0.6.0
Co-Authored-By: NEEWE Agent <neewe@noreply>
```

`governance-release` (in enterprise mode) refuses to ship without these trailers.

## What this plugin does NOT do

- Encrypt your data (use disk/transport encryption separately)
- Run vulnerability scans (use `governance-cso` from neewe-core)
- Replace your existing IAM (works alongside)
- Audit cost beyond NEEWE's own approximate tracker (reconcile with `/usage`)

## Enterprise Support

For installation onto regulated infrastructure (CI runners, DevContainers, fleet management), see the **`CLAUDE_CODE_PLUGIN_SEED_DIR`** pattern documented at `docs/CATALOG-IMPORTS.md` in the source repo.
