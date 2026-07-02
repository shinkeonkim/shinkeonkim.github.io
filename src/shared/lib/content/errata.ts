import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ErrataCollection } from '@/shared/config';

export interface ErrataIssue {
  number: number;
  title: string;
  state: 'open' | 'closed';
  createdAt: string;
  closedAt?: string;
  url: string;
  author: string;
  labels: string[];
  excerpt?: string;
}

export type ErrataMap = Record<string, ErrataIssue[]>;

const ERRATA_PATH = path.join(process.cwd(), 'src/data/errata.json');

let cache: Promise<ErrataMap> | null = null;

async function load(): Promise<ErrataMap> {
  try {
    const raw = await readFile(ERRATA_PATH, 'utf8');
    return JSON.parse(raw) as ErrataMap;
  } catch {
    return {};
  }
}

export function loadErrata(): Promise<ErrataMap> {
  if (!cache) cache = load();
  return cache;
}

export async function getErrataFor(
  collection: ErrataCollection,
  slug: string,
): Promise<ErrataIssue[]> {
  const all = await loadErrata();
  return all[`${collection}:${slug}`] ?? [];
}
