import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import { COLLECTIONS, CONTENT_ROOT, type Collection } from './path-utils';
import { errorResponse, jsonResponse, notFoundResponse } from './api-utils';

export const prerender = false;

interface GrepBody {
  query?: string;
  regex?: boolean;
  caseSensitive?: boolean;
  maxResults?: number;
}

interface GrepMatch {
  collection: Collection;
  slug: string;
  ext: string;
  line: number;
  column: number;
  text: string;
}

const HARD_LIMIT = 500;

function walkFiles(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, out);
      continue;
    }
    if (/\.(md|mdx)$/.test(entry.name)) out.push(full);
  }
}

function buildRegex(query: string, isRegex: boolean, caseSensitive: boolean): RegExp | null {
  const flags = caseSensitive ? 'g' : 'gi';
  try {
    if (isRegex) return new RegExp(query, flags);
    return new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
  } catch {
    return null;
  }
}

export const POST: APIRoute = async ({ request }) => {
  if (!import.meta.env.DEV) return notFoundResponse();
  let body: GrepBody;
  try {
    body = (await request.json()) as GrepBody;
  } catch {
    return errorResponse('invalid json', 400);
  }
  const query = (body.query ?? '').trim();
  if (!query) return jsonResponse({ matches: [], truncated: false, scanned: 0 });
  const re = buildRegex(query, body.regex === true, body.caseSensitive === true);
  if (!re) return errorResponse('invalid regex', 400);
  const cap = Math.min(Math.max(1, body.maxResults ?? HARD_LIMIT), HARD_LIMIT);

  try {
    const matches: GrepMatch[] = [];
    let scanned = 0;
    let truncated = false;
    outer: for (const collection of COLLECTIONS) {
      const files: string[] = [];
      walkFiles(path.join(CONTENT_ROOT, collection), files);
      for (const full of files) {
        scanned += 1;
        const content = fs.readFileSync(full, 'utf-8');
        const lines = content.split('\n');
        const m = /^(.+?)\.(md|mdx)$/.exec(path.basename(full));
        if (!m) continue;
        const ext = '.' + m[2];
        const rel = path
          .relative(path.join(CONTENT_ROOT, collection), full)
          .replace(/\\/g, '/');
        const slug = rel.replace(/\.(md|mdx)$/, '');
        for (let i = 0; i < lines.length; i += 1) {
          const line = lines[i];
          re.lastIndex = 0;
          const hit = re.exec(line);
          if (!hit) continue;
          matches.push({
            collection,
            slug,
            ext,
            line: i + 1,
            column: hit.index + 1,
            text: line.length > 200 ? line.slice(0, 200) + '…' : line,
          });
          if (matches.length >= cap) {
            truncated = true;
            break outer;
          }
        }
      }
    }
    return jsonResponse({ matches, truncated, scanned });
  } catch (err) {
    return errorResponse(err, 500);
  }
};
