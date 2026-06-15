#!/usr/bin/env bun
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const REPO_ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const DIST = path.join(REPO_ROOT, 'dist');
const args = process.argv.slice(2);
const internalOnly = args.includes('--internal-only');
const failOnExternal = args.includes('--fail-on-external');

if (!existsSync(DIST)) {
  console.error('dist/ not found, run `bun run build` first.');
  process.exit(2);
}

const SKIP_REGEXES = [
  /linkedin\.com/i,
  /(^|\W)twitter\.com/i,
  /(^|\W)x\.com/i,
  /facebook\.com/i,
  /instagram\.com/i,
  /^mailto:/,
  /^tel:/,
  /^https?:\/\/shinkeonkim\.com\//i,
];

const cliArgs = [
  DIST,
  '--recurse',
  '--verbosity',
  'ERROR',
  '--concurrency',
  '12',
  '--timeout',
  '15000',
  '--format',
  'json',
];

const child = spawnSync(path.join(REPO_ROOT, 'node_modules', '.bin', 'linkinator'), cliArgs, {
  cwd: REPO_ROOT,
  encoding: 'utf-8',
});

if (child.error) {
  console.error('linkinator launch failed:', child.error.message);
  process.exit(2);
}

const stdout = child.stdout ?? '';
const stderr = child.stderr ?? '';
let report;
try {
  report = JSON.parse(stdout);
} catch {
  process.stdout.write(stdout);
  process.stderr.write(stderr);
  process.exit(child.status ?? 1);
}

const allLinks = report.links ?? [];
const total = allLinks.length;
const skipped = allLinks.filter((l) => l.state === 'SKIPPED').length;
const broken = allLinks
  .filter((l) => l.state === 'BROKEN')
  .filter((l) => !SKIP_REGEXES.some((re) => re.test(l.url ?? '')));

function isInternal(url) {
  if (!url) return false;
  if (/^https?:\/\//.test(url)) return /shinkeonkim\.com/.test(url);
  return true;
}

let internalBroken = broken.filter((l) => isInternal(l.url));
let externalBroken = broken.filter((l) => !isInternal(l.url));

if (internalOnly) externalBroken = [];

console.log(
  `scanned ${total} links · ${broken.length} broken (internal ${internalBroken.length} / external ${externalBroken.length}) · ${skipped} skipped`,
);

if (internalBroken.length > 0) {
  console.error('\n[INTERNAL broken links, fail]');
  for (const l of internalBroken.slice(0, 100)) {
    console.error(`  ${l.status ?? '?'} ${l.url} (parent: ${l.parent ?? 'n/a'})`);
  }
  process.exit(1);
}
if (externalBroken.length > 0) {
  console.warn('\n[EXTERNAL broken links, warning only]');
  for (const l of externalBroken.slice(0, 100)) {
    console.warn(`  ${l.status ?? '?'} ${l.url} (parent: ${l.parent ?? 'n/a'})`);
  }
  if (failOnExternal) process.exit(1);
}
