import type { CollectionEntry } from 'astro:content';
import { SITE_AUTHOR, SITE_URL } from '../consts';

export interface FeedItem {
  title: string;
  description: string;
  pubDate: Date;
  link: string;
  categories?: string[];
  author?: string;
}

export function postToFeedItem(post: CollectionEntry<'posts'>): FeedItem {
  return {
    title: post.data.title,
    description: post.data.description ?? '',
    pubDate: post.data.date,
    link: `${SITE_URL}/posts/${post.id}/`,
    categories: post.data.tags,
    author: SITE_AUTHOR,
  };
}

export function noteToFeedItem(note: CollectionEntry<'notes'>): FeedItem {
  const body = (note as { body?: string }).body ?? '';
  const firstLine = body.split('\n').find((l) => l.trim()) ?? '';
  const description = firstLine
    .replace(/\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]/g, (_m, target, alias) =>
      String(alias ?? target).trim(),
    )
    .slice(0, 240);
  return {
    title: note.data.date.toISOString().slice(0, 10),
    description,
    pubDate: note.data.date,
    link: `${SITE_URL}/notes/#${note.id}`,
    categories: note.data.tags,
    author: SITE_AUTHOR,
  };
}
