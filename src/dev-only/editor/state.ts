export type Ext = '.md' | '.mdx';
export type CollectionName = 'posts' | 'notes' | 'wiki' | 'sources';
export const COLLECTION_NAMES: CollectionName[] = ['posts', 'notes', 'wiki', 'sources'];

export interface CurrentFile {
  collection: CollectionName;
  slug: string;
  ext: Ext;
}

export interface EditorState {
  current: CurrentFile | null;
  isDirty: boolean;
  lastSavedAt: number | null;
}

export const state: EditorState = {
  current: null,
  isDirty: false,
  lastSavedAt: null,
};

type Listener = (state: EditorState) => void;
const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function notify(): void {
  for (const l of listeners) l(state);
}
