import type { APIRoute } from 'astro';
import { COLLECTIONS, listFiles, listTree, type TreeEntry, type FileEntry } from '@/dev-only/shared/path-utils';
import { notFoundResponse } from '@/dev-only/shared/api-utils';

export const prerender = false;

export const GET: APIRoute = ({ url }) => {
  if (!import.meta.env.DEV) {
    return notFoundResponse();
  }
  const shape = url.searchParams.get('shape') ?? 'tree';
  if (shape === 'flat') {
    const out: Record<string, FileEntry[]> = {};
    for (const c of COLLECTIONS) out[c] = listFiles(c);
    return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json' } });
  }
  const out: Record<string, TreeEntry[]> = {};
  for (const c of COLLECTIONS) out[c] = listTree(c);
  return new Response(JSON.stringify({ collections: COLLECTIONS, tree: out }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
