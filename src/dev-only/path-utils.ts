import path from 'node:path';
import fs from 'node:fs';

export const CONTENT_ROOT = path.resolve(process.cwd(), 'src/content');
export const COLLECTIONS = ['posts', 'notes', 'wiki'] as const;
export type Collection = (typeof COLLECTIONS)[number];

export function isCollection(value: string): value is Collection {
  return (COLLECTIONS as readonly string[]).includes(value);
}

export function listFiles(collection: Collection): { slug: string; ext: string }[] {
  const dir = path.join(CONTENT_ROOT, collection);
  if (!fs.existsSync(dir)) return [];
  const out: { slug: string; ext: string }[] = [];
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
      const m = entry.name.match(/^(.+?)\.(md|mdx)$/);
      if (!m) continue;
      const rel = path.relative(dir, full).replace(/\\/g, '/');
      out.push({
        slug: rel.replace(/\.(md|mdx)$/, ''),
        ext: '.' + m[2],
      });
    }
  }
  out.sort((a, b) => a.slug.localeCompare(b.slug));
  return out;
}

export function resolveFile(collection: Collection, slug: string, ext: '.md' | '.mdx'): string {
  if (slug.includes('..') || slug.startsWith('/') || slug.includes('\\')) {
    throw new Error('invalid slug');
  }
  const normalized = path.normalize(slug).replace(/^[/\\]+/, '');
  const base = path.join(CONTENT_ROOT, collection);
  const full = path.join(base, normalized + ext);
  const relative = path.relative(base, full);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('path traversal');
  }
  return full;
}

export function loadFile(collection: Collection, slug: string): { content: string; ext: '.md' | '.mdx' } | null {
  for (const ext of ['.md', '.mdx'] as const) {
    const full = resolveFile(collection, slug, ext);
    if (fs.existsSync(full)) {
      return { content: fs.readFileSync(full, 'utf-8'), ext };
    }
  }
  return null;
}

export function saveFile(
  collection: Collection,
  slug: string,
  ext: '.md' | '.mdx',
  content: string,
): { path: string; bytes: number } {
  const full = resolveFile(collection, slug, ext);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf-8');
  return { path: path.relative(process.cwd(), full), bytes: Buffer.byteLength(content, 'utf-8') };
}
