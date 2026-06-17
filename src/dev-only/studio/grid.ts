const STORAGE_KEY = 'studio.grid';
const SIZE_KEY = 'studio.gridSize';
const DEFAULT_SIZE = 10;

let gridEnabled = false;
let gridSize = DEFAULT_SIZE;
const listeners = new Set<() => void>();

export function initGrid(): void {
  try {
    gridEnabled = localStorage.getItem(STORAGE_KEY) === '1';
    const raw = Number(localStorage.getItem(SIZE_KEY));
    if (Number.isFinite(raw) && raw > 0) gridSize = raw;
  } catch {
    return;
  }
}

export function isGridEnabled(): boolean {
  return gridEnabled;
}

export function getGridSize(): number {
  return gridSize;
}

export function setGridEnabled(on: boolean): void {
  if (gridEnabled === on) return;
  gridEnabled = on;
  try {
    localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
  } catch {
    return;
  }
  for (const fn of listeners) fn();
}

export function subscribeGrid(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function snap(value: number): number {
  if (!gridEnabled) return value;
  return Math.round(value / gridSize) * gridSize;
}

export function snapPoint(pt: { x: number; y: number }): { x: number; y: number } {
  if (!gridEnabled) return pt;
  return { x: snap(pt.x), y: snap(pt.y) };
}
