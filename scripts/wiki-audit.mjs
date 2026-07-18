#!/usr/bin/env bun
// 위키 전수조사 스크립트
// - 진짜 broken wikilink 필터링
// - 짧은 파일 목록 (200줄 이하)
// - 시각화 없는 파일 목록
// - 카테고리별 통계

import fs from 'node:fs/promises';
import path from 'node:path';
import { parseFrontmatter } from '@astrojs/markdown-remark';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const WIKI_DIR = path.join(REPO_ROOT, 'src/content/wiki');
const COLLECTIONS_DIR = path.join(REPO_ROOT, 'src/content');

const args = new Set(process.argv.slice(2));
const CATEGORY = process.argv.find((a) => a.startsWith('--category='))?.split('=')[1];
const JSON_OUT = args.has('--json');

// validate-content.mjs 와 동일한 정규식
const WIKILINK_RE = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;
// 시각화 감지
const MERMAID_RE = /```mermaid/;
const ANIM_RE = /```anim:/;
const CHART_RE = /<ChartJs\s/;
const IMAGE_RE = /!\[.*?\]\(/;
// 진짜 위키링크만 (코드/특수문자 걸러내기)
const REAL_LINK_RE = /^[a-zA-Z0-9가-힣][a-zA-Z0-9가-힣_\- ]*$/;

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
    if (ent.isDirectory()) {
      out.push(...(await walk(full)));
    } else if (/\.(md|mdx)$/.test(ent.name)) {
      out.push(full);
    }
  }
  return out;
}

function normKey(s) {
  return String(s).normalize('NFC').toLowerCase();
}

// 코드블록/인라인 코드 안의 텍스트 제거 (오탐 방지)
function stripCode(body) {
  return body
    .replace(/```[\s\S]*?```/g, '')  // fenced code
    .replace(/`[^`\n]*`/g, '');       // inline code
}

async function main() {
  // 전체 slugMap 구성 (posts, notes, wiki, sources)
  const slugMap = new Map();
  const collections = ['posts', 'notes', 'wiki', 'sources'];
  const wikiEntries = [];

  for (const collection of collections) {
    const dir = path.join(COLLECTIONS_DIR, collection);
    const files = await walk(dir);
    for (const file of files) {
      const raw = await fs.readFile(file, 'utf-8');
      let fm = {}, body = '';
      try {
        const parsed = parseFrontmatter(raw);
        fm = parsed.frontmatter ?? {};
        body = parsed.content ?? '';
      } catch {
        continue;
      }
      const rel = path.relative(dir, file).replace(/\\/g, '/');
      const slug = rel.replace(/\.(md|mdx)$/, '');
      const filename = slug.split('/').pop();
      const aliases = Array.isArray(fm.aliases) ? fm.aliases : [];
      const keys = [slug, filename, fm.title, ...aliases].filter(Boolean);
      for (const k of keys) {
        const key = normKey(k);
        if (!slugMap.has(key)) slugMap.set(key, { file, collection, slug, fm });
      }
      if (collection === 'wiki') {
        wikiEntries.push({ file, slug, fm, body, raw });
      }
    }
  }

  const stats = {};
  const brokenLinks = [];
  const shortFiles = [];
  const noVisualFiles = [];
  const suggestedNew = new Map(); // target -> [sources]

  for (const entry of wikiEntries) {
    const rel = path.relative(WIKI_DIR, entry.file).replace(/\\/g, '/');
    const category = rel.split('/')[0];
    if (CATEGORY && category !== CATEGORY) continue;

    if (!stats[category]) {
      stats[category] = { total: 0, short: 0, noVisual: 0, broken: 0, lineTotal: 0 };
    }
    stats[category].total += 1;

    const lines = entry.body.split('\n').length;
    stats[category].lineTotal += lines;

    const hasVisual = MERMAID_RE.test(entry.body) || ANIM_RE.test(entry.body) || CHART_RE.test(entry.body) || IMAGE_RE.test(entry.body);
    if (lines < 200) {
      stats[category].short += 1;
      shortFiles.push({ category, slug: entry.slug, lines, hasVisual, title: entry.fm.title });
    }
    if (!hasVisual) {
      stats[category].noVisual += 1;
      if (lines >= 100) {
        noVisualFiles.push({ category, slug: entry.slug, lines, title: entry.fm.title });
      }
    }

    // broken link 검출 - 코드 제외 후 스캔
    const cleanBody = stripCode(entry.body);
    const seen = new Set();
    let m;
    WIKILINK_RE.lastIndex = 0;
    while ((m = WIKILINK_RE.exec(cleanBody)) !== null) {
      const target = m[1].trim();
      if (!target) continue;
      if (seen.has(target)) continue;
      seen.add(target);

      // 순수한 링크 텍스트만 (코드/수식이 아님)
      if (!REAL_LINK_RE.test(target)) continue;

      const key = normKey(target);
      if (!slugMap.has(key)) {
        stats[category].broken += 1;
        brokenLinks.push({ category, slug: entry.slug, target, title: entry.fm.title });
        const arr = suggestedNew.get(key) || [];
        arr.push({ category, slug: entry.slug, target });
        suggestedNew.set(key, arr);
      }
    }
  }

  if (JSON_OUT) {
    console.log(JSON.stringify({ stats, brokenLinks, shortFiles, noVisualFiles }, null, 2));
    return;
  }

  console.log('\n=== 카테고리별 통계 ===');
  const rows = Object.entries(stats)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([cat, s]) => ({
      category: cat,
      total: s.total,
      short: s.short,
      noVisual: s.noVisual,
      broken: s.broken,
      avgLines: Math.round(s.lineTotal / s.total),
    }));
  console.table(rows);

  console.log('\n=== 자주 참조되지만 문서 없는 위키 (신규 생성 우선순위) ===');
  const suggested = [...suggestedNew.entries()]
    .filter(([, arr]) => arr.length >= 2)
    .sort((a, b) => b[1].length - a[1].length);
  for (const [key, arr] of suggested) {
    console.log(`  [[${key}]] (참조 ${arr.length}회): ${arr.slice(0, 3).map((a) => a.slug).join(', ')}${arr.length > 3 ? '...' : ''}`);
  }

  console.log(`\n=== broken wikilink 총 ${brokenLinks.length}건 ===`);
  const groupedBroken = {};
  for (const b of brokenLinks) {
    if (!groupedBroken[b.category]) groupedBroken[b.category] = [];
    groupedBroken[b.category].push(b);
  }
  for (const [cat, list] of Object.entries(groupedBroken).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n  [${cat}] ${list.length}건`);
    for (const b of list.slice(0, 10)) {
      console.log(`    ${b.slug} -> [[${b.target}]]`);
    }
    if (list.length > 10) console.log(`    ... ${list.length - 10}건 더`);
  }

  console.log(`\n=== 짧은 파일 (200줄 이하) 카테고리별 상위 ===`);
  const byCatShort = {};
  for (const s of shortFiles) {
    if (!byCatShort[s.category]) byCatShort[s.category] = [];
    byCatShort[s.category].push(s);
  }
  for (const [cat, list] of Object.entries(byCatShort).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n  [${cat}] ${list.length}건 (시각화 없음: ${list.filter((f) => !f.hasVisual).length}건)`);
    for (const s of list.slice(0, 5).sort((a, b) => a.lines - b.lines)) {
      console.log(`    ${s.slug} (${s.lines}줄${s.hasVisual ? '' : ', no-visual'})`);
    }
  }

  console.log(`\n=== 시각화 없는 100줄 이상 파일 (시각화 추가 후보) 카테고리별 상위 ===`);
  const byCatNoVis = {};
  for (const s of noVisualFiles) {
    if (!byCatNoVis[s.category]) byCatNoVis[s.category] = [];
    byCatNoVis[s.category].push(s);
  }
  for (const [cat, list] of Object.entries(byCatNoVis).sort((a, b) => b[1].length - a[1].length).slice(0, 10)) {
    console.log(`\n  [${cat}] ${list.length}건`);
    for (const s of list.slice(0, 3).sort((a, b) => b.lines - a.lines)) {
      console.log(`    ${s.slug} (${s.lines}줄)`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
