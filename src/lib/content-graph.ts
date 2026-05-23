import { getCollection } from 'astro:content';

export type Collection = 'posts' | 'notes' | 'wiki';

export interface ContentNode {
  id: string;
  collection: Collection;
  slug: string;
  title: string;
  url: string;
}

export interface ContentLink {
  source: string;
  target: string;
}

export interface ContentGraph {
  nodes: ContentNode[];
  links: ContentLink[];
  backlinks: Map<string, ContentNode[]>;
  slugMap: Map<string, ContentNode>;
}

const WIKILINK_RE = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;

let cache: Promise<ContentGraph> | null = null;

export function getContentGraph(): Promise<ContentGraph> {
  if (!cache) cache = build();
  return cache;
}

export function canonicalId(collection: Collection, slug: string): string {
  return `${collection}:${slug}`;
}

function urlFor(collection: Collection, slug: string): string {
  if (collection === 'posts') return `/posts/${slug}/`;
  if (collection === 'wiki') return `/wiki/${slug}/`;
  return `/notes/#${slug}`;
}

async function build(): Promise<ContentGraph> {
  const [posts, notes, wiki] = await Promise.all([
    getCollection('posts', ({ data }) => !data.draft),
    getCollection('notes'),
    getCollection('wiki'),
  ]);

  const nodes: ContentNode[] = [];
  const slugMap = new Map<string, ContentNode>();

  function addEntry(collection: Collection, entry: { id: string; data: Record<string, unknown> }) {
    const slug = entry.id;
    const data = entry.data as { title?: string; aliases?: string[] };
    const title = data.title ?? slug;
    const node: ContentNode = {
      id: canonicalId(collection, slug),
      collection,
      slug,
      title,
      url: urlFor(collection, slug),
    };
    nodes.push(node);

    const filename = slug.includes('/') ? slug.split('/').pop()! : slug;
    const aliases = Array.isArray(data.aliases) ? data.aliases : [];
    const keys = [slug, filename, title, ...aliases].filter(Boolean);
    for (const k of keys) {
      const lower = k.toLowerCase();
      if (!slugMap.has(lower)) slugMap.set(lower, node);
    }
  }

  for (const e of posts) addEntry('posts', e);
  for (const e of wiki) addEntry('wiki', e);
  for (const e of notes) addEntry('notes', e);

  const links: ContentLink[] = [];
  const linkSeen = new Set<string>();
  const backlinks = new Map<string, ContentNode[]>();
  const backlinkSeen = new Map<string, Set<string>>();

  function scan(entry: { id: string; body?: string }) {
    const body = entry.body ?? '';
    if (!body || !body.includes('[[')) return;
    const sourceNode = slugMap.get(entry.id.toLowerCase());
    if (!sourceNode) return;

    const re = new RegExp(WIKILINK_RE.source, WIKILINK_RE.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(body)) !== null) {
      const targetText = m[1].trim().toLowerCase();
      const targetNode = slugMap.get(targetText);
      if (!targetNode || targetNode.id === sourceNode.id) continue;

      const linkKey = `${sourceNode.id}->${targetNode.id}`;
      if (!linkSeen.has(linkKey)) {
        linkSeen.add(linkKey);
        links.push({ source: sourceNode.id, target: targetNode.id });
      }

      let bset = backlinkSeen.get(targetNode.id);
      if (!bset) {
        bset = new Set();
        backlinkSeen.set(targetNode.id, bset);
      }
      if (!bset.has(sourceNode.id)) {
        bset.add(sourceNode.id);
        let list = backlinks.get(targetNode.id);
        if (!list) {
          list = [];
          backlinks.set(targetNode.id, list);
        }
        list.push(sourceNode);
      }
    }
  }

  for (const e of posts) scan(e as { id: string; body?: string });
  for (const e of wiki) scan(e as { id: string; body?: string });
  for (const e of notes) scan(e as { id: string; body?: string });

  return { nodes, links, backlinks, slugMap };
}
