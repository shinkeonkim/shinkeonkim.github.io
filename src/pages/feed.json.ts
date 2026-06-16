import type { APIContext } from 'astro';
import { SITE_AUTHOR, SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from '@/shared/config';
import { getPublishedPosts, sortByDateDesc } from '@/shared/lib/content/content-queries';

export async function GET(_context: APIContext) {
  const posts = sortByDateDesc(await getPublishedPosts()).slice(0, 50);

  const body = {
    version: 'https://jsonfeed.org/version/1.1',
    title: SITE_TITLE,
    home_page_url: `${SITE_URL}/`,
    feed_url: `${SITE_URL}/feed.json`,
    description: SITE_DESCRIPTION,
    language: 'ko-KR',
    icon: `${SITE_URL}/icon-512.png`,
    favicon: `${SITE_URL}/favicon-32x32.png`,
    authors: [{ name: SITE_AUTHOR, url: SITE_URL }],
    items: posts.map((p) => ({
      id: `${SITE_URL}/posts/${p.id}/`,
      url: `${SITE_URL}/posts/${p.id}/`,
      title: p.data.title,
      summary: p.data.description ?? undefined,
      content_text: p.data.description ?? '',
      date_published: p.data.date.toISOString(),
      ...(p.data.updated && { date_modified: p.data.updated.toISOString() }),
      tags: p.data.tags,
      ...(p.data.cover && { image: new URL(p.data.cover, SITE_URL).toString() }),
      authors: [{ name: SITE_AUTHOR, url: SITE_URL }],
    })),
  };

  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'Content-Type': 'application/feed+json; charset=utf-8' },
  });
}
