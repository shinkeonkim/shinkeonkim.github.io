import type { AnimationDef } from '@/entities/animation/engine/schema';
import { animationDefSchema } from '@/entities/animation/engine/schema';
import type { HistoryEntry, HistoryKind, InternalState, Listener } from './types';

const listeners = new Set<Listener>();

export const state: InternalState = {
  def: null,
  dirty: false,
  selection: { kind: 'none' },
  currentTime: 0,
  isDraft: false,
};

const HISTORY_LIMIT = 60;

export const past: HistoryEntry[] = [];
export const future: HistoryEntry[] = [];

let inTransient = false;

export function snapshotJson(): string | null {
  return state.def ? JSON.stringify(state.def) : null;
}

export function pushHistory(label: string, kind: HistoryKind): void {
  const snap = snapshotJson();
  if (snap === null) return;
  past.push({ snap, label, kind, timestamp: Date.now() });
  if (past.length > HISTORY_LIMIT) past.shift();
  future.length = 0;
}

export function setInTransient(value: boolean): void {
  inTransient = value;
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emit(): void {
  for (const fn of listeners) fn();
}

export function mutateDef(
  fn: (def: AnimationDef) => void,
  label = 'edit',
  kind: HistoryKind = 'other',
): void {
  if (!state.def) return;
  if (!inTransient) pushHistory(label, kind);
  const cloned = JSON.parse(JSON.stringify(state.def));
  fn(cloned);
  const parsed = animationDefSchema.safeParse(cloned);
  if (!parsed.success) {
    past.pop();
    console.warn('[studio.state] invalid mutation', parsed.error.issues);
    return;
  }
  state.def = parsed.data;
  state.dirty = true;
  emit();
}
