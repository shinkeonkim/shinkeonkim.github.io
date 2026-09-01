import { StudioMount, type AnimationRepository } from '@kokoa/clotho-editor';
import type { AnimationDocument } from '@kokoa/clotho';

const BASE = '/_studio/api/animations';

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  return (await response.json()) as T;
}

const repository: AnimationRepository = {
  async list() {
    return (await readJson<{ items: Awaited<ReturnType<AnimationRepository['list']>> }>(await fetch(BASE))).items;
  },
  async load(id) {
    return (await readJson<{ def: AnimationDocument }>(await fetch(`${BASE}/${encodeURIComponent(id)}`))).def;
  },
  async create(id, title) {
    const response = await fetch(BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, title }),
    });
    return (await readJson<{ def: AnimationDocument }>(response)).def;
  },
  async save(document) {
    const response = await fetch(`${BASE}/${encodeURIComponent(document.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(document),
    });
    return (await readJson<{ def: AnimationDocument }>(response)).def;
  },
  async delete(id) {
    await readJson(await fetch(`${BASE}/${encodeURIComponent(id)}`, { method: 'DELETE' }));
  },
};

export default function ClothoStudio(): React.JSX.Element {
  return (
    <StudioMount
      repository={repository}
      editorTitle="shinkeonkim.com Clotho Editor"
    />
  );
}
