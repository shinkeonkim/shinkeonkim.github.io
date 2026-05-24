import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import { CONTENT_ROOT } from './path-utils';

export const prerender = false;

interface ParsedSource {
  id: string;
  title: string;
  type: string;
  author?: string;
  publisher?: string;
  year?: number;
  url?: string;
  aliases: string[];
  tags: string[];
}

function parseFrontmatter(raw: string): Record<string, unknown> {
  if (!raw.startsWith('---')) return {};
  const end = raw.indexOf('\n---', 3);
  if (end < 0) return {};
  const fm = raw.slice(3, end).trim();
  const data: Record<string, unknown> = {};
  let key: string | null = null;
  let inList: string | null = null;
  for (const line of fm.split('\n')) {
    if (!line.trim()) continue;
    if (inList && /^\s*-\s+/.test(line)) {
      const value = line.replace(/^\s*-\s+/, '').replace(/^["']|["']$/g, '');
      const arr = data[inList];
      if (Array.isArray(arr)) arr.push(value);
      continue;
    }
    inList = null;
    const m = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (!m) continue;
    key = m[1];
    const raw = m[2].trim();
    if (raw === '' || raw === '[]') {
      if (raw === '[]') data[key] = [];
      else {
        inList = key;
        data[key] = [];
      }
      continue;
    }
    if (raw.startsWith('[') && raw.endsWith(']')) {
      data[key] = raw
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
      continue;
    }
    if (/^-?\d+(\.\d+)?$/.test(raw)) {
      data[key] = Number(raw);
      continue;
    }
    if (raw === 'true' || raw === 'false') {
      data[key] = raw === 'true';
      continue;
    }
    data[key] = raw.replace(/^["']|["']$/g, '');
  }
  return data;
}

function listSources(): ParsedSource[] {
  const dir = path.join(CONTENT_ROOT, 'sources');
  if (!fs.existsSync(dir)) return [];
  const out: ParsedSource[] = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      const m = entry.name.match(/^(.+?)\.md$/);
      if (!m) continue;
      const rel = path.relative(dir, full).replace(/\\/g, '/');
      const id = rel.replace(/\.md$/, '');
      try {
        const raw = fs.readFileSync(full, 'utf-8');
        const fm = parseFrontmatter(raw);
        const aliases = Array.isArray(fm.aliases) ? (fm.aliases as string[]) : [];
        const tags = Array.isArray(fm.tags) ? (fm.tags as string[]) : [];
        out.push({
          id,
          title: typeof fm.title === 'string' ? fm.title : id,
          type: typeof fm.type === 'string' ? fm.type : 'other',
          author: typeof fm.author === 'string' ? fm.author : undefined,
          publisher: typeof fm.publisher === 'string' ? fm.publisher : undefined,
          year: typeof fm.year === 'number' ? fm.year : undefined,
          url: typeof fm.url === 'string' ? fm.url : undefined,
          aliases,
          tags,
        });
      } catch {
        out.push({ id, title: id, type: 'other', aliases: [], tags: [] });
      }
    }
  }
  out.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
  return out;
}

export const GET: APIRoute = () => {
  if (!import.meta.env.DEV) {
    return new Response('Not available', { status: 404 });
  }
  return new Response(JSON.stringify({ sources: listSources() }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
