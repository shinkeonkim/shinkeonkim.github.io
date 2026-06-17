import type { AnimationDef, SnapshotMap } from '@/entities/animation/engine/schema';
import { computeSnapshot } from '@/entities/animation/engine/schema';
import type { Selection } from './types';
import { emit, state, past, future } from './internals';

export function isDraft(): boolean {
  return state.isDraft;
}

export function setDraft(def: AnimationDef): void {
  state.def = def;
  state.dirty = false;
  state.isDraft = true;
  state.selection = { kind: 'none' };
  state.currentTime = 0;
  past.length = 0;
  future.length = 0;
  emit();
}

export function promoteDraftToSaved(): void {
  state.isDraft = false;
  emit();
}

export function getDef(): AnimationDef | null {
  return state.def;
}

export function getSelection(): Selection {
  return state.selection;
}

export function isDirty(): boolean {
  return state.dirty;
}

export function getCurrentTime(): number {
  return state.currentTime;
}

export function setCurrentTime(time: number): void {
  state.currentTime = Math.max(0, Math.round(time));
  emit();
}

export function setDef(def: AnimationDef | null, markDirty = false): void {
  state.def = def;
  state.dirty = markDirty;
  state.isDraft = false;
  state.selection = { kind: 'none' };
  state.currentTime = 0;
  past.length = 0;
  future.length = 0;
  emit();
}

export function markClean(): void {
  state.dirty = false;
  emit();
}

export function setSelection(sel: Selection): void {
  state.selection = sel;
  emit();
}

export function getSelectedElementIds(sel: Selection): string[] {
  if (sel.kind === 'element') return [sel.elementId];
  if (sel.kind === 'elements') return sel.elementIds;
  return [];
}

export function isElementSelected(sel: Selection, id: string): boolean {
  if (sel.kind === 'element') return sel.elementId === id;
  if (sel.kind === 'elements') return sel.elementIds.includes(id);
  return false;
}

export function toggleSelectionFor(sel: Selection, id: string): Selection {
  const cur = getSelectedElementIds(sel);
  if (cur.includes(id)) {
    const next = cur.filter((x) => x !== id);
    if (next.length === 0) return { kind: 'none' };
    if (next.length === 1) return { kind: 'element', elementId: next[0] };
    return { kind: 'elements', elementIds: next };
  }
  const next = [...cur, id];
  if (next.length === 1) return { kind: 'element', elementId: next[0] };
  return { kind: 'elements', elementIds: next };
}

export function getCurrentSnapshot(): SnapshotMap {
  if (!state.def) return new Map();
  return computeSnapshot(state.def, state.currentTime);
}
