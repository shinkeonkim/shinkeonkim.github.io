import type { APIContext } from 'astro';
import {
  getPublishedNotes,
  getPublishedPosts,
  getPublishedWiki,
} from '@/shared/lib/content/content-queries';
import { notePreview, noteTitle } from '@/shared/lib/content/notes';
import { normKey, previewOf } from '@/shared/lib/content/wikilink-preview';

const MAX_PREVIEW = 280;

interface PreviewEntry {
  title: string;
  url: string;
  preview: string;
  collection: 'posts' | 'wiki' | 'notes';
}

export async function GET(_context: APIContext): Promise<Response> {
  const [posts, wiki, notes] = await Promise.all([
    getPublishedPosts(),
    getPublishedWiki(),
    getPublishedNotes(),
  ]);

  const previews: Record<string, PreviewEntry> = {};
  const add = (keys: (string | undefined)[], entry: PreviewEntry): void => {
    for (const k of keys) {
      if (!k) continue;
      const nk = normKey(k);
      if (!previews[nk]) previews[nk] = entry;
    }
  };

  for (const p of posts) {
    const body = (p as { body?: string }).body ?? '';
    const filename = p.id.includes('/') ? p.id.split('/').pop()! : p.id;
    add([p.id, filename, p.data.title], {
      title: p.data.title,
      url: `/posts/${p.id}/`,
      preview: previewOf(body, MAX_PREVIEW),
      collection: 'posts',
    });
  }
  for (const w of wiki) {
    const body = (w as { body?: string }).body ?? '';
    const filename = w.id.includes('/') ? w.id.split('/').pop()! : w.id;
    const aliases = w.data.aliases ?? [];
    add([w.id, filename, w.data.title, ...aliases], {
      title: w.data.title,
      url: `/wiki/${w.id}/`,
      preview: previewOf(body, MAX_PREVIEW),
      collection: 'wiki',
    });
  }
  for (const n of notes) {
    const body = (n as { body?: string }).body ?? '';
    const title = noteTitle(body) || n.id;
    add([n.id], {
      title,
      url: `/notes/${n.id}/`,
      preview: notePreview(body, MAX_PREVIEW),
      collection: 'notes',
    });
  }

  return new Response(JSON.stringify(previews), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
