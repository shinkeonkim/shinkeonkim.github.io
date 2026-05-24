import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE_TITLE } from '../../../consts';
import { getPublishedPosts, sortByDateDesc } from '../../../lib/content-queries';
import { postToFeedItem } from '../../../lib/feed';

export async function getStaticPaths() {
  const [posts, wiki] = await Promise.all([getPublishedPosts(), getCollection('wiki')]);
  const tags = new Set<string>();
  for (const p of posts) p.data.tags.forEach((t) => tags.add(t));
  for (const w of wiki) w.data.tags.forEach((t) => tags.add(t));
  return Array.from(tags).map((tag) => ({ params: { tag } }));
}

export async function GET(context: APIContext) {
  const tag = context.params.tag!;
  const posts = sortByDateDesc(await getPublishedPosts())
    .filter((p) => p.data.tags.includes(tag))
    .slice(0, 50);

  return rss({
    title: `${SITE_TITLE} - #${tag}`,
    description: `'${tag}' 태그가 붙은 글 모음`,
    site: context.site ?? 'https://shinkeonkim.com',
    customData: `<language>ko-KR</language>`,
    items: posts.map(postToFeedItem),
  });
}
