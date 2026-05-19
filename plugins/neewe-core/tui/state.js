// State accessors for the TUI. Reads .neewe/state.json, .cost-log, vault/log.md.
// All paths resolved relative to process.cwd() (the project the TUI is launched in).

import { readFileSync, existsSync, watch, statSync } from 'node:fs';
import { join } from 'node:path';

const NEEWE_DIR = '.neewe';
const STATE_PATH = join(NEEWE_DIR, 'state.json');
const COST_LOG_PATH = join(NEEWE_DIR, '.cost-log');
const VAULT_LOG_PATH = 'vault/log.md';

export function readState() {
  if (!existsSync(STATE_PATH)) return null;
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  } catch {
    return null;
  }
}

export function readCostLog(limit = 200) {
  if (!existsSync(COST_LOG_PATH)) return [];
  try {
    const lines = readFileSync(COST_LOG_PATH, 'utf8').trim().split('\n').filter(Boolean);
    const tail = lines.slice(-limit);
    return tail.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch {
    return [];
  }
}

export function readEventLog(limit = 50) {
  if (!existsSync(VAULT_LOG_PATH)) return [];
  try {
    const raw = readFileSync(VAULT_LOG_PATH, 'utf8');
    // Event log entries are markdown headings: `## [date] type | subject`
    const lines = raw.split('\n').filter((l) => l.startsWith('## ['));
    return lines.slice(-limit).reverse().map(parseEventLine);
  } catch {
    return [];
  }
}

function parseEventLine(line) {
  // ## [2026-05-19] precompact-save | session=abc → file
  const m = line.match(/^##\s*\[([^\]]+)\]\s*(\S+)\s*\|?\s*(.*)$/);
  if (m) return { ts: m[1], type: m[2], subject: m[3] };
  return { ts: '', type: 'event', subject: line.replace(/^##\s*/, '') };
}

// fs.watch wrapper that calls cb() debounced when a file changes.
export function watchFile(filepath, cb, debounceMs = 250) {
  if (!existsSync(filepath)) return () => {};
  let timer = null;
  const watcher = watch(filepath, () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(cb, debounceMs);
  });
  return () => { if (timer) clearTimeout(timer); watcher.close(); };
}

// Build a 7-step stage map. Internal phase → external stage index.
export const STAGE_MAP = {
  init: 0, bootstrap: 0,
  discovery: 1,
  planning: 2,
  dispatch: 3, dispatching: 3,
  orchestration: 4, orchestrating: 4,
  execution: 5,
  verification: 6, review: 6, release: 6, retro: 6, finished: 6
};

export function currentStageIndex(state) {
  if (!state) return 0;
  const phase = String(state.phase || '').toLowerCase();
  return STAGE_MAP[phase] ?? 0;
}

export function costSummary(state) {
  const cb = (state && state.cost_budget) || {};
  const spent = Number(cb.spent_usd || 0);
  const cap = Number(cb.cap_usd || 0);
  const pct = cap > 0 ? (spent / cap) * 100 : 0;
  return { spent, cap, pct };
}
