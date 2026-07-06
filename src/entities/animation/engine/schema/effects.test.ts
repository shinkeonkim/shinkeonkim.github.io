import { describe, expect, it } from 'vitest';
import { effectSchema } from './effects';

describe('effectSchema (highlight)', () => {
  it('accepts a valid highlight and applies defaults', () => {
    const r = effectSchema.parse({ type: 'highlight', id: 'e1', elementId: 'a', time: 100 });
    expect(r.type).toBe('highlight');
    if (r.type === 'highlight') {
      expect(r.color).toBe('#facc15');
      expect(r.duration).toBe(500);
    }
  });

  it('accepts custom color and duration', () => {
    const r = effectSchema.parse({
      type: 'highlight',
      id: 'e1',
      elementId: 'a',
      time: 100,
      color: '#ff00ff',
      duration: 800,
    });
    if (r.type === 'highlight') {
      expect(r.color).toBe('#ff00ff');
      expect(r.duration).toBe(800);
    }
  });
});

describe('effectSchema (pulse)', () => {
  it('accepts pulse with defaults', () => {
    const r = effectSchema.parse({ type: 'pulse', id: 'e1', elementId: 'a', time: 0 });
    if (r.type === 'pulse') {
      expect(r.scale).toBeCloseTo(1.12);
      expect(r.duration).toBe(500);
    }
  });

  it('rejects non-positive scale', () => {
    expect(
      effectSchema.safeParse({ type: 'pulse', id: 'e1', elementId: 'a', time: 0, scale: 0 })
        .success,
    ).toBe(false);
  });
});

describe('effectSchema (flow)', () => {
  it('accepts flow with defaults', () => {
    const r = effectSchema.parse({ type: 'flow', id: 'e1', elementId: 'a', time: 0 });
    if (r.type === 'flow') {
      expect(r.particles).toBe(3);
      expect(r.radius).toBe(4);
      expect(r.color).toBe('#facc15');
      expect(r.duration).toBe(800);
    }
  });

  it('rejects out-of-range particles', () => {
    expect(
      effectSchema.safeParse({
        type: 'flow',
        id: 'e1',
        elementId: 'a',
        time: 0,
        particles: 0,
      }).success,
    ).toBe(false);
    expect(
      effectSchema.safeParse({
        type: 'flow',
        id: 'e1',
        elementId: 'a',
        time: 0,
        particles: 11,
      }).success,
    ).toBe(false);
  });
});

describe('effectSchema discriminator', () => {
  it('rejects unknown type', () => {
    expect(
      effectSchema.safeParse({ type: 'sparkle', id: 'e1', elementId: 'a', time: 0 }).success,
    ).toBe(false);
  });

  it('rejects negative time', () => {
    expect(
      effectSchema.safeParse({ type: 'highlight', id: 'e1', elementId: 'a', time: -1 }).success,
    ).toBe(false);
  });
});
