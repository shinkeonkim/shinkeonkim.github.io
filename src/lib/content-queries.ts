import { getCollection, type CollectionEntry } from 'astro:content';

export const WIKILINK_RE = /\[\[([^\]|#]+)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]/g;

export function getPublishedPosts(): Promise<CollectionEntry<'posts'>[]> {
  return getCollection('posts', ({ data }) => !data.draft);
}

export function getPublishedWiki(): Promise<CollectionEntry<'wiki'>[]> {
  return getCollection('wiki');
}

export function getPublishedNotes(): Promise<CollectionEntry<'notes'>[]> {
  return getCollection('notes');
}

export function getPublishedProjects(): Promise<CollectionEntry<'projects'>[]> {
  return getCollection('projects', ({ data }) => !data.draft);
}

export function getPublishedSources(): Promise<CollectionEntry<'sources'>[]> {
  return getCollection('sources');
}

export function sortByDateDesc<T extends { data: { date: Date } }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function sortByTitleAsc<T extends { data: { title: string } }>(entries: T[]): T[] {
  return [...entries].sort((a, b) => a.data.title.localeCompare(b.data.title));
}

export function extractWikilinkTargets(body: string): string[] {
  if (!body || !body.includes('[[')) return [];
  const targets: string[] = [];
  const re = new RegExp(WIKILINK_RE.source, WIKILINK_RE.flags);
  let match: RegExpExecArray | null;
  while ((match = re.exec(body)) !== null) {
    const target = match[1]?.trim();
    if (target) targets.push(target);
  }
  return targets;
}
