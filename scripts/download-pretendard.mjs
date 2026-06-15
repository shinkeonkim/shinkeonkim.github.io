#!/usr/bin/env bun
// Downloads Pretendard Variable dynamic-subset (92 woff2 files + CSS) into
// public/fonts/pretendard/ for self-hosted serving. Rewrites the CSS to point
// at /fonts/pretendard/. Idempotent, skips files that already exist locally
// unless --force is passed.
//
// Usage: bun scripts/download-pretendard.mjs [--force]

import { mkdir, writeFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PRETENDARD_VERSION = '1.3.9';
const CDN_BASE_WEB = `https://cdn.jsdelivr.net/npm/pretendard@${PRETENDARD_VERSION}/dist/web/variable`;
const CDN_BASE_STATIC = `https://cdn.jsdelivr.net/npm/pretendard@${PRETENDARD_VERSION}/dist/public/static/alternative`;
const SUBSET_COUNT = 92;

const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT_DIR = join(REPO_ROOT, 'public', 'fonts', 'pretendard');
const CACHE_DIR = join(REPO_ROOT, '.cache', 'fonts');

const TTF_WEIGHTS = [
  { name: 'Pretendard-Regular.ttf', weight: 400 },
  { name: 'Pretendard-Bold.ttf', weight: 700 },
];

const force = process.argv.includes('--force');

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function downloadFile(url, outPath) {
  if (!force && (await exists(outPath))) return false;
  await mkdir(dirname(outPath), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  const buf = await res.arrayBuffer();
  await writeFile(outPath, Buffer.from(buf));
  return true;
}

async function downloadSubsets() {
  let downloaded = 0;
  const errors = [];
  await Promise.all(
    Array.from({ length: SUBSET_COUNT }, (_, i) => i).map(async (i) => {
      const filename = `PretendardVariable.subset.${i}.woff2`;
      const url = `${CDN_BASE_WEB}/woff2-dynamic-subset/${filename}`;
      const out = join(OUT_DIR, 'woff2-dynamic-subset', filename);
      try {
        if (await downloadFile(url, out)) downloaded += 1;
      } catch (err) {
        errors.push(`${filename}: ${err.message}`);
      }
    }),
  );
  return { downloaded, errors };
}

async function downloadAndRewriteCss() {
  const cssUrl = `${CDN_BASE_WEB}/pretendardvariable-dynamic-subset.css`;
  const cssOut = join(REPO_ROOT, 'src', 'styles', 'pretendard.css');
  if (!force && (await exists(cssOut))) {
    return { downloaded: false, path: cssOut };
  }
  const res = await fetch(cssUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status} for CSS`);
  let css = await res.text();
  css = css.replace(
    /\.\/woff2-dynamic-subset\//g,
    '/fonts/pretendard/woff2-dynamic-subset/',
  );
  await mkdir(dirname(cssOut), { recursive: true });
  await writeFile(cssOut, css);
  return { downloaded: true, path: cssOut };
}

async function downloadTtfForSatori() {
  let downloaded = 0;
  const errors = [];
  for (const { name } of TTF_WEIGHTS) {
    const url = `${CDN_BASE_STATIC}/${name}`;
    const out = join(CACHE_DIR, 'pretendard', name);
    try {
      if (await downloadFile(url, out)) downloaded += 1;
    } catch (err) {
      errors.push(`${name}: ${err.message}`);
    }
  }
  return { downloaded, errors };
}

async function main() {
  console.log(`[pretendard] downloading v${PRETENDARD_VERSION} → ${OUT_DIR}`);
  const { downloaded: numFonts, errors } = await downloadSubsets();
  console.log(`[pretendard] subset woff2: ${numFonts} new (${SUBSET_COUNT - numFonts} cached)`);
  const css = await downloadAndRewriteCss();
  console.log(`[pretendard] css: ${css.downloaded ? 'downloaded' : 'cached'} (${css.path})`);
  const ttf = await downloadTtfForSatori();
  console.log(
    `[pretendard] satori ttf: ${ttf.downloaded} new (${TTF_WEIGHTS.length - ttf.downloaded} cached, in ${CACHE_DIR})`,
  );
  const allErrors = [...errors, ...ttf.errors];
  if (allErrors.length > 0) {
    console.error(`[pretendard] ${allErrors.length} error(s):`);
    for (const e of allErrors) console.error('  ' + e);
    process.exit(1);
  }
  console.log('[pretendard] done.');
}

main().catch((err) => {
  console.error('[pretendard] fatal:', err);
  process.exit(1);
});
