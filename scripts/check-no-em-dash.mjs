#!/usr/bin/env bun
// Repo-wide lint, fails on any em-dash character (U+2014).
//
// Em-dash is an English typographic convention that has been retired from
// this repo's content/code/docs. Use ',', ':', '/', or '-' depending on
// context. See AGENTS.md for the rule and rationale.
//
// Scope: source files only. Vendored / build / lockfiles / Jekyll legacy
// content under _posts/_tabs/assets/ are excluded. .git/.astro/.cache/dist
// are excluded.
//
// Usage:
//   bun scripts/check-no-em-dash.mjs            # report + exit 1 if any
//   bun scripts/check-no-em-dash.mjs --quiet    # exit code only
//   bun scripts/check-no-em-dash.mjs --json     # machine-readable

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const EM_DASH = '\u2014';

const args = new Set(process.argv.slice(2));
const QUIET = args.has('--quiet');
const JSON_OUT = args.has('--json');

const INCLUDE_EXT = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.astro', '.svelte', '.vue',
  '.md', '.mdx',
  '.json', '.jsonc',
  '.css', '.scss',
  '.html',
  '.yml', '.yaml',
  '.py',
]);

const EXCLUDE_DIRS = new Set([
  'node_modules', '.git', 'dist', '.astro', '.cache',
  '.playwright-mcp', 'coverage', '.next', '.turbo',
  '_posts', '_tabs', 'assets',
  'manual-docs',
]);

const EXCLUDE_FILES = new Set([
  'bun.lock', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock',
  'requirements.md',
]);

async function walk(dir, out) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    if (EXCLUDE_DIRS.has(ent.name)) continue;
    if (EXCLUDE_FILES.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      await walk(full, out);
    } else if (ent.isFile() && INCLUDE_EXT.has(path.extname(ent.name))) {
      out.push(full);
    }
  }
  return out;
}

async function scan(files) {
  const hits = [];
  for (const file of files) {
    let body;
    try {
      body = await readFile(file, 'utf-8');
    } catch {
      continue;
    }
    if (!body.includes(EM_DASH)) continue;
    const lines = body.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].includes(EM_DASH)) {
        hits.push({ file: path.relative(REPO_ROOT, file), line: i + 1, text: lines[i] });
      }
    }
  }
  return hits;
}

async function main() {
  const files = await walk(REPO_ROOT, []);
  const hits = await scan(files);

  if (JSON_OUT) {
    console.log(JSON.stringify({ total: hits.length, hits }, null, 2));
  } else if (!QUIET) {
    for (const h of hits) {
      const col = h.text.indexOf(EM_DASH) + 1;
      const snippet = h.text.length > 200 ? h.text.slice(0, 200) + '…' : h.text;
      console.log(`\u001b[31m[em-dash]\u001b[0m ${h.file}:${h.line}:${col}: ${snippet}`);
    }
    if (hits.length === 0) {
      console.log(`\u2713 no em-dash found across ${files.length} files.`);
    } else {
      console.log(
        `\n\u001b[31m${hits.length} em-dash occurrence(s)\u001b[0m across ${new Set(hits.map((h) => h.file)).size} file(s).`,
      );
      console.log(`Em-dash (\u2014, U+2014) is forbidden. Use ',', ':', '/', or '-' as appropriate.`);
    }
  }

  process.exit(hits.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
