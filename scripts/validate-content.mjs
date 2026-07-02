#!/usr/bin/env bun
import fs from 'node:fs/promises';
import path from 'node:path';
import { parseFrontmatter } from '@astrojs/markdown-remark';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const CONTENT_DIR = path.join(REPO_ROOT, 'src/content');
const PUBLIC_DIR = path.join(REPO_ROOT, 'public');
const COLLECTIONS = ['posts', 'notes', 'wiki', 'sources'];
const WIKILINK_RE = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;

const args = new Set(process.argv.slice(2));
const STRICT = args.has('--strict');
const JSON_OUT = args.has('--json');

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

async function loadEntries() {
  const all = [];
  for (const collection of COLLECTIONS) {
    const dir = path.join(CONTENT_DIR, collection);
    const files = await walk(dir);
    for (const file of files) {
      const raw = await fs.readFile(file, 'utf-8');
      let fm;
      let body;
      try {
        const parsed = parseFrontmatter(raw);
        fm = parsed.frontmatter ?? {};
        body = parsed.content ?? '';
      } catch {
        all.push({ file, collection, fm: {}, body: '', parseError: true });
        continue;
      }
      const rel = path.relative(dir, file).replace(/\\/g, '/');
      const slug = rel.replace(/\.(md|mdx)$/, '');
      all.push({ file, collection, slug, fm, body });
    }
  }
  return all;
}

// Normalize for slug comparison: NFC to canonicalize Hangul jamo
// (macOS HFS+/APFS returns NFD filenames; git/Linux returns NFC),
// then lowercase for case-insensitive matching.
function normKey(s) {
  return String(s).normalize('NFC').toLowerCase();
}

function buildSlugMap(entries) {
  const map = new Map();
  for (const e of entries) {
    if (!e.slug) continue;
    const filename = e.slug.split('/').pop();
    const aliases = Array.isArray(e.fm.aliases) ? e.fm.aliases : [];
    const keys = [e.slug, filename, e.fm.title, ...aliases].filter(Boolean);
    for (const k of keys) {
      const key = normKey(k);
      if (!map.has(key)) map.set(key, e);
    }
  }
  return map;
}

function classify(severity, _entries, collection, slug, message) {
  return { severity, collection, slug, message };
}

// Mirrors src/shared/lib/content/content-graph.ts detectLearningPathCycles:
// prereq target -> source, follows source -> target (learning-order DAG).
function findLearningPathCycles(entries, slugMap) {
  const adj = new Map();
  function addEdge(from, to) {
    const b = adj.get(from) ?? [];
    b.push(to);
    adj.set(from, b);
  }
  for (const e of entries) {
    if (e.collection !== 'posts' && e.collection !== 'wiki') continue;
    const sourceKey = `${e.collection}:${e.slug}`;
    const pre = Array.isArray(e.fm.prerequisites) ? e.fm.prerequisites : [];
    const lead = Array.isArray(e.fm.leadsTo) ? e.fm.leadsTo : [];
    for (const raw of pre) {
      const target = slugMap.get(normKey(String(raw ?? '').trim()));
      if (!target) continue;
      const targetKey = `${target.collection}:${target.slug}`;
      if (targetKey === sourceKey) continue;
      addEdge(targetKey, sourceKey);
    }
    for (const raw of lead) {
      const target = slugMap.get(normKey(String(raw ?? '').trim()));
      if (!target) continue;
      const targetKey = `${target.collection}:${target.slug}`;
      if (targetKey === sourceKey) continue;
      addEdge(sourceKey, targetKey);
    }
  }

  const cycles = [];
  const seenKeys = new Set();
  const visited = new Set();
  const stack = [];
  const stackIdx = new Map();

  function dfs(node) {
    if (stackIdx.has(node)) {
      const start = stackIdx.get(node);
      const cyc = stack.slice(start).concat(node);
      const key = [...cyc].sort().join('|');
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        cycles.push(cyc.map((k) => {
          const [collection, slug] = k.split(':');
          return { collection, slug };
        }));
      }
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    stack.push(node);
    stackIdx.set(node, stack.length - 1);
    for (const next of adj.get(node) ?? []) dfs(next);
    stack.pop();
    stackIdx.delete(node);
  }
  for (const start of adj.keys()) dfs(start);
  return cycles;
}

async function checkAssetExists(rel) {
  if (!rel) return true;
  if (/^https?:\/\//.test(rel)) return true;
  const abs = rel.startsWith('/')
    ? path.join(PUBLIC_DIR, rel.slice(1))
    : path.join(REPO_ROOT, rel);
  try {
    await fs.access(abs);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const entries = await loadEntries();
  const violations = [];
  const slugMap = buildSlugMap(entries);

  const sourceIds = new Set(
    entries.filter((e) => e.collection === 'sources').map((e) => e.slug.normalize('NFC')),
  );

  const slugSeenByCollection = new Map();
  for (const e of entries) {
    if (e.parseError) {
      violations.push(classify('error', entries, e.collection, e.file, 'frontmatter parse error'));
      continue;
    }
    const key = `${e.collection}:${e.slug}`;
    if (slugSeenByCollection.has(key)) {
      violations.push(
        classify(
          'error',
          entries,
          e.collection,
          e.slug,
          `duplicate slug (also at ${slugSeenByCollection.get(key)})`,
        ),
      );
    } else {
      slugSeenByCollection.set(key, path.relative(REPO_ROOT, e.file));
    }

    if (e.fm.cover) {
      const exists = await checkAssetExists(e.fm.cover);
      if (!exists) {
        violations.push(classify('error', entries, e.collection, e.slug, `cover not found: ${e.fm.cover}`));
      }
      if (!e.fm.coverAlt) {
        violations.push(
          classify('warn', entries, e.collection, e.slug, 'cover present but coverAlt missing (a11y / SEO)'),
        );
      }
    }
    if (e.fm.thumbnail) {
      const exists = await checkAssetExists(e.fm.thumbnail);
      if (!exists) {
        violations.push(
          classify('error', entries, e.collection, e.slug, `thumbnail not found: ${e.fm.thumbnail}`),
        );
      }
    }

    if (e.collection === 'posts' || e.collection === 'wiki') {
      const d = e.fm.description;
      if (typeof d === 'string') {
        if (d.length > 0 && d.length < 50) {
          violations.push(
            classify('warn', entries, e.collection, e.slug, `description short (${d.length} chars, ≥60 권장)`),
          );
        } else if (d.length > 200) {
          violations.push(
            classify('warn', entries, e.collection, e.slug, `description long (${d.length} chars, ≤160 권장)`),
          );
        }
      }
    }

    if (Array.isArray(e.fm.references)) {
      for (const ref of e.fm.references) {
        if (ref && typeof ref === 'object' && typeof ref.id === 'string') {
          if (!sourceIds.has(ref.id.normalize('NFC'))) {
            violations.push(
              classify('error', entries, e.collection, e.slug, `references unknown source id: ${ref.id}`),
            );
          }
        }
      }
    }

    if (e.body && e.body.includes('[[')) {
      const re = new RegExp(WIKILINK_RE.source, WIKILINK_RE.flags);
      let match;
      while ((match = re.exec(e.body)) !== null) {
        const target = match[1] ? normKey(match[1].trim()) : '';
        if (!target) continue;
        if (!slugMap.has(target)) {
          violations.push(
            classify('warn', entries, e.collection, e.slug, `broken wikilink: [[${match[1].trim()}]]`),
          );
        }
      }
    }

    if (e.collection === 'posts' || e.collection === 'wiki') {
      for (const kind of ['prerequisites', 'leadsTo']) {
        const list = Array.isArray(e.fm[kind]) ? e.fm[kind] : [];
        for (const raw of list) {
          const key = normKey(String(raw ?? '').trim());
          if (!key) continue;
          if (!slugMap.has(key)) {
            violations.push(
              classify(
                'warn',
                entries,
                e.collection,
                e.slug,
                `${kind} unresolved: "${raw}" (no matching wiki/post/note slug)`,
              ),
            );
          }
        }
      }
    }
  }

  for (const cycle of findLearningPathCycles(entries, slugMap)) {
    const trail = cycle.map((n) => `${n.collection}/${n.slug}`).join(' -> ');
    violations.push(classify('warn', entries, cycle[0].collection, cycle[0].slug, `learning-path cycle: ${trail}`));
  }

  const errors = violations.filter((v) => v.severity === 'error');
  const warnings = violations.filter((v) => v.severity === 'warn');

  if (JSON_OUT) {
    console.log(JSON.stringify({ errors, warnings, total: violations.length }, null, 2));
  } else {
    for (const v of violations) {
      const tag = v.severity === 'error' ? '\u001b[31m[ERROR]\u001b[0m' : '\u001b[33m[WARN] \u001b[0m';
      console.log(`${tag} ${v.collection}/${v.slug ?? v.file}: ${v.message}`);
    }
    console.log(
      `\n${errors.length} errors, ${warnings.length} warnings across ${entries.length} entries.`,
    );
  }

  const failOnWarn = STRICT && warnings.length > 0;
  if (errors.length > 0 || failOnWarn) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
