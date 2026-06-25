#!/usr/bin/env bun
/**
 * Wrap unprotected `{...}` body-text expressions with backticks so MDX stops
 * treating them as JSX expressions.
 *
 * Examples:
 *   c_{i+j}            -> `c_{i+j}`
 *   {0, ..., N-1}      -> `{0, ..., N-1}`
 *   e^{2πi/n}          -> `e^{2πi/n}`
 *
 * Scope (same as fix-mdx-jsx-arrows.mjs):
 *   - skips fenced code blocks (``` toggle)
 *   - skips inline backtick spans
 *   - skips lines starting with `<`, `import`, `export` (JSX)
 *   - skips lines with 4+ leading spaces or a leading tab (indented code,
 *     JSX-child template literals)
 *
 * Matched pattern: a single `{...}` segment containing at least one ASCII
 * letter, no nested braces. Each match is replaced with `` `match` ``
 * (literal backticks around the original).
 *
 * Flags:
 *   --write    apply edits in place (default is dry-run)
 *   --json     machine-readable report
 *   --files    space-separated explicit file list
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

const BRACE_RE = /\{[^{}`\n]*[a-zA-Z][^{}`\n]*\}/g;

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

function isIndented(line) {
  const m = line.match(/^([ \t]+)/);
  if (!m) return false;
  let cols = 0;
  for (const ch of m[1]) cols += ch === '\t' ? 4 : 1;
  return cols >= 4;
}

function wrapBraces(line) {
  const masked = maskBackticks(line);
  let result = '';
  let last = 0;
  let count = 0;
  for (const m of masked.matchAll(BRACE_RE)) {
    const start = m.index;
    const end = start + m[0].length;
    const original = line.slice(start, end);
    result += line.slice(last, start) + '`' + original + '`';
    last = end;
    count++;
  }
  result += line.slice(last);
  return { line: result, changes: count };
}

async function processFile(file) {
  const raw = await fs.readFile(file, 'utf-8');
  const lines = raw.split(/\r?\n/);
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  let inCode = false;
  const changedLines = [];
  let total = 0;
  const out = lines.map((line, idx) => {
    if (line.startsWith('```')) {
      inCode = !inCode;
      return line;
    }
    if (inCode) return line;
    if (isJsxLine(line)) return line;
    if (isIndented(line)) return line;
    const { line: next, changes } = wrapBraces(line);
    if (changes > 0) {
      changedLines.push(idx + 1);
      total += changes;
    }
    return next;
  });
  if (total === 0) return { changes: 0 };
  if (WRITE) await fs.writeFile(file, out.join(eol), 'utf-8');
  return { changes: total, lines: changedLines };
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
    console.log(`[fix-mdx-curly-braces] mode=${report.mode}`);
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
