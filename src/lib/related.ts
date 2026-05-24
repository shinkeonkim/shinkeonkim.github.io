import type { CollectionEntry } from 'astro:content';
import { getPublishedPosts, getPublishedWiki } from './content-queries';

export interface RelatedEntry {
  collection: 'posts' | 'wiki';
  id: string;
  title: string;
  date?: Date;
  score: number;
  shared: string[];
}

type Candidate = CollectionEntry<'posts'> | CollectionEntry<'wiki'>;

function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let intersection = 0;
  for (const x of a) if (b.has(x)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function intersection(a: ReadonlySet<string>, b: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const x of a) if (b.has(x)) out.push(x);
  return out;
}

function normalize(tag: string): string {
  return tag.trim().toLowerCase();
}

interface CandidateInfo {
  collection: 'posts' | 'wiki';
  id: string;
  title: string;
  date?: Date;
  category?: string;
  series?: string;
  tags: ReadonlySet<string>;
}

let cache: Promise<CandidateInfo[]> | null = null;

async function loadCandidates(): Promise<CandidateInfo[]> {
  if (!cache) {
    cache = (async () => {
      const [posts, wiki] = await Promise.all([getPublishedPosts(), getPublishedWiki()]);
      const candidates: CandidateInfo[] = [];
      for (const p of posts as Candidate[]) {
        if (p.collection === 'posts') {
          candidates.push({
            collection: 'posts',
            id: p.id,
            title: p.data.title,
            date: p.data.date,
            category: p.data.category,
            series: p.data.series,
            tags: new Set((p.data.tags ?? []).map(normalize)),
          });
        }
      }
      for (const w of wiki as Candidate[]) {
        if (w.collection === 'wiki') {
          candidates.push({
            collection: 'wiki',
            id: w.id,
            title: w.data.title,
            tags: new Set((w.data.tags ?? []).map(normalize)),
          });
        }
      }
      return candidates;
    })();
  }
  return cache;
}

export interface ComputeRelatedOptions {
  collection: 'posts' | 'wiki';
  slug: string;
  tags: string[];
  category?: string;
  series?: string;
  limit?: number;
}

export async function computeRelated(opts: ComputeRelatedOptions): Promise<RelatedEntry[]> {
  const candidates = await loadCandidates();
  const seedTags = new Set(opts.tags.map(normalize));
  if (seedTags.size === 0) return [];

  const scored: RelatedEntry[] = [];
  for (const c of candidates) {
    if (c.collection === opts.collection && c.id === opts.slug) continue;
    const shared = intersection(seedTags, c.tags);
    if (shared.length === 0) continue;

    let score = jaccard(seedTags, c.tags);
    if (opts.category && c.collection === 'posts' && c.category === opts.category) score += 0.15;
    if (opts.series && c.collection === 'posts' && c.series === opts.series) score += 0.1;

    scored.push({
      collection: c.collection,
      id: c.id,
      title: c.title,
      date: c.date,
      score,
      shared,
    });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aTime = a.date?.valueOf() ?? 0;
    const bTime = b.date?.valueOf() ?? 0;
    return bTime - aTime;
  });

  return scored.slice(0, opts.limit ?? 5);
}
