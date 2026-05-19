#!/usr/bin/env node
// Lightweight language detector. PT-BR vs EN-US heuristic.
// Used by session-start hook to seed state.locale.user_language.
//
// Heuristic: count language-specific stop words and diacritics in the input.
// Returns { locale, confidence } where confidence is 0..1.
//
// CLI:
//   echo "olá tudo bem" | node detect.js   → {"locale":"pt-BR","confidence":0.83}
//
// Programmatic:
//   const { detect } = require('./detect');
//   detect("olá mundo")   → { locale: "pt-BR", confidence: ... }

'use strict';

const PT_STOPWORDS = [
  'o', 'a', 'os', 'as', 'um', 'uma', 'e', 'ou', 'mas', 'que', 'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas', 'por', 'para', 'com', 'sem', 'sobre', 'eu', 'voce', 'você',
  'ele', 'ela', 'nós', 'nos', 'eles', 'elas', 'meu', 'minha', 'seu', 'sua', 'nosso', 'nossa',
  'é', 'são', 'foi', 'ser', 'estar', 'está', 'estão', 'tem', 'têm', 'isso', 'isto', 'aquilo',
  'aqui', 'ali', 'lá', 'então', 'porque', 'agora', 'já', 'também', 'muito', 'pouco',
  'não', 'sim', 'preciso', 'quero', 'faça', 'vamos', 'vai', 'fazer', 'criar', 'usar',
  'olá', 'oi', 'tudo', 'bem', 'obrigado', 'obrigada'
];

const EN_STOPWORDS = [
  'the', 'a', 'an', 'and', 'or', 'but', 'that', 'of', 'in', 'on', 'at', 'to', 'for', 'with',
  'without', 'about', 'i', 'you', 'he', 'she', 'we', 'they', 'my', 'your', 'his', 'her',
  'our', 'their', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'this', 'that', 'these', 'those', 'here', 'there', 'now', 'then',
  'because', 'also', 'very', 'not', 'yes', 'need', 'want', 'make', 'create', 'use', 'let',
  'hello', 'hi', 'thanks', 'thank', 'please'
];

const PT_DIACRITICS = /[áàâãéêíóôõúüç]/i;
const PT_EXCLUSIVE_BIGRAMS = /\b(nh|lh|ção|ções|ões)\b|ção|ções|nh[aeiou]|lh[aeiou]/i;

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function detect(text) {
  const tokens = tokenize(text);
  if (tokens.length === 0) {
    return { locale: 'en-US', confidence: 0 };
  }

  let ptHits = 0;
  let enHits = 0;
  for (const tok of tokens) {
    if (PT_STOPWORDS.includes(tok)) ptHits++;
    if (EN_STOPWORDS.includes(tok)) enHits++;
  }

  // Diacritics are a near-perfect PT signal.
  const hasDiacritics = PT_DIACRITICS.test(text);
  const hasPtBigrams = PT_EXCLUSIVE_BIGRAMS.test(text);

  const ptScore = ptHits + (hasDiacritics ? 3 : 0) + (hasPtBigrams ? 2 : 0);
  const enScore = enHits;

  const total = ptScore + enScore;
  if (total === 0) {
    return { locale: 'en-US', confidence: 0 };
  }

  const ptRatio = ptScore / total;
  const enRatio = enScore / total;

  if (ptScore > enScore) {
    return { locale: 'pt-BR', confidence: Math.min(1, ptRatio + (hasDiacritics ? 0.1 : 0)) };
  }
  return { locale: 'en-US', confidence: enRatio };
}

module.exports = { detect };

if (require.main === module) {
  let buf = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (c) => (buf += c));
  process.stdin.on('end', () => {
    const result = detect(buf);
    process.stdout.write(JSON.stringify(result));
  });
  // If no stdin (TTY), fall back to argv.
  if (process.stdin.isTTY) {
    const text = process.argv.slice(2).join(' ');
    process.stdout.write(JSON.stringify(detect(text)));
    process.exit(0);
  }
}
