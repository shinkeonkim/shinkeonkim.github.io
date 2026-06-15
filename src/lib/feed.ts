import type { CollectionEntry } from 'astro:content';
import { createMarkdownProcessor } from '@astrojs/markdown-remark';
import { SITE_AUTHOR, SITE_URL } from '../consts';

import { notePreview, noteTitle } from './notes';

export interface FeedItem {
  title: string;
  description: string;
  pubDate: Date;
  link: string;
  categories?: string[];
  author?: string;
  content?: string;
}

let processorPromise: ReturnType<typeof createMarkdownProcessor> | null = null;
async function getProcessor() {
  if (!processorPromise) processorPromise = createMarkdownProcessor({});
  return processorPromise;
}

function stripMdx(body: string): string {
  return body
    .replace(/^import\s+[^\n]+;\s*$/gm, '')
    .replace(/<([A-Z][A-Za-z0-9]*)([^>]*)\/>/g, '<!-- mdx-component: $1 -->')
    .replace(/<([A-Z][A-Za-z0-9]*)([^>]*)>([\s\S]*?)<\/\1>/g, '<!-- mdx-component: $1 -->\n$3');
}

function absolutizeUrls(html: string): string {
  return html
    .replace(/(href|src)="\/(?!\/)/g, `$1="${SITE_URL}/`)
    .replace(/(href|src)='\/(?!\/)/g, `$1='${SITE_URL}/`);
}

export async function renderBodyForFeed(rawBody: string): Promise<string> {
  if (!rawBody) return '';
  try {
    const processor = await getProcessor();
    const stripped = stripMdx(rawBody);
    const result = await processor.render(stripped);
    return absolutizeUrls(String(result.code ?? ''));
  } catch {
    return '';
  }
}

export async function postToFeedItem(
  post: CollectionEntry<'posts'>,
  options: { fullContent?: boolean } = {},
): Promise<FeedItem> {
  const item: FeedItem = {
    title: post.data.title,
    description: post.data.description ?? '',
    pubDate: post.data.date,
    link: `${SITE_URL}/posts/${post.id}/`,
    categories: post.data.tags,
    author: SITE_AUTHOR,
  };
  if (options.fullContent) {
    const body = (post as { body?: string }).body ?? '';
    item.content = await renderBodyForFeed(body);
  }
  return item;
}

export function noteToFeedItem(note: CollectionEntry<'notes'>): FeedItem {
  const body = (note as { body?: string }).body ?? '';
  return {
    title: noteTitle(body) || note.data.date.toISOString().slice(0, 10),
    description: notePreview(body, 240),
    pubDate: note.data.date,
    link: `${SITE_URL}/notes/${note.id}/`,
    categories: note.data.tags,
    author: SITE_AUTHOR,
  };
}

export async function wikiToFeedItem(
  wiki: CollectionEntry<'wiki'>,
  options: { fullContent?: boolean } = {},
): Promise<FeedItem> {
  const pubDate = wiki.data.updated ?? new Date(0);
  const item: FeedItem = {
    title: wiki.data.title,
    description: '',
    pubDate,
    link: `${SITE_URL}/wiki/${wiki.id}/`,
    categories: wiki.data.tags,
    author: SITE_AUTHOR,
  };
  if (options.fullContent) {
    const body = (wiki as { body?: string }).body ?? '';
    item.content = await renderBodyForFeed(body);
  }
  return item;
}
