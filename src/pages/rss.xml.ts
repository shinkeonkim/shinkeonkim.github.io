import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { getPublishedPosts, sortByDateDesc } from '../lib/content-queries';
import { postToFeedItem } from '../lib/feed';

export async function GET(context: APIContext) {
  const posts = sortByDateDesc(await getPublishedPosts()).slice(0, 30);
  const items = await Promise.all(posts.map((p) => postToFeedItem(p, { fullContent: true })));

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site ?? 'https://shinkeonkim.com',
    customData: `<language>ko-KR</language>`,
    items,
  });
}
