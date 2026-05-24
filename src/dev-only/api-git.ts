import type { APIRoute } from 'astro';
import {
  amendCommit,
  checkoutBranch,
  commit,
  createBranch,
  fetchOrigin,
  getDiff,
  getStatus,
  listBranches,
  pull,
  push,
} from './git-utils';
import { notFoundResponse } from './api-utils';

export const prerender = false;

function devGuard(): Response | null {
  if (!import.meta.env.DEV) {
    return notFoundResponse();
  }
  return null;
}

function jsonError(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function jsonOk(data: Record<string, unknown>): Response {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET: APIRoute = async ({ url }) => {
  const guard = devGuard();
  if (guard) return guard;
  const action = url.searchParams.get('action') ?? 'status';
  try {
    if (action === 'status') {
      const status = await getStatus();
      return jsonOk({ status });
    }
    if (action === 'diff') {
      const file = url.searchParams.get('file');
      if (!file) return jsonError('file required');
      const diff = await getDiff(file);
      return jsonOk({ diff });
    }
    if (action === 'branches') {
      const branches = await listBranches();
      return jsonOk({ branches });
    }
    return jsonError(`unknown action: ${action}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonError(msg, 500);
  }
};

interface GitBody {
  action?: string;
  files?: string[];
  message?: string;
  branch?: string;
  checkout?: boolean;
}

export const POST: APIRoute = async ({ request }) => {
  const guard = devGuard();
  if (guard) return guard;

  let body: GitBody;
  try {
    body = (await request.json()) as GitBody;
  } catch {
    return jsonError('invalid json');
  }

  try {
    if (body.action === 'commit') {
      const files = Array.isArray(body.files) ? body.files : [];
      const message = String(body.message ?? '').trim();
      if (!message) return jsonError('message required');
      if (files.length === 0) return jsonError('no files');
      const result = await commit(files, message);
      return jsonOk(result);
    }
    if (body.action === 'push') {
      const result = await push();
      return jsonOk(result);
    }
    if (body.action === 'fetch') {
      const result = await fetchOrigin();
      return jsonOk(result);
    }
    if (body.action === 'pull') {
      const result = await pull();
      return jsonOk(result);
    }
    if (body.action === 'amend') {
      const files = Array.isArray(body.files) ? body.files : [];
      const result = await amendCommit(files, body.message);
      return jsonOk(result);
    }
    if (body.action === 'checkout') {
      if (!body.branch) return jsonError('branch required');
      const result = await checkoutBranch(body.branch);
      return jsonOk(result);
    }
    if (body.action === 'createBranch') {
      if (!body.branch) return jsonError('branch required');
      const result = await createBranch(body.branch, body.checkout !== false);
      return jsonOk(result);
    }
    return jsonError(`unknown action: ${body.action}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonError(msg, 500);
  }
};
