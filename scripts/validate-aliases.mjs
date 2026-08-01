#!/usr/bin/env bun
// Alias 중복/오염 검출 스크립트
// 목적: wikilink 해석 우선순위 (slug > filename > title > alias) 에서
//       같은 정규화 key 가 여러 문서에서 등록되면 하나만 "당첨" 되고
//       나머지는 은밀하게 링크가 엉뚱한 곳으로 감. 이걸 감시.
//
// 검출 항목:
//   1. Alias/Title/Filename 이 다른 문서의 슬러그/파일명/제목/alias 와 충돌
//      → wikilink 해석이 "무엇을 우선하는가" 로 인해 잘못 연결됨
//   2. 자체 파일 안에서 alias 가 중복 선언
//   3. Alias 가 자기 자신의 slug/filename/title 과 동일 (무의미한 중복)
//   4. Alias 수 초과 (기본 10 개)
//   5. 지나치게 짧거나 너무 흔한 단일 단어 alias (충돌 위험)
//   6. Wikilink 가 어디에도 매칭 안 됨 (broken)
//
// 사용:
//   bun scripts/validate-aliases.mjs             # 리포트 (경고만)
//   bun scripts/validate-aliases.mjs --strict    # 경고도 실패로
//   bun scripts/validate-aliases.mjs --json      # 머신 가독
//   bun scripts/validate-aliases.mjs --fix-suggest  # 자동 수정 제안
//
// wikilink 해석 우선순위는 src/plugins/remark-wikilink.mjs 와 동일.

import fs from 'node:fs/promises';
import path from 'node:path';
import { parseFrontmatter } from '@astrojs/markdown-remark';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const CONTENT_DIR = path.join(REPO_ROOT, 'src/content');
const COLLECTIONS = ['posts', 'notes', 'wiki', 'sources'];
const WIKILINK_RE = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;
const REAL_LINK_RE = /^[a-zA-Z0-9가-힣][a-zA-Z0-9가-힣_\- ./]*$/;

// 정책
const MAX_ALIASES = 10;              // alias 최대 권장 개수
const MIN_ALIAS_LEN = 2;              // 너무 짧은 alias (1-char) 는 오탐 위험
const GENERIC_BLOCKLIST = new Set([   // 너무 흔한 단어 - 어느 문서의 것인지 모호
  'model', 'store', 'stream', 'streams', 'service', 'services',
  'api', 'client', 'server', 'config', 'session', 'user', 'users',
  'file', 'files', 'log', 'logs', 'event', 'events', 'queue',
  'cache', 'db', 'database', 'state', 'manager', 'access', 'auth',
  'network', 'security', 'admin', 'ops', 'plan', 'plans',
]);

const args = new Set(process.argv.slice(2));
const STRICT = args.has('--strict');
const JSON_OUT = args.has('--json');
const FIX_SUGGEST = args.has('--fix-suggest');

function normKey(s) {
  return String(s).normalize('NFC').toLowerCase().trim();
}

function stripCode(body) {
  return body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\b(?:code|output|result)=\{`[\s\S]*?`\}/g, '')
    .replace(/`[^`\n]*`/g, '')
    .replace(/\\\|/g, '|');
}

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

async function loadEntries() {
  const all = [];
  for (const collection of COLLECTIONS) {
    const dir = path.join(CONTENT_DIR, collection);
    const files = await walk(dir);
    for (const file of files) {
      const raw = await fs.readFile(file, 'utf-8');
      let fm; let body;
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
      const aliases = Array.isArray(fm.aliases) ? fm.aliases.filter((a) => typeof a === 'string' && a.trim().length > 0) : [];
      all.push({
        file, collection, slug, filename,
        title: typeof fm.title === 'string' ? fm.title : undefined,
        aliases,
        body,
        rel: path.relative(REPO_ROOT, file),
      });
    }
  }
  return all;
}

// 각 key (정규화된 slug/filename/title/alias) 를 등록한 모든 entry 를 기록.
// 여러 entry 가 같은 key 를 주장하면 → 충돌.
function buildOwnershipMap(entries) {
  // key -> Array<{ entry, source: 'slug'|'filename'|'title'|'alias', original }>
  const map = new Map();
  for (const e of entries) {
    const claims = [];
    if (e.slug) claims.push({ source: 'slug', original: e.slug });
    if (e.filename) claims.push({ source: 'filename', original: e.filename });
    if (e.title) claims.push({ source: 'title', original: e.title });
    for (const a of e.aliases) claims.push({ source: 'alias', original: a });

    // 자체 파일 안에서 alias 중복 감지용 카운트
    const localSeen = new Set();
    const localDups = [];
    for (const c of claims) {
      const key = normKey(c.original);
      if (c.source === 'alias') {
        if (localSeen.has(key)) localDups.push(c.original);
        localSeen.add(key);
      }
      const list = map.get(key) ?? [];
      list.push({ entry: e, source: c.source, original: c.original });
      map.set(key, list);
    }
    e._localAliasDups = localDups;
  }
  return map;
}

function buildResolutionMap(ownership) {
  // remark-wikilink 와 동일 - "first entry wins"
  // 우선순위: 같은 key 안에서 slug/filename/title/alias 중 순서 상관없이
  //   실제로는 buildSlugMap 이 파일 walk 순서대로 first-come-first-served.
  //   여기서는 진짜 우선순위를 명시적으로 계산하지 않고, "충돌" 여부만 감지.
  //   해석 매핑은 첫 번째 등록자로 결정 (walk 순).
  const resolve = new Map();
  for (const [key, list] of ownership) {
    resolve.set(key, list[0]);
  }
  return resolve;
}

async function main() {
  const entries = await loadEntries();
  const ownership = buildOwnershipMap(entries);
  const resolve = buildResolutionMap(ownership);

  // ---------- 1. Cross-file collisions ----------
  const collisions = [];
  for (const [key, list] of ownership) {
    // 같은 entry (같은 file) 안에서 alias 여러 개 등록은 collision 이 아님.
    const uniqueEntries = new Map();
    for (const c of list) {
      if (!uniqueEntries.has(c.entry.file)) uniqueEntries.set(c.entry.file, []);
      uniqueEntries.get(c.entry.file).push(c);
    }
    if (uniqueEntries.size < 2) continue; // 한 파일만 주장 → OK

    // 여러 파일이 주장 → 충돌
    // 어떤 종류의 충돌인지 (slug vs alias, alias vs alias, ...) 상세히
    const claimants = [];
    for (const [file, cs] of uniqueEntries) {
      const sources = cs.map((c) => c.source);
      claimants.push({
        file: path.relative(REPO_ROOT, file),
        entry: cs[0].entry,
        sources: [...new Set(sources)],
      });
    }
    const winner = list[0];
    collisions.push({
      key,
      display: list[0].original,
      claimants,
      winner: {
        file: path.relative(REPO_ROOT, winner.entry.file),
        source: winner.source,
      },
    });
  }

  // ---------- 2. Self alias vs own title/filename/slug ----------
  const selfRedundant = [];
  for (const e of entries) {
    if (e.aliases.length === 0) continue;
    const own = new Set([e.slug, e.filename, e.title].filter(Boolean).map(normKey));
    for (const a of e.aliases) {
      if (own.has(normKey(a))) {
        selfRedundant.push({
          file: e.rel,
          alias: a,
          reason: `alias "${a}" 가 자기 파일의 slug/filename/title 과 동일 (해석 우선순위상 무의미)`,
        });
      }
    }
  }

  // ---------- 3. Local (in-file) alias duplicates ----------
  const localDups = [];
  for (const e of entries) {
    if (e._localAliasDups && e._localAliasDups.length > 0) {
      localDups.push({ file: e.rel, dups: e._localAliasDups });
    }
  }

  // ---------- 4. Excessive alias count ----------
  const excessive = [];
  for (const e of entries) {
    if (e.aliases.length > MAX_ALIASES) {
      excessive.push({
        file: e.rel,
        count: e.aliases.length,
        aliases: e.aliases,
      });
    }
  }

  // ---------- 5. Generic / too-short aliases ----------
  const risky = [];
  for (const e of entries) {
    for (const a of e.aliases) {
      const norm = normKey(a);
      if (norm.length < MIN_ALIAS_LEN) {
        risky.push({ file: e.rel, alias: a, reason: `too short (${norm.length} chars)` });
      } else if (GENERIC_BLOCKLIST.has(norm)) {
        risky.push({ file: e.rel, alias: a, reason: `generic single word (blocklist)` });
      }
    }
  }

  // ---------- 6. Broken wikilinks ----------
  const broken = [];
  for (const e of entries) {
    if (!e.body || !e.body.includes('[[')) continue;
    const clean = stripCode(e.body);
    const re = new RegExp(WIKILINK_RE.source, WIKILINK_RE.flags);
    const seen = new Set();
    let m;
    while ((m = re.exec(clean)) !== null) {
      const target = m[1].trim();
      if (!target) continue;
      if (seen.has(target)) continue;
      seen.add(target);
      if (!REAL_LINK_RE.test(target)) continue;
      const key = normKey(target);
      if (!resolve.has(key)) {
        broken.push({
          file: e.rel,
          target,
        });
      }
    }
  }

  const stats = {
    entries: entries.length,
    collisions: collisions.length,
    selfRedundant: selfRedundant.length,
    localDups: localDups.length,
    excessive: excessive.length,
    risky: risky.length,
    broken: broken.length,
  };

  if (JSON_OUT) {
    console.log(JSON.stringify({ stats, collisions, selfRedundant, localDups, excessive, risky, broken }, null, 2));
    const hardCount = collisions.length + localDups.length;
    const softCount = selfRedundant.length + excessive.length + risky.length + broken.length;
    if (hardCount > 0 || (STRICT && softCount > 0)) process.exit(1);
    return;
  }

  const RED = '\u001b[31m';
  const YELLOW = '\u001b[33m';
  const CYAN = '\u001b[36m';
  const RESET = '\u001b[0m';
  const BOLD = '\u001b[1m';

  console.log(`\n${BOLD}=== Alias 검증 리포트 ===${RESET}`);
  console.log(`총 ${entries.length} 개 entry 스캔`);
  console.log(`  Alias 충돌: ${collisions.length > 0 ? RED : ''}${collisions.length}${RESET}`);
  console.log(`  자체 파일 내 alias 중복: ${localDups.length > 0 ? RED : ''}${localDups.length}${RESET}`);
  console.log(`  자기 파일의 title/filename 과 동일한 alias: ${selfRedundant.length > 0 ? YELLOW : ''}${selfRedundant.length}${RESET}`);
  console.log(`  Alias 초과 (>${MAX_ALIASES}): ${excessive.length > 0 ? YELLOW : ''}${excessive.length}${RESET}`);
  console.log(`  Risky alias (generic/short): ${risky.length > 0 ? YELLOW : ''}${risky.length}${RESET}`);
  console.log(`  Broken wikilink: ${broken.length > 0 ? YELLOW : ''}${broken.length}${RESET}`);

  if (collisions.length > 0) {
    console.log(`\n${RED}${BOLD}[ERROR] Alias / 이름 충돌 ${collisions.length} 건${RESET}`);
    console.log(`  같은 이름을 여러 문서가 주장 → wikilink 가 첫 번째로 등록된 문서에만 연결됨.`);
    console.log(`  나머지 문서로 가는 링크는 조용히 엉뚱한 곳으로 감. 반드시 해결.`);
    for (const c of collisions) {
      const winner = `${CYAN}${c.winner.file}${RESET} (${c.winner.source})`;
      console.log(`\n  [[${c.display}]] → 현재 ${winner} 로 해석`);
      for (const cl of c.claimants) {
        const marker = path.relative(REPO_ROOT, cl.entry.file) === c.winner.file ? '★' : ' ';
        console.log(`    ${marker} ${cl.file}  [${cl.sources.join(', ')}]`);
      }
      if (FIX_SUGGEST) {
        console.log(`    ${YELLOW}fix:${RESET} 하나만 남기고 나머지 파일에서 이 alias 제거,`);
        console.log(`         또는 각 alias 를 더 구체적으로 (예: "State" → "SSM State Manager")`);
      }
    }
  }

  if (localDups.length > 0) {
    console.log(`\n${RED}${BOLD}[ERROR] 자체 파일 내 alias 중복 ${localDups.length} 건${RESET}`);
    for (const d of localDups) {
      console.log(`  ${d.file}`);
      for (const dup of d.dups) console.log(`    - "${dup}" 중복 선언`);
    }
  }

  if (selfRedundant.length > 0) {
    console.log(`\n${YELLOW}${BOLD}[WARN] 자기 파일의 title/filename 과 동일한 alias ${selfRedundant.length} 건${RESET}`);
    console.log(`  slug/filename/title 은 자동으로 wikilink 매칭 → alias 로 등록해도 무의미.`);
    for (const r of selfRedundant.slice(0, 30)) {
      console.log(`  ${r.file}: ${r.reason}`);
    }
    if (selfRedundant.length > 30) console.log(`  ... 그 외 ${selfRedundant.length - 30} 건`);
  }

  if (excessive.length > 0) {
    console.log(`\n${YELLOW}${BOLD}[WARN] Alias 초과 (>${MAX_ALIASES} 개) ${excessive.length} 건${RESET}`);
    console.log(`  Alias 를 많이 걸면 다른 문서와 충돌 확률 증가. 3-8 개 권장.`);
    for (const e of excessive.slice(0, 15)) {
      console.log(`  ${e.file} (${e.count} 개)`);
    }
    if (excessive.length > 15) console.log(`  ... 그 외 ${excessive.length - 15} 건`);
  }

  if (risky.length > 0) {
    console.log(`\n${YELLOW}${BOLD}[WARN] Risky alias (generic/짧음) ${risky.length} 건${RESET}`);
    const grouped = {};
    for (const r of risky) {
      const key = normKey(r.alias);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    }
    for (const [key, list] of Object.entries(grouped).sort((a, b) => b[1].length - a[1].length).slice(0, 20)) {
      console.log(`  "${key}" (${list[0].reason}) - 사용 문서 ${list.length} 개:`);
      for (const r of list.slice(0, 3)) console.log(`    ${r.file}`);
      if (list.length > 3) console.log(`    ... 그 외 ${list.length - 3}`);
    }
  }

  if (broken.length > 0) {
    console.log(`\n${YELLOW}${BOLD}[WARN] Broken wikilink ${broken.length} 건${RESET}`);
    const grouped = {};
    for (const b of broken) {
      if (!grouped[b.target]) grouped[b.target] = [];
      grouped[b.target].push(b.file);
    }
    for (const [target, files] of Object.entries(grouped).sort((a, b) => b[1].length - a[1].length).slice(0, 20)) {
      console.log(`  [[${target}]] ← 참조 ${files.length} 곳`);
      for (const f of files.slice(0, 3)) console.log(`    ${f}`);
      if (files.length > 3) console.log(`    ... 그 외 ${files.length - 3}`);
    }
    if (Object.keys(grouped).length > 20) {
      console.log(`  ... 그 외 target ${Object.keys(grouped).length - 20} 개`);
    }
  }

  console.log('');

  const hardCount = collisions.length + localDups.length;
  const softCount = selfRedundant.length + excessive.length + risky.length + broken.length;
  if (hardCount > 0) {
    console.log(`${RED}${BOLD}✗ Hard error: ${hardCount} 건 (충돌은 반드시 해결)${RESET}`);
    process.exit(1);
  }
  if (STRICT && softCount > 0) {
    console.log(`${YELLOW}${BOLD}✗ Strict mode: soft warning ${softCount} 건${RESET}`);
    process.exit(1);
  }
  if (hardCount === 0 && softCount === 0) {
    console.log(`\u001b[32m✓ 문제 없음\u001b[0m`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
