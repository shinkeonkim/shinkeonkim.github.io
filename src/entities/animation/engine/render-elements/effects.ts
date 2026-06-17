import type { AnimationEffect } from '../schema';

export function applyEffectColor(
  stateColor: string | undefined,
  effect: AnimationEffect | undefined,
  defaultColor: string,
): string {
  if (effect && effect.type === 'highlight') return effect.color;
  return (stateColor as string) ?? defaultColor;
}

export function applyEffectScale(effect: AnimationEffect | undefined, currentTime: number): number {
  if (effect && effect.type === 'pulse') {
    const elapsed = currentTime - effect.time;
    const t = Math.max(0, Math.min(1, elapsed / effect.duration));
    const pulse = Math.sin(t * Math.PI);
    return 1 + (effect.scale - 1) * pulse;
  }
  return 1;
}
