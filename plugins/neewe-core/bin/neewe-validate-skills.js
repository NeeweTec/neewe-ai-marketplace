#!/usr/bin/env node
/**
 * NEEWE Skill Linter (Sprint 2)
 *
 * Walks src/neewe-core/skills/<name>/SKILL.md (or `plugins/neewe-core/skills/<name>/SKILL.md`
 * if invoked from the published plugin) and enforces NEEWE skill-authoring rules:
 *
 *   L1. Frontmatter present + has name, description.
 *   L2. Description starts with a WHEN trigger ("Use when ...", "Use after ...",
 *       "Use whenever ...", "Use before ...", etc.) and does NOT start with a
 *       WHAT verb (Runs/Implements/Handles/Performs/Generates/Manages/Provides/
 *       Computes/Builds/Validates/Verifies/Creates).
 *   L3. Description doesn't summarize workflow (heuristic: more than 1 sentence
 *       describing what happens INSIDE the skill — Superpowers anti-summarization rule).
 *   L4. Body word count within budget (default 1000; tighter limits via frontmatter
 *       `token_budget: getting-started | frequent | standard | reference`).
 *   L5. No `@` cross-references in body (force-load anti-pattern).
 *   L6. Single `<HARD-GATE>` per skill (inflation breaks signal).
 *
 * Exit codes: 0 = all pass; 1 = lint failures.
 *
 * Usage:
 *   node bin/neewe-validate-skills.js               # auto-detect skills dir
 *   node bin/neewe-validate-skills.js <path>        # custom skills dir
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Auto-detect skills dir: prefer fw src/neewe-core/skills, fall back to plugin skills/.
function findSkillsDir(customArg) {
  if (customArg) return customArg;
  const candidates = [
    join(__dirname, '..', 'skills'),                              // plugin-relative: bin/../skills
    join(__dirname, '..', '..', 'src', 'neewe-core', 'skills'),   // fw-relative: bin/../../src/neewe-core/skills
    join(process.cwd(), 'src', 'neewe-core', 'skills'),
    join(process.cwd(), 'plugins', 'neewe-core', 'skills'),
    join(process.cwd(), 'skills'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

const WHEN_PREFIXES = /^(Use\s+(when|after|whenever|before|while|on)|Triggered\s+by|Invoked\s+(when|after))\b/i;
const WHAT_PREFIXES = /^(Runs|Implements|Handles|Performs|Generates|Manages|Provides|Computes|Builds|Validates|Verifies|Creates|Executes|Processes|Defines|Loads)\b/i;
const AT_REFERENCE = /@[a-zA-Z0-9_\-/.]+\.md\b/;
const HARD_GATE_OPEN = /<HARD-GATE>/g;

const TOKEN_BUDGETS = {
  'getting-started': 300,
  'frequent': 500,
  'standard': 1000,
  'reference': Infinity,
};

function parseSkill(skillPath) {
  const raw = readFileSync(skillPath, 'utf8');
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) return { error: 'missing or malformed YAML frontmatter (must start with ---)' };
  const fmRaw = fmMatch[1];
  const body = fmMatch[2];
  // Very loose YAML parse for the 4-5 fields we care about — keep it dep-free.
  const fm = {};
  for (const line of fmRaw.split('\n')) {
    const m = line.match(/^([a-zA-Z_-]+):\s*(.*)$/);
    if (m) fm[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
  }
  // description may be multi-line via YAML folding; collect continuation lines too.
  let descLines = [];
  let inDesc = false;
  for (const line of fmRaw.split('\n')) {
    if (/^description\s*:/.test(line)) {
      inDesc = true;
      const after = line.replace(/^description\s*:\s*/, '').trim();
      if (after && !after.startsWith('>') && !after.startsWith('|')) descLines.push(after);
      continue;
    }
    if (inDesc) {
      if (/^[a-zA-Z_-]+\s*:/.test(line)) break;
      descLines.push(line.trim());
    }
  }
  if (descLines.length) fm.description = descLines.filter(Boolean).join(' ');
  return { fm, body, raw };
}

function lintSkill(skillPath) {
  const issues = [];
  const result = parseSkill(skillPath);
  if (result.error) {
    issues.push({ rule: 'L1', sev: 'error', msg: result.error });
    return issues;
  }
  const { fm, body } = result;

  // L1 — frontmatter has name + description
  if (!fm.name) issues.push({ rule: 'L1', sev: 'error', msg: 'frontmatter missing `name`' });
  if (!fm.description) issues.push({ rule: 'L1', sev: 'error', msg: 'frontmatter missing `description`' });

  // L2 — description starts with WHEN trigger
  if (fm.description) {
    const desc = fm.description.trim();
    if (WHAT_PREFIXES.test(desc)) {
      issues.push({ rule: 'L2', sev: 'error', msg: `description starts with a WHAT verb ("${desc.slice(0, 40)}..."). Rewrite as "Use when ..." (NEEWE-LAW: Description = WHEN, never WHAT — see Superpowers analysis Nugget 14 / U3).` });
    } else if (!WHEN_PREFIXES.test(desc)) {
      issues.push({ rule: 'L2', sev: 'warn', msg: `description doesn't start with a clear WHEN trigger ("${desc.slice(0, 40)}..."). Recommended prefixes: "Use when", "Use after", "Use whenever", "Use before".` });
    }
  }

  // L3 — workflow-summary heuristic (warn if description contains "and" + verb-ing pattern indicating multi-step summary)
  if (fm.description && /\b(then|and then|followed by)\b/i.test(fm.description) && fm.description.length > 150) {
    issues.push({ rule: 'L3', sev: 'warn', msg: 'description seems to summarize a multi-step workflow. The Superpowers anti-summarization rule: descriptions that summarize WHAT cause Claude to skip the body. Keep it to "Use when X" — let the body describe the workflow.' });
  }

  // L4 — word count vs budget
  const budgetKey = fm.token_budget || 'standard';
  const budget = TOKEN_BUDGETS[budgetKey] ?? TOKEN_BUDGETS.standard;
  const wordCount = (body.match(/\S+/g) || []).length;
  if (wordCount > budget) {
    issues.push({ rule: 'L4', sev: 'warn', msg: `body word count ${wordCount} exceeds ${budgetKey} budget (${budget}). Extract examples to a companion file (examples.md, anti-patterns.md) and reference by filename.` });
  }

  // Strip fenced code blocks (```...```) and inline backticks before checking L5/L6 —
  // documentation mentioning @-refs or <HARD-GATE> inside code formatting is not a real
  // force-load or marker (caught its own self-bug on first dogfood run).
  const stripped = body
    .replace(/```[\s\S]*?```/g, '')   // fenced code blocks
    .replace(/`[^`\n]*`/g, '');        // inline backticks

  // L5 — no @-references in body (outside code formatting)
  if (AT_REFERENCE.test(stripped)) {
    const match = stripped.match(AT_REFERENCE);
    issues.push({ rule: 'L5', sev: 'error', msg: `body contains @-reference "${match[0]}" — this force-loads the other file every time this skill loads. Use the Skill tool or plain filename mention instead.` });
  }

  // L6 — single <HARD-GATE> (outside code formatting)
  const hardGates = (stripped.match(HARD_GATE_OPEN) || []).length;
  if (hardGates > 1) {
    issues.push({ rule: 'L6', sev: 'warn', msg: `body contains ${hardGates} <HARD-GATE> markers. Inflation breaks the signal — limit to 1 unless genuinely multiple non-bypassable constraints exist.` });
  }

  return issues;
}

// ─── Main ──────────────────────────────────────────────────────────────────

const customDir = process.argv[2];
const skillsDir = findSkillsDir(customDir);
if (!skillsDir || !existsSync(skillsDir)) {
  console.error('[neewe-validate-skills] ERROR: skills dir not found. Tried auto-detection; pass a path arg.');
  process.exit(1);
}

console.log(`[neewe-validate-skills] scanning ${skillsDir}`);

let totalSkills = 0;
let totalErrors = 0;
let totalWarns = 0;

const skillDirs = readdirSync(skillsDir, { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => e.name);

for (const skillName of skillDirs) {
  const skillPath = join(skillsDir, skillName, 'SKILL.md');
  if (!existsSync(skillPath)) {
    console.log(`  - ${skillName}: SKIP (no SKILL.md)`);
    continue;
  }
  totalSkills++;
  const issues = lintSkill(skillPath);
  if (issues.length === 0) {
    console.log(`  ✓ ${skillName}: OK`);
    continue;
  }
  const errors = issues.filter(i => i.sev === 'error');
  const warns = issues.filter(i => i.sev === 'warn');
  totalErrors += errors.length;
  totalWarns += warns.length;
  console.log(`  ${errors.length > 0 ? '✗' : '⚠'} ${skillName}: ${errors.length} error(s), ${warns.length} warning(s)`);
  for (const i of issues) {
    console.log(`      [${i.rule} ${i.sev}] ${i.msg}`);
  }
}

console.log(`\n[neewe-validate-skills] scanned=${totalSkills}  errors=${totalErrors}  warnings=${totalWarns}`);
process.exit(totalErrors > 0 ? 1 : 0);
