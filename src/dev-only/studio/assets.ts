import type { AnimationElement } from '../../animations/schema';

export interface AssetDef {
  id: string;
  name: string;
  description?: string;
  category: 'queue' | 'stack' | 'array' | 'graph' | 'tree' | 'custom';
  elements: AnimationElement[];
  builtin?: boolean;
}

const STORAGE_KEY = 'studio.assets.v1';
const listeners = new Set<() => void>();

function readSaved(): AssetDef[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((a): a is AssetDef => !!a && typeof a.id === 'string' && Array.isArray(a.elements));
  } catch {
    return [];
  }
}

function writeSaved(list: AssetDef[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    return;
  }
  for (const fn of listeners) fn();
}

export function subscribeAssets(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function bbox(elements: AnimationElement[]): { x: number; y: number; w: number; h: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) {
    let ex = 0, ey = 0, ew = 0, eh = 0;
    if (el.type === 'rect' || el.type === 'image' || el.type === 'text') {
      ex = el.x; ey = el.y;
      ew = 'width' in el ? el.width : 60;
      eh = 'height' in el ? el.height : 30;
      if (el.type === 'text') { ew = 100; eh = 24; }
    } else if (el.type === 'circle') {
      ex = el.cx - el.r; ey = el.cy - el.r; ew = el.r * 2; eh = el.r * 2;
    } else if (el.type === 'line' || el.type === 'arrow') {
      const x1 = el.x1 ?? 0, y1 = el.y1 ?? 0, x2 = el.x2 ?? 0, y2 = el.y2 ?? 0;
      ex = Math.min(x1, x2); ey = Math.min(y1, y2);
      ew = Math.abs(x2 - x1); eh = Math.abs(y2 - y1);
    } else if (el.type === 'polygon') {
      const pts = el.points.trim().split(/\s+/).map((p) => p.split(',').map(Number));
      const xs = pts.map((p) => p[0]).filter(Number.isFinite);
      const ys = pts.map((p) => p[1]).filter(Number.isFinite);
      if (xs.length === 0) continue;
      ex = Math.min(...xs); ey = Math.min(...ys);
      ew = Math.max(...xs) - ex; eh = Math.max(...ys) - ey;
    } else if (el.type === 'path') {
      ex = el.x ?? 0; ey = el.y ?? 0; ew = 80; eh = 80;
    }
    minX = Math.min(minX, ex);
    minY = Math.min(minY, ey);
    maxX = Math.max(maxX, ex + ew);
    maxY = Math.max(maxY, ey + eh);
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, w: 0, h: 0 };
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

function shiftElement(el: AnimationElement, dx: number, dy: number): AnimationElement {
  const clone = JSON.parse(JSON.stringify(el)) as AnimationElement;
  if (clone.type === 'rect' || clone.type === 'image' || clone.type === 'text') {
    clone.x += dx; clone.y += dy;
  } else if (clone.type === 'circle') {
    clone.cx += dx; clone.cy += dy;
  } else if (clone.type === 'line' || clone.type === 'arrow') {
    if (typeof clone.x1 === 'number') clone.x1 += dx;
    if (typeof clone.y1 === 'number') clone.y1 += dy;
    if (typeof clone.x2 === 'number') clone.x2 += dx;
    if (typeof clone.y2 === 'number') clone.y2 += dy;
  } else if (clone.type === 'path') {
    clone.x = (clone.x ?? 0) + dx; clone.y = (clone.y ?? 0) + dy;
  } else if (clone.type === 'polygon') {
    const pts = clone.points.trim().split(/\s+/).map((pair) => {
      const [x, y] = pair.split(',').map(Number);
      if (Number.isFinite(x) && Number.isFinite(y)) return `${x + dx},${y + dy}`;
      return pair;
    });
    clone.points = pts.join(' ');
  }
  return clone;
}

export function assetBoundingBox(asset: AssetDef): { x: number; y: number; w: number; h: number } {
  return bbox(asset.elements);
}

export function instantiateAsset(
  asset: AssetDef,
  offsetX: number,
  offsetY: number,
  uniqueId: (prefix: string) => string,
): AnimationElement[] {
  const box = bbox(asset.elements);
  const dx = offsetX - box.x;
  const dy = offsetY - box.y;
  const idMap = new Map<string, string>();
  const out: AnimationElement[] = [];
  for (const el of asset.elements) {
    const newId = uniqueId(el.type);
    idMap.set(el.id, newId);
    const shifted = shiftElement(el, dx, dy);
    shifted.id = newId;
    if ((shifted.type === 'line' || shifted.type === 'arrow') && shifted.fromId) {
      shifted.fromId = idMap.get(shifted.fromId) ?? shifted.fromId;
    }
    if ((shifted.type === 'line' || shifted.type === 'arrow') && shifted.toId) {
      shifted.toId = idMap.get(shifted.toId) ?? shifted.toId;
    }
    out.push(shifted);
  }
  return out;
}

function builtin(): AssetDef[] {
  const queue: AssetDef = {
    id: 'builtin-queue',
    name: '큐 (Queue) — 3 slot',
    description: 'FIFO 큐. front/back 라벨 + 3개 슬롯',
    category: 'queue',
    builtin: true,
    elements: [
      { type: 'rect', id: 'q-s0', rotation: 0, x: 100, y: 100, width: 70, height: 60, fill: '#e0e7ff', stroke: '#6366f1', strokeWidth: 2, cornerRadius: 6, label: '', labelColor: '#312e81', labelSize: 18 },
      { type: 'rect', id: 'q-s1', rotation: 0, x: 175, y: 100, width: 70, height: 60, fill: '#e0e7ff', stroke: '#6366f1', strokeWidth: 2, cornerRadius: 6, label: '', labelColor: '#312e81', labelSize: 18 },
      { type: 'rect', id: 'q-s2', rotation: 0, x: 250, y: 100, width: 70, height: 60, fill: '#e0e7ff', stroke: '#6366f1', strokeWidth: 2, cornerRadius: 6, label: '', labelColor: '#312e81', labelSize: 18 },
      { type: 'text', id: 'q-lbl-front', rotation: 0, x: 135, y: 90, content: 'front', fontSize: 12, fontWeight: 700, color: '#64748b', textAnchor: 'middle' },
      { type: 'text', id: 'q-lbl-back', rotation: 0, x: 285, y: 90, content: 'back', fontSize: 12, fontWeight: 700, color: '#64748b', textAnchor: 'middle' },
      { type: 'arrow', id: 'q-arr-in', rotation: 0, x1: 360, y1: 130, x2: 320, y2: 130, stroke: '#16a34a', strokeWidth: 2.5, curvature: 0, labelColor: '#0b0b0f', headEnd: 'arrow' },
      { type: 'text', id: 'q-lbl-in', rotation: 0, x: 380, y: 135, content: 'enqueue', fontSize: 12, fontWeight: 700, color: '#16a34a', textAnchor: 'start' },
      { type: 'arrow', id: 'q-arr-out', rotation: 0, x1: 100, y1: 130, x2: 60, y2: 130, stroke: '#dc2626', strokeWidth: 2.5, curvature: 0, labelColor: '#0b0b0f', headEnd: 'arrow' },
      { type: 'text', id: 'q-lbl-out', rotation: 0, x: 55, y: 135, content: 'dequeue', fontSize: 12, fontWeight: 700, color: '#dc2626', textAnchor: 'end' },
    ],
  };

  const stack: AssetDef = {
    id: 'builtin-stack',
    name: '스택 (Stack) — 3 slot',
    description: 'LIFO 스택. top 라벨 + push/pop 화살표',
    category: 'stack',
    builtin: true,
    elements: [
      { type: 'rect', id: 's-s2', rotation: 0, x: 200, y: 60, width: 90, height: 50, fill: '#e0e7ff', stroke: '#6366f1', strokeWidth: 2, cornerRadius: 6, label: '', labelColor: '#312e81', labelSize: 18 },
      { type: 'rect', id: 's-s1', rotation: 0, x: 200, y: 115, width: 90, height: 50, fill: '#e0e7ff', stroke: '#6366f1', strokeWidth: 2, cornerRadius: 6, label: '', labelColor: '#312e81', labelSize: 18 },
      { type: 'rect', id: 's-s0', rotation: 0, x: 200, y: 170, width: 90, height: 50, fill: '#e0e7ff', stroke: '#6366f1', strokeWidth: 2, cornerRadius: 6, label: '', labelColor: '#312e81', labelSize: 18 },
      { type: 'text', id: 's-lbl-top', rotation: 0, x: 305, y: 90, content: '← top', fontSize: 13, fontWeight: 700, color: '#64748b', textAnchor: 'start' },
      { type: 'arrow', id: 's-arr-push', rotation: 0, x1: 130, y1: 50, x2: 195, y2: 85, stroke: '#16a34a', strokeWidth: 2.5, curvature: 0, labelColor: '#0b0b0f', headEnd: 'arrow' },
      { type: 'text', id: 's-lbl-push', rotation: 0, x: 80, y: 45, content: 'push', fontSize: 13, fontWeight: 700, color: '#16a34a', textAnchor: 'start' },
      { type: 'arrow', id: 's-arr-pop', rotation: 0, x1: 195, y1: 110, x2: 130, y2: 145, stroke: '#dc2626', strokeWidth: 2.5, curvature: 0, labelColor: '#0b0b0f', headEnd: 'arrow' },
      { type: 'text', id: 's-lbl-pop', rotation: 0, x: 80, y: 155, content: 'pop', fontSize: 13, fontWeight: 700, color: '#dc2626', textAnchor: 'start' },
    ],
  };

  const arrayDef: AssetDef = {
    id: 'builtin-array',
    name: '배열 (Array) — 6 elements',
    description: '인덱스 0..5 의 빈 배열',
    category: 'array',
    builtin: true,
    elements: [
      ...[0, 1, 2, 3, 4, 5].flatMap((i) => [
        {
          type: 'rect' as const, id: `a-${i}`, rotation: 0,
          x: 100 + i * 65, y: 100, width: 60, height: 55,
          fill: '#e0e7ff', stroke: '#6366f1', strokeWidth: 2, cornerRadius: 6,
          label: '', labelColor: '#312e81', labelSize: 18,
        },
        {
          type: 'text' as const, id: `a-${i}-idx`, rotation: 0,
          x: 130 + i * 65, y: 175, content: String(i),
          fontSize: 11, fontWeight: 600, color: '#94a3b8', textAnchor: 'middle' as const,
        },
      ]),
    ],
  };

  const tree: AssetDef = {
    id: 'builtin-tree',
    name: '이진 트리 (Tree) — depth 3',
    description: '7개 노드의 완전 이진 트리 (라벨 비어있음)',
    category: 'tree',
    builtin: true,
    elements: [
      { type: 'line', id: 't-e-1-2', rotation: 0, fromId: 't-n1', toId: 't-n2', stroke: '#94a3b8', strokeWidth: 2 },
      { type: 'line', id: 't-e-1-3', rotation: 0, fromId: 't-n1', toId: 't-n3', stroke: '#94a3b8', strokeWidth: 2 },
      { type: 'line', id: 't-e-2-4', rotation: 0, fromId: 't-n2', toId: 't-n4', stroke: '#94a3b8', strokeWidth: 2 },
      { type: 'line', id: 't-e-2-5', rotation: 0, fromId: 't-n2', toId: 't-n5', stroke: '#94a3b8', strokeWidth: 2 },
      { type: 'line', id: 't-e-3-6', rotation: 0, fromId: 't-n3', toId: 't-n6', stroke: '#94a3b8', strokeWidth: 2 },
      { type: 'line', id: 't-e-3-7', rotation: 0, fromId: 't-n3', toId: 't-n7', stroke: '#94a3b8', strokeWidth: 2 },
      { type: 'circle', id: 't-n1', rotation: 0, cx: 250, cy: 80, r: 25, fill: '#e0e7ff', stroke: '#6366f1', strokeWidth: 2, label: '', labelColor: '#312e81', labelSize: 16 },
      { type: 'circle', id: 't-n2', rotation: 0, cx: 150, cy: 170, r: 25, fill: '#e0e7ff', stroke: '#6366f1', strokeWidth: 2, label: '', labelColor: '#312e81', labelSize: 16 },
      { type: 'circle', id: 't-n3', rotation: 0, cx: 350, cy: 170, r: 25, fill: '#e0e7ff', stroke: '#6366f1', strokeWidth: 2, label: '', labelColor: '#312e81', labelSize: 16 },
      { type: 'circle', id: 't-n4', rotation: 0, cx: 90, cy: 260, r: 25, fill: '#e0e7ff', stroke: '#6366f1', strokeWidth: 2, label: '', labelColor: '#312e81', labelSize: 16 },
      { type: 'circle', id: 't-n5', rotation: 0, cx: 210, cy: 260, r: 25, fill: '#e0e7ff', stroke: '#6366f1', strokeWidth: 2, label: '', labelColor: '#312e81', labelSize: 16 },
      { type: 'circle', id: 't-n6', rotation: 0, cx: 290, cy: 260, r: 25, fill: '#e0e7ff', stroke: '#6366f1', strokeWidth: 2, label: '', labelColor: '#312e81', labelSize: 16 },
      { type: 'circle', id: 't-n7', rotation: 0, cx: 410, cy: 260, r: 25, fill: '#e0e7ff', stroke: '#6366f1', strokeWidth: 2, label: '', labelColor: '#312e81', labelSize: 16 },
    ],
  };

  const graph: AssetDef = {
    id: 'builtin-graph',
    name: '그래프 (Graph) — 5 nodes',
    description: '5 노드의 무방향 그래프 (pentagon)',
    category: 'graph',
    builtin: true,
    elements: [
      { type: 'line', id: 'g-e-1-2', rotation: 0, fromId: 'g-n1', toId: 'g-n2', stroke: '#94a3b8', strokeWidth: 2 },
      { type: 'line', id: 'g-e-2-3', rotation: 0, fromId: 'g-n2', toId: 'g-n3', stroke: '#94a3b8', strokeWidth: 2 },
      { type: 'line', id: 'g-e-3-4', rotation: 0, fromId: 'g-n3', toId: 'g-n4', stroke: '#94a3b8', strokeWidth: 2 },
      { type: 'line', id: 'g-e-4-5', rotation: 0, fromId: 'g-n4', toId: 'g-n5', stroke: '#94a3b8', strokeWidth: 2 },
      { type: 'line', id: 'g-e-5-1', rotation: 0, fromId: 'g-n5', toId: 'g-n1', stroke: '#94a3b8', strokeWidth: 2 },
      { type: 'circle', id: 'g-n1', rotation: 0, cx: 250, cy: 80, r: 28, fill: '#e0e7ff', stroke: '#6366f1', strokeWidth: 2, label: '', labelColor: '#312e81', labelSize: 16 },
      { type: 'circle', id: 'g-n2', rotation: 0, cx: 380, cy: 170, r: 28, fill: '#e0e7ff', stroke: '#6366f1', strokeWidth: 2, label: '', labelColor: '#312e81', labelSize: 16 },
      { type: 'circle', id: 'g-n3', rotation: 0, cx: 330, cy: 310, r: 28, fill: '#e0e7ff', stroke: '#6366f1', strokeWidth: 2, label: '', labelColor: '#312e81', labelSize: 16 },
      { type: 'circle', id: 'g-n4', rotation: 0, cx: 170, cy: 310, r: 28, fill: '#e0e7ff', stroke: '#6366f1', strokeWidth: 2, label: '', labelColor: '#312e81', labelSize: 16 },
      { type: 'circle', id: 'g-n5', rotation: 0, cx: 120, cy: 170, r: 28, fill: '#e0e7ff', stroke: '#6366f1', strokeWidth: 2, label: '', labelColor: '#312e81', labelSize: 16 },
    ],
  };

  return [queue, stack, arrayDef, tree, graph];
}

export function listAssets(): AssetDef[] {
  return [...builtin(), ...readSaved()];
}

export function saveAsset(name: string, elements: AnimationElement[], category: AssetDef['category'] = 'custom'): AssetDef {
  const id = `custom-${Date.now()}`;
  const asset: AssetDef = {
    id,
    name: name.trim() || 'Untitled',
    category,
    elements: JSON.parse(JSON.stringify(elements)),
  };
  const saved = readSaved();
  saved.push(asset);
  writeSaved(saved);
  return asset;
}

export function deleteAsset(id: string): void {
  if (id.startsWith('builtin-')) return;
  const saved = readSaved().filter((a) => a.id !== id);
  writeSaved(saved);
}
