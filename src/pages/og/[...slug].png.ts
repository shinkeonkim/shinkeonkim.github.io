import type { APIRoute } from 'astro';
import { renderOgPng, type OgImageProps } from '../../lib/og-image';
import {
  getPublishedPosts,
  getPublishedWiki,
  getPublishedProjects,
} from '../../lib/content-queries';
import { SITE_TITLE, SITE_DESCRIPTION } from '../../consts';

interface SerializedProps {
  title: string;
  description?: string;
  dateIso?: string;
  tags?: string[];
  category?: string;
  kind: 'post' | 'wiki' | 'project' | 'site';
}

export async function getStaticPaths() {
  const [posts, wiki, projects] = await Promise.all([
    getPublishedPosts(),
    getPublishedWiki(),
    getPublishedProjects(),
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

  for (const pr of projects) {
    paths.push({
      params: { slug: `projects/${pr.id}` },
      props: {
        title: pr.data.title,
        description: pr.data.summary,
        dateIso: pr.data.start.toISOString(),
        tags: pr.data.tags,
        kind: 'project',
      },
    });
  }

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
