import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE_DESCRIPTION, SITE_TITLE } from '@/shared/config';
import { getPublishedPosts, sortByDateDesc } from '@/shared/lib/content/content-queries';
import { postToFeedItem } from '@/shared/lib/seo/feed';

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
