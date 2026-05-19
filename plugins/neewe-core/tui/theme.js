// NEEWE TUI design tokens. Linear/Vercel/Anthropic-inspired premium dark palette.
// All colors via chalk-compatible hex strings.

export const theme = {
  bg: {
    deep: '#06070A',
    surface: '#0E1014',
    elevated: '#161A21',
    overlay: '#1B2029'
  },
  border: {
    subtle: '#1F2530',
    default: '#2A3140',
    strong: '#3D4658'
  },
  text: {
    primary: '#E5E9F0',
    secondary: '#9AA3B2',
    dim: '#5C6471',
    muted: '#3D4452'
  },
  accent: {
    primary: '#F5A623',     // warm amber — single accent color
    primarySoft: '#7A5A2E',
    secondary: '#7B8CDE'
  },
  status: {
    ok: '#5DBA8E',
    warn: '#F5A623',
    crit: '#E26D6D',
    info: '#7B8CDE',
    muted: '#5C6471'
  },
  // Stage colors — subtle gradient from dim to accent as user progresses
  stage: {
    pending: '#3D4452',
    active: '#F5A623',
    done: '#5DBA8E'
  }
};

export const glyph = {
  // Box drawing
  hBar: '─',
  vBar: '│',
  cornerTL: '┌',
  cornerTR: '┐',
  cornerBL: '└',
  cornerBR: '┘',

  // Stepper
  dotPending: '○',
  dotActive: '●',
  dotDone: '◉',
  arrow: '→',

  // Status
  check: '✓',
  cross: '✗',
  warn: '⚠',
  info: 'ⓘ',
  bullet: '•',
  spinner: '⠋'
};
