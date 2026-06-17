import path from 'node:path';
import fs from 'node:fs';

export const CONTENT_ROOT = path.resolve(process.cwd(), 'src/content');
export const COLLECTIONS = ['posts', 'notes', 'wiki', 'sources'] as const;
export type Collection = (typeof COLLECTIONS)[number];

export interface FileEntry {
  slug: string;
  ext: string;
}

export interface TreeEntry {
  name: string;
  type: 'file' | 'folder';
  slug: string;
  ext?: string;
  children?: TreeEntry[];
}

export function isCollection(value: string): value is Collection {
  return (COLLECTIONS as readonly string[]).includes(value);
}

export function listFiles(collection: Collection): FileEntry[] {
  const dir = path.join(CONTENT_ROOT, collection);
  if (!fs.existsSync(dir)) return [];
  const out: FileEntry[] = [];
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

export function listTree(collection: Collection): TreeEntry[] {
  const dir = path.join(CONTENT_ROOT, collection);
  if (!fs.existsSync(dir)) return [];
  return buildTree(dir, '');
}

function buildTree(absDir: string, relPrefix: string): TreeEntry[] {
  const entries = fs.readdirSync(absDir, { withFileTypes: true });
  const folders: TreeEntry[] = [];
  const files: TreeEntry[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
    const childRel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      folders.push({
        name: entry.name,
        type: 'folder',
        slug: childRel,
        children: buildTree(path.join(absDir, entry.name), childRel),
      });
    } else {
      const m = entry.name.match(/^(.+?)\.(md|mdx)$/);
      if (!m) continue;
      const baseName = m[1];
      const ext = '.' + m[2];
      const slug = relPrefix ? `${relPrefix}/${baseName}` : baseName;
      files.push({ name: entry.name, type: 'file', slug, ext });
    }
  }
  folders.sort((a, b) => a.name.localeCompare(b.name));
  files.sort((a, b) => a.name.localeCompare(b.name));
  return [...folders, ...files];
}

function safeResolve(collection: Collection, relPath: string): string {
  if (relPath.includes('..') || relPath.startsWith('/') || relPath.includes('\\')) {
    throw new Error('invalid path');
  }
  const base = path.join(CONTENT_ROOT, collection);
  const full = path.normalize(path.join(base, relPath));
  const rel = path.relative(base, full);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error('path traversal');
  }
  return full;
}

export function resolveFile(collection: Collection, slug: string, ext: '.md' | '.mdx'): string {
  return safeResolve(collection, slug + ext);
}

export function resolveFolder(collection: Collection, folderRel: string): string {
  return safeResolve(collection, folderRel);
}

export function loadFile(
  collection: Collection,
  slug: string,
): { content: string; ext: '.md' | '.mdx' } | null {
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

export function deleteFile(
  collection: Collection,
  slug: string,
  ext: '.md' | '.mdx',
): { path: string } {
  const full = resolveFile(collection, slug, ext);
  if (!fs.existsSync(full)) throw new Error('file not found');
  fs.unlinkSync(full);
  return { path: path.relative(process.cwd(), full) };
}

export function renameFile(
  collection: Collection,
  fromSlug: string,
  fromExt: '.md' | '.mdx',
  toSlug: string,
  toExt: '.md' | '.mdx',
): { from: string; to: string } {
  const src = resolveFile(collection, fromSlug, fromExt);
  const dst = resolveFile(collection, toSlug, toExt);
  if (!fs.existsSync(src)) throw new Error('source file not found');
  if (fs.existsSync(dst)) throw new Error('destination already exists');
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.renameSync(src, dst);
  return {
    from: path.relative(process.cwd(), src),
    to: path.relative(process.cwd(), dst),
  };
}

export function moveFile(
  fromCollection: Collection,
  fromSlug: string,
  fromExt: '.md' | '.mdx',
  toCollection: Collection,
  toSlug: string,
): { from: string; to: string } {
  const src = resolveFile(fromCollection, fromSlug, fromExt);
  const dst = resolveFile(toCollection, toSlug, fromExt);
  if (!fs.existsSync(src)) throw new Error('source file not found');
  if (fs.existsSync(dst)) throw new Error('destination already exists');
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.renameSync(src, dst);
  return {
    from: path.relative(process.cwd(), src),
    to: path.relative(process.cwd(), dst),
  };
}

export function createFolder(collection: Collection, folderRel: string): { path: string } {
  const full = resolveFolder(collection, folderRel);
  if (fs.existsSync(full)) {
    const stat = fs.statSync(full);
    if (stat.isDirectory()) return { path: path.relative(process.cwd(), full) };
    throw new Error('path exists but is not a directory');
  }
  fs.mkdirSync(full, { recursive: true });
  const gitkeep = path.join(full, '.gitkeep');
  fs.writeFileSync(gitkeep, '', 'utf-8');
  return { path: path.relative(process.cwd(), full) };
}

export function renameFolder(
  collection: Collection,
  fromRel: string,
  toRel: string,
): { from: string; to: string } {
  const src = resolveFolder(collection, fromRel);
  const dst = resolveFolder(collection, toRel);
  if (!fs.existsSync(src) || !fs.statSync(src).isDirectory()) {
    throw new Error('source folder not found');
  }
  if (fs.existsSync(dst)) throw new Error('destination already exists');
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.renameSync(src, dst);
  return {
    from: path.relative(process.cwd(), src),
    to: path.relative(process.cwd(), dst),
  };
}

export function deleteFolder(
  collection: Collection,
  folderRel: string,
): { path: string; removed: number } {
  const full = resolveFolder(collection, folderRel);
  if (!fs.existsSync(full)) throw new Error('folder not found');
  if (!fs.statSync(full).isDirectory()) throw new Error('not a folder');
  let removed = 0;
  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const child = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(child);
      else removed++;
    }
  }
  walk(full);
  fs.rmSync(full, { recursive: true, force: true });
  return { path: path.relative(process.cwd(), full), removed };
}
