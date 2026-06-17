import type {
  AnimationDef,
  AnimationElement,
  Appearance,
  PropertyTrack,
  TrackKeyframe,
} from '@/entities/animation/engine/schema';
import type { HistoryKind } from './types';
import { emit, mutateDef, state } from './internals';

function ensureAppearance(el: AnimationElement, def: AnimationDef): void {
  if (!el.appearances || el.appearances.length === 0) {
    el.appearances = [{ start: 0, end: def.duration, entryDuration: 300, exitDuration: 300 }];
  }
}

export function addElement(el: AnimationElement): void {
  const kind: HistoryKind = el.type === 'group' ? 'group' : 'add';
  const label =
    el.type === 'group'
      ? `그룹 생성 (${(el as { childIds?: string[] }).childIds?.length ?? 0}개)`
      : `요소 추가: ${el.type}`;
  mutateDef(
    (def) => {
      const cloned = JSON.parse(JSON.stringify(el)) as AnimationElement;
      ensureAppearance(cloned, def);
      if (!cloned.tracks) cloned.tracks = [];
      def.elements.push(cloned);
    },
    label,
    kind,
  );
  state.selection = { kind: 'element', elementId: el.id };
  emit();
}

export function deleteElement(id: string): void {
  const targetEl = state.def?.elements.find((e) => e.id === id);
  const isGroupKind = targetEl?.type === 'group';
  mutateDef(
    (def) => {
      def.elements = def.elements.filter((e) => e.id !== id);
      def.effects = def.effects.filter((e) => e.elementId !== id);
      for (const el of def.elements) {
        if (el.type === 'group' && el.childIds.includes(id)) {
          el.childIds = el.childIds.filter((c) => c !== id);
        }
      }
    },
    isGroupKind ? `그룹 해제` : `요소 삭제: ${id}`,
    isGroupKind ? 'group' : 'delete',
  );
  if (state.selection.kind === 'element' && state.selection.elementId === id) {
    state.selection = { kind: 'none' };
  } else if (state.selection.kind === 'elements') {
    const remaining = state.selection.elementIds.filter((x) => x !== id);
    if (remaining.length === 0) state.selection = { kind: 'none' };
    else if (remaining.length === 1) state.selection = { kind: 'element', elementId: remaining[0] };
    else state.selection = { kind: 'elements', elementIds: remaining };
  }
  emit();
}

function labelForPatch(id: string, patch: Record<string, unknown>): { label: string; kind: HistoryKind } {
  const keys = Object.keys(patch);
  if (keys.length === 0) return { label: `요소 수정: ${id}`, kind: 'other' };
  const posKeys = ['x', 'y', 'cx', 'cy', 'x1', 'y1', 'x2', 'y2', 'points'];
  const sizeKeys = ['width', 'height', 'r', 'fontSize', 'cellWidth'];
  const styleKeys = ['fill', 'stroke', 'strokeWidth', 'color', 'opacity', 'cornerRadius', 'labelColor', 'labelSize'];
  if (keys.some((k) => posKeys.includes(k))) return { label: `이동: ${id}`, kind: 'move' };
  if (keys.some((k) => sizeKeys.includes(k))) return { label: `크기 변경: ${id}`, kind: 'resize' };
  if (keys.includes('rotation')) return { label: `회전: ${id}`, kind: 'rotate' };
  if (keys.some((k) => styleKeys.includes(k))) return { label: `스타일: ${id} (${keys.join(', ')})`, kind: 'style' };
  if (keys.includes('name')) return { label: `이름 변경: ${id}`, kind: 'meta' };
  return { label: `요소 수정: ${id} (${keys.join(', ')})`, kind: 'other' };
}

export function updateElementBase(id: string, patch: Record<string, unknown>): void {
  const { label, kind } = labelForPatch(id, patch);
  mutateDef(
    (def) => {
      const idx = def.elements.findIndex((e) => e.id === id);
      if (idx < 0) return;
      const baseEl = def.elements[idx];
      const merged: Record<string, unknown> = { ...(baseEl as unknown as Record<string, unknown>) };
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === undefined) delete merged[k];
        else merged[k] = v;
      }
      def.elements[idx] = merged as unknown as AnimationElement;
    },
    label,
    kind,
  );
}

export function reorderElement(sourceId: string, targetId: string, position: 'before' | 'after'): void {
  mutateDef(
    (def) => {
      const srcIdx = def.elements.findIndex((e) => e.id === sourceId);
      if (srcIdx < 0) return;
      const [moved] = def.elements.splice(srcIdx, 1);
      let targetIdx = def.elements.findIndex((e) => e.id === targetId);
      if (targetIdx < 0) {
        def.elements.push(moved);
        return;
      }
      if (position === 'after') targetIdx += 1;
      def.elements.splice(targetIdx, 0, moved);
    },
    `순서 변경: ${sourceId}`,
    'reorder',
  );
}

export function moveElementToEnd(id: string): void {
  mutateDef(
    (def) => {
      const idx = def.elements.findIndex((e) => e.id === id);
      if (idx < 0) return;
      const [moved] = def.elements.splice(idx, 1);
      def.elements.push(moved);
    },
    `맨 앞으로: ${id}`,
    'reorder',
  );
}

export function moveElementToFront(id: string): void {
  mutateDef(
    (def) => {
      const idx = def.elements.findIndex((e) => e.id === id);
      if (idx < 0) return;
      const [moved] = def.elements.splice(idx, 1);
      def.elements.unshift(moved);
    },
    `맨 뒤로: ${id}`,
    'reorder',
  );
}

export function addAppearance(id: string, ap: Appearance): void {
  mutateDef(
    (def) => {
      const el = def.elements.find((e) => e.id === id);
      if (!el) return;
      el.appearances.push(ap);
      el.appearances.sort((a, b) => a.start - b.start);
    },
    `출현 추가: ${id}`,
    'appearance',
  );
}

export function updateAppearance(id: string, apIdx: number, patch: Partial<Appearance>): void {
  mutateDef(
    (def) => {
      const el = def.elements.find((e) => e.id === id);
      if (!el || !el.appearances[apIdx]) return;
      el.appearances[apIdx] = { ...el.appearances[apIdx], ...patch };
      el.appearances.sort((a, b) => a.start - b.start);
    },
    `출현 조정: ${id}`,
    'appearance',
  );
}

export function removeAppearance(id: string, apIdx: number): void {
  mutateDef(
    (def) => {
      const el = def.elements.find((e) => e.id === id);
      if (!el) return;
      el.appearances.splice(apIdx, 1);
      if (el.appearances.length === 0) ensureAppearance(el, def);
    },
    `출현 삭제: ${id}`,
    'appearance',
  );
}

function findTrack(el: AnimationElement, property: string): PropertyTrack | undefined {
  return el.tracks.find((t) => t.property === property);
}

export function setTrackKeyframe(
  elementId: string,
  property: string,
  time: number,
  value: TrackKeyframe['value'],
): void {
  mutateDef(
    (def) => {
      const el = def.elements.find((e) => e.id === elementId);
      if (!el) return;
      let track = findTrack(el, property);
      if (!track) {
        track = { property, keyframes: [] };
        el.tracks.push(track);
      }
      const existing = track.keyframes.find((k) => k.time === time);
      if (existing) {
        existing.value = value;
      } else {
        track.keyframes.push({ time, value });
        track.keyframes.sort((a, b) => a.time - b.time);
      }
    },
    `keyframe ${property} @ ${time}ms`,
    'track',
  );
}

export function removeTrackKeyframe(elementId: string, property: string, time: number): void {
  mutateDef(
    (def) => {
      const el = def.elements.find((e) => e.id === elementId);
      if (!el) return;
      const track = findTrack(el, property);
      if (!track) return;
      track.keyframes = track.keyframes.filter((k) => k.time !== time);
      if (track.keyframes.length === 0) {
        el.tracks = el.tracks.filter((t) => t.property !== property);
      }
    },
    `keyframe 삭제 ${property} @ ${time}ms`,
    'track',
  );
}

export function setElementValueAtTime(elementId: string, patch: Record<string, unknown>): void {
  const time = state.currentTime;
  if (time <= 0) {
    updateElementBase(elementId, patch);
    return;
  }
  if (!state.def) return;
  const el = state.def.elements.find((e) => e.id === elementId);
  if (!el) return;
  for (const [prop, value] of Object.entries(patch)) {
    if (value === null || value === undefined) continue;
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') continue;
    const hasTrack = el.tracks.some((t) => t.property === prop);
    if (!hasTrack) {
      const baseVal = (el as unknown as Record<string, unknown>)[prop];
      if (typeof baseVal === 'string' || typeof baseVal === 'number' || typeof baseVal === 'boolean') {
        setTrackKeyframe(elementId, prop, 0, baseVal);
      }
    }
    setTrackKeyframe(elementId, prop, time, value);
  }
}

export function removeTrack(elementId: string, property: string): void {
  mutateDef(
    (def) => {
      const el = def.elements.find((e) => e.id === elementId);
      if (!el) return;
      el.tracks = el.tracks.filter((t) => t.property !== property);
    },
    `트랙 삭제: ${property}`,
    'track',
  );
}
