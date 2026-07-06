import { describe, expect, it } from 'vitest';
import { applyEffectColor, applyEffectScale } from './effects';
import type { AnimationEffect } from '../schema';

describe('applyEffectColor', () => {
  it('returns highlight color when effect is highlight', () => {
    const effect: AnimationEffect = {
      type: 'highlight',
      id: 'e1',
      elementId: 'x',
      time: 0,
      color: '#ff0000',
      duration: 500,
    };
    expect(applyEffectColor('#000000', effect, '#111111')).toBe('#ff0000');
  });

  it('returns state color when effect is not highlight', () => {
    const effect: AnimationEffect = {
      type: 'pulse',
      id: 'e1',
      elementId: 'x',
      time: 0,
      scale: 1.2,
      duration: 500,
    };
    expect(applyEffectColor('#333', effect, '#000')).toBe('#333');
  });

  it('returns state color when effect is undefined', () => {
    expect(applyEffectColor('#222', undefined, '#000')).toBe('#222');
  });

  it('falls back to default color when state color is missing', () => {
    expect(applyEffectColor(undefined, undefined, '#000')).toBe('#000');
  });
});

describe('applyEffectScale', () => {
  const pulse = (time: number, duration: number, scale: number): AnimationEffect => ({
    type: 'pulse',
    id: 'p',
    elementId: 'x',
    time,
    duration,
    scale,
  });

  it('returns 1 when no effect provided', () => {
    expect(applyEffectScale(undefined, 100)).toBe(1);
  });

  it('returns 1 when effect is not pulse', () => {
    const highlight: AnimationEffect = {
      type: 'highlight',
      id: 'h',
      elementId: 'x',
      time: 0,
      color: '#fff',
      duration: 100,
    };
    expect(applyEffectScale(highlight, 50)).toBe(1);
  });

  it('produces peak scale at the middle of the duration', () => {
    const p = pulse(0, 100, 2);
    expect(applyEffectScale(p, 50)).toBeCloseTo(2, 5);
  });

  it('returns 1 at effect start', () => {
    expect(applyEffectScale(pulse(0, 100, 2), 0)).toBeCloseTo(1, 5);
  });

  it('returns 1 at effect end', () => {
    expect(applyEffectScale(pulse(0, 100, 2), 100)).toBeCloseTo(1, 5);
  });

  it('clamps time before effect start to 1', () => {
    expect(applyEffectScale(pulse(50, 100, 2), 0)).toBeCloseTo(1, 5);
  });

  it('clamps time after effect end to 1', () => {
    expect(applyEffectScale(pulse(0, 50, 2), 200)).toBeCloseTo(1, 5);
  });
});
