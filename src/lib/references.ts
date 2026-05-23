import { getCollection, type CollectionEntry } from 'astro:content';

export type ReferenceCollection = 'posts' | 'wiki';

export interface InlineReference {
  kind: 'inline';
  title: string;
  url?: string;
  author?: string;
  note?: string;
}

export interface SharedReference {
  kind: 'shared';
  id: string;
  page?: number;
  anchor?: string;
  note?: string;
  source: CollectionEntry<'sources'>;
}

export interface MissingReference {
  kind: 'missing';
  id: string;
  note?: string;
}

export type ResolvedReference = InlineReference | SharedReference | MissingReference;

export interface CitingDoc {
  collection: ReferenceCollection;
  slug: string;
  title: string;
  url: string;
  date?: Date;
  note?: string;
  page?: number;
  anchor?: string;
}

interface CitingEntry {
  ref: { id?: string; title?: string; note?: string; page?: number; anchor?: string };
  doc: CitingDoc;
}

let cache: Promise<ReferenceIndex> | null = null;

export interface ReferenceIndex {
  sources: Map<string, CollectionEntry<'sources'>>;
  citingBySourceId: Map<string, CitingDoc[]>;
}

export function getReferenceIndex(): Promise<ReferenceIndex> {
  if (!cache) cache = buildIndex();
  return cache;
}

function urlForDoc(collection: ReferenceCollection, slug: string): string {
  return collection === 'posts' ? `/posts/${slug}/` : `/wiki/${slug}/`;
}

async function buildIndex(): Promise<ReferenceIndex> {
  const [sourcesAll, posts, wiki] = await Promise.all([
    getCollection('sources'),
    getCollection('posts', ({ data }) => !data.draft),
    getCollection('wiki'),
  ]);
  const sources = new Map<string, CollectionEntry<'sources'>>();
  for (const s of sourcesAll) sources.set(s.id, s);

  const citingBySourceId = new Map<string, CitingDoc[]>();
  const collect = (collection: ReferenceCollection, entries: CitingEntry[]): void => {
    for (const { ref, doc } of entries) {
      if (!ref.id) continue;
      let list = citingBySourceId.get(ref.id);
      if (!list) {
        list = [];
        citingBySourceId.set(ref.id, list);
      }
      list.push({ ...doc, page: ref.page, anchor: ref.anchor, note: ref.note });
    }
    void collection;
  };

  function entriesFor(
    collection: ReferenceCollection,
    items: (CollectionEntry<'posts'> | CollectionEntry<'wiki'>)[],
  ): CitingEntry[] {
    const out: CitingEntry[] = [];
    for (const item of items) {
      const refs = (item.data as { references?: unknown[] }).references ?? [];
      if (!Array.isArray(refs) || refs.length === 0) continue;
      const data = item.data as { title?: string; date?: Date };
      const doc: CitingDoc = {
        collection,
        slug: item.id,
        title: data.title ?? item.id,
        url: urlForDoc(collection, item.id),
        date: data.date,
      };
      for (const r of refs) {
        out.push({ ref: r as CitingEntry['ref'], doc });
      }
    }
    return out;
  }

  collect('posts', entriesFor('posts', posts));
  collect('wiki', entriesFor('wiki', wiki));

  for (const list of citingBySourceId.values()) {
    list.sort((a, b) => {
      const ad = a.date?.valueOf() ?? 0;
      const bd = b.date?.valueOf() ?? 0;
      return bd - ad;
    });
  }

  return { sources, citingBySourceId };
}

export function resolveReferences(
  refs: unknown[] | undefined,
  index: ReferenceIndex,
): ResolvedReference[] {
  if (!Array.isArray(refs)) return [];
  const out: ResolvedReference[] = [];
  for (const raw of refs) {
    if (!raw || typeof raw !== 'object') continue;
    const obj = raw as Record<string, unknown>;
    if (typeof obj.id === 'string') {
      const source = index.sources.get(obj.id);
      if (source) {
        out.push({
          kind: 'shared',
          id: obj.id,
          page: typeof obj.page === 'number' ? obj.page : undefined,
          anchor: typeof obj.anchor === 'string' ? obj.anchor : undefined,
          note: typeof obj.note === 'string' ? obj.note : undefined,
          source,
        });
      } else {
        out.push({
          kind: 'missing',
          id: obj.id,
          note: typeof obj.note === 'string' ? obj.note : undefined,
        });
      }
      continue;
    }
    if (typeof obj.title === 'string') {
      out.push({
        kind: 'inline',
        title: obj.title,
        url: typeof obj.url === 'string' ? obj.url : undefined,
        author: typeof obj.author === 'string' ? obj.author : undefined,
        note: typeof obj.note === 'string' ? obj.note : undefined,
      });
    }
  }
  return out;
}

export function formatSourceLabel(source: CollectionEntry<'sources'>): string {
  const d = source.data;
  if (d.type === 'book') {
    return d.author ? `${d.author} · ${d.title}` : d.title;
  }
  return d.title;
}
