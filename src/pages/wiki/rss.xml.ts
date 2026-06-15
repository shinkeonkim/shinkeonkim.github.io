import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE_TITLE } from '../../consts';
import { getPublishedWiki } from '../../lib/content-queries';
import { wikiToFeedItem } from '../../lib/feed';

const FEED_LIMIT = 50;

export async function GET(context: APIContext) {
  const wiki = (await getPublishedWiki())
    .filter((w) => w.data.updated)
    .sort((a, b) => b.data.updated!.valueOf() - a.data.updated!.valueOf())
    .slice(0, FEED_LIMIT);
  const items = await Promise.all(wiki.map((w) => wikiToFeedItem(w, { fullContent: true })));
  return rss({
    title: `${SITE_TITLE} - 위키`,
    description: '위키 페이지 최신 업데이트 모음',
    site: context.site ?? 'https://shinkeonkim.com',
    customData: `<language>ko-KR</language>`,
    items,
  });
}
