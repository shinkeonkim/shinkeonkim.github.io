import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';
import { getPublishedPosts, sortByDateDesc } from '../lib/content-queries';

export async function GET(context: APIContext) {
  const posts = sortByDateDesc(await getPublishedPosts());

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site ?? 'https://shinkeonkim.com',
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description ?? '',
      pubDate: post.data.date,
      link: `/posts/${post.id}/`,
      categories: post.data.tags,
    })),
  });
}
