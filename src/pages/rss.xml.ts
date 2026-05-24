import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE_AUTHOR, SITE_DESCRIPTION, SITE_TITLE } from '../consts';
import { getPublishedPosts, sortByDateDesc } from '../lib/content-queries';

export async function GET(context: APIContext) {
  const posts = sortByDateDesc(await getPublishedPosts()).slice(0, 50);

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site ?? 'https://shinkeonkim.com',
    customData: `<language>ko-KR</language>`,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description ?? '',
      pubDate: post.data.date,
      link: `/posts/${post.id}/`,
      categories: post.data.tags,
      author: SITE_AUTHOR,
    })),
  });
}
