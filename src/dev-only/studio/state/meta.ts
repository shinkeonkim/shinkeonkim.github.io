import type { AnimationDef } from '@/entities/animation/engine/schema';
import { mutateDef, state } from './internals';

export function updateMeta(patch: Partial<Pick<AnimationDef, 'title' | 'description'>>): void {
  const keys = Object.keys(patch).join(', ');
  mutateDef(
    (def) => {
      Object.assign(def, patch);
    },
    `메타 수정: ${keys}`,
    'meta',
  );
}

export function updateCanvas(patch: Partial<AnimationDef['canvas']>): void {
  const keys = Object.keys(patch).join(', ');
  mutateDef(
    (def) => {
      def.canvas = { ...def.canvas, ...patch };
    },
    `캔버스: ${keys}`,
    'canvas',
  );
}

export function updateSettings(patch: Partial<AnimationDef['settings']>): void {
  const keys = Object.keys(patch).join(', ');
  mutateDef(
    (def) => {
      def.settings = { ...def.settings, ...patch };
    },
    `설정: ${keys}`,
    'settings',
  );
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
