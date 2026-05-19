#!/usr/bin/env node
// NEEWE TUI entrypoint. Renders the Shell with the 7-step user flow.
// Reads .neewe/state.json from CWD (the project the user invoked us from).

import React, { useState, useEffect } from 'react';
import { render, Box, Text, useApp, useInput } from 'ink';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync as fsReadFileSync, writeFileSync as fsWriteFileSync } from 'node:fs';

import { theme, glyph } from './theme.js';
import { readState, costSummary, currentStageIndex, watchFile } from './state.js';
import {
  Header, StageStepper, StagePane, CostMeter, EventStream,
  StatusBar, CommandPalette, WelcomeScreen, Loading
} from './components.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = join(__dirname, '..');

// Inline i18n loader (zero deps; mirrors i18n/t.js)
const STRINGS = JSON.parse(fsReadFileSync(join(PLUGIN_ROOT, 'i18n', 'strings.json'), 'utf8'));
const SUPPORTED_LOCALES = STRINGS._meta.supported_locales;
const DEFAULT_LOCALE = STRINGS._meta.default_locale;

function t(key, locale, vars) {
  const loc = locale || DEFAULT_LOCALE;
  const chain = (STRINGS._meta.fallback_chain || {})[loc] || [loc, DEFAULT_LOCALE];
  for (const l of chain) {
    const bag = STRINGS[l];
    if (bag && bag[key] != null) {
      const v = bag[key];
      if (vars && typeof v === 'string') {
        return v.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
      }
      return v;
    }
  }
  return key;
}

const h = React.createElement;

const COMMANDS = [
  { label: 'Start project (stage 1)',       value: 'start' },
  { label: 'Ground / discovery (stage 2)',  value: 'ground' },
  { label: 'Plan / architecture (stage 3)', value: 'plan' },
  { label: 'Dispatch squad (stage 4)',      value: 'dispatch' },
  { label: 'Orchestrate (stage 5)',         value: 'orchestrate' },
  { label: 'Code / goal mode (stage 6)',    value: 'code' },
  { label: 'Finish / release (stage 7)',    value: 'finish' },
  { label: 'Show state',                    value: 'show' },
  { label: 'Open dashboard',                value: 'dashboard' },
  { label: 'Generate replay HTML',          value: 'replay' },
  { label: 'Save current squad',            value: 'squad-save' },
  { label: 'Quit',                          value: 'quit' }
];

function Shell({ initialState, initialLocale }) {
  const { exit } = useApp();
  const [state, setState] = useState(initialState);
  const [locale, setLocale] = useState(initialLocale);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(!initialState || !state?.locale?.user_language);

  // Keyboard
  useInput((input, key) => {
    if (paletteOpen || welcomeOpen) return;
    if (key.ctrl && input === 'p') setPaletteOpen(true);
    if (input === '?') setPaletteOpen(true);
    if (input === 'q') exit();
  });

  // Live state refresh — watch .neewe/state.json
  useEffect(() => {
    const stop = watchFile('.neewe/state.json', () => {
      const next = readState();
      if (next) {
        setState(next);
        if (next.locale && next.locale.user_language) setLocale(next.locale.user_language);
      }
    }, 250);
    return stop;
  }, []);

  const stages = SUPPORTED_LOCALES.includes(locale)
    ? [1, 2, 3, 4, 5, 6, 7].map((i) => t(`stage.${i}.label`, locale))
    : ['Initial', 'Ground', 'Plan', 'Dispatch', 'Orchestrate', 'Code', 'Finish'];

  const stageIndex = currentStageIndex(state);
  const cost = costSummary(state);
  const mode = (state && state.mode) || '—';
  const permission = (state && state.permission_mode) || '—';

  if (welcomeOpen) {
    return h(Box, { flexDirection: 'column', minHeight: 20 },
      h(WelcomeScreen, {
        detectedLocale: locale,
        locales: SUPPORTED_LOCALES,
        t,
        onPick: (picked) => {
          setLocale(picked);
          setWelcomeOpen(false);
          // Persist to .neewe/state.json (best-effort, never crash the TUI)
          try {
            if (existsSync('.neewe/state.json')) {
              const s = JSON.parse(fsReadFileSync('.neewe/state.json', 'utf8'));
              s.locale = s.locale || {};
              s.locale.user_language = picked;
              s.locale.source = 'user_pick';
              fsWriteFileSync('.neewe/state.json', JSON.stringify(s, null, 2));
            }
          } catch {}
        }
      })
    );
  }

  return h(Box, { flexDirection: 'column' },
    h(Header, { locale, mode, permission }),
    h(StageStepper, { stages, activeIndex: stageIndex }),
    h(Box, { flexDirection: 'row', marginTop: 0 },
      h(Box, { flexDirection: 'column', flexGrow: 1 },
        h(StagePane, { stageIndex, t, locale, state })
      ),
      h(Box, { flexDirection: 'column', marginLeft: 1 },
        h(CostMeter, { ...cost, t, locale }),
        h(Box, { marginTop: 0 }),
        h(EventStream, { height: 8 })
      )
    ),
    paletteOpen
      ? h(Box, { marginTop: 0 },
          h(CommandPalette, {
            commands: COMMANDS,
            onSelect: (val) => {
              setPaletteOpen(false);
              runCommand(val, exit);
            },
            onClose: () => setPaletteOpen(false)
          })
        )
      : null,
    h(StatusBar, {
      shortcuts: [
        { key: 'Ctrl-P', label: 'palette' },
        { key: '?', label: 'help' },
        { key: 'q', label: 'quit' }
      ]
    })
  );
}

function runCommand(cmd, exit) {
  if (cmd === 'quit') { exit(); return; }
  const NEEWE = join(PLUGIN_ROOT, 'bin', 'neewe');
  const map = {
    start: ['init'],
    ground: ['set-phase', 'discovery'],
    plan: ['set-phase', 'planning'],
    dispatch: ['set-phase', 'dispatch'],
    orchestrate: ['set-phase', 'orchestration'],
    code: ['set-phase', 'execution'],
    finish: ['set-phase', 'release'],
    show: ['show'],
    dashboard: null,  // handled below via bin/neewe-dashboard
    replay: null,     // bin/neewe-replay
    'squad-save': null
  };
  try {
    if (cmd === 'dashboard') {
      spawnSync('bash', [join(PLUGIN_ROOT, 'bin', 'neewe-dashboard'), 'token'], { stdio: 'inherit' });
    } else if (cmd === 'replay') {
      spawnSync('bash', [join(PLUGIN_ROOT, 'bin', 'neewe-replay')], { stdio: 'inherit' });
    } else if (cmd === 'squad-save') {
      spawnSync('bash', [join(PLUGIN_ROOT, 'bin', 'neewe-squad'), 'save', 'unnamed'], { stdio: 'inherit' });
    } else {
      const args = map[cmd];
      if (args) spawnSync('bash', [NEEWE, ...args], { stdio: 'inherit' });
    }
  } catch {}
}

// ── Bootstrap ─────────────────────────────────────────────────────────────
function bootstrap() {
  const state = readState();
  const initialLocale = (state && state.locale && state.locale.user_language) || DEFAULT_LOCALE;

  // Render the Shell
  const { waitUntilExit } = render(h(Shell, { initialState: state, initialLocale }));
  waitUntilExit().then(() => process.exit(0));
}

bootstrap();
