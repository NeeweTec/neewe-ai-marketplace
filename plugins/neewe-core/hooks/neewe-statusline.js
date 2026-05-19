#!/usr/bin/env node
/**
 * neewe-statusline.js — writes context % to bridge file (Sprint 5 wave 2)
 *
 * Wired as a statusline command in settings.json. Runs on every prompt to refresh
 * the bridge file at /tmp/neewe-ctx-<session_id>.json (or %TEMP%\... on Windows).
 *
 * The bridge file is then read by neewe-context-monitor.js (PostToolUse) which
 * injects WARNING/CRITICAL warnings into the agent's context at 35% / 25% remaining.
 *
 * Pattern lifted verbatim from GSD (gsd-statusline.js + gsd-context-monitor.js)
 * with NEEWE adaptations (bridge file path, neewe-prefixed identifiers).
 *
 * Statusline contract: read JSON from stdin (Claude Code provides session metadata
 * incl. context window utilization), print one-line summary to stdout (rendered
 * in the user's status bar).
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function getTempDir() {
  if (process.platform === 'win32') {
    return process.env.TEMP || process.env.TMP || 'C:\\Windows\\Temp';
  }
  return process.env.TMPDIR || '/tmp';
}

function sanitizeSessionId(id) {
  // Path-traversal guard. Allow only alphanumeric + hyphen + underscore.
  if (typeof id !== 'string') return 'unknown';
  return id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'unknown';
}

async function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    let timer = setTimeout(() => { resolve(''); }, 1000); // 1s safety
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('end', () => { clearTimeout(timer); resolve(data); });
    process.stdin.on('error', () => { clearTimeout(timer); resolve(''); });
  });
}

async function main() {
  let input;
  try {
    const raw = await readStdin();
    input = raw ? JSON.parse(raw) : {};
  } catch (_) {
    input = {};
  }

  const sessionId = sanitizeSessionId(input.session_id || input.sessionId || '');
  // Claude Code provides context info under different paths depending on version.
  const ctxPct = (input.context_window_pct_used != null) ? input.context_window_pct_used
    : (input.context && input.context.pct_used != null) ? input.context.pct_used
    : null;
  const ctxRemaining = (ctxPct != null) ? (100 - ctxPct) : null;
  const tokensUsed = input.tokens_used || (input.context && input.context.tokens_used) || null;
  const tokensTotal = input.tokens_total || (input.context && input.context.tokens_total) || null;

  // Write bridge file (only if we have meaningful data).
  const bridgePath = path.join(getTempDir(), `neewe-ctx-${sessionId}.json`);
  if (ctxRemaining != null) {
    const payload = {
      session_id: sessionId,
      ts: new Date().toISOString(),
      pct_used: ctxPct,
      pct_remaining: ctxRemaining,
      tokens_used: tokensUsed,
      tokens_total: tokensTotal,
    };
    try {
      fs.writeFileSync(bridgePath, JSON.stringify(payload), { mode: 0o600 });
    } catch (_) { /* silent; statusline must never break */ }
  }

  // Try to read .neewe/state.json for phase + mode + cost (statusline display).
  let phase = '', mode = '', spent = '', cap = '', model = '';
  try {
    const state = JSON.parse(fs.readFileSync('.neewe/state.json', 'utf8'));
    phase = state.phase || '';
    mode = state.mode || '';
    spent = (state.cost_budget?.spent_usd ?? 0).toFixed(2);
    cap = (state.cost_budget?.cap_usd ?? 0).toFixed(2);
    model = state.model_routing?.main || '';
  } catch (_) { /* no state file; skip */ }

  // Compose statusline (target: <120 chars; clean on narrow terminals).
  const parts = [];
  if (phase) parts.push(`[${phase}]`);
  if (mode && model) parts.push(`${mode}:${model}`);
  if (ctxRemaining != null) {
    const ctxLabel = ctxRemaining <= 25 ? `⚠ctx ${ctxRemaining.toFixed(0)}%`
                   : ctxRemaining <= 35 ? `ctx ${ctxRemaining.toFixed(0)}%`
                   : `ctx ${ctxRemaining.toFixed(0)}%`;
    parts.push(ctxLabel);
  }
  if (cap && spent) parts.push(`$${spent}/$${cap}`);

  process.stdout.write(parts.length ? parts.join(' | ') : 'neewe ready');
  process.exit(0);
}

main().catch(() => { process.exit(0); });
