import type { APIRoute } from 'astro';
import { renderOgPng, type OgImageProps } from '@/shared/lib/seo/og-image';
import { getPublishedPosts, getPublishedWiki } from '@/shared/lib/content/content-queries';
import { getWikiTaxonomy } from '@/shared/lib/content/taxonomy';
import { SITE_TITLE, SITE_DESCRIPTION } from '@/shared/config';

interface SerializedProps {
  title: string;
  description?: string;
  dateIso?: string;
  tags?: string[];
  category?: string;
  kind: 'post' | 'wiki' | 'site';
}

export async function getStaticPaths() {
  const [posts, wiki, wikiTaxonomy] = await Promise.all([
    getPublishedPosts(),
    getPublishedWiki(),
    getWikiTaxonomy(),
  ]);

  const paths: { params: { slug: string }; props: SerializedProps }[] = [];

  for (const p of posts) {
    paths.push({
      params: { slug: `posts/${p.id}` },
      props: {
        title: p.data.title,
        description: p.data.description,
        dateIso: p.data.date.toISOString(),
        tags: p.data.tags,
        category: p.data.category,
        kind: 'post',
      },
    });
  }

  for (const w of wiki) {
    paths.push({
      params: { slug: `wiki/${w.id}` },
      props: {
        title: w.data.title,
        tags: w.data.tags,
        category: w.data.category,
        dateIso: w.data.updated?.toISOString(),
        kind: 'wiki',
      },
    });
  }

  for (const [cat, items] of wikiTaxonomy.categories) {
    paths.push({
      params: { slug: `wiki/category/${cat}` },
      props: {
        title: `${cat} 위키`,
        description: `${items.length}개의 위키 페이지`,
        category: cat,
        kind: 'site',
      },
    });
  }

  paths.push({
    params: { slug: 'wiki/categories' },
    props: {
      title: '위키 카테고리',
      description: `${wikiTaxonomy.categories.size}개 카테고리`,
      kind: 'site',
    },
  });

  paths.push({
    params: { slug: 'site' },
    props: {
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      kind: 'site',
    },
  });

  return paths;
}

export const GET: APIRoute<SerializedProps> = async ({ props }) => {
  const data: OgImageProps = {
    title: props.title,
    description: props.description,
    date: props.dateIso ? new Date(props.dateIso) : undefined,
    tags: props.tags,
    category: props.category,
    kind: props.kind,
  };
  const png = await renderOgPng(data);
  return new Response(new Uint8Array(png), {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
