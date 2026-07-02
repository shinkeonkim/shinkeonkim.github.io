#!/usr/bin/env bun
// Emits src/data/content-changelog.json - per-file git history for posts,
// wiki, and notes. Consumed by PostChangelog.astro to render the '이 글의
// 편집 이력' section. One `git log` invocation over all three roots keeps
// prebuild overhead under a second for ~1000 files (per-file --follow
// would take ~30 seconds).

import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { simpleGit } from 'simple-git';

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT_FILE = join(REPO_ROOT, 'src/data/content-changelog.json');
const CONTENT_ROOTS = ['src/content/posts', 'src/content/wiki', 'src/content/notes'];
const REPO_SLUG = 'shinkeonkim/shinkeonkim.github.io';
const MAJOR_LINE_THRESHOLD = 50;
const MAJOR_SUBJECT_RE = /^(refactor|rewrite|overhaul)(\([^)]*\))?!?:/i;
const COMMIT_MARKER = '__COMMIT__';

const git = simpleGit({ baseDir: REPO_ROOT });

function pathToKey(filePath) {
  const m = filePath.match(/^src\/content\/(posts|wiki|notes)\/(.+)\.(md|mdx)$/);
  if (!m) return null;
  return `${m[1]}:${m[2]}`;
}

async function main() {
  const raw = await git.raw([
    'log',
    '--numstat',
    '--date=iso-strict',
    `--pretty=format:${COMMIT_MARKER}%n%H%n%h%n%aI%n%s`,
    '--',
    ...CONTENT_ROOTS,
  ]);

  const byPath = new Map();

  const blocks = raw.split(new RegExp(`^${COMMIT_MARKER}$`, 'm')).filter((b) => b.trim());
  let commitCount = 0;
  for (const block of blocks) {
    const lines = block.split('\n');
    let cursor = 0;
    while (cursor < lines.length && !lines[cursor].trim()) cursor++;
    if (lines.length - cursor < 4) continue;
    const sha = lines[cursor].trim();
    const shortSha = lines[cursor + 1].trim();
    const date = lines[cursor + 2].trim();
    const subject = lines[cursor + 3].trim();
    if (!sha) continue;
    commitCount++;

    for (let i = cursor + 4; i < lines.length; i++) {
      const line = lines[i];
      if (!line || !line.trim()) continue;
      const m = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
      if (!m) continue;
      const ins = m[1] === '-' ? 0 : parseInt(m[1], 10);
      const del = m[2] === '-' ? 0 : parseInt(m[2], 10);
      const filePath = m[3];
      const key = pathToKey(filePath);
      if (!key) continue;

      const total = ins + del;
      const major = total >= MAJOR_LINE_THRESHOLD || MAJOR_SUBJECT_RE.test(subject);

      let list = byPath.get(key);
      if (!list) {
        list = [];
        byPath.set(key, list);
      }
      list.push({
        sha,
        shortSha,
        date,
        subject,
        insertions: ins,
        deletions: del,
        major,
        url: `https://github.com/${REPO_SLUG}/commit/${sha}`,
      });
    }
  }

  const out = Object.fromEntries(
    [...byPath.entries()].map(([k, entries]) => [
      k,
      entries.sort((a, b) => b.date.localeCompare(a.date)),
    ]),
  );

  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(out) + '\n');
  console.log(
    `[changelog] ${byPath.size} files, ${commitCount} commits scanned → src/data/content-changelog.json`,
  );
}

main().catch((err) => {
  console.error('[changelog] fatal:', err);
  process.exit(1);
});
