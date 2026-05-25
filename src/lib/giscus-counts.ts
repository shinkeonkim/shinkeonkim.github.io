import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface GiscusCount {
  comments: number;
  reactions: number;
}

export interface GiscusCountsFile {
  generatedAt: string;
  counts: Record<string, GiscusCount>;
}

let cached: GiscusCountsFile | null = null;

async function load(): Promise<GiscusCountsFile> {
  if (cached) return cached;
  const path = join(process.cwd(), '.cache', 'giscus-counts.json');
  try {
    const text = await readFile(path, 'utf-8');
    cached = JSON.parse(text) as GiscusCountsFile;
  } catch {
    cached = { generatedAt: '', counts: {} };
  }
  return cached;
}

export async function getCommentCount(slug: string): Promise<number> {
  const { counts } = await load();
  return counts[slug]?.comments ?? 0;
}

export async function getCounts(slug: string): Promise<GiscusCount> {
  const { counts } = await load();
  return counts[slug] ?? { comments: 0, reactions: 0 };
}
