import type { APIRoute } from 'astro';
import {
  amendCommit,
  checkoutBranch,
  commit,
  commitHunks,
  createBranch,
  fetchOrigin,
  getDiff,
  getFileHunks,
  getStatus,
  listBranches,
  pull,
  push,
  stashDrop,
  stashList,
  stashPop,
  stashPush,
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
    if (action === 'hunks') {
      const file = url.searchParams.get('file');
      if (!file) return jsonError('file required');
      const result = await getFileHunks(file);
      return jsonOk({ ...result });
    }
    if (action === 'branches') {
      const branches = await listBranches();
      return jsonOk({ branches });
    }
    if (action === 'stash-list') {
      const stashes = await stashList();
      return jsonOk({ stashes });
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
  stashIndex?: number;
  file?: string;
  hunkIndexes?: number[];
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
    if (body.action === 'stash-push') {
      const result = await stashPush(body.message ?? '');
      return jsonOk(result);
    }
    if (body.action === 'stash-pop') {
      const result = await stashPop(body.stashIndex ?? 0);
      return jsonOk(result);
    }
    if (body.action === 'stash-drop') {
      if (typeof body.stashIndex !== 'number') return jsonError('stashIndex required');
      const result = await stashDrop(body.stashIndex);
      return jsonOk(result);
    }
    if (body.action === 'commit-hunks') {
      const file = body.file ?? '';
      const idxs = Array.isArray(body.hunkIndexes) ? body.hunkIndexes : [];
      const msg = String(body.message ?? '').trim();
      if (!file) return jsonError('file required');
      if (!msg) return jsonError('message required');
      if (idxs.length === 0) return jsonError('no hunks');
      const result = await commitHunks(file, idxs, msg);
      return jsonOk(result);
    }
    return jsonError(`unknown action: ${body.action}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonError(msg, 500);
  }
};
