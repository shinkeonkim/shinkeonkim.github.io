import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE_TITLE } from '@/shared/config';
import { getWikiTaxonomy } from '@/shared/lib/content/taxonomy';
import { wikiToFeedItem } from '@/shared/lib/seo/feed';

const FEED_LIMIT = 30;

export async function getStaticPaths() {
  const taxonomy = await getWikiTaxonomy();
  return Array.from(taxonomy.categories.keys()).map((category) => ({
    params: { category },
  }));
}

export async function GET(context: APIContext) {
  const category = context.params.category!;
  const taxonomy = await getWikiTaxonomy();
  const wiki = (taxonomy.categories.get(category) ?? [])
    .filter((w) => w.data.updated)
    .sort((a, b) => b.data.updated!.valueOf() - a.data.updated!.valueOf())
    .slice(0, FEED_LIMIT);
  const items = await Promise.all(wiki.map((w) => wikiToFeedItem(w, { fullContent: true })));

  return rss({
    title: `${SITE_TITLE} - 위키 / ${category}`,
    description: `'${category}' 카테고리 위키 페이지 최신 업데이트`,
    site: context.site ?? 'https://shinkeonkim.com',
    customData: `<language>ko-KR</language>`,
    items,
  });
}
