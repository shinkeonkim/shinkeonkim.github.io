import type { AnimationElement } from '../../animations/schema';

export type AssetCategory = 'queue' | 'stack' | 'array' | 'graph' | 'tree' | 'custom';

export interface AssetParam {
  name: string;
  type: 'number' | 'string' | 'string-array';
  label: string;
  default: unknown;
  min?: number;
  max?: number;
  placeholder?: string;
}

export interface BuiltinAsset {
  id: string;
  name: string;
  description?: string;
  category: AssetCategory;
  builtin: true;
  params: AssetParam[];
  generate: (params: Record<string, unknown>) => AnimationElement[];
}

export interface CustomAsset {
  id: string;
  name: string;
  description?: string;
  category: AssetCategory;
  builtin: false;
  elements: AnimationElement[];
}

export type AssetDef = BuiltinAsset | CustomAsset;

const STORAGE_KEY = 'studio.assets.v3';
const listeners = new Set<() => void>();
const TRACK_FIELDS = { appearances: [] as never[], tracks: [] as never[] };

function readSaved(): CustomAsset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((a): a is CustomAsset => !!a && typeof a.id === 'string' && Array.isArray(a.elements));
  } catch {
    return [];
  }
}

function writeSaved(list: CustomAsset[]): void {
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

function num(params: Record<string, unknown>, key: string, fallback: number): number {
  const v = params[key];
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function strArr(params: Record<string, unknown>, key: string, fallback: string[]): string[] {
  const v = params[key];
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string' && v.trim()) return v.split(',').map((s) => s.trim());
  return fallback;
}

function queueGenerate(params: Record<string, unknown>): AnimationElement[] {
  const size = Math.max(1, Math.min(10, num(params, 'size', 3)));
  const items = strArr(params, 'items', new Array(size).fill(''));
  const slotW = 70;
  const gap = 5;
  const startX = 100;
  const out: AnimationElement[] = [];
  for (let i = 0; i < size; i += 1) {
    out.push({
      type: 'rect', id: `q-s${i}`, rotation: 0, ...TRACK_FIELDS,
      x: startX + i * (slotW + gap), y: 100, width: slotW, height: 60,
      fill: '#e0e7ff', stroke: '#6366f1', strokeWidth: 2, cornerRadius: 6,
      label: items[i] ?? '', labelColor: '#312e81', labelSize: 18,
    });
  }
  out.push(
    { type: 'text', id: 'q-lbl-front', rotation: 0, ...TRACK_FIELDS, x: startX + slotW / 2, y: 90, content: 'front', fontSize: 12, fontWeight: 700, color: '#64748b', textAnchor: 'middle' },
    { type: 'text', id: 'q-lbl-back', rotation: 0, ...TRACK_FIELDS, x: startX + (size - 1) * (slotW + gap) + slotW / 2, y: 90, content: 'back', fontSize: 12, fontWeight: 700, color: '#64748b', textAnchor: 'middle' },
    { type: 'arrow', id: 'q-arr-in', rotation: 0, ...TRACK_FIELDS, x1: startX + size * (slotW + gap) + 40, y1: 130, x2: startX + size * (slotW + gap), y2: 130, stroke: '#16a34a', strokeWidth: 2.5, curvature: 0, labelColor: '#0b0b0f', headEnd: 'arrow' },
    { type: 'text', id: 'q-lbl-in', rotation: 0, ...TRACK_FIELDS, x: startX + size * (slotW + gap) + 50, y: 135, content: 'enqueue', fontSize: 12, fontWeight: 700, color: '#16a34a', textAnchor: 'start' },
    { type: 'arrow', id: 'q-arr-out', rotation: 0, ...TRACK_FIELDS, x1: startX, y1: 130, x2: startX - 40, y2: 130, stroke: '#dc2626', strokeWidth: 2.5, curvature: 0, labelColor: '#0b0b0f', headEnd: 'arrow' },
    { type: 'text', id: 'q-lbl-out', rotation: 0, ...TRACK_FIELDS, x: startX - 50, y: 135, content: 'dequeue', fontSize: 12, fontWeight: 700, color: '#dc2626', textAnchor: 'end' },
  );
  return out;
}

function stackGenerate(params: Record<string, unknown>): AnimationElement[] {
  const size = Math.max(1, Math.min(10, num(params, 'size', 3)));
  const items = strArr(params, 'items', new Array(size).fill(''));
  const slotH = 50;
  const gap = 5;
  const topY = 60;
  const out: AnimationElement[] = [];
  for (let i = 0; i < size; i += 1) {
    const idxFromTop = size - 1 - i;
    out.push({
      type: 'rect', id: `s-s${i}`, rotation: 0, ...TRACK_FIELDS,
      x: 200, y: topY + idxFromTop * (slotH + gap), width: 90, height: slotH,
      fill: '#e0e7ff', stroke: '#6366f1', strokeWidth: 2, cornerRadius: 6,
      label: items[i] ?? '', labelColor: '#312e81', labelSize: 18,
    });
  }
  out.push(
    { type: 'text', id: 's-lbl-top', rotation: 0, ...TRACK_FIELDS, x: 305, y: topY + 30, content: '← top', fontSize: 13, fontWeight: 700, color: '#64748b', textAnchor: 'start' },
    { type: 'arrow', id: 's-arr-push', rotation: 0, ...TRACK_FIELDS, x1: 130, y1: topY - 10, x2: 195, y2: topY + 25, stroke: '#16a34a', strokeWidth: 2.5, curvature: 0, labelColor: '#0b0b0f', headEnd: 'arrow' },
    { type: 'text', id: 's-lbl-push', rotation: 0, ...TRACK_FIELDS, x: 80, y: topY - 15, content: 'push', fontSize: 13, fontWeight: 700, color: '#16a34a', textAnchor: 'start' },
    { type: 'arrow', id: 's-arr-pop', rotation: 0, ...TRACK_FIELDS, x1: 195, y1: topY + 50, x2: 130, y2: topY + 85, stroke: '#dc2626', strokeWidth: 2.5, curvature: 0, labelColor: '#0b0b0f', headEnd: 'arrow' },
    { type: 'text', id: 's-lbl-pop', rotation: 0, ...TRACK_FIELDS, x: 80, y: topY + 95, content: 'pop', fontSize: 13, fontWeight: 700, color: '#dc2626', textAnchor: 'start' },
  );
  return out;
}

function arrayGenerate(params: Record<string, unknown>): AnimationElement[] {
  const size = Math.max(1, Math.min(20, num(params, 'size', 6)));
  const items = strArr(params, 'items', new Array(size).fill(''));
  const cellW = num(params, 'cellWidth', 60);
  const gap = 5;
  const startX = num(params, 'startX', 100);
  const startY = num(params, 'startY', 100);
  const out: AnimationElement[] = [];
  for (let i = 0; i < size; i += 1) {
    out.push({
      type: 'rect', id: `a-${i}`, rotation: 0, ...TRACK_FIELDS,
      x: startX + i * (cellW + gap), y: startY, width: cellW, height: 55,
      fill: '#e0e7ff', stroke: '#6366f1', strokeWidth: 2, cornerRadius: 6,
      label: items[i] ?? '', labelColor: '#312e81', labelSize: 18,
    });
    out.push({
      type: 'text', id: `a-${i}-idx`, rotation: 0, ...TRACK_FIELDS,
      x: startX + i * (cellW + gap) + cellW / 2, y: startY + 75,
      content: String(i), fontSize: 11, fontWeight: 600, color: '#94a3b8', textAnchor: 'middle',
    });
  }
  return out;
}

function treeGenerate(params: Record<string, unknown>): AnimationElement[] {
  const depth = Math.max(1, Math.min(5, num(params, 'depth', 3)));
  const out: AnimationElement[] = [];
  const canvasW = 500;
  const levelGap = 90;
  const startY = 80;
  let nodeIdx = 0;
  const ids: string[][] = [];
  for (let level = 0; level < depth; level += 1) {
    const count = 2 ** level;
    const row: string[] = [];
    const spacing = canvasW / (count + 1);
    for (let i = 0; i < count; i += 1) {
      nodeIdx += 1;
      const id = `t-n${nodeIdx}`;
      row.push(id);
      const cx = (i + 1) * spacing;
      const cy = startY + level * levelGap;
      out.push({
        type: 'circle', id, rotation: 0, ...TRACK_FIELDS,
        cx, cy, r: Math.max(15, 30 - level * 4),
        fill: '#e0e7ff', stroke: '#6366f1', strokeWidth: 2,
        label: String(nodeIdx), labelColor: '#312e81', labelSize: 14,
      });
    }
    ids.push(row);
  }
  let edgeIdx = 0;
  for (let level = 1; level < depth; level += 1) {
    for (let i = 0; i < ids[level].length; i += 1) {
      const parentIdx = Math.floor(i / 2);
      edgeIdx += 1;
      out.push({
        type: 'line', id: `t-e${edgeIdx}`, rotation: 0, ...TRACK_FIELDS,
        fromId: ids[level - 1][parentIdx], toId: ids[level][i],
        stroke: '#94a3b8', strokeWidth: 2,
      });
    }
  }
  return out;
}

function graphGenerate(params: Record<string, unknown>): AnimationElement[] {
  const nodes = Math.max(3, Math.min(10, num(params, 'nodes', 5)));
  const layout = String(params.layout ?? 'pentagon');
  const out: AnimationElement[] = [];
  const cx = 280;
  const cy = 200;
  const r = 130;
  for (let i = 0; i < nodes; i += 1) {
    const angle = layout === 'line' ? 0 : (i / nodes) * Math.PI * 2 - Math.PI / 2;
    const px = layout === 'line' ? 80 + i * 100 : cx + r * Math.cos(angle);
    const py = layout === 'line' ? cy : cy + r * Math.sin(angle);
    out.push({
      type: 'circle', id: `g-n${i + 1}`, rotation: 0, ...TRACK_FIELDS,
      cx: Math.round(px), cy: Math.round(py), r: 28,
      fill: '#e0e7ff', stroke: '#6366f1', strokeWidth: 2,
      label: String(i + 1), labelColor: '#312e81', labelSize: 16,
    });
  }
  for (let i = 0; i < nodes; i += 1) {
    const next = (i + 1) % nodes;
    if (layout === 'line' && next === 0) break;
    out.push({
      type: 'line', id: `g-e${i + 1}`, rotation: 0, ...TRACK_FIELDS,
      fromId: `g-n${i + 1}`, toId: `g-n${next + 1}`,
      stroke: '#94a3b8', strokeWidth: 2,
    });
  }
  return out;
}

const BUILTINS: BuiltinAsset[] = [
  {
    id: 'builtin-queue', name: '큐 (Queue)',
    description: 'FIFO 큐. front / back 라벨 + enqueue / dequeue 화살표', category: 'queue', builtin: true,
    params: [
      { name: 'size', type: 'number', label: '슬롯 개수', default: 3, min: 1, max: 10 },
      { name: 'items', type: 'string-array', label: '초기 내용 (쉼표 구분)', default: '' },
    ],
    generate: queueGenerate,
  },
  {
    id: 'builtin-stack', name: '스택 (Stack)',
    description: 'LIFO 스택. top 라벨 + push / pop 화살표', category: 'stack', builtin: true,
    params: [
      { name: 'size', type: 'number', label: '슬롯 개수', default: 3, min: 1, max: 10 },
      { name: 'items', type: 'string-array', label: '초기 내용 (바닥→top, 쉼표 구분)', default: '' },
    ],
    generate: stackGenerate,
  },
  {
    id: 'builtin-array', name: '배열 (Array)',
    description: '인덱스 표시된 셀 묶음', category: 'array', builtin: true,
    params: [
      { name: 'size', type: 'number', label: '셀 개수', default: 6, min: 1, max: 20 },
      { name: 'items', type: 'string-array', label: '초기 값 (쉼표 구분)', default: '' },
      { name: 'cellWidth', type: 'number', label: '셀 너비', default: 60, min: 30, max: 120 },
    ],
    generate: arrayGenerate,
  },
  {
    id: 'builtin-tree', name: '이진 트리 (Tree)',
    description: '완전 이진 트리. depth=N 이면 2^N - 1 개 노드', category: 'tree', builtin: true,
    params: [{ name: 'depth', type: 'number', label: '깊이', default: 3, min: 1, max: 5 }],
    generate: treeGenerate,
  },
  {
    id: 'builtin-graph', name: '그래프 (Graph)',
    description: '다각형 또는 선형 layout 의 무방향 그래프', category: 'graph', builtin: true,
    params: [
      { name: 'nodes', type: 'number', label: '노드 개수', default: 5, min: 3, max: 10 },
      { name: 'layout', type: 'string', label: 'layout (pentagon | line)', default: 'pentagon' },
    ],
    generate: graphGenerate,
  },
];

export function listAssets(): AssetDef[] {
  return [...BUILTINS, ...readSaved()];
}

export function saveAsset(name: string, elements: AnimationElement[], category: AssetCategory = 'custom'): CustomAsset {
  const id = `custom-${Date.now()}`;
  const asset: CustomAsset = {
    id, name: name.trim() || 'Untitled', category, builtin: false,
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

export function resolveAssetElements(asset: AssetDef, params: Record<string, unknown>): AnimationElement[] {
  if (asset.builtin) return asset.generate(params);
  return JSON.parse(JSON.stringify(asset.elements));
}

function bbox(elements: AnimationElement[]): { x: number; y: number; w: number; h: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const el of elements) {
    let ex = 0, ey = 0, ew = 0, eh = 0;
    if (el.type === 'rect' || el.type === 'image') {
      ex = el.x; ey = el.y; ew = el.width; eh = el.height;
    } else if (el.type === 'text') {
      ex = el.x - 50; ey = el.y - 12; ew = 100; eh = 24;
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

export function instantiateAsset(
  asset: AssetDef,
  params: Record<string, unknown>,
  offsetX: number,
  offsetY: number,
  uniqueId: (prefix: string) => string,
): AnimationElement[] {
  const sourceElements = resolveAssetElements(asset, params);
  const box = bbox(sourceElements);
  const dx = offsetX - box.x;
  const dy = offsetY - box.y;
  const idMap = new Map<string, string>();
  const out: AnimationElement[] = [];
  for (const el of sourceElements) {
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
