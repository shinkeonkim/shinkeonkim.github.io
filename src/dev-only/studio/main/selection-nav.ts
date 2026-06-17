import { getDef, getSelection, setSelection } from '../state';
import type { AnimationDef } from '@/entities/animation/engine/schema';
import { activeAppearance } from '@/entities/animation/engine/schema';

export function selectAdjacentElement(direction: 1 | -1): boolean {
  const def = getDef();
  if (!def || def.elements.length === 0) return false;
  const sel = getSelection();
  if (sel.kind !== 'element') {
    const target = direction === 1 ? def.elements[0] : def.elements[def.elements.length - 1];
    setSelection({ kind: 'element', elementId: target.id });
    return true;
  }
  const idx = def.elements.findIndex((e) => e.id === sel.elementId);
  if (idx < 0) return false;
  const nextIdx = (idx + direction + def.elements.length) % def.elements.length;
  setSelection({ kind: 'element', elementId: def.elements[nextIdx].id });
  return true;
}

export function getVisibleElementIds(def: AnimationDef, time: number): string[] {
  return def.elements
    .filter((el) => el.appearances.length === 0 || activeAppearance(el, time) !== null)
    .map((el) => el.id);
}

export function handleSelectAll(e: KeyboardEvent): void {
  const def = getDef();
  if (!def) return;
  const time = (function () {
    const sel = getSelection();
    if (sel.kind === 'chapter') {
      const c = def.chapters.find((x) => x.id === sel.chapterId);
      if (c) return c.time;
    }
    return 0;
  })();
  const visibleIds = time > 0 ? getVisibleElementIds(def, time) : def.elements.map((el) => el.id);
  if (visibleIds.length === 0) return;
  e.preventDefault();
  if (visibleIds.length === 1) {
    setSelection({ kind: 'element', elementId: visibleIds[0] });
  } else {
    setSelection({ kind: 'elements', elementIds: visibleIds });
  }
}
