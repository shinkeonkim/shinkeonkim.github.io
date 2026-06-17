import type { APIRoute } from 'astro';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { animationDefSchema, ID_RE } from '@/entities/animation/engine/schema';
import { ANIM_DIR } from '@/entities/animation/engine/loader';
import { errorResponse, jsonResponse, requireDev } from './api-utils';

export const prerender = false;

async function ensureDir(): Promise<void> {
  await mkdir(ANIM_DIR, { recursive: true });
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

interface AnimationSummary {
  id: string;
  title: string;
  description: string;
  updatedAt?: string;
}

async function loadSummary(fn: string): Promise<AnimationSummary | null> {
  let text: string;
  try {
    text = await readFile(join(ANIM_DIR, fn), 'utf-8');
  } catch {
    return null;
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  const parsed = animationDefSchema.safeParse(json);
  if (!parsed.success) return null;
  return {
    id: parsed.data.id,
    title: parsed.data.title,
    description: parsed.data.description,
    updatedAt: parsed.data.updatedAt,
  };
}

export const GET: APIRoute = requireDev(async () => {
  try {
    await ensureDir();
    const entries = await readdir(ANIM_DIR);
    const jsonEntries = entries.filter((n) => n.endsWith('.json'));
    const summaries = (await Promise.all(jsonEntries.map(loadSummary))).filter(
      (s): s is AnimationSummary => s !== null,
    );
    summaries.sort((a, b) => a.title.localeCompare(b.title, 'ko'));
    return jsonResponse({ items: summaries });
  } catch (err) {
    return errorResponse(err);
  }
});

export const POST: APIRoute = requireDev(async ({ request }) => {
  try {
    await ensureDir();
    const body = await request.json();
    const id: unknown = body?.id;
    if (typeof id !== 'string' || !ID_RE.test(id)) {
      return jsonResponse({ error: 'invalid id (lowercase / digits / - / _ only)' }, { status: 400 });
    }
    const filePath = join(ANIM_DIR, `${id}.json`);
    if (await fileExists(filePath)) {
      return jsonResponse({ error: 'animation already exists' }, { status: 409 });
    }
    const initial = animationDefSchema.parse({
      id,
      title: typeof body?.title === 'string' && body.title ? body.title : id,
      description: typeof body?.description === 'string' ? body.description : '',
    });
    initial.updatedAt = new Date().toISOString();
    await writeFile(filePath, JSON.stringify(initial, null, 2) + '\n', 'utf-8');
    return jsonResponse({ ok: true, def: initial });
  } catch (err) {
    return errorResponse(err);
  }
});
