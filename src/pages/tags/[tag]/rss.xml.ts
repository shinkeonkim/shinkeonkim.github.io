import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { SITE_TITLE } from '../../../consts';
import { getPublishedPosts, sortByDateDesc } from '../../../lib/content-queries';
import { postToFeedItem } from '../../../lib/feed';

export async function getStaticPaths() {
  const [posts, wiki] = await Promise.all([getPublishedPosts(), getCollection('wiki')]);
  const slugToLabel = new Map<string, string>();
  const addTag = (raw: string): void => {
    const slug = raw.toLowerCase();
    if (!slugToLabel.has(slug)) slugToLabel.set(slug, raw);
  };
  for (const p of posts) p.data.tags.forEach(addTag);
  for (const w of wiki) w.data.tags.forEach(addTag);
  return Array.from(slugToLabel.entries()).map(([slug, label]) => ({
    params: { tag: slug },
    props: { tagLabel: label },
  }));
}

interface Props {
  tagLabel: string;
}

export async function GET(context: APIContext) {
  const tagSlug = context.params.tag!;
  const tag = (context.props as Props).tagLabel;
  const posts = sortByDateDesc(await getPublishedPosts())
    .filter((p) => p.data.tags.some((t) => t.toLowerCase() === tagSlug))
    .slice(0, 30);
  const items = await Promise.all(posts.map((p) => postToFeedItem(p)));

  return rss({
    title: `${SITE_TITLE} - #${tag}`,
    description: `'${tag}' 태그가 붙은 글 모음`,
    site: context.site ?? 'https://shinkeonkim.com',
    customData: `<language>ko-KR</language>`,
    items,
  });
}
