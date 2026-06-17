import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE_TITLE } from '@/shared/config';
import { getPublishedNotes, sortByDateDesc } from '@/shared/lib/content/content-queries';
import { noteToFeedItem } from '@/shared/lib/seo/feed';

export async function GET(context: APIContext) {
  const notes = sortByDateDesc(await getPublishedNotes()).slice(0, 100);
  return rss({
    title: `${SITE_TITLE} - 노트`,
    description: '짧은 메모와 노트 모음',
    site: context.site ?? 'https://shinkeonkim.com',
    customData: `<language>ko-KR</language>`,
    items: notes.map(noteToFeedItem),
  });
}
