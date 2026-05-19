#!/usr/bin/env node
// NEEWE i18n lookup. Zero deps. Used by TUI, dashboard server, hooks, and CLI.
//
// Public API:
//   t(key, locale?, vars?)                 → string (with fallback chain)
//   resolveLocale(opts?)                   → "pt-BR" | "en-US"
//   loadStrings()                          → raw object (cached)
//   listLocales()                          → ["en-US", "pt-BR"]
//
// CLI:
//   node t.js <key> [locale] [k=v ...]     → prints the resolved string

'use strict';

const fs = require('fs');
const path = require('path');

const STRINGS_PATH = path.join(__dirname, 'strings.json');

let cache = null;

function loadStrings() {
  if (cache) return cache;
  const raw = fs.readFileSync(STRINGS_PATH, 'utf8');
  cache = JSON.parse(raw);
  return cache;
}

function listLocales() {
  const s = loadStrings();
  return (s._meta && s._meta.supported_locales) || ['en-US'];
}

function defaultLocale() {
  const s = loadStrings();
  return (s._meta && s._meta.default_locale) || 'en-US';
}

function fallbackChain(locale) {
  const s = loadStrings();
  const chain = (s._meta && s._meta.fallback_chain && s._meta.fallback_chain[locale]) || null;
  if (chain) return chain;
  return [locale, defaultLocale()].filter((v, i, a) => a.indexOf(v) === i);
}

function interpolate(str, vars) {
  if (!vars || typeof str !== 'string') return str;
  return str.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
}

function t(key, locale, vars) {
  const s = loadStrings();
  const loc = locale || defaultLocale();
  const chain = fallbackChain(loc);
  for (const l of chain) {
    const bag = s[l];
    if (bag && bag[key] != null) return interpolate(bag[key], vars);
  }
  return key;
}

// Resolve user locale from (in order of precedence):
// 1. opts.override  (settings.json neewe.language)
// 2. opts.state     (state.json.locale.user_language)
// 3. opts.envLang   (OS $LANG / $LC_ALL)
// 4. default
function resolveLocale(opts) {
  opts = opts || {};
  const supported = listLocales();

  const normalize = (raw) => {
    if (!raw) return null;
    const s = String(raw).replace('_', '-');
    if (supported.includes(s)) return s;
    const short = s.split('-')[0].toLowerCase();
    const match = supported.find((l) => l.toLowerCase().startsWith(short + '-'));
    return match || null;
  };

  return (
    normalize(opts.override) ||
    normalize(opts.state) ||
    normalize(opts.envLang) ||
    defaultLocale()
  );
}

module.exports = { t, resolveLocale, loadStrings, listLocales, defaultLocale };

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('usage: t.js <key> [locale] [k=v ...]');
    process.exit(2);
  }
  const key = args[0];
  let locale = null;
  const vars = {};
  for (let i = 1; i < args.length; i++) {
    const a = args[i];
    if (a.includes('=')) {
      const [k, v] = a.split('=');
      vars[k] = v;
    } else if (!locale) {
      locale = a;
    }
  }
  process.stdout.write(t(key, locale, vars));
}
