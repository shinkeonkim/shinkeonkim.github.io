import type { HistoryEntry, HistoryKind } from './types';
import {
  emit,
  future,
  past,
  pushHistory,
  setInTransient,
  snapshotJson,
  state,
} from './internals';

export function beginTransient(label = 'edit', kind: HistoryKind = 'other'): void {
  if (!state.def) return;
  pushHistory(label, kind);
  setInTransient(true);
}

export function endTransient(): void {
  setInTransient(false);
}

export function canUndo(): boolean {
  return past.length > 0;
}

export function canRedo(): boolean {
  return future.length > 0;
}

export function undo(): void {
  if (past.length === 0) return;
  const prev = past[past.length - 1]!;
  const cur = snapshotJson();
  if (cur !== null) {
    future.push({ snap: cur, label: prev.label, kind: prev.kind, timestamp: prev.timestamp });
  }
  past.pop();
  state.def = JSON.parse(prev.snap);
  state.dirty = true;
  emit();
}

export function redo(): void {
  if (future.length === 0) return;
  const next = future[future.length - 1]!;
  const cur = snapshotJson();
  if (cur !== null) {
    past.push({ snap: cur, label: next.label, kind: next.kind, timestamp: next.timestamp });
  }
  future.pop();
  state.def = JSON.parse(next.snap);
  state.dirty = true;
  emit();
}

export function resetHistory(): void {
  past.length = 0;
  future.length = 0;
}

export function getHistory(): { past: readonly HistoryEntry[]; future: readonly HistoryEntry[] } {
  return { past, future };
}

export function jumpBack(steps: number): void {
  if (steps <= 0 || past.length === 0) return;
  const n = Math.min(steps, past.length);
  for (let i = 0; i < n; i += 1) undo();
}

export function jumpForward(steps: number): void {
  if (steps <= 0 || future.length === 0) return;
  const n = Math.min(steps, future.length);
  for (let i = 0; i < n; i += 1) redo();
}
