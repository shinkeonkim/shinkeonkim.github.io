import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE_TITLE } from '@/shared/config';
import { sortByDateDesc } from '@/shared/lib/content/content-queries';
import { listSeriesInfos } from '@/shared/lib/content/taxonomy';
import { postToFeedItem } from '@/shared/lib/seo/feed';

const FEED_LIMIT = 50;

export async function getStaticPaths() {
  const seriesList = await listSeriesInfos();
  return seriesList.map((s) => ({
    params: { series: s.slug },
    props: { seriesName: s.name },
  }));
}

interface Props {
  seriesName: string;
}

export async function GET(context: APIContext) {
  const seriesSlug = context.params.series!;
  const seriesName = (context.props as Props).seriesName;
  const seriesList = await listSeriesInfos();
  const info = seriesList.find((s) => s.slug === seriesSlug);
  const posts = sortByDateDesc(info?.posts ?? []).slice(0, FEED_LIMIT);
  const items = await Promise.all(posts.map((p) => postToFeedItem(p)));

  return rss({
    title: `${SITE_TITLE} - ${seriesName}`,
    description: `시리즈 '${seriesName}' 글 모음`,
    site: context.site ?? 'https://shinkeonkim.com',
    customData: `<language>ko-KR</language>`,
    items,
  });
}
