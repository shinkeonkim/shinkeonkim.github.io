import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE_TITLE } from '../../consts';
import { getPublishedNotes, sortByDateDesc } from '../../lib/content-queries';
import { noteToFeedItem } from '../../lib/feed';

export async function GET(context: APIContext) {
  const notes = sortByDateDesc(await getPublishedNotes()).slice(0, 100);
  return rss({
    title: `${SITE_TITLE} - 한줄 노트`,
    description: '짧은 메모 / 한줄 노트 모음',
    site: context.site ?? 'https://shinkeonkim.com',
    customData: `<language>ko-KR</language>`,
    items: notes.map(noteToFeedItem),
  });
}
