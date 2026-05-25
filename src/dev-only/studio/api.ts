import type { AnimationDef } from '../../animations/schema';

const BASE = '/_studio/api/animations';

export interface AnimationSummary {
  id: string;
  title: string;
  description: string;
  updatedAt?: string;
}

async function jsonOr<T>(res: Response, fallback?: T): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

export async function listAnimations(): Promise<AnimationSummary[]> {
  const res = await fetch(BASE);
  const data = await jsonOr<{ items: AnimationSummary[] }>(res);
  return data.items;
}

export async function loadAnimation(id: string): Promise<AnimationDef> {
  const res = await fetch(`${BASE}/${encodeURIComponent(id)}`);
  const data = await jsonOr<{ def: AnimationDef }>(res);
  return data.def;
}

export async function saveAnimation(def: AnimationDef): Promise<AnimationDef> {
  const res = await fetch(`${BASE}/${encodeURIComponent(def.id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(def),
  });
  const data = await jsonOr<{ def: AnimationDef }>(res);
  return data.def;
}

export async function createAnimation(id: string, title: string): Promise<AnimationDef> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, title }),
  });
  const data = await jsonOr<{ def: AnimationDef }>(res);
  return data.def;
}

export async function deleteAnimation(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  await jsonOr<{ ok: true }>(res);
}

export async function duplicateAnimation(
  sourceId: string,
  newId: string,
  newTitle: string,
): Promise<AnimationDef> {
  const source = await loadAnimation(sourceId);
  const cloned: AnimationDef = { ...source, id: newId, title: newTitle };
  await createAnimation(newId, newTitle);
  return await saveAnimation(cloned);
}
