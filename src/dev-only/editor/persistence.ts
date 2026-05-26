import type { CurrentFile } from './state';

const STORAGE_KEY = 'editor-ui-state-v1';
const SILENT_RESTORE_AFTER_SAVE_WINDOW_MS = 5_000;

export type PersistReason = 'save' | 'unload' | 'periodic';

export interface PersistedUiState {
  current: CurrentFile | null;
  caretStart: number;
  caretEnd: number;
  scrollTop: number;
  previewOpen: boolean;
  treeSearch: string;
  gitPanelOpen: boolean;
  savedAt: number;
  reason: PersistReason;
}

export function saveUiState(state: PersistedUiState): boolean {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function loadUiState(): PersistedUiState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedUiState;
    if (!isValid(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearUiState(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}

export function isFreshSaveSnapshot(state: PersistedUiState): boolean {
  if (state.reason !== 'save') return false;
  return Date.now() - state.savedAt < SILENT_RESTORE_AFTER_SAVE_WINDOW_MS;
}

function isValid(s: unknown): s is PersistedUiState {
  if (!s || typeof s !== 'object') return false;
  const o = s as Record<string, unknown>;
  if (typeof o.caretStart !== 'number') return false;
  if (typeof o.caretEnd !== 'number') return false;
  if (typeof o.scrollTop !== 'number') return false;
  if (typeof o.previewOpen !== 'boolean') return false;
  if (typeof o.treeSearch !== 'string') return false;
  if (typeof o.gitPanelOpen !== 'boolean') return false;
  if (typeof o.savedAt !== 'number') return false;
  if (o.reason !== 'save' && o.reason !== 'unload' && o.reason !== 'periodic') return false;
  if (o.current !== null) {
    const c = o.current as Record<string, unknown>;
    if (typeof c.collection !== 'string') return false;
    if (typeof c.slug !== 'string') return false;
    if (c.ext !== '.md' && c.ext !== '.mdx') return false;
  }
  return true;
}
