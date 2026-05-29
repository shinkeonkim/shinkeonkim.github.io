import type { AnimationElement } from '../../animations/schema';
import type { AnyAssetParam, AssetParamSpec } from './asset-schema';

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
  params: AnyAssetParam[];
  generate: (params: Record<string, unknown>) => AnimationElement[];
}

export interface CustomAsset {
  id: string;
  name: string;
  description?: string;
  category: AssetCategory;
  builtin: false;
  elements: AnimationElement[];
  params?: AnyAssetParam[];
}

export type AssetDef = BuiltinAsset | CustomAsset;

const STORAGE_KEY = 'studio.assets.v4';
const LEGACY_STORAGE_KEY_V3 = 'studio.assets.v3';

function migrateFromV3IfNeeded(): void {
  try {
    if (localStorage.getItem(STORAGE_KEY) !== null) return;
    const v3 = localStorage.getItem(LEGACY_STORAGE_KEY_V3);
    if (!v3) return;
    localStorage.setItem(STORAGE_KEY, v3);
  } catch {
    void 0;
  }
}
const listeners = new Set<() => void>();
const TRACK_FIELDS = { appearances: [] as never[], tracks: [] as never[] };

function readSaved(): CustomAsset[] {
  try {
    migrateFromV3IfNeeded();
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

function str(params: Record<string, unknown>, key: string, fallback: string): string {
  const v = params[key];
  return typeof v === 'string' ? v : fallback;
}

function bool(params: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const v = params[key];
  return typeof v === 'boolean' ? v : fallback;
}

function pt(params: Record<string, unknown>, key: string, fallback: { x: number; y: number }): { x: number; y: number } {
  const v = params[key];
  if (v && typeof v === 'object' && 'x' in v && 'y' in v) {
    const o = v as { x: unknown; y: unknown };
    return { x: typeof o.x === 'number' ? o.x : fallback.x, y: typeof o.y === 'number' ? o.y : fallback.y };
  }
  return fallback;
}

const QUEUE_PARAMS: AssetParamSpec[] = [
  { kind: 'number', name: 'size', label: '슬롯 개수', default: 3, min: 1, max: 10 },
  { kind: 'string-list', name: 'items', label: '초기 내용', default: [], placeholder: '쉼표 구분 (예: A, B, C)' },
  { kind: 'boolean', name: 'showArrows', label: 'enqueue / dequeue 화살표', default: true },
  { kind: 'point', name: 'start', label: '시작 위치 (x, y)', default: { x: 100, y: 100 } },
  { kind: 'group', name: 'style', label: '스타일', collapsed: true, fields: [
    { kind: 'color', name: 'slotFill', label: '슬롯 배경', default: '#e0e7ff' },
    { kind: 'color', name: 'slotStroke', label: '슬롯 테두리', default: '#6366f1' },
    { kind: 'number', name: 'slotWidth', label: '슬롯 너비', default: 70, min: 30, max: 200 },
    { kind: 'number', name: 'slotHeight', label: '슬롯 높이', default: 60, min: 20, max: 200 },
  ]},
];

function queueGenerate(params: Record<string, unknown>): AnimationElement[] {
  const size = Math.max(1, Math.min(10, num(params, 'size', 3)));
  const items = strArr(params, 'items', new Array(size).fill(''));
  const showArrows = bool(params, 'showArrows', true);
  const start = pt(params, 'start', { x: 100, y: 100 });
  const slotW = num(params, 'slotWidth', 70);
  const slotH = num(params, 'slotHeight', 60);
  const slotFill = str(params, 'slotFill', '#e0e7ff');
  const slotStroke = str(params, 'slotStroke', '#6366f1');
  const gap = 5;
  const startX = start.x;
  const startY = start.y;
  const out: AnimationElement[] = [];
  for (let i = 0; i < size; i += 1) {
    out.push({
      type: 'rect', id: `q-s${i}`, name: `Slot ${i + 1}`, rotation: 0, ...TRACK_FIELDS,
      x: startX + i * (slotW + gap), y: startY, width: slotW, height: slotH,
      fill: slotFill, stroke: slotStroke, strokeWidth: 2, cornerRadius: 6,
      label: items[i] ?? '', labelColor: '#312e81', labelSize: 18,
    });
  }
  out.push(
    { type: 'text', id: 'q-lbl-front', name: 'front 라벨', rotation: 0, ...TRACK_FIELDS, x: startX + slotW / 2, y: startY - 10, content: 'front', fontSize: 12, fontWeight: 700, color: '#64748b', textAnchor: 'middle' },
    { type: 'text', id: 'q-lbl-back', name: 'back 라벨', rotation: 0, ...TRACK_FIELDS, x: startX + (size - 1) * (slotW + gap) + slotW / 2, y: startY - 10, content: 'back', fontSize: 12, fontWeight: 700, color: '#64748b', textAnchor: 'middle' },
  );
  if (showArrows) {
    const arrowY = startY + slotH / 2;
    out.push(
      { type: 'arrow', id: 'q-arr-in', name: 'enqueue 화살표', rotation: 0, ...TRACK_FIELDS, x1: startX + size * (slotW + gap) + 40, y1: arrowY, x2: startX + size * (slotW + gap), y2: arrowY, stroke: '#16a34a', strokeWidth: 2.5, curvature: 0, labelColor: '#0b0b0f', headEnd: 'arrow' },
      { type: 'text', id: 'q-lbl-in', name: 'enqueue 라벨', rotation: 0, ...TRACK_FIELDS, x: startX + size * (slotW + gap) + 50, y: arrowY + 5, content: 'enqueue', fontSize: 12, fontWeight: 700, color: '#16a34a', textAnchor: 'start' },
      { type: 'arrow', id: 'q-arr-out', name: 'dequeue 화살표', rotation: 0, ...TRACK_FIELDS, x1: startX, y1: arrowY, x2: startX - 40, y2: arrowY, stroke: '#dc2626', strokeWidth: 2.5, curvature: 0, labelColor: '#0b0b0f', headEnd: 'arrow' },
      { type: 'text', id: 'q-lbl-out', name: 'dequeue 라벨', rotation: 0, ...TRACK_FIELDS, x: startX - 50, y: arrowY + 5, content: 'dequeue', fontSize: 12, fontWeight: 700, color: '#dc2626', textAnchor: 'end' },
    );
  }
  return out;
}

const STACK_PARAMS: AssetParamSpec[] = [
  { kind: 'number', name: 'size', label: '슬롯 개수', default: 3, min: 1, max: 10 },
  { kind: 'string-list', name: 'items', label: '초기 내용 (바닥 → top)', default: [], placeholder: '쉼표 구분' },
  { kind: 'boolean', name: 'showArrows', label: 'push / pop 화살표', default: true },
  { kind: 'point', name: 'topAt', label: 'top 위치 (x, y)', default: { x: 200, y: 60 } },
  { kind: 'group', name: 'style', label: '스타일', collapsed: true, fields: [
    { kind: 'color', name: 'slotFill', label: '슬롯 배경', default: '#e0e7ff' },
    { kind: 'color', name: 'slotStroke', label: '슬롯 테두리', default: '#6366f1' },
    { kind: 'number', name: 'slotWidth', label: '슬롯 너비', default: 90, min: 30, max: 200 },
    { kind: 'number', name: 'slotHeight', label: '슬롯 높이', default: 50, min: 20, max: 200 },
  ]},
];

function stackGenerate(params: Record<string, unknown>): AnimationElement[] {
  const size = Math.max(1, Math.min(10, num(params, 'size', 3)));
  const items = strArr(params, 'items', new Array(size).fill(''));
  const showArrows = bool(params, 'showArrows', true);
  const top = pt(params, 'topAt', { x: 200, y: 60 });
  const slotW = num(params, 'slotWidth', 90);
  const slotH = num(params, 'slotHeight', 50);
  const slotFill = str(params, 'slotFill', '#e0e7ff');
  const slotStroke = str(params, 'slotStroke', '#6366f1');
  const gap = 5;
  const topY = top.y;
  const topX = top.x;
  const out: AnimationElement[] = [];
  for (let i = 0; i < size; i += 1) {
    const idxFromTop = size - 1 - i;
    out.push({
      type: 'rect', id: `s-s${i}`, name: `Slot ${i + 1}`, rotation: 0, ...TRACK_FIELDS,
      x: topX, y: topY + idxFromTop * (slotH + gap), width: slotW, height: slotH,
      fill: slotFill, stroke: slotStroke, strokeWidth: 2, cornerRadius: 6,
      label: items[i] ?? '', labelColor: '#312e81', labelSize: 18,
    });
  }
  out.push(
    { type: 'text', id: 's-lbl-top', name: 'top 라벨', rotation: 0, ...TRACK_FIELDS, x: topX + slotW + 15, y: topY + slotH / 2 + 5, content: '← top', fontSize: 13, fontWeight: 700, color: '#64748b', textAnchor: 'start' },
  );
  if (showArrows) {
    out.push(
      { type: 'arrow', id: 's-arr-push', name: 'push 화살표', rotation: 0, ...TRACK_FIELDS, x1: topX - 70, y1: topY - 10, x2: topX - 5, y2: topY + 25, stroke: '#16a34a', strokeWidth: 2.5, curvature: 0, labelColor: '#0b0b0f', headEnd: 'arrow' },
      { type: 'text', id: 's-lbl-push', name: 'push 라벨', rotation: 0, ...TRACK_FIELDS, x: topX - 120, y: topY - 15, content: 'push', fontSize: 13, fontWeight: 700, color: '#16a34a', textAnchor: 'start' },
      { type: 'arrow', id: 's-arr-pop', name: 'pop 화살표', rotation: 0, ...TRACK_FIELDS, x1: topX - 5, y1: topY + 50, x2: topX - 70, y2: topY + 85, stroke: '#dc2626', strokeWidth: 2.5, curvature: 0, labelColor: '#0b0b0f', headEnd: 'arrow' },
      { type: 'text', id: 's-lbl-pop', name: 'pop 라벨', rotation: 0, ...TRACK_FIELDS, x: topX - 120, y: topY + 95, content: 'pop', fontSize: 13, fontWeight: 700, color: '#dc2626', textAnchor: 'start' },
    );
  }
  return out;
}

const ARRAY_PARAMS: AssetParamSpec[] = [
  { kind: 'number', name: 'size', label: '셀 개수', default: 6, min: 1, max: 20 },
  { kind: 'string-list', name: 'items', label: '초기 값', default: [], placeholder: '쉼표 구분' },
  { kind: 'boolean', name: 'showIndex', label: '인덱스 표시', default: true },
  { kind: 'point', name: 'start', label: '시작 위치 (x, y)', default: { x: 100, y: 100 } },
  { kind: 'group', name: 'style', label: '스타일', collapsed: true, fields: [
    { kind: 'color', name: 'cellFill', label: '셀 배경', default: '#e0e7ff' },
    { kind: 'color', name: 'cellStroke', label: '셀 테두리', default: '#6366f1' },
    { kind: 'number', name: 'cellWidth', label: '셀 너비', default: 60, min: 20, max: 200 },
    { kind: 'number', name: 'cellHeight', label: '셀 높이', default: 55, min: 20, max: 200 },
    { kind: 'number', name: 'gap', label: '셀 간격', default: 5, min: 0, max: 30 },
  ]},
];

function arrayGenerate(params: Record<string, unknown>): AnimationElement[] {
  const size = Math.max(1, Math.min(20, num(params, 'size', 6)));
  const items = strArr(params, 'items', new Array(size).fill(''));
  const showIndex = bool(params, 'showIndex', true);
  const cellW = num(params, 'cellWidth', 60);
  const cellH = num(params, 'cellHeight', 55);
  const gap = num(params, 'gap', 5);
  const start = pt(params, 'start', { x: 100, y: 100 });
  const cellFill = str(params, 'cellFill', '#e0e7ff');
  const cellStroke = str(params, 'cellStroke', '#6366f1');
  const out: AnimationElement[] = [];
  for (let i = 0; i < size; i += 1) {
    out.push({
      type: 'rect', id: `a-${i}`, name: `Cell [${i}]`, rotation: 0, ...TRACK_FIELDS,
      x: start.x + i * (cellW + gap), y: start.y, width: cellW, height: cellH,
      fill: cellFill, stroke: cellStroke, strokeWidth: 2, cornerRadius: 6,
      label: items[i] ?? '', labelColor: '#312e81', labelSize: 18,
    });
    if (showIndex) {
      out.push({
        type: 'text', id: `a-${i}-idx`, name: `Index ${i}`, rotation: 0, ...TRACK_FIELDS,
        x: start.x + i * (cellW + gap) + cellW / 2, y: start.y + cellH + 20,
        content: String(i), fontSize: 11, fontWeight: 600, color: '#94a3b8', textAnchor: 'middle',
      });
    }
  }
  return out;
}

const TREE_PARAMS: AssetParamSpec[] = [
  { kind: 'number', name: 'depth', label: '깊이', default: 3, min: 1, max: 5 },
  { kind: 'point', name: 'rootAt', label: '루트 위치 (x, y)', default: { x: 250, y: 80 } },
  { kind: 'number', name: 'spreadWidth', label: '폭 (가로 전개)', default: 500, min: 200, max: 1200 },
  { kind: 'number', name: 'levelGap', label: '레벨 간격', default: 90, min: 40, max: 200 },
  { kind: 'group', name: 'style', label: '스타일', collapsed: true, fields: [
    { kind: 'color', name: 'nodeFill', label: '노드 배경', default: '#e0e7ff' },
    { kind: 'color', name: 'nodeStroke', label: '노드 테두리', default: '#6366f1' },
    { kind: 'color', name: 'edgeStroke', label: '엣지 색', default: '#94a3b8' },
  ]},
];

function treeGenerate(params: Record<string, unknown>): AnimationElement[] {
  const depth = Math.max(1, Math.min(5, num(params, 'depth', 3)));
  const root = pt(params, 'rootAt', { x: 250, y: 80 });
  const canvasW = num(params, 'spreadWidth', 500);
  const levelGap = num(params, 'levelGap', 90);
  const nodeFill = str(params, 'nodeFill', '#e0e7ff');
  const nodeStroke = str(params, 'nodeStroke', '#6366f1');
  const edgeStroke = str(params, 'edgeStroke', '#94a3b8');
  const out: AnimationElement[] = [];
  const startX = root.x - canvasW / 2;
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
      const cx = startX + (i + 1) * spacing;
      const cy = root.y + level * levelGap;
      out.push({
        type: 'circle', id, name: `Node ${nodeIdx}`, rotation: 0, ...TRACK_FIELDS,
        cx, cy, r: Math.max(15, 30 - level * 4),
        fill: nodeFill, stroke: nodeStroke, strokeWidth: 2,
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
        type: 'line', id: `t-e${edgeIdx}`, name: `Edge ${edgeIdx}`, rotation: 0, ...TRACK_FIELDS,
        fromId: ids[level - 1][parentIdx], toId: ids[level][i],
        stroke: edgeStroke, strokeWidth: 2,
      });
    }
  }
  return out;
}

const GRAPH_PARAMS: AssetParamSpec[] = [
  { kind: 'number', name: 'nodes', label: '노드 개수', default: 5, min: 3, max: 12 },
  { kind: 'select', name: 'layout', label: '배치', default: 'polygon', options: [
    { value: 'polygon', label: '다각형 (원형)' },
    { value: 'line', label: '선형' },
  ]},
  { kind: 'point', name: 'center', label: '중심 (x, y)', default: { x: 280, y: 200 } },
  { kind: 'number', name: 'radius', label: '반지름 (다각형)', default: 130, min: 30, max: 500 },
  { kind: 'number', name: 'nodeR', label: '노드 반지름', default: 28, min: 8, max: 80 },
  { kind: 'group', name: 'style', label: '스타일', collapsed: true, fields: [
    { kind: 'color', name: 'nodeFill', label: '노드 배경', default: '#e0e7ff' },
    { kind: 'color', name: 'nodeStroke', label: '노드 테두리', default: '#6366f1' },
    { kind: 'color', name: 'edgeStroke', label: '엣지 색', default: '#94a3b8' },
  ]},
];

function graphGenerate(params: Record<string, unknown>): AnimationElement[] {
  const nodes = Math.max(3, Math.min(12, num(params, 'nodes', 5)));
  const layout = str(params, 'layout', 'polygon');
  const center = pt(params, 'center', { x: 280, y: 200 });
  const r = num(params, 'radius', 130);
  const nodeR = num(params, 'nodeR', 28);
  const nodeFill = str(params, 'nodeFill', '#e0e7ff');
  const nodeStroke = str(params, 'nodeStroke', '#6366f1');
  const edgeStroke = str(params, 'edgeStroke', '#94a3b8');
  const out: AnimationElement[] = [];
  for (let i = 0; i < nodes; i += 1) {
    const angle = layout === 'line' ? 0 : (i / nodes) * Math.PI * 2 - Math.PI / 2;
    const px = layout === 'line' ? center.x - ((nodes - 1) * 100) / 2 + i * 100 : center.x + r * Math.cos(angle);
    const py = layout === 'line' ? center.y : center.y + r * Math.sin(angle);
    out.push({
      type: 'circle', id: `g-n${i + 1}`, name: `Node ${i + 1}`, rotation: 0, ...TRACK_FIELDS,
      cx: Math.round(px), cy: Math.round(py), r: nodeR,
      fill: nodeFill, stroke: nodeStroke, strokeWidth: 2,
      label: String(i + 1), labelColor: '#312e81', labelSize: 16,
    });
  }
  for (let i = 0; i < nodes; i += 1) {
    const next = (i + 1) % nodes;
    if (layout === 'line' && next === 0) break;
    out.push({
      type: 'line', id: `g-e${i + 1}`, name: `Edge ${i + 1}`, rotation: 0, ...TRACK_FIELDS,
      fromId: `g-n${i + 1}`, toId: `g-n${next + 1}`,
      stroke: edgeStroke, strokeWidth: 2,
    });
  }
  return out;
}

const BUILTINS: BuiltinAsset[] = [
  {
    id: 'builtin-queue', name: '큐 (Queue)',
    description: 'FIFO 큐. front / back 라벨 + enqueue / dequeue 화살표', category: 'queue', builtin: true,
    params: QUEUE_PARAMS,
    generate: queueGenerate,
  },
  {
    id: 'builtin-stack', name: '스택 (Stack)',
    description: 'LIFO 스택. top 라벨 + push / pop 화살표', category: 'stack', builtin: true,
    params: STACK_PARAMS,
    generate: stackGenerate,
  },
  {
    id: 'builtin-array', name: '배열 (Array)',
    description: '인덱스 표시된 셀 묶음', category: 'array', builtin: true,
    params: ARRAY_PARAMS,
    generate: arrayGenerate,
  },
  {
    id: 'builtin-tree', name: '이진 트리 (Tree)',
    description: '완전 이진 트리. depth=N 이면 2^N - 1 개 노드', category: 'tree', builtin: true,
    params: TREE_PARAMS,
    generate: treeGenerate,
  },
  {
    id: 'builtin-graph', name: '그래프 (Graph)',
    description: '다각형 또는 선형 layout 의 무방향 그래프', category: 'graph', builtin: true,
    params: GRAPH_PARAMS,
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
