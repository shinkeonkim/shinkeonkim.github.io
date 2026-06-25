#!/usr/bin/env bun
/**
 * Replace ASCII comparison/arrow bigraphs (<-, ->, <->, <=, >=, etc.) in MDX
 * body text with their Unicode equivalents so the MDX parser stops trying to
 * read them as JSX tags.
 *
 * MDX treats `<` followed by a non-name character (`=`, `-`, `,`, ` `) as
 * either a JSX tag attempt or a literal. The parser bails when it cannot
 * recover, e.g. `H <= 10` becomes `<=` and the `=` is flagged as
 * "Unexpected character `=` (U+003D) before name".
 *
 * Scope:
 *   - Only edits lines outside ``` fenced code blocks.
 *   - Skips inline backtick spans by masking them before matching.
 *   - Skips lines that start with `<`, `import`, or `export` (likely JSX).
 *   - Only matches a small, conservative pattern set that is unambiguously
 *     hazardous in body text. Anything outside that pattern set is left for
 *     manual review.
 *
 * Substitutions (in order):
 *   `<->`          ->  `↔`   (U+2194 LEFT RIGHT ARROW)
 *   `<==`          ->  `<==` (left untouched, ambiguous)
 *   `<=`<space>    ->  `≤ `  (U+2264 LESS-THAN OR EQUAL TO)
 *   `<=`<eol>      ->  `≤`
 *   `>=`<space>    ->  `≥ `  (U+2265 GREATER-THAN OR EQUAL TO)
 *   `>=`<eol>      ->  `≥`
 *   <space>`->`<space>   ->  ` → `  (U+2192 RIGHTWARDS ARROW)
 *   <space>`<-`<space>   ->  ` ← `  (U+2190 LEFTWARDS ARROW)
 *
 * Flags:
 *   --write    apply edits in place (default is dry-run)
 *   --json     machine-readable report
 *   --files    space-separated explicit file list; defaults to wiki tree
 */
import fs from 'node:fs/promises';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const WIKI_DIR = path.join(REPO_ROOT, 'src/content/wiki');

const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const JSON_OUT = args.includes('--json');
const filesArgIdx = args.indexOf('--files');
const explicitFiles = filesArgIdx >= 0 ? args.slice(filesArgIdx + 1) : null;

async function walk(dir) {
  const out = [];
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...(await walk(full)));
    else if (/\.(md|mdx)$/.test(ent.name)) out.push(full);
  }
  return out;
}

function maskBackticks(line) {
  return line.replace(/`[^`]*`/g, (m) => '\x00'.repeat(m.length));
}

function isJsxLine(line) {
  const trimmed = line.trimStart();
  return (
    trimmed.startsWith('<') ||
    trimmed.startsWith('import ') ||
    trimmed.startsWith('export ')
  );
}

function isIndentedCodeOrJsxChild(line) {
  const m = line.match(/^([ \t]+)/);
  if (!m) return false;
  let cols = 0;
  for (const ch of m[1]) cols += ch === '\t' ? 4 : 1;
  return cols >= 4;
}

function applySubstitutions(line) {
  const masked = maskBackticks(line);
  const isHazard = (idx, len) => {
    for (let i = idx; i < idx + len; i++) {
      if (masked[i] === '\x00') return false;
    }
    return true;
  };

  let result = '';
  let i = 0;
  let changes = 0;
  while (i < line.length) {
    const slice3 = line.slice(i, i + 3);
    const slice2 = line.slice(i, i + 2);
    if (slice3 === '<->' && isHazard(i, 3)) {
      result += '↔';
      i += 3;
      changes++;
      continue;
    }
    if (slice2 === '<=' && isHazard(i, 2)) {
      const next = line[i + 2];
      if (next === undefined || next === ' ' || next === '\t' || next === ')') {
        result += '≤';
        i += 2;
        changes++;
        continue;
      }
    }
    if (slice2 === '<-' && isHazard(i, 2)) {
      const prev = i > 0 ? line[i - 1] : ' ';
      const next = line[i + 2];
      if ((prev === ' ' || prev === '\t') && (next === ' ' || next === '\t' || next === undefined)) {
        result += '←';
        i += 2;
        changes++;
        continue;
      }
    }
    result += line[i];
    i++;
  }
  return { line: result, changes };
}

async function processFile(file) {
  const raw = await fs.readFile(file, 'utf-8');
  const lines = raw.split(/\r?\n/);
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  let inCode = false;
  let totalChanges = 0;
  const changedLines = [];
  const out = lines.map((line, idx) => {
    if (line.startsWith('```')) {
      inCode = !inCode;
      return line;
    }
    if (inCode) return line;
    if (isJsxLine(line)) return line;
    if (isIndentedCodeOrJsxChild(line)) return line;
    const { line: next, changes } = applySubstitutions(line);
    if (changes > 0) {
      totalChanges += changes;
      changedLines.push(idx + 1);
    }
    return next;
  });
  if (totalChanges === 0) return { changes: 0 };
  if (WRITE) await fs.writeFile(file, out.join(eol), 'utf-8');
  return { changes: totalChanges, lines: changedLines };
}

async function main() {
  const files = explicitFiles ?? (await walk(WIKI_DIR));
  const report = { mode: WRITE ? 'WRITE' : 'DRY-RUN', files: 0, total: 0, perFile: [] };
  for (const file of files) {
    try {
      const { changes, lines } = await processFile(file);
      if (changes > 0) {
        const rel = path.relative(REPO_ROOT, file);
        report.files += 1;
        report.total += changes;
        report.perFile.push({ file: rel, changes, lines });
      }
    } catch (err) {
      console.error(file, err);
    }
  }
  if (JSON_OUT) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`[fix-mdx-jsx-arrows] mode=${report.mode}`);
    console.log(`  files: ${report.files}`);
    console.log(`  total: ${report.total}`);
    const preview = report.perFile.slice(0, 12);
    for (const it of preview) {
      console.log(`  + ${it.file} (${it.changes} subs on ${it.lines.length} lines)`);
    }
    if (report.perFile.length > preview.length) {
      console.log(`  ... and ${report.perFile.length - preview.length} more`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
