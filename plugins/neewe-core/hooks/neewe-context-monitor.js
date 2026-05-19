#!/usr/bin/env node
/**
 * neewe-context-monitor.js — PostToolUse hook that injects context warnings
 * into the AGENT's context (not just the user's statusline).
 *
 * Reads the bridge file written by neewe-statusline.js
 * (/tmp/neewe-ctx-<session_id>.json) and, at threshold breaches, emits
 * additionalContext blocks via hookSpecificOutput JSON.
 *
 * Thresholds (lifted from GSD):
 *   ≥ 35% remaining → no warning (silent)
 *   < 35% remaining → WARNING ("wrap up current task; avoid starting new complex work")
 *   < 25% remaining → CRITICAL ("stop immediately; save state; run /context-save")
 *
 * Engineering details (also from GSD analysis):
 * - 10s stdin timeout (Windows pipe safety)
 * - Stale-metric rejection (bridge file >60s old → skip — statusline didn't refresh)
 * - Path-traversal guard on session_id (sanitized to alnum/hyphen/underscore)
 * - Debounce: same-severity warning fires at most once per 5 tool uses
 * - Severity escalation BYPASSES debounce (WARN → CRITICAL emits immediately)
 * - Silent exit on any error — never breaks the agent
 *
 * Currently, agents have NO awareness of context limits. The statusline only
 * shows the user. This hook closes that gap.
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
  if (typeof id !== 'string') return 'unknown';
  return id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'unknown';
}

function readStdinSync() {
  // 10s timeout — safety on Windows where stdin may hang if not properly piped.
  try {
    const data = fs.readFileSync(0, 'utf8');
    return data;
  } catch (_) {
    return '';
  }
}

function emitEmpty() {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: '',
    },
  }));
  process.exit(0);
}

function debounceFile(sessionId) {
  return path.join(getTempDir(), `neewe-ctx-debounce-${sessionId}.json`);
}

function readDebounce(sessionId) {
  try {
    return JSON.parse(fs.readFileSync(debounceFile(sessionId), 'utf8'));
  } catch (_) {
    return { last_severity: 'none', count_since: 0 };
  }
}

function writeDebounce(sessionId, severity, count) {
  try {
    fs.writeFileSync(debounceFile(sessionId), JSON.stringify({
      last_severity: severity, count_since: count, ts: Date.now(),
    }), { mode: 0o600 });
  } catch (_) { /* silent */ }
}

function main() {
  let input;
  try {
    const raw = readStdinSync();
    input = raw ? JSON.parse(raw) : {};
  } catch (_) {
    emitEmpty();
    return;
  }

  const sessionId = sanitizeSessionId(input.session_id || input.sessionId || '');
  if (sessionId === 'unknown') { emitEmpty(); return; }

  // Read bridge file (written by neewe-statusline.js).
  const bridgePath = path.join(getTempDir(), `neewe-ctx-${sessionId}.json`);
  let bridge;
  try {
    bridge = JSON.parse(fs.readFileSync(bridgePath, 'utf8'));
  } catch (_) {
    emitEmpty(); return;
  }

  // Stale-metric rejection (>60s old → don't act on it; statusline hasn't refreshed).
  const ageMs = Date.now() - new Date(bridge.ts).getTime();
  if (!Number.isFinite(ageMs) || ageMs > 60_000) { emitEmpty(); return; }

  const pctRemaining = bridge.pct_remaining;
  if (typeof pctRemaining !== 'number') { emitEmpty(); return; }

  // Determine severity.
  let severity = 'none';
  if (pctRemaining < 25) severity = 'critical';
  else if (pctRemaining < 35) severity = 'warning';

  if (severity === 'none') { emitEmpty(); return; }

  // Debounce: same severity at most once per 5 tool uses; escalation bypasses.
  const debounce = readDebounce(sessionId);
  const isEscalation = (debounce.last_severity === 'warning' && severity === 'critical');
  const sameSeverity = debounce.last_severity === severity;
  if (sameSeverity && !isEscalation && debounce.count_since < 5) {
    writeDebounce(sessionId, severity, debounce.count_since + 1);
    emitEmpty(); return;
  }

  // Build the additionalContext message.
  let message;
  if (severity === 'critical') {
    message = `\n\n---\n\n## ⚠ NEEWE Context CRITICAL\n\n- **Context remaining:** ${pctRemaining.toFixed(0)}% (below 25% threshold)\n- **Action:** STOP starting new complex work. Save current state. Run \`/context-save\` to snapshot. Then \`/clear\` and \`/context-restore\` to continue with full window.\n- **Bridge file:** ${bridgePath}\n`;
  } else {
    message = `\n\n---\n\n## NEEWE Context Warning\n\n- **Context remaining:** ${pctRemaining.toFixed(0)}% (below 35% threshold)\n- **Action:** Wrap up the current task. Avoid starting new long-running work. Consider \`/context-save\` if you want to checkpoint.\n- **Bridge file:** ${bridgePath}\n`;
  }

  writeDebounce(sessionId, severity, 0);

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: message,
    },
  }));
  process.exit(0);
}

try { main(); } catch (_) { emitEmpty(); }
