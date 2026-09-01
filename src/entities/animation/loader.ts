import { loadAllDocuments, loadDocument } from '@kokoa/clotho/node';
import type { AnimationDocument } from '@kokoa/clotho';
import { ANIM_DIR } from './animation-directory';

export async function loadAnimation(id: string): Promise<AnimationDocument | null> {
  const result = await loadDocument(ANIM_DIR, id);
  return result.ok ? result.document : null;
}

export async function loadAllAnimations(): Promise<AnimationDocument[]> {
  const results = await loadAllDocuments(ANIM_DIR);
  return results.flatMap((result) => (result.ok ? [result.document] : []));
}
