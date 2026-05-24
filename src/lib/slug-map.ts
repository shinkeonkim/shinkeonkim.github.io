export interface SlugMapEntry {
  collection: 'posts' | 'wiki' | 'notes';
  slug: string;
  title: string;
  url: string;
}

export type SlugMap = Map<string, SlugMapEntry>;

interface BuildOptions {
  posts: ReadonlyArray<{ id: string; data: Record<string, unknown> }>;
  wiki: ReadonlyArray<{ id: string; data: Record<string, unknown> }>;
  notes: ReadonlyArray<{ id: string; data: Record<string, unknown> }>;
}

function urlFor(collection: SlugMapEntry['collection'], slug: string): string {
  if (collection === 'posts') return `/posts/${slug}/`;
  if (collection === 'wiki') return `/wiki/${slug}/`;
  return `/notes/#${slug}`;
}

function keyFor(value: string): string {
  return value.toLowerCase();
}

export function buildSlugMap({ posts, wiki, notes }: BuildOptions): SlugMap {
  const map: SlugMap = new Map();

  const add = (collection: SlugMapEntry['collection'], entry: { id: string; data: Record<string, unknown> }): void => {
    const slug = entry.id;
    const data = entry.data;
    const title = typeof data.title === 'string' ? data.title : slug;
    const aliases = Array.isArray(data.aliases) ? data.aliases.filter((x): x is string => typeof x === 'string') : [];
    const filename = slug.includes('/') ? (slug.split('/').pop() ?? slug) : slug;
    const node: SlugMapEntry = {
      collection,
      slug,
      title,
      url: urlFor(collection, slug),
    };
    for (const k of [slug, filename, title, ...aliases].filter(Boolean)) {
      const key = keyFor(k as string);
      if (!map.has(key)) map.set(key, node);
    }
  };

  for (const p of posts) add('posts', p);
  for (const w of wiki) add('wiki', w);
  for (const n of notes) add('notes', n);

  return map;
}

export function resolveWikilink(map: SlugMap, target: string): SlugMapEntry | undefined {
  return map.get(keyFor(target));
}
