import type { CollectionEntry } from 'astro:content';
import { getPublishedNotes, getPublishedPosts, getPublishedWiki } from './content-queries';
import { canonicalId, getContentGraph } from './content-graph';
import { noteTitle } from './notes';
import { canonicalizeTag } from '@/data/tags';

export type RelatedCollection = 'posts' | 'wiki' | 'notes';

export interface RelatedEntry {
  collection: RelatedCollection;
  id: string;
  title: string;
  date?: Date;
  score: number;
  shared: string[];
  signals?: {
    tags: number;
    title: number;
    sources: number;
    wikilink: number;
    bonus: number;
  };
}

type Candidate =
  | CollectionEntry<'posts'>
  | CollectionEntry<'wiki'>
  | CollectionEntry<'notes'>;

const TAG_NORMALIZE_RE = /\s+/g;
const TITLE_TOKEN_SPLIT_RE = /[^\p{Script=Hangul}a-z0-9]+/giu;
const MIN_TITLE_TOKEN_LEN = 2;
const MAX_WIKILINK_DEPTH = 2;

const W_TAGS = 1.0;
const W_TITLE = 0.6;
const W_SOURCES = 0.5;
const W_WIKI_1HOP = 0.5;
const W_WIKI_2HOP = 0.2;
const BONUS_CATEGORY = 0.15;
const BONUS_SERIES = 0.1;

function normalizeTag(tag: string): string {
  return canonicalizeTag(tag.replace(TAG_NORMALIZE_RE, ''));
}

function tokenizeTitle(text: string | undefined): Set<string> {
  const out = new Set<string>();
  if (!text) return out;
  const re = new RegExp(TITLE_TOKEN_SPLIT_RE.source, TITLE_TOKEN_SPLIT_RE.flags);
  for (const part of text.toLowerCase().split(re)) {
    if (part.length >= MIN_TITLE_TOKEN_LEN) out.add(part);
  }
  return out;
}

function extractSourceIds(refs: unknown): Set<string> {
  const out = new Set<string>();
  if (!Array.isArray(refs)) return out;
  for (const r of refs) {
    if (r && typeof r === 'object') {
      const id = (r as { id?: unknown }).id;
      if (typeof id === 'string' && id) out.add(id.normalize('NFC'));
    }
  }
  return out;
}

function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let i = 0;
  for (const x of a) if (b.has(x)) i++;
  if (i === 0) return 0;
  const u = a.size + b.size - i;
  return i / u;
}

function intersection(a: ReadonlySet<string>, b: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const x of a) if (b.has(x)) out.push(x);
  return out;
}

interface CandidateInfo {
  collection: RelatedCollection;
  id: string;
  title: string;
  date?: Date;
  category?: string;
  series?: string;
  tags: ReadonlySet<string>;
  titleTokens: ReadonlySet<string>;
  sources: ReadonlySet<string>;
}

interface RelatedIndex {
  candidates: CandidateInfo[];
  byCanonicalId: Map<string, CandidateInfo>;
  wikilinkNeighbors: Map<string, Set<string>>;
}

let cache: Promise<RelatedIndex> | null = null;

async function loadIndex(): Promise<RelatedIndex> {
  if (!cache) {
    cache = (async () => {
      const [posts, wiki, notes, graph] = await Promise.all([
        getPublishedPosts(),
        getPublishedWiki(),
        getPublishedNotes(),
        getContentGraph(),
      ]);
      const candidates: CandidateInfo[] = [];
      const byCanonicalId = new Map<string, CandidateInfo>();

      for (const p of posts as Candidate[]) {
        if (p.collection !== 'posts') continue;
        const info: CandidateInfo = {
          collection: 'posts',
          id: p.id,
          title: p.data.title,
          date: p.data.date,
          category: p.data.category,
          series: p.data.series,
          tags: new Set((p.data.tags ?? []).map(normalizeTag).filter(Boolean)),
          titleTokens: tokenizeTitle(p.data.title),
          sources: extractSourceIds((p.data as { references?: unknown }).references),
        };
        candidates.push(info);
        byCanonicalId.set(canonicalId('posts', p.id), info);
      }
      for (const w of wiki as Candidate[]) {
        if (w.collection !== 'wiki') continue;
        const info: CandidateInfo = {
          collection: 'wiki',
          id: w.id,
          title: w.data.title,
          tags: new Set((w.data.tags ?? []).map(normalizeTag).filter(Boolean)),
          titleTokens: tokenizeTitle(w.data.title),
          sources: extractSourceIds((w.data as { references?: unknown }).references),
        };
        candidates.push(info);
        byCanonicalId.set(canonicalId('wiki', w.id), info);
      }
      for (const n of notes as Candidate[]) {
        if (n.collection !== 'notes') continue;
        const body = (n as { body?: string }).body ?? '';
        const title = noteTitle(body) || n.id;
        const info: CandidateInfo = {
          collection: 'notes',
          id: n.id,
          title,
          date: n.data.date,
          tags: new Set((n.data.tags ?? []).map(normalizeTag).filter(Boolean)),
          titleTokens: tokenizeTitle(title),
          sources: extractSourceIds((n.data as { references?: unknown }).references),
        };
        candidates.push(info);
        byCanonicalId.set(canonicalId('notes', n.id), info);
      }

      const wikilinkNeighbors = new Map<string, Set<string>>();
      const addEdge = (a: string, b: string): void => {
        if (a === b) return;
        let na = wikilinkNeighbors.get(a);
        if (!na) {
          na = new Set();
          wikilinkNeighbors.set(a, na);
        }
        na.add(b);
        let nb = wikilinkNeighbors.get(b);
        if (!nb) {
          nb = new Set();
          wikilinkNeighbors.set(b, nb);
        }
        nb.add(a);
      };
      for (const link of graph.links) {
        if (link.kind !== 'wikilink') continue;
        addEdge(String(link.source), String(link.target));
      }

      return { candidates, byCanonicalId, wikilinkNeighbors };
    })();
  }
  return cache;
}

function distancesFrom(
  seedId: string,
  neighbors: Map<string, Set<string>>,
  maxDepth: number,
): Map<string, number> {
  const out = new Map<string, number>([[seedId, 0]]);
  let frontier: string[] = [seedId];
  for (let depth = 1; depth <= maxDepth; depth++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const n of neighbors.get(id) ?? []) {
        if (out.has(n)) continue;
        out.set(n, depth);
        next.push(n);
      }
    }
    if (next.length === 0) break;
    frontier = next;
  }
  return out;
}

export interface ComputeRelatedOptions {
  collection: RelatedCollection;
  slug: string;
  tags: string[];
  category?: string;
  series?: string;
  limit?: number;
}

export async function computeRelated(opts: ComputeRelatedOptions): Promise<RelatedEntry[]> {
  const index = await loadIndex();
  const seedCanonical = canonicalId(opts.collection, opts.slug);
  const seedInfo = index.byCanonicalId.get(seedCanonical);

  const seedTags = new Set(opts.tags.map(normalizeTag).filter(Boolean));
  const seedTitleTokens = seedInfo?.titleTokens ?? new Set<string>();
  const seedSources = seedInfo?.sources ?? new Set<string>();

  const distances = distancesFrom(seedCanonical, index.wikilinkNeighbors, MAX_WIKILINK_DEPTH);

  const results: RelatedEntry[] = [];
  for (const c of index.candidates) {
    if (c.collection === opts.collection && c.id === opts.slug) continue;

    const tagJ = jaccard(seedTags, c.tags);
    const titleJ = jaccard(seedTitleTokens, c.titleTokens);
    const sourceJ = jaccard(seedSources, c.sources);
    const distance = distances.get(canonicalId(c.collection, c.id)) ?? Infinity;
    const wikilinkScore = distance === 1 ? W_WIKI_1HOP : distance === 2 ? W_WIKI_2HOP : 0;

    let bonus = 0;
    if (opts.category && c.collection === 'posts' && c.category === opts.category) {
      bonus += BONUS_CATEGORY;
    }
    if (opts.series && c.collection === 'posts' && c.series === opts.series) {
      bonus += BONUS_SERIES;
    }

    const tagsScore = tagJ * W_TAGS;
    const titleScore = titleJ * W_TITLE;
    const sourcesScore = sourceJ * W_SOURCES;
    const score = tagsScore + titleScore + sourcesScore + wikilinkScore + bonus;
    if (score <= 0) continue;

    results.push({
      collection: c.collection,
      id: c.id,
      title: c.title,
      date: c.date,
      score,
      shared: intersection(seedTags, c.tags),
      signals: {
        tags: tagsScore,
        title: titleScore,
        sources: sourcesScore,
        wikilink: wikilinkScore,
        bonus,
      },
    });
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const at = a.date?.valueOf() ?? 0;
    const bt = b.date?.valueOf() ?? 0;
    return bt - at;
  });

  return results.slice(0, opts.limit ?? 5);
}
