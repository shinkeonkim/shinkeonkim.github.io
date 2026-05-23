import type { APIRoute } from 'astro';
import { COLLECTIONS, listFiles } from './path-utils';

export const prerender = false;

export const GET: APIRoute = () => {
  if (!import.meta.env.DEV) {
    return new Response('Not available', { status: 404 });
  }
  const out: Record<string, ReturnType<typeof listFiles>> = {};
  for (const c of COLLECTIONS) {
    out[c] = listFiles(c);
  }
  return new Response(JSON.stringify(out), {
    headers: { 'Content-Type': 'application/json' },
  });
};
