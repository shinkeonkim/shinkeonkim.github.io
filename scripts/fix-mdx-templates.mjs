#!/usr/bin/env bun
/**
 * Wrap unprotected C++/Java template-style `<...>` segments in MDX body text
 * with inline backticks so the MDX parser stops trying to read them as JSX
 * tag openings.
 *
 * Hazardous patterns (in body text only):
 *   vector<int>            -> `vector<int>`
 *   vector<vector<ll>>     -> `vector<vector<ll>>`
 *   pair<int, int>         -> `pair<int, int>`
 *   map<tuple<int, ...>, V>-> `map<tuple<int, ...>, V>`
 *   RedisTemplate<K, V>    -> `RedisTemplate<K, V>`
 *
 * Detection: a segment matches when it starts with `<` immediately followed
 * by a letter, contains at least one `<` or `,` in its interior, and ends at
 * the first balanced closing `>` (or `>>`, `>>>`).
 *
 * Same guards as the arrow/curly-brace tools:
 *   - skip fenced code blocks
 *   - mask inline backtick spans
 *   - skip lines starting with `<`, `import`, `export` (genuine JSX)
 *   - skip lines with 4+ leading spaces or a leading tab (indented code,
 *     JSX-child template literals)
 *
 * The matcher walks the line character-by-character, tracking a depth counter
 * for `<`/`>` so nested templates close at the right `>`. It only wraps the
 * shortest segment that satisfies the open/close balance.
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

function findTemplateSegments(masked) {
  const segments = [];
  let i = 0;
  while (i < masked.length) {
    const ch = masked[i];
    if (ch === '\x00') {
      i++;
      continue;
    }
    if (ch !== '<') {
      i++;
      continue;
    }
    const next = masked[i + 1];
    if (!next || !/[a-zA-Z_]/.test(next)) {
      i++;
      continue;
    }
    let depth = 0;
    let j = i;
    let hasInnerHazard = false;
    let aborted = false;
    while (j < masked.length) {
      const c = masked[j];
      if (c === '\x00' || c === '\n' || c === '`') {
        aborted = true;
        break;
      }
      if (c === '<') depth++;
      else if (c === '>') {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      } else if (c === ',' && depth >= 1) {
        hasInnerHazard = true;
      }
      if (c === '<' && depth > 1) hasInnerHazard = true;
      j++;
    }
    if (aborted || depth !== 0) {
      i++;
      continue;
    }
    if (!hasInnerHazard) {
      i++;
      continue;
    }
    const segText = masked.slice(i, j);
    if (segText.length > 80) {
      i++;
      continue;
    }
    segments.push({ start: i, end: j });
    i = j;
  }
  return segments;
}

function wrapTemplates(line) {
  const masked = maskBackticks(line);
  const segments = findTemplateSegments(masked);
  if (segments.length === 0) return { line, changes: 0 };
  let result = '';
  let last = 0;
  for (const seg of segments) {
    result += line.slice(last, seg.start) + '`' + line.slice(seg.start, seg.end) + '`';
    last = seg.end;
  }
  result += line.slice(last);
  return { line: result, changes: segments.length };
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
    if (isIndented(line)) return line;
    const { line: next, changes } = wrapTemplates(line);
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
    console.log(`[fix-mdx-templates] mode=${report.mode}`);
    console.log(`  files: ${report.files}`);
    console.log(`  total: ${report.total}`);
    const preview = report.perFile.slice(0, 20);
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
