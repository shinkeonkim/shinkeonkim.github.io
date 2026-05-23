import type { APIRoute } from 'astro';
import { isCollection, loadFile, saveFile } from './path-utils';

export const prerender = false;

function devGuard(): Response | null {
  if (!import.meta.env.DEV) {
    return new Response('Not available', { status: 404 });
  }
  return null;
}

export const GET: APIRoute = ({ url }) => {
  const guard = devGuard();
  if (guard) return guard;
  const collection = url.searchParams.get('collection') ?? '';
  const slug = url.searchParams.get('slug') ?? '';
  if (!isCollection(collection) || !slug) {
    return new Response(JSON.stringify({ error: 'collection and slug required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    const loaded = loadFile(collection, slug);
    if (!loaded) {
      return new Response(JSON.stringify({ error: 'not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ collection, slug, ...loaded }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  const guard = devGuard();
  if (guard) return guard;
  let body: { collection?: string; slug?: string; ext?: string; content?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const { collection, slug, ext = '.md', content } = body;
  if (!collection || !isCollection(collection) || !slug || typeof content !== 'string') {
    return new Response(JSON.stringify({ error: 'collection, slug, content required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (ext !== '.md' && ext !== '.mdx') {
    return new Response(JSON.stringify({ error: 'ext must be .md or .mdx' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    const result = saveFile(collection, slug, ext, content);
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
