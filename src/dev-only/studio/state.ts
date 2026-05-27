import type {
  AnimationDef,
  AnimationElement,
  AnimationStep,
  AnimationEffect,
  ElementKeyframe,
} from '../../animations/schema';
import { animationDefSchema, computeSnapshot } from '../../animations/schema';

export type Selection =
  | { kind: 'none' }
  | { kind: 'element'; elementId: string }
  | { kind: 'elements'; elementIds: string[] }
  | { kind: 'step'; stepId: string };

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

interface State {
  def: AnimationDef | null;
  dirty: boolean;
  selection: Selection;
  currentStepIdx: number;
  isDraft: boolean;
}

type Listener = () => void;
const listeners = new Set<Listener>();

const state: State = {
  def: null,
  dirty: false,
  selection: { kind: 'none' },
  currentStepIdx: -1,
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
  state.currentStepIdx = def.steps.length > 0 ? def.steps.length - 1 : -1;
  resetHistory();
  emit();
}

export function promoteDraftToSaved(): void {
  state.isDraft = false;
  emit();
}

const HISTORY_LIMIT = 60;
const past: string[] = [];
const future: string[] = [];
let inTransient = false;

function snapshotJson(): string | null {
  return state.def ? JSON.stringify(state.def) : null;
}

function pushHistory(): void {
  const snap = snapshotJson();
  if (snap === null) return;
  past.push(snap);
  if (past.length > HISTORY_LIMIT) past.shift();
  future.length = 0;
}

export function beginTransient(): void {
  if (!state.def) return;
  pushHistory();
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
  if (cur !== null) future.push(cur);
  const prev = past.pop()!;
  state.def = JSON.parse(prev);
  state.dirty = true;
  emit();
}

export function redo(): void {
  if (future.length === 0) return;
  const cur = snapshotJson();
  if (cur !== null) past.push(cur);
  const next = future.pop()!;
  state.def = JSON.parse(next);
  state.dirty = true;
  emit();
}

export function resetHistory(): void {
  past.length = 0;
  future.length = 0;
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

export function getCurrentStepIdx(): number {
  return state.currentStepIdx;
}

export function setCurrentStepIdx(idx: number): void {
  state.currentStepIdx = idx;
  emit();
}

export function setDef(def: AnimationDef | null, markDirty = false): void {
  state.def = def;
  state.dirty = markDirty;
  state.isDraft = false;
  if (def === null) {
    state.selection = { kind: 'none' };
    state.currentStepIdx = -1;
  } else {
    state.currentStepIdx = def.steps.length > 0 ? def.steps.length - 1 : -1;
  }
  resetHistory();
  emit();
}

export function markClean(): void {
  state.dirty = false;
  emit();
}

export function setSelection(sel: Selection): void {
  state.selection = sel;
  if (sel.kind === 'step') {
    const def = state.def;
    if (def) {
      const idx = def.steps.findIndex((s) => s.id === sel.stepId);
      if (idx >= 0) state.currentStepIdx = idx;
    }
  }
  emit();
}

function mutateDef(fn: (def: AnimationDef) => void): void {
  if (!state.def) return;
  if (!inTransient) pushHistory();
  const next = animationDefSchema.parse(JSON.parse(JSON.stringify(state.def)));
  fn(next);
  state.def = next;
  state.dirty = true;
  emit();
}

export function getCurrentSnapshot(): Map<string, Record<string, unknown> & { visible: boolean }> {
  if (!state.def) return new Map();
  return computeSnapshot(state.def, state.currentStepIdx);
}

export function getPrevSnapshot(): Map<string, Record<string, unknown> & { visible: boolean }> {
  if (!state.def) return new Map();
  return computeSnapshot(state.def, state.currentStepIdx - 1);
}

export function setElementKeyframe(elementId: string, patch: ElementKeyframe): void {
  mutateDef((def) => {
    if (state.currentStepIdx < 0 || state.currentStepIdx >= def.steps.length) {
      const idx = def.elements.findIndex((e) => e.id === elementId);
      if (idx < 0) return;
      const baseEl = def.elements[idx];
      const merged: Record<string, unknown> = { ...(baseEl as unknown as Record<string, unknown>) };
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) {
          delete merged[k];
          continue;
        }
        merged[k] = v;
      }
      def.elements[idx] = merged as unknown as AnimationElement;
      return;
    }
    const step = def.steps[state.currentStepIdx];
    if (!step.keyframes[elementId]) step.keyframes[elementId] = {};
    Object.assign(step.keyframes[elementId], patch);
  });
}

export function setElementBase(elementId: string, patch: Record<string, unknown>): void {
  mutateDef((def) => {
    const idx = def.elements.findIndex((e) => e.id === elementId);
    if (idx < 0) return;
    const baseEl = def.elements[idx];
    const merged: Record<string, unknown> = { ...(baseEl as unknown as Record<string, unknown>) };
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === undefined) {
        delete merged[k];
        continue;
      }
      merged[k] = v;
    }
    def.elements[idx] = merged as unknown as AnimationElement;
  });
}

export function setElementVisibility(elementId: string, visible: boolean): void {
  mutateDef((def) => {
    if (state.currentStepIdx < 0) {
      const initiallyHidden = new Set(def.initiallyHidden);
      if (visible) initiallyHidden.delete(elementId);
      else initiallyHidden.add(elementId);
      def.initiallyHidden = Array.from(initiallyHidden);
      return;
    }
    const step = def.steps[state.currentStepIdx];
    if (!step.keyframes[elementId]) step.keyframes[elementId] = {};
    step.keyframes[elementId].visible = visible;
  });
}

export function clearKeyframeProp(elementId: string, key: string): void {
  mutateDef((def) => {
    const step = def.steps[state.currentStepIdx];
    if (!step || !step.keyframes[elementId]) return;
    delete step.keyframes[elementId][key];
    if (Object.keys(step.keyframes[elementId]).length === 0) {
      delete step.keyframes[elementId];
    }
  });
}

export function addElement(el: AnimationElement): void {
  mutateDef((def) => {
    def.elements.push(el);
  });
  state.selection = { kind: 'element', elementId: el.id };
  emit();
}

export function deleteElement(id: string): void {
  mutateDef((def) => {
    def.elements = def.elements.filter((e) => e.id !== id);
    def.initiallyHidden = def.initiallyHidden.filter((x) => x !== id);
    for (const step of def.steps) {
      delete step.keyframes[id];
      step.effects = step.effects.filter((e) => e.elementId !== id);
    }
  });
  if (state.selection.kind === 'element' && state.selection.elementId === id) {
    state.selection = { kind: 'none' };
  }
  emit();
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
  });
}

export function moveElementToEnd(id: string): void {
  mutateDef((def) => {
    const idx = def.elements.findIndex((e) => e.id === id);
    if (idx < 0) return;
    const [moved] = def.elements.splice(idx, 1);
    def.elements.push(moved);
  });
}

export function moveElementToFront(id: string): void {
  mutateDef((def) => {
    const idx = def.elements.findIndex((e) => e.id === id);
    if (idx < 0) return;
    const [moved] = def.elements.splice(idx, 1);
    def.elements.unshift(moved);
  });
}

export function addStep(step: AnimationStep): void {
  mutateDef((def) => {
    def.steps.push(step);
  });
  state.selection = { kind: 'step', stepId: step.id };
  state.currentStepIdx = (state.def?.steps.length ?? 1) - 1;
  emit();
}

export function deleteStep(id: string): void {
  mutateDef((def) => {
    def.steps = def.steps.filter((s) => s.id !== id);
  });
  if (state.selection.kind === 'step' && state.selection.stepId === id) {
    state.selection = { kind: 'none' };
  }
  if (state.def) {
    state.currentStepIdx = Math.min(state.currentStepIdx, state.def.steps.length - 1);
  }
  emit();
}

export function updateStep(id: string, patch: Partial<AnimationStep>): void {
  mutateDef((def) => {
    const idx = def.steps.findIndex((s) => s.id === id);
    if (idx < 0) return;
    def.steps[idx] = { ...def.steps[idx], ...patch };
  });
}

export function moveStep(id: string, direction: -1 | 1): void {
  mutateDef((def) => {
    const idx = def.steps.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const target = idx + direction;
    if (target < 0 || target >= def.steps.length) return;
    [def.steps[idx], def.steps[target]] = [def.steps[target], def.steps[idx]];
  });
}

export function addEffect(stepId: string, effect: AnimationEffect): void {
  mutateDef((def) => {
    const step = def.steps.find((s) => s.id === stepId);
    if (!step) return;
    step.effects.push(effect);
  });
}

export function removeEffect(stepId: string, idx: number): void {
  mutateDef((def) => {
    const step = def.steps.find((s) => s.id === stepId);
    if (!step) return;
    step.effects.splice(idx, 1);
  });
}

export function updateEffect(stepId: string, idx: number, patch: Partial<AnimationEffect>): void {
  mutateDef((def) => {
    const step = def.steps.find((s) => s.id === stepId);
    if (!step || !step.effects[idx]) return;
    step.effects[idx] = { ...step.effects[idx], ...patch } as AnimationEffect;
  });
}

export function updateMeta(patch: Partial<Pick<AnimationDef, 'title' | 'description'>>): void {
  mutateDef((def) => {
    Object.assign(def, patch);
  });
}

export function updateCanvas(patch: Partial<AnimationDef['canvas']>): void {
  mutateDef((def) => {
    def.canvas = { ...def.canvas, ...patch };
  });
}

export function updateSettings(patch: Partial<AnimationDef['settings']>): void {
  mutateDef((def) => {
    def.settings = { ...def.settings, ...patch };
  });
}

export function uniqueElementId(type: string): string {
  if (!state.def) return type + '-1';
  const used = new Set(state.def.elements.map((e) => e.id));
  let i = 1;
  while (used.has(`${type}-${i}`)) i += 1;
  return `${type}-${i}`;
}

export function uniqueStepId(): string {
  if (!state.def) return 'step-1';
  const used = new Set(state.def.steps.map((s) => s.id));
  let i = 1;
  while (used.has(`step-${i}`)) i += 1;
  return `step-${i}`;
}
