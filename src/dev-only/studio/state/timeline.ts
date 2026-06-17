import type {
  AnimationDef,
  AnimationEffect,
  Chapter,
} from '@/entities/animation/engine/schema';
import { emit, mutateDef, state } from './internals';

export function addChapter(c: Chapter): void {
  mutateDef(
    (def) => {
      def.chapters.push(c);
      def.chapters.sort((a, b) => a.time - b.time);
    },
    `Chapter 추가: ${c.label || c.id}`,
    'chapter',
  );
  state.selection = { kind: 'chapter', chapterId: c.id };
  emit();
}

export function updateChapter(id: string, patch: Partial<Chapter>): void {
  const keys = Object.keys(patch).join(', ');
  mutateDef(
    (def) => {
      const idx = def.chapters.findIndex((c) => c.id === id);
      if (idx < 0) return;
      def.chapters[idx] = { ...def.chapters[idx], ...patch };
      def.chapters.sort((a, b) => a.time - b.time);
    },
    `Chapter 수정: ${id} (${keys})`,
    'chapter',
  );
}

export function deleteChapter(id: string): void {
  mutateDef(
    (def) => {
      def.chapters = def.chapters.filter((c) => c.id !== id);
    },
    `Chapter 삭제: ${id}`,
    'chapter',
  );
  if (state.selection.kind === 'chapter' && state.selection.chapterId === id) {
    state.selection = { kind: 'none' };
  }
  emit();
}

export function addEffect(eff: AnimationEffect): void {
  mutateDef(
    (def) => {
      def.effects.push(eff);
      def.effects.sort((a, b) => a.time - b.time);
    },
    `효과 추가: ${eff.type}`,
    'effect',
  );
}

export function updateEffect(id: string, patch: Partial<AnimationEffect>): void {
  mutateDef(
    (def) => {
      const idx = def.effects.findIndex((e) => e.id === id);
      if (idx < 0) return;
      def.effects[idx] = { ...def.effects[idx], ...patch } as AnimationEffect;
      def.effects.sort((a, b) => a.time - b.time);
    },
    `효과 수정: ${id}`,
    'effect',
  );
}

export function deleteEffect(id: string): void {
  mutateDef(
    (def) => {
      def.effects = def.effects.filter((e) => e.id !== id);
    },
    `효과 삭제: ${id}`,
    'effect',
  );
  if (state.selection.kind === 'effect' && state.selection.effectId === id) {
    state.selection = { kind: 'none' };
  }
  emit();
}

export function updateDuration(ms: number): void {
  mutateDef(
    (def) => {
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
    },
    `duration: ${ms} ms`,
    'meta',
  );
  if (state.currentTime > ms) state.currentTime = ms;
}
