#!/usr/bin/env bun
/**
 * Sync `category` frontmatter field from directory structure.
 *
 * Wiki entries live at `src/content/wiki/{category}/{slug}.{md,mdx}` (depth 2,
 * 89% of current entries) or `src/content/wiki/{category}/{sub}/{slug}.{md,mdx}`
 * (depth 3, 11%). The first path segment under `src/content/wiki/` is treated
 * as the canonical category.
 *
 * Behavior:
 * - If `category` is missing, insert it as a single line after the existing
 *   `tags:` line (or after `aliases:` / `title:` as fallback). Other YAML
 *   formatting is preserved BYTE-FOR-BYTE - we never re-serialize the file.
 * - If `category` is present but does not match the directory, leave it alone
 *   and emit a MISMATCH warning.
 *
 * Flags:
 *   --write     Actually update files. Default is dry-run.
 *   --json      Machine-readable JSON instead of human report.
 *   --strict    Exit 1 on any MISMATCH (use in CI to enforce hygiene).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseFrontmatter } from '@astrojs/markdown-remark';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const WIKI_DIR = path.join(REPO_ROOT, 'src/content/wiki');

const args = new Set(process.argv.slice(2));
const WRITE = args.has('--write');
const JSON_OUT = args.has('--json');
const STRICT = args.has('--strict');

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

function extractCategory(relPath) {
  const parts = relPath.split('/');
  if (parts.length < 2) return null;
  return parts[0];
}

/**
 * Insert `category: {value}` as a single new line in the YAML block,
 * preserving every other byte. We target the line immediately after the
 * `tags:` block (whether inline `tags: [...]` or block `tags:` + indented
 * items). Falls back to inserting after `aliases:`, then after `title:`.
 *
 * Returns null if no anchor key is found.
 */
function insertCategoryLine(raw, category) {
  const fmMatch = raw.match(/^(---\r?\n)([\s\S]*?)(\r?\n---\r?\n)([\s\S]*)$/);
  if (!fmMatch) return null;
  const [, openDelim, yamlBody, closeDelim, body] = fmMatch;

  const lines = yamlBody.split(/\r?\n/);
  const eol = yamlBody.includes('\r\n') ? '\r\n' : '\n';

  function blockEnd(anchorKey) {
    const startIdx = lines.findIndex((l) => new RegExp('^' + anchorKey + ':').test(l));
    if (startIdx === -1) return -1;
    let i = startIdx + 1;
    while (i < lines.length) {
      const line = lines[i];
      if (line === '' || /^[ \t]/.test(line)) i++;
      else break;
    }
    return i;
  }

  let insertAt = blockEnd('tags');
  if (insertAt === -1) insertAt = blockEnd('aliases');
  if (insertAt === -1) insertAt = blockEnd('title');
  if (insertAt === -1) return null;

  const newLine = 'category: ' + category;
  lines.splice(insertAt, 0, newLine);

  return openDelim + lines.join(eol) + closeDelim + body;
}

async function main() {
  const files = await walk(WIKI_DIR);
  const results = {
    filled: [],
    matched: [],
    mismatch: [],
    topLevel: [],
    errors: [],
    skippedNoAnchor: [],
  };

  for (const file of files) {
    const rel = path.relative(WIKI_DIR, file).replace(/\\/g, '/');
    const dirCategory = extractCategory(rel);

    let raw;
    try {
      raw = await fs.readFile(file, 'utf-8');
    } catch (err) {
      results.errors.push({ file: rel, error: String(err) });
      continue;
    }

    let parsed;
    try {
      parsed = parseFrontmatter(raw);
    } catch (err) {
      results.errors.push({ file: rel, error: 'frontmatter parse: ' + err });
      continue;
    }

    const fm = parsed.frontmatter ?? {};
    const currentCategory = fm.category;

    if (!dirCategory) {
      results.topLevel.push({ file: rel, current: currentCategory ?? null });
      continue;
    }

    if (!currentCategory) {
      results.filled.push({ file: rel, category: dirCategory });
      if (WRITE) {
        const next = insertCategoryLine(raw, dirCategory);
        if (next === null) {
          results.skippedNoAnchor.push({ file: rel });
          continue;
        }
        await fs.writeFile(file, next, 'utf-8');
      }
    } else if (currentCategory === dirCategory) {
      results.matched.push({ file: rel, category: currentCategory });
    } else {
      results.mismatch.push({
        file: rel,
        current: currentCategory,
        directory: dirCategory,
      });
    }
  }

  if (JSON_OUT) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    const mode = WRITE ? 'WRITE' : 'DRY-RUN';
    console.log('[sync-wiki-category] mode=' + mode);
    console.log('  filled    : ' + results.filled.length);
    console.log('  matched   : ' + results.matched.length);
    console.log('  mismatch  : ' + results.mismatch.length);
    console.log('  top-level : ' + results.topLevel.length);
    console.log('  skipped (no anchor) : ' + results.skippedNoAnchor.length);
    console.log('  errors    : ' + results.errors.length);

    if (results.filled.length > 0 && !WRITE) {
      const preview = results.filled.slice(0, 10);
      console.log('\nWould fill ' + results.filled.length + ' files (showing first 10):');
      for (const it of preview) console.log('  + ' + it.file + '  ->  ' + it.category);
      if (results.filled.length > 10) {
        console.log('  ... and ' + (results.filled.length - 10) + ' more');
      }
    }

    if (results.mismatch.length > 0) {
      console.log('\nMISMATCH (manual review needed):');
      for (const it of results.mismatch) {
        console.log('  ! ' + it.file + '  current="' + it.current + '"  directory="' + it.directory + '"');
      }
    }

    if (results.skippedNoAnchor.length > 0) {
      console.log('\nSKIPPED (no title/aliases/tags anchor to insert after):');
      for (const it of results.skippedNoAnchor) console.log('  ? ' + it.file);
    }

    if (results.errors.length > 0) {
      console.log('\nERRORS:');
      for (const it of results.errors) console.log('  x ' + it.file + ': ' + it.error);
    }
  }

  if (results.errors.length > 0) process.exit(2);
  if (STRICT && results.mismatch.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
