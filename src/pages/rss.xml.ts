import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';

export async function GET(context: APIContext) {
  const posts = (await getCollection('posts', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );

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
