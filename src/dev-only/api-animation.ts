import type { APIRoute } from 'astro';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { animationDefSchema, ID_RE } from '../animations/schema';
import { ANIM_DIR } from '../animations/loader';
import { errorResponse, jsonResponse, requireDev } from './api-utils';

export const prerender = false;

function pathFor(id: string): string {
  return join(ANIM_DIR, `${id}.json`);
}

function invalidId(): Response {
  return jsonResponse({ error: 'invalid id' }, { status: 400 });
}

export const GET: APIRoute = requireDev(async ({ params }) => {
  const id = params.id ?? '';
  if (!ID_RE.test(id)) return invalidId();
  try {
    const text = await readFile(pathFor(id), 'utf-8');
    const json = JSON.parse(text);
    const parsed = animationDefSchema.safeParse(json);
    if (!parsed.success) {
      return jsonResponse({ error: 'invalid stored animation', detail: parsed.error.message }, { status: 500 });
    }
    return jsonResponse({ def: parsed.data });
  } catch {
    return jsonResponse({ error: 'not found' }, { status: 404 });
  }
});

export const PUT: APIRoute = requireDev(async ({ params, request }) => {
  const id = params.id ?? '';
  if (!ID_RE.test(id)) return invalidId();
  try {
    await mkdir(ANIM_DIR, { recursive: true });
    const body = await request.json();
    const merged = { ...body, id };
    const parsed = animationDefSchema.safeParse(merged);
    if (!parsed.success) {
      return jsonResponse({ error: 'validation failed', detail: parsed.error.message }, { status: 400 });
    }
    parsed.data.updatedAt = new Date().toISOString();
    await writeFile(pathFor(id), JSON.stringify(parsed.data, null, 2) + '\n', 'utf-8');
    return jsonResponse({ ok: true, def: parsed.data });
  } catch (err) {
    return errorResponse(err);
  }
});

export const DELETE: APIRoute = requireDev(async ({ params }) => {
  const id = params.id ?? '';
  if (!ID_RE.test(id)) return invalidId();
  try {
    await unlink(pathFor(id));
    return jsonResponse({ ok: true });
  } catch {
    return jsonResponse({ error: 'not found' }, { status: 404 });
  }
});
