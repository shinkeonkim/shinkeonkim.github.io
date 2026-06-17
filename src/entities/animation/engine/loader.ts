import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { animationDefSchema, type AnimationDef } from './schema';

export const ANIM_DIR = join(process.cwd(), 'public', 'animations');

export async function listAnimationFiles(): Promise<string[]> {
  try {
    const entries = await readdir(ANIM_DIR);
    return entries.filter((n) => n.endsWith('.json'));
  } catch {
    return [];
  }
}

export async function loadAnimation(id: string): Promise<AnimationDef | null> {
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(id)) return null;
  try {
    const text = await readFile(join(ANIM_DIR, `${id}.json`), 'utf-8');
    const json = JSON.parse(text);
    const parsed = animationDefSchema.safeParse(json);
    if (!parsed.success) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export async function loadAllAnimations(): Promise<AnimationDef[]> {
  const files = await listAnimationFiles();
  const out: AnimationDef[] = [];
  for (const f of files) {
    const id = f.replace(/\.json$/, '');
    const def = await loadAnimation(id);
    if (def) out.push(def);
  }
  return out;
}
