import type { AnimationElement, GroupElement } from '@/entities/animation/engine/schema';
import {
  addElement,
  deleteElement,
  getDef,
  setSelection,
  uniqueElementId,
  updateElementBase,
} from './state';

export function isGroup(el: AnimationElement): el is GroupElement {
  return el.type === 'group';
}

export function findContainingGroup(elementId: string): GroupElement | null {
  const def = getDef();
  if (!def) return null;
  for (const el of def.elements) {
    if (isGroup(el) && el.childIds.includes(elementId)) {
      const outer = findContainingGroup(el.id);
      return outer ?? el;
    }
  }
  return null;
}

export function expandToLeafIds(ids: string[]): string[] {
  const def = getDef();
  if (!def) return ids;
  const seen = new Set<string>();
  const stack = [...ids];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const el = def.elements.find((e) => e.id === id);
    if (el && isGroup(el)) {
      for (const childId of el.childIds) stack.push(childId);
    }
  }
  const out: string[] = [];
  for (const id of seen) {
    const el = def.elements.find((e) => e.id === id);
    if (el && !isGroup(el)) out.push(id);
  }
  return out;
}

export function groupBbox(groupId: string): { x: number; y: number; w: number; h: number } | null {
  const def = getDef();
  if (!def) return null;
  const leafIds = expandToLeafIds([groupId]);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let any = false;
  for (const id of leafIds) {
    const el = def.elements.find((e) => e.id === id);
    if (!el) continue;
    const b = elementBbox(el);
    if (!b) continue;
    any = true;
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.w > maxX) maxX = b.x + b.w;
    if (b.y + b.h > maxY) maxY = b.y + b.h;
  }
  return any ? { x: minX, y: minY, w: maxX - minX, h: maxY - minY } : null;
}

function elementBbox(el: AnimationElement): { x: number; y: number; w: number; h: number } | null {
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

function shiftLeafBy(el: AnimationElement, dx: number, dy: number): void {
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

export function moveGroupBy(groupId: string, dx: number, dy: number): void {
  const def = getDef();
  if (!def) return;
  const leafIds = expandToLeafIds([groupId]);
  for (const id of leafIds) {
    const el = def.elements.find((e) => e.id === id);
    if (el) shiftLeafBy(el, dx, dy);
  }
  const group = def.elements.find((e) => e.id === groupId);
  if (group && isGroup(group)) {
    updateElementBase(groupId, { x: group.x + dx, y: group.y + dy });
  }
}

export function groupElements(ids: string[]): string | null {
  if (ids.length < 2) return null;
  const def = getDef();
  if (!def) return null;
  const valid = ids.filter((id) => def.elements.some((e) => e.id === id));
  if (valid.length < 2) return null;
  const newId = uniqueElementId('group');
  const bbox = (() => {
    let minX = Infinity, minY = Infinity;
    for (const id of valid) {
      const el = def.elements.find((e) => e.id === id);
      if (!el) continue;
      const b = elementBbox(el);
      if (!b) continue;
      if (b.x < minX) minX = b.x;
      if (b.y < minY) minY = b.y;
    }
    return { x: Number.isFinite(minX) ? minX : 0, y: Number.isFinite(minY) ? minY : 0 };
  })();
  const group: GroupElement = {
    type: 'group',
    id: newId,
    name: `Group ${newId.split('-')[1] ?? ''}`.trim(),
    rotation: 0,
    appearances: [],
    tracks: [],
    x: bbox.x,
    y: bbox.y,
    childIds: valid,
  };
  addElement(group);
  setSelection({ kind: 'element', elementId: newId });
  return newId;
}

export function ungroupElement(groupId: string): string[] {
  const def = getDef();
  if (!def) return [];
  const group = def.elements.find((e) => e.id === groupId);
  if (!group || !isGroup(group)) return [];
  const childIds = [...group.childIds];
  deleteElement(groupId);
  if (childIds.length === 1) {
    setSelection({ kind: 'element', elementId: childIds[0] });
  } else if (childIds.length > 1) {
    setSelection({ kind: 'elements', elementIds: childIds });
  } else {
    setSelection({ kind: 'none' });
  }
  return childIds;
}
