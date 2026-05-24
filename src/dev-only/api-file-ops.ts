import type { APIRoute } from 'astro';
import { notFoundResponse } from './api-utils';
import {
  COLLECTIONS,
  createFolder,
  deleteFile,
  deleteFolder,
  isCollection,
  moveFile,
  renameFile,
  renameFolder,
} from './path-utils';

export const prerender = false;

function devGuard(): Response | null {
  if (!import.meta.env.DEV) {
    return notFoundResponse();
  }
  return null;
}

function badRequest(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });
}

function ok(data: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

interface OpsBody {
  action?: string;
  collection?: string;
  slug?: string;
  ext?: string;
  toSlug?: string;
  toExt?: string;
  toCollection?: string;
  folder?: string;
  toFolder?: string;
}

function parseExt(value: unknown): '.md' | '.mdx' {
  if (value === '.mdx') return '.mdx';
  return '.md';
}

export const POST: APIRoute = async ({ request }) => {
  const guard = devGuard();
  if (guard) return guard;

  let body: OpsBody;
  try {
    body = (await request.json()) as OpsBody;
  } catch {
    return badRequest('invalid json');
  }

  const { action, collection } = body;
  if (!collection || !isCollection(collection)) {
    return badRequest('valid collection required');
  }

  try {
    switch (action) {
      case 'delete-file': {
        if (!body.slug) return badRequest('slug required');
        const result = deleteFile(collection, body.slug, parseExt(body.ext));
        return ok({ action, ...result });
      }
      case 'rename-file': {
        if (!body.slug || !body.toSlug) return badRequest('slug and toSlug required');
        const result = renameFile(
          collection,
          body.slug,
          parseExt(body.ext),
          body.toSlug,
          parseExt(body.toExt ?? body.ext),
        );
        return ok({ action, ...result });
      }
      case 'move-file': {
        if (!body.slug || !body.toSlug || !body.toCollection) {
          return badRequest('slug, toCollection, toSlug required');
        }
        if (!isCollection(body.toCollection)) return badRequest('valid toCollection required');
        const result = moveFile(
          collection,
          body.slug,
          parseExt(body.ext),
          body.toCollection,
          body.toSlug,
        );
        return ok({ action, ...result });
      }
      case 'create-folder': {
        if (!body.folder) return badRequest('folder required');
        const result = createFolder(collection, body.folder);
        return ok({ action, ...result });
      }
      case 'rename-folder': {
        if (!body.folder || !body.toFolder) return badRequest('folder and toFolder required');
        const result = renameFolder(collection, body.folder, body.toFolder);
        return ok({ action, ...result });
      }
      case 'delete-folder': {
        if (!body.folder) return badRequest('folder required');
        const result = deleteFolder(collection, body.folder);
        return ok({ action, ...result });
      }
      default:
        return badRequest(`unknown action: ${action}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const GET: APIRoute = () => {
  const guard = devGuard();
  if (guard) return guard;
  return new Response(JSON.stringify({ collections: COLLECTIONS }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
