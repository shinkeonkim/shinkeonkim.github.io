import type { AnimationElement } from '@/entities/animation/engine/schema';
import { getDef, getSelection, getSelectedElementIds, updateElementBase } from './state';

export type AlignKind = 'left' | 'center-h' | 'right' | 'top' | 'middle-v' | 'bottom';
export type DistributeKind = 'horizontal' | 'vertical';

interface Bbox { x: number; y: number; w: number; h: number }

function elementBbox(el: AnimationElement): Bbox | null {
  if (el.type === 'rect' || el.type === 'image') return { x: el.x, y: el.y, w: el.width, h: el.height };
  if (el.type === 'circle') return { x: el.cx - el.r, y: el.cy - el.r, w: el.r * 2, h: el.r * 2 };
  if (el.type === 'text') return { x: el.x - 40, y: el.y - (el.fontSize ?? 16), w: 80, h: el.fontSize ?? 16 };
  if (el.type === 'line' || el.type === 'arrow') {
    if (typeof el.x1 !== 'number' || typeof el.x2 !== 'number' || typeof el.y1 !== 'number' || typeof el.y2 !== 'number') return null;
    return {
      x: Math.min(el.x1, el.x2),
      y: Math.min(el.y1, el.y2),
      w: Math.abs(el.x2 - el.x1),
      h: Math.abs(el.y2 - el.y1),
    };
  }
  if (el.type === 'polygon') {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let any = false;
    for (const pair of el.points.trim().split(/\s+/)) {
      const [x, y] = pair.split(',').map(Number);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      any = true;
      if (x < minX) minX = x; if (y < minY) minY = y;
      if (x > maxX) maxX = x; if (y > maxY) maxY = y;
    }
    return any ? { x: minX, y: minY, w: maxX - minX, h: maxY - minY } : null;
  }
  if (el.type === 'path') return { x: el.x ?? 0, y: el.y ?? 0, w: 60, h: 60 };
  return null;
}

function shiftBy(el: AnimationElement, dx: number, dy: number): void {
  if (dx === 0 && dy === 0) return;
  if (el.type === 'rect' || el.type === 'image' || el.type === 'text') {
    updateElementBase(el.id, { x: el.x + dx, y: el.y + dy });
  } else if (el.type === 'circle') {
    updateElementBase(el.id, { cx: el.cx + dx, cy: el.cy + dy });
  } else if (el.type === 'line' || el.type === 'arrow') {
    const patch: Record<string, unknown> = {};
    if (typeof el.x1 === 'number') patch.x1 = el.x1 + dx;
    if (typeof el.y1 === 'number') patch.y1 = el.y1 + dy;
    if (typeof el.x2 === 'number') patch.x2 = el.x2 + dx;
    if (typeof el.y2 === 'number') patch.y2 = el.y2 + dy;
    updateElementBase(el.id, patch);
  } else if (el.type === 'path') {
    updateElementBase(el.id, { x: (el.x ?? 0) + dx, y: (el.y ?? 0) + dy });
  } else if (el.type === 'polygon') {
    const shifted = el.points.trim().split(/\s+/).map((pair) => {
      const [x, y] = pair.split(',').map(Number);
      if (Number.isFinite(x) && Number.isFinite(y)) return `${(x + dx).toFixed(1)},${(y + dy).toFixed(1)}`;
      return pair;
    }).join(' ');
    updateElementBase(el.id, { points: shifted });
  }
}

function selectedElementsWithBbox(): Array<{ el: AnimationElement; bbox: Bbox }> {
  const def = getDef();
  if (!def) return [];
  const sel = getSelection();
  const ids = getSelectedElementIds(sel);
  if (ids.length < 2) return [];
  const out: Array<{ el: AnimationElement; bbox: Bbox }> = [];
  for (const id of ids) {
    const el = def.elements.find((e) => e.id === id);
    if (!el) continue;
    const bbox = elementBbox(el);
    if (bbox) out.push({ el, bbox });
  }
  return out;
}

export function alignSelected(kind: AlignKind): boolean {
  const items = selectedElementsWithBbox();
  if (items.length < 2) return false;
  const xs = items.map((it) => it.bbox.x);
  const ys = items.map((it) => it.bbox.y);
  const rights = items.map((it) => it.bbox.x + it.bbox.w);
  const bottoms = items.map((it) => it.bbox.y + it.bbox.h);
  const left = Math.min(...xs);
  const right = Math.max(...rights);
  const top = Math.min(...ys);
  const bottom = Math.max(...bottoms);
  const centerH = (left + right) / 2;
  const middleV = (top + bottom) / 2;
  for (const { el, bbox } of items) {
    let dx = 0; let dy = 0;
    if (kind === 'left') dx = left - bbox.x;
    else if (kind === 'right') dx = right - (bbox.x + bbox.w);
    else if (kind === 'center-h') dx = centerH - (bbox.x + bbox.w / 2);
    else if (kind === 'top') dy = top - bbox.y;
    else if (kind === 'bottom') dy = bottom - (bbox.y + bbox.h);
    else if (kind === 'middle-v') dy = middleV - (bbox.y + bbox.h / 2);
    shiftBy(el, Math.round(dx), Math.round(dy));
  }
  return true;
}

export function distributeSelected(kind: DistributeKind): boolean {
  const items = selectedElementsWithBbox();
  if (items.length < 3) return false;
  if (kind === 'horizontal') {
    items.sort((a, b) => a.bbox.x + a.bbox.w / 2 - (b.bbox.x + b.bbox.w / 2));
    const firstCenter = items[0].bbox.x + items[0].bbox.w / 2;
    const lastCenter = items[items.length - 1].bbox.x + items[items.length - 1].bbox.w / 2;
    const step = (lastCenter - firstCenter) / (items.length - 1);
    for (let i = 1; i < items.length - 1; i += 1) {
      const targetCenter = firstCenter + step * i;
      const currentCenter = items[i].bbox.x + items[i].bbox.w / 2;
      shiftBy(items[i].el, Math.round(targetCenter - currentCenter), 0);
    }
  } else {
    items.sort((a, b) => a.bbox.y + a.bbox.h / 2 - (b.bbox.y + b.bbox.h / 2));
    const firstCenter = items[0].bbox.y + items[0].bbox.h / 2;
    const lastCenter = items[items.length - 1].bbox.y + items[items.length - 1].bbox.h / 2;
    const step = (lastCenter - firstCenter) / (items.length - 1);
    for (let i = 1; i < items.length - 1; i += 1) {
      const targetCenter = firstCenter + step * i;
      const currentCenter = items[i].bbox.y + items[i].bbox.h / 2;
      shiftBy(items[i].el, 0, Math.round(targetCenter - currentCenter));
    }
  }
  return true;
}
