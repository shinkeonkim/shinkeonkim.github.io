import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE_TITLE } from '@/shared/config';
import {
  getPublishedNotes,
  getPublishedPosts,
  getPublishedWiki,
} from '@/shared/lib/content/content-queries';
import { noteToFeedItem, postToFeedItem, wikiToFeedItem } from '../../lib/feed';

const FEED_LIMIT = 50;

interface DatedItem {
  date: Date;
  item: Awaited<ReturnType<typeof postToFeedItem>>;
}

export async function GET(context: APIContext) {
  const [posts, wiki, notes] = await Promise.all([
    getPublishedPosts(),
    getPublishedWiki(),
    getPublishedNotes(),
  ]);

  const collected: DatedItem[] = [];

  for (const p of posts) {
    const item = await postToFeedItem(p);
    item.title = `[글] ${item.title}`;
    collected.push({ date: p.data.date, item });
  }
  for (const w of wiki) {
    if (!w.data.updated) continue;
    const item = await wikiToFeedItem(w);
    item.title = `[위키] ${item.title}`;
    collected.push({ date: w.data.updated, item });
  }
  for (const n of notes) {
    const item = noteToFeedItem(n);
    item.title = `[노트] ${item.title}`;
    collected.push({ date: n.data.date, item });
  }

  collected.sort((a, b) => b.date.valueOf() - a.date.valueOf());
  const items = collected.slice(0, FEED_LIMIT).map((c) => c.item);

  return rss({
    title: `${SITE_TITLE} - 전체 최신`,
    description: '글, 위키, 노트의 최신 업데이트를 한곳에 모은 통합 피드',
    site: context.site ?? 'https://shinkeonkim.com',
    customData: `<language>ko-KR</language>`,
    items,
  });
}
