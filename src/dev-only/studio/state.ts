import type {
  AnimationDef,
  AnimationElement,
  AnimationEffect,
  Appearance,
  Chapter,
  PropertyTrack,
  TrackKeyframe,
  SnapshotMap,
} from '../../animations/schema';
import { animationDefSchema, computeSnapshot } from '../../animations/schema';

export type Selection =
  | { kind: 'none' }
  | { kind: 'element'; elementId: string }
  | { kind: 'elements'; elementIds: string[] }
  | { kind: 'chapter'; chapterId: string }
  | { kind: 'effect'; effectId: string };

interface State {
  def: AnimationDef | null;
  dirty: boolean;
  selection: Selection;
  currentTime: number;
  isDraft: boolean;
}

type Listener = () => void;
const listeners = new Set<Listener>();

const state: State = {
  def: null,
  dirty: false,
  selection: { kind: 'none' },
  currentTime: 0,
  isDraft: false,
};

export function isDraft(): boolean {
  return state.isDraft;
}

export function setDraft(def: AnimationDef): void {
  state.def = def;
  state.dirty = false;
  state.isDraft = true;
  state.selection = { kind: 'none' };
  state.currentTime = 0;
  resetHistory();
  emit();
}

export function promoteDraftToSaved(): void {
  state.isDraft = false;
  emit();
}

const HISTORY_LIMIT = 60;

export type HistoryKind =
  | 'meta'
  | 'canvas'
  | 'settings'
  | 'add'
  | 'delete'
  | 'move'
  | 'style'
  | 'rotate'
  | 'resize'
  | 'reorder'
  | 'track'
  | 'appearance'
  | 'chapter'
  | 'effect'
  | 'group'
  | 'other';

export interface HistoryEntry {
  snap: string;
  label: string;
  kind: HistoryKind;
  timestamp: number;
}

const past: HistoryEntry[] = [];
const future: HistoryEntry[] = [];
let inTransient = false;
let pendingLabel: { label: string; kind: HistoryKind } | null = null;

function snapshotJson(): string | null {
  return state.def ? JSON.stringify(state.def) : null;
}

function pushHistory(label: string, kind: HistoryKind): void {
  const snap = snapshotJson();
  if (snap === null) return;
  past.push({ snap, label, kind, timestamp: Date.now() });
  if (past.length > HISTORY_LIMIT) past.shift();
  future.length = 0;
}

export function beginTransient(label = 'edit', kind: HistoryKind = 'other'): void {
  if (!state.def) return;
  pushHistory(label, kind);
  inTransient = true;
}

export function endTransient(): void {
  inTransient = false;
}

export function canUndo(): boolean {
  return past.length > 0;
}

export function canRedo(): boolean {
  return future.length > 0;
}

export function undo(): void {
  if (past.length === 0) return;
  const cur = snapshotJson();
  if (cur !== null) future.push({ snap: cur, label: '(redo)', kind: 'other', timestamp: Date.now() });
  const prev = past.pop()!;
  state.def = JSON.parse(prev.snap);
  state.dirty = true;
  emit();
}

export function redo(): void {
  if (future.length === 0) return;
  const cur = snapshotJson();
  if (cur !== null) past.push({ snap: cur, label: '(undo)', kind: 'other', timestamp: Date.now() });
  const next = future.pop()!;
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



export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(): void {
  for (const fn of listeners) fn();
}

export function getDef(): AnimationDef | null {
  return state.def;
}

export function getSelection(): Selection {
  return state.selection;
}

export function isDirty(): boolean {
  return state.dirty;
}

export function getCurrentTime(): number {
  return state.currentTime;
}

export function setCurrentTime(time: number): void {
  state.currentTime = Math.max(0, Math.round(time));
  emit();
}

export function setDef(def: AnimationDef | null, markDirty = false): void {
  state.def = def;
  state.dirty = markDirty;
  state.isDraft = false;
  state.selection = { kind: 'none' };
  state.currentTime = 0;
  resetHistory();
  emit();
}

export function markClean(): void {
  state.dirty = false;
  emit();
}

export function setSelection(sel: Selection): void {
  state.selection = sel;
  emit();
}

export function getSelectedElementIds(sel: Selection): string[] {
  if (sel.kind === 'element') return [sel.elementId];
  if (sel.kind === 'elements') return sel.elementIds;
  return [];
}

export function isElementSelected(sel: Selection, id: string): boolean {
  if (sel.kind === 'element') return sel.elementId === id;
  if (sel.kind === 'elements') return sel.elementIds.includes(id);
  return false;
}

export function toggleSelectionFor(sel: Selection, id: string): Selection {
  const cur = getSelectedElementIds(sel);
  if (cur.includes(id)) {
    const next = cur.filter((x) => x !== id);
    if (next.length === 0) return { kind: 'none' };
    if (next.length === 1) return { kind: 'element', elementId: next[0] };
    return { kind: 'elements', elementIds: next };
  }
  const next = [...cur, id];
  if (next.length === 1) return { kind: 'element', elementId: next[0] };
  return { kind: 'elements', elementIds: next };
}

function mutateDef(fn: (def: AnimationDef) => void, label = 'edit', kind: HistoryKind = 'other'): void {
  if (!state.def) return;
  const effectiveLabel = pendingLabel?.label ?? label;
  const effectiveKind = pendingLabel?.kind ?? kind;
  pendingLabel = null;
  if (!inTransient) pushHistory(effectiveLabel, effectiveKind);
  const cloned = JSON.parse(JSON.stringify(state.def));
  fn(cloned);
  const parsed = animationDefSchema.safeParse(cloned);
  if (!parsed.success) {
    past.pop();
    console.warn('[studio.state] invalid mutation', parsed.error.issues);
    return;
  }
  state.def = parsed.data;
  state.dirty = true;
  emit();
}

export function getCurrentSnapshot(): SnapshotMap {
  if (!state.def) return new Map();
  return computeSnapshot(state.def, state.currentTime);
}

function ensureAppearance(el: AnimationElement, def: AnimationDef): void {
  if (!el.appearances || el.appearances.length === 0) {
    el.appearances = [{ start: 0, end: def.duration, entryDuration: 300, exitDuration: 300 }];
  }
}

export function addElement(el: AnimationElement): void {
  const kind: HistoryKind = el.type === 'group' ? 'group' : 'add';
  const label = el.type === 'group' ? `그룹 생성 (${(el as { childIds?: string[] }).childIds?.length ?? 0}개)` : `요소 추가: ${el.type}`;
  mutateDef((def) => {
    const cloned = JSON.parse(JSON.stringify(el)) as AnimationElement;
    ensureAppearance(cloned, def);
    if (!cloned.tracks) cloned.tracks = [];
    def.elements.push(cloned);
  }, label, kind);
  state.selection = { kind: 'element', elementId: el.id };
  emit();
}

export function deleteElement(id: string): void {
  const targetEl = state.def?.elements.find((e) => e.id === id);
  const isGroupKind = targetEl?.type === 'group';
  mutateDef((def) => {
    def.elements = def.elements.filter((e) => e.id !== id);
    def.effects = def.effects.filter((e) => e.elementId !== id);
    for (const el of def.elements) {
      if (el.type === 'group' && el.childIds.includes(id)) {
        el.childIds = el.childIds.filter((c) => c !== id);
      }
    }
  }, isGroupKind ? `그룹 해제` : `요소 삭제: ${id}`, isGroupKind ? 'group' : 'delete');
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
  mutateDef((def) => {
    const idx = def.elements.findIndex((e) => e.id === id);
    if (idx < 0) return;
    const baseEl = def.elements[idx];
    const merged: Record<string, unknown> = { ...(baseEl as unknown as Record<string, unknown>) };
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === undefined) delete merged[k];
      else merged[k] = v;
    }
    def.elements[idx] = merged as unknown as AnimationElement;
  }, label, kind);
}

export function reorderElement(sourceId: string, targetId: string, position: 'before' | 'after'): void {
  mutateDef((def) => {
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
  }, `순서 변경: ${sourceId}`, 'reorder');
}

export function moveElementToEnd(id: string): void {
  mutateDef((def) => {
    const idx = def.elements.findIndex((e) => e.id === id);
    if (idx < 0) return;
    const [moved] = def.elements.splice(idx, 1);
    def.elements.push(moved);
  }, `맨 앞으로: ${id}`, 'reorder');
}

export function moveElementToFront(id: string): void {
  mutateDef((def) => {
    const idx = def.elements.findIndex((e) => e.id === id);
    if (idx < 0) return;
    const [moved] = def.elements.splice(idx, 1);
    def.elements.unshift(moved);
  }, `맨 뒤로: ${id}`, 'reorder');
}

export function addAppearance(id: string, ap: Appearance): void {
  mutateDef((def) => {
    const el = def.elements.find((e) => e.id === id);
    if (!el) return;
    el.appearances.push(ap);
    el.appearances.sort((a, b) => a.start - b.start);
  }, `출현 추가: ${id}`, 'appearance');
}

export function updateAppearance(id: string, apIdx: number, patch: Partial<Appearance>): void {
  mutateDef((def) => {
    const el = def.elements.find((e) => e.id === id);
    if (!el || !el.appearances[apIdx]) return;
    el.appearances[apIdx] = { ...el.appearances[apIdx], ...patch };
    el.appearances.sort((a, b) => a.start - b.start);
  }, `출현 조정: ${id}`, 'appearance');
}

export function removeAppearance(id: string, apIdx: number): void {
  mutateDef((def) => {
    const el = def.elements.find((e) => e.id === id);
    if (!el) return;
    el.appearances.splice(apIdx, 1);
    if (el.appearances.length === 0) ensureAppearance(el, def);
  }, `출현 삭제: ${id}`, 'appearance');
}

function findTrack(el: AnimationElement, property: string): PropertyTrack | undefined {
  return el.tracks.find((t) => t.property === property);
}

export function setTrackKeyframe(elementId: string, property: string, time: number, value: TrackKeyframe['value']): void {
  mutateDef((def) => {
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
  }, `keyframe ${property} @ ${time}ms`, 'track');
}

export function removeTrackKeyframe(elementId: string, property: string, time: number): void {
  mutateDef((def) => {
    const el = def.elements.find((e) => e.id === elementId);
    if (!el) return;
    const track = findTrack(el, property);
    if (!track) return;
    track.keyframes = track.keyframes.filter((k) => k.time !== time);
    if (track.keyframes.length === 0) {
      el.tracks = el.tracks.filter((t) => t.property !== property);
    }
  }, `keyframe 삭제 ${property} @ ${time}ms`, 'track');
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
  mutateDef((def) => {
    const el = def.elements.find((e) => e.id === elementId);
    if (!el) return;
    el.tracks = el.tracks.filter((t) => t.property !== property);
  }, `트랙 삭제: ${property}`, 'track');
}

export function addChapter(c: Chapter): void {
  mutateDef((def) => {
    def.chapters.push(c);
    def.chapters.sort((a, b) => a.time - b.time);
  }, `Chapter 추가: ${c.label || c.id}`, 'chapter');
  state.selection = { kind: 'chapter', chapterId: c.id };
  emit();
}

export function updateChapter(id: string, patch: Partial<Chapter>): void {
  const keys = Object.keys(patch).join(', ');
  mutateDef((def) => {
    const idx = def.chapters.findIndex((c) => c.id === id);
    if (idx < 0) return;
    def.chapters[idx] = { ...def.chapters[idx], ...patch };
    def.chapters.sort((a, b) => a.time - b.time);
  }, `Chapter 수정: ${id} (${keys})`, 'chapter');
}

export function deleteChapter(id: string): void {
  mutateDef((def) => {
    def.chapters = def.chapters.filter((c) => c.id !== id);
  }, `Chapter 삭제: ${id}`, 'chapter');
  if (state.selection.kind === 'chapter' && state.selection.chapterId === id) {
    state.selection = { kind: 'none' };
  }
  emit();
}

export function addEffect(eff: AnimationEffect): void {
  mutateDef((def) => {
    def.effects.push(eff);
    def.effects.sort((a, b) => a.time - b.time);
  }, `효과 추가: ${eff.type}`, 'effect');
}

export function updateEffect(id: string, patch: Partial<AnimationEffect>): void {
  mutateDef((def) => {
    const idx = def.effects.findIndex((e) => e.id === id);
    if (idx < 0) return;
    def.effects[idx] = { ...def.effects[idx], ...patch } as AnimationEffect;
    def.effects.sort((a, b) => a.time - b.time);
  }, `효과 수정: ${id}`, 'effect');
}

export function deleteEffect(id: string): void {
  mutateDef((def) => {
    def.effects = def.effects.filter((e) => e.id !== id);
  }, `효과 삭제: ${id}`, 'effect');
  if (state.selection.kind === 'effect' && state.selection.effectId === id) {
    state.selection = { kind: 'none' };
  }
  emit();
}

export function updateMeta(patch: Partial<Pick<AnimationDef, 'title' | 'description'>>): void {
  const keys = Object.keys(patch).join(', ');
  mutateDef((def) => {
    Object.assign(def, patch);
  }, `메타 수정: ${keys}`, 'meta');
}

export function updateCanvas(patch: Partial<AnimationDef['canvas']>): void {
  const keys = Object.keys(patch).join(', ');
  mutateDef((def) => {
    def.canvas = { ...def.canvas, ...patch };
  }, `캔버스: ${keys}`, 'canvas');
}

export function updateSettings(patch: Partial<AnimationDef['settings']>): void {
  const keys = Object.keys(patch).join(', ');
  mutateDef((def) => {
    def.settings = { ...def.settings, ...patch };
  }, `설정: ${keys}`, 'settings');
}

export function updateDuration(ms: number): void {
  mutateDef((def) => {
    def.duration = Math.max(0, Math.round(ms));
    for (const el of def.elements) {
      for (const ap of el.appearances) {
        if (ap.end > def.duration) ap.end = def.duration;
        if (ap.start > def.duration) ap.start = def.duration;
      }
    }
    for (const ch of def.chapters) {
      if (ch.time > def.duration) ch.time = def.duration;
    }
    for (const eff of def.effects) {
      if (eff.time > def.duration) eff.time = def.duration;
    }
  }, `duration: ${ms} ms`, 'meta');
  if (state.currentTime > ms) state.currentTime = ms;
}

export function uniqueElementId(type: string): string {
  if (!state.def) return type + '-1';
  const used = new Set(state.def.elements.map((e) => e.id));
  let i = 1;
  while (used.has(`${type}-${i}`)) i += 1;
  return `${type}-${i}`;
}

export function uniqueChapterId(): string {
  if (!state.def) return 'chapter-1';
  const used = new Set(state.def.chapters.map((c) => c.id));
  let i = 1;
  while (used.has(`chapter-${i}`)) i += 1;
  return `chapter-${i}`;
}

export function uniqueEffectId(): string {
  if (!state.def) return 'effect-1';
  const used = new Set(state.def.effects.map((e) => e.id));
  let i = 1;
  while (used.has(`effect-${i}`)) i += 1;
  return `effect-${i}`;
}
