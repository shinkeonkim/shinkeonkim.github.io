import type { AnimationElement } from '@/entities/animation/engine/schema';
import {
  addElement,
  getDef,
  getSelectedElementIds,
  getSelection,
  setSelection,
  uniqueElementId,
  updateElementBase,
} from './state';
import { isGroup, moveGroupBy } from './studio-groups';

let clipboard: AnimationElement[] = [];

function shiftCloneCoords(el: AnimationElement, dx: number, dy: number): AnimationElement {
  const clone = JSON.parse(JSON.stringify(el)) as AnimationElement;
  if (clone.type === 'rect' || clone.type === 'image' || clone.type === 'text') {
    clone.x += dx;
    clone.y += dy;
  } else if (clone.type === 'circle') {
    clone.cx += dx;
    clone.cy += dy;
  } else if (clone.type === 'line' || clone.type === 'arrow') {
    if (typeof clone.x1 === 'number') clone.x1 += dx;
    if (typeof clone.y1 === 'number') clone.y1 += dy;
    if (typeof clone.x2 === 'number') clone.x2 += dx;
    if (typeof clone.y2 === 'number') clone.y2 += dy;
  } else if (clone.type === 'path') {
    clone.x = (clone.x ?? 0) + dx;
    clone.y = (clone.y ?? 0) + dy;
  } else if (clone.type === 'polygon') {
    const pts = clone.points.trim().split(/\s+/).map((pair: string) => {
      const [x, y] = pair.split(',').map(Number);
      if (Number.isFinite(x) && Number.isFinite(y)) return `${x + dx},${y + dy}`;
      return pair;
    });
    clone.points = pts.join(' ');
  }
  return clone;
}

export function copySelection(): boolean {
  const sel = getSelection();
  const ids = getSelectedElementIds(sel);
  if (ids.length === 0) return false;
  const def = getDef();
  if (!def) return false;
  const copies: AnimationElement[] = [];
  for (const id of ids) {
    const el = def.elements.find((e) => e.id === id);
    if (el) copies.push(JSON.parse(JSON.stringify(el)));
  }
  if (copies.length === 0) return false;
  clipboard = copies;
  return true;
}

export function pasteFromClipboard(): boolean {
  if (clipboard.length === 0) return false;
  const newIds: string[] = [];
  for (const item of clipboard) {
    const newId = uniqueElementId(item.type);
    const shifted = shiftCloneCoords(item, 20, 20);
    shifted.id = newId;
    addElement(shifted);
    newIds.push(newId);
  }
  if (newIds.length === 1) {
    setSelection({ kind: 'element', elementId: newIds[0] });
  } else if (newIds.length > 1) {
    setSelection({ kind: 'elements', elementIds: newIds });
  }
  return true;
}

export function duplicateSelection(): boolean {
  const sel = getSelection();
  const ids = getSelectedElementIds(sel);
  if (ids.length === 0) return false;
  const def = getDef();
  if (!def) return false;
  const newIds: string[] = [];
  for (const id of ids) {
    const el = def.elements.find((e) => e.id === id);
    if (!el) continue;
    const newId = uniqueElementId(el.type);
    const cloned = JSON.parse(JSON.stringify(el)) as AnimationElement;
    const shifted = shiftCloneCoords(cloned, 20, 20);
    shifted.id = newId;
    addElement(shifted);
    newIds.push(newId);
  }
  if (newIds.length === 1) {
    setSelection({ kind: 'element', elementId: newIds[0] });
  } else if (newIds.length > 1) {
    setSelection({ kind: 'elements', elementIds: newIds });
  }
  return newIds.length > 0;
}

function moveOneElement(el: AnimationElement, dx: number, dy: number): boolean {
  if (isGroup(el)) {
    moveGroupBy(el.id, dx, dy);
    return true;
  }
  const patch: Record<string, unknown> = {};
  if (el.type === 'rect' || el.type === 'image' || el.type === 'text') {
    patch.x = el.x + dx;
    patch.y = el.y + dy;
  } else if (el.type === 'circle') {
    patch.cx = el.cx + dx;
    patch.cy = el.cy + dy;
  } else if (el.type === 'line' || el.type === 'arrow') {
    if (typeof el.x1 === 'number') patch.x1 = el.x1 + dx;
    if (typeof el.y1 === 'number') patch.y1 = el.y1 + dy;
    if (typeof el.x2 === 'number') patch.x2 = el.x2 + dx;
    if (typeof el.y2 === 'number') patch.y2 = el.y2 + dy;
  } else if (el.type === 'path') {
    patch.x = (el.x ?? 0) + dx;
    patch.y = (el.y ?? 0) + dy;
  } else if (el.type === 'polygon') {
    const pts = el.points.trim().split(/\s+/).map((pair) => {
      const [x, y] = pair.split(',').map(Number);
      if (Number.isFinite(x) && Number.isFinite(y)) return `${x + dx},${y + dy}`;
      return pair;
    });
    patch.points = pts.join(' ');
  } else {
    return false;
  }
  updateElementBase(el.id, patch);
  return true;
}

export function moveSelectedElement(dx: number, dy: number): boolean {
  const sel = getSelection();
  const ids = getSelectedElementIds(sel);
  if (ids.length === 0) return false;
  const def = getDef();
  if (!def) return false;
  let moved = false;
  for (const id of ids) {
    const el = def.elements.find((e) => e.id === id);
    if (el && moveOneElement(el, dx, dy)) moved = true;
  }
  return moved;
}
