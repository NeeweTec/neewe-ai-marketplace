// NEEWE TUI components. ESM JS using React.createElement (h) — no JSX transpile.
// Single-file to keep things lean.

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { theme, glyph } from './theme.js';
import { readState, readEventLog, costSummary, currentStageIndex, watchFile } from './state.js';

const h = React.createElement;

// ── Header ──────────────────────────────────────────────────────────────────
export function Header({ locale, mode, permission }) {
  return h(Box, {
    borderStyle: 'round',
    borderColor: theme.border.default,
    paddingX: 2,
    justifyContent: 'space-between'
  },
    h(Box, null,
      h(Text, { color: theme.accent.primary, bold: true }, 'NEEWE'),
      h(Text, { color: theme.text.dim }, '  '),
      h(Text, { color: theme.text.secondary }, 'Opus plans · Sonnet executes')
    ),
    h(Box, null,
      h(Text, { color: theme.text.dim }, `${locale}`),
      h(Text, { color: theme.text.muted }, '  ·  '),
      h(Text, { color: theme.status.info }, `${mode}`),
      h(Text, { color: theme.text.muted }, '  ·  '),
      h(Text, { color: theme.status.muted }, `${permission}`)
    )
  );
}

// ── Stage stepper ───────────────────────────────────────────────────────────
export function StageStepper({ stages, activeIndex }) {
  // Renders: ●  Initial  →  ◉  Ground  →  ○  Plan  ...
  const items = [];
  stages.forEach((label, i) => {
    let dot = glyph.dotPending;
    let color = theme.stage.pending;
    if (i < activeIndex) { dot = glyph.dotDone; color = theme.stage.done; }
    if (i === activeIndex) { dot = glyph.dotActive; color = theme.stage.active; }
    items.push(
      h(Box, { key: `s${i}`, flexDirection: 'column', alignItems: 'center', marginRight: 1 },
        h(Text, { color }, dot),
        h(Text, { color: i === activeIndex ? theme.text.primary : theme.text.dim }, label)
      )
    );
    if (i < stages.length - 1) {
      items.push(h(Text, { key: `a${i}`, color: theme.text.muted }, ` ${glyph.arrow} `));
    }
  });
  return h(Box, {
    borderStyle: 'single',
    borderColor: theme.border.subtle,
    paddingX: 2,
    paddingY: 0,
    justifyContent: 'center'
  }, ...items);
}

// ── Stage pane (main content area for the active stage) ─────────────────────
export function StagePane({ stageIndex, t, locale, state }) {
  const label = t(`stage.${stageIndex + 1}.label`, locale);
  const hint = t(`stage.${stageIndex + 1}.hint`, locale);
  const cta = t(`stage.${stageIndex + 1}.cta`, locale);

  return h(Box, {
    flexDirection: 'column',
    borderStyle: 'round',
    borderColor: theme.border.default,
    padding: 2,
    flexGrow: 1
  },
    h(Text, { color: theme.text.dim }, `STAGE ${stageIndex + 1} / 7`),
    h(Box, { marginTop: 1 }),
    h(Text, { color: theme.accent.primary, bold: true }, label),
    h(Box, { marginTop: 1 }),
    h(Text, { color: theme.text.secondary }, hint),
    h(Box, { marginTop: 2 }),
    h(Box, { borderStyle: 'single', borderColor: theme.accent.primarySoft, paddingX: 2 },
      h(Text, { color: theme.accent.primary, bold: true }, `${glyph.arrow} ${cta}`)
    ),
    state && state.active_goal
      ? h(Box, { marginTop: 2, flexDirection: 'column' },
          h(Text, { color: theme.text.dim }, 'ACTIVE GOAL'),
          h(Text, { color: theme.text.primary }, state.active_goal)
        )
      : null
  );
}

// ── Cost meter ──────────────────────────────────────────────────────────────
export function CostMeter({ spent, cap, pct, t, locale }) {
  const width = 28;
  const filled = Math.min(width, Math.floor((pct / 100) * width));
  const empty = width - filled;
  let color = theme.status.ok;
  if (pct >= 50) color = theme.status.warn;
  if (pct >= 80) color = theme.status.crit;

  return h(Box, {
    flexDirection: 'column',
    borderStyle: 'round',
    borderColor: theme.border.default,
    paddingX: 2,
    paddingY: 0,
    width: 36
  },
    h(Text, { color: theme.text.dim }, t('cost.label', locale).toUpperCase()),
    h(Box, { marginTop: 0 },
      h(Text, { color: theme.text.primary, bold: true },
        `$${spent.toFixed(2)}`
      ),
      h(Text, { color: theme.text.muted }, ` / $${cap.toFixed(2)}`)
    ),
    h(Box, { marginTop: 1 },
      h(Text, { color }, '█'.repeat(filled)),
      h(Text, { color: theme.text.muted }, '░'.repeat(empty))
    ),
    h(Text, { color }, `${pct.toFixed(1)}% ${pct >= 80 ? t('cost.critical', locale) : pct >= 50 ? t('cost.warning', locale) : ''}`)
  );
}

// ── Event stream (tails vault/log.md) ───────────────────────────────────────
export function EventStream({ height = 8 }) {
  const [events, setEvents] = useState(() => readEventLog(height));
  useEffect(() => {
    const stop = watchFile('vault/log.md', () => setEvents(readEventLog(height)), 300);
    return stop;
  }, [height]);

  const rows = events.slice(0, height).map((e, i) =>
    h(Box, { key: i, flexDirection: 'row' },
      h(Text, { color: theme.text.muted }, `${e.ts || '·'.padEnd(10)} `),
      h(Text, { color: theme.status.info }, `${(e.type || '').padEnd(16)} `),
      h(Text, { color: theme.text.secondary }, e.subject || '')
    )
  );

  return h(Box, {
    flexDirection: 'column',
    borderStyle: 'round',
    borderColor: theme.border.default,
    paddingX: 2,
    paddingY: 0,
    flexGrow: 1
  },
    h(Text, { color: theme.text.dim }, 'EVENTS'),
    ...rows,
    events.length === 0 ? h(Text, { color: theme.text.muted }, 'no events yet') : null
  );
}

// ── Status bar ──────────────────────────────────────────────────────────────
export function StatusBar({ shortcuts }) {
  return h(Box, {
    paddingX: 1,
    justifyContent: 'space-between',
    borderStyle: 'single',
    borderColor: theme.border.subtle
  },
    h(Box, null,
      ...shortcuts.map((s, i) =>
        h(Box, { key: i, marginRight: 2 },
          h(Text, { color: theme.accent.primary }, s.key),
          h(Text, { color: theme.text.dim }, ` ${s.label}`)
        )
      )
    ),
    h(Text, { color: theme.text.muted }, 'NEEWE v0.9.0')
  );
}

// ── Command palette (Ctrl-P) ────────────────────────────────────────────────
export function CommandPalette({ commands, onSelect, onClose }) {
  const [query, setQuery] = useState('');
  useInput((input, key) => {
    if (key.escape) onClose();
  });
  const items = useMemo(() => {
    const q = query.toLowerCase();
    return commands
      .filter((c) => c.label.toLowerCase().includes(q) || c.value.toLowerCase().includes(q))
      .slice(0, 8)
      .map((c) => ({ label: c.label, value: c.value }));
  }, [query, commands]);

  return h(Box, {
    flexDirection: 'column',
    borderStyle: 'double',
    borderColor: theme.accent.primary,
    paddingX: 2,
    paddingY: 1,
    width: 60
  },
    h(Text, { color: theme.accent.primary, bold: true }, 'Command Palette'),
    h(Box, { marginTop: 1 },
      h(Text, { color: theme.text.dim }, '› '),
      h(TextInput, { value: query, onChange: setQuery, focus: true })
    ),
    h(Box, { marginTop: 1 },
      h(SelectInput, { items, onSelect: (item) => onSelect(item.value) })
    ),
    h(Box, { marginTop: 1 },
      h(Text, { color: theme.text.muted }, 'Esc to close · Enter to run')
    )
  );
}

// ── Welcome screen ──────────────────────────────────────────────────────────
export function WelcomeScreen({ detectedLocale, locales, t, onPick }) {
  const items = locales.map((l) => ({ label: l === 'pt-BR' ? 'Português (Brasil)' : 'English (US)', value: l }));
  return h(Box, { flexDirection: 'column', padding: 2, alignItems: 'center' },
    h(Text, { color: theme.accent.primary, bold: true }, t('welcome.title', detectedLocale)),
    h(Box, { marginTop: 1 }),
    h(Text, { color: theme.text.secondary }, t('welcome.subtitle', detectedLocale)),
    h(Box, { marginTop: 2 }),
    h(Text, { color: theme.text.dim }, t('welcome.confirm', detectedLocale, { locale: detectedLocale })),
    h(Box, { marginTop: 1 },
      h(SelectInput, { items, onSelect: (item) => onPick(item.value), initialIndex: locales.indexOf(detectedLocale) })
    ),
    h(Box, { marginTop: 2 }),
    h(Text, { color: theme.text.muted }, t('welcome.next', detectedLocale))
  );
}

// ── Loading spinner ─────────────────────────────────────────────────────────
export function Loading({ label = 'loading…' }) {
  return h(Box, null,
    h(Text, { color: theme.accent.primary }, h(Spinner, { type: 'dots' })),
    h(Text, { color: theme.text.dim }, ` ${label}`)
  );
}
