#!/usr/bin/env node
// detect-language.js — NEEWE UserPromptSubmit hook.
//
// The SessionStart hook can only fall back to the OS locale because at startup
// there is no user prompt to analyze. This hook closes that gap: it detects the
// user's language from their actual prompt and (a) persists it to
// state.locale.user_language and (b) injects a directive so the model addresses
// the user in their language while keeping all artifacts in English.
//
// Precedence (first wins):
//   1. settings.local.json#neewe.language  (explicit override — never re-detected)
//   2. state.locale already set by settings/user_pick/heuristic (sticky — no flip-flop)
//   3. heuristic on the current prompt (confidence >= 0.6)
//
// Defensive: never breaks the prompt. Any error → silent exit 0.

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_LOCALE = 'en-US';
const CONFIDENCE_MIN = 0.6;
const STICKY_SOURCES = ['settings', 'user_pick', 'heuristic'];

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; }
}

function emitDirective(locale) {
  const msg = `\n\n[neewe-i18n] Respond to the USER in \`${locale}\`. Produce ALL ARTIFACTS — code, identifiers, comments, commit messages, vault entries, ADRs, gate reports — in English regardless of user language.`;
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: msg }
  }));
}

function run(raw) {
  let payload = {};
  try { payload = JSON.parse(raw); } catch (_) {}
  const prompt = typeof payload.prompt === 'string' ? payload.prompt : '';

  // 1. Explicit override in settings.local.json
  const local = readJSON('.claude/settings.local.json');
  const override = local && local.neewe && local.neewe.language;
  if (override) {
    if (override !== DEFAULT_LOCALE) emitDirective(override);
    return;
  }

  const statePath = '.neewe/state.json';
  const state = readJSON(statePath);

  // 2. Sticky: a confident locale was already established — re-anchor, never re-detect.
  if (state && state.locale && state.locale.user_language &&
      STICKY_SOURCES.includes(state.locale.source)) {
    if (state.locale.user_language !== DEFAULT_LOCALE) emitDirective(state.locale.user_language);
    return;
  }

  // 3. Detect from the current prompt.
  const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.join(__dirname, '..');
  let det = null;
  try { det = require(path.join(PLUGIN_ROOT, 'i18n', 'detect.js')).detect(prompt); } catch (_) {}

  if (det && det.confidence >= CONFIDENCE_MIN) {
    const locale = det.locale;
    // Persist (best-effort) so future sessions and the dashboard/TUI agree.
    if (state) {
      state.locale = state.locale || {};
      if (state.locale.user_language !== locale || state.locale.source !== 'heuristic') {
        state.locale.user_language = locale;
        state.locale.source = 'heuristic';
        try { fs.writeFileSync(statePath, JSON.stringify(state, null, 2)); } catch (_) {}
      }
    }
    if (locale !== DEFAULT_LOCALE) emitDirective(locale);
  }
  // No confident detection → stay silent (model keeps prior behavior).
}

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (c) => (buf += c));
process.stdin.on('end', () => {
  try { run(buf); } catch (_) {}
  process.exit(0);
});
// No stdin (TTY) → nothing to do.
if (process.stdin.isTTY) process.exit(0);
