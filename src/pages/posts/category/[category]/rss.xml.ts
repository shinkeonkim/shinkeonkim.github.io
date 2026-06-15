import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE_TITLE } from '../../../../consts';
import { sortByDateDesc } from '../../../../lib/content-queries';
import { getPostTaxonomy } from '../../../../lib/taxonomy';
import { postToFeedItem } from '../../../../lib/feed';

const FEED_LIMIT = 30;

export async function getStaticPaths() {
  const taxonomy = await getPostTaxonomy();
  return Array.from(taxonomy.categories.keys()).map((category) => ({
    params: { category },
  }));
}

export async function GET(context: APIContext) {
  const category = context.params.category!;
  const taxonomy = await getPostTaxonomy();
  const posts = sortByDateDesc(taxonomy.categories.get(category) ?? []).slice(0, FEED_LIMIT);
  const items = await Promise.all(posts.map((p) => postToFeedItem(p)));

  return rss({
    title: `${SITE_TITLE} - ${category}`,
    description: `'${category}' 카테고리 글 모음`,
    site: context.site ?? 'https://shinkeonkim.com',
    customData: `<language>ko-KR</language>`,
    items,
  });
}
