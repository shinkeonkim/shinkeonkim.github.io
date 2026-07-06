import { describe, expect, it } from 'vitest';
import { elementCenterFromState, entryStyle, exitStyle } from './phase-styles';
import type { AnimationElement } from './schema';

function el(type: AnimationElement['type']): AnimationElement {
  return { type, id: 'e', appearances: [], tracks: [], rotation: 0 } as unknown as AnimationElement;
}

describe('elementCenterFromState', () => {
  it('computes rect center from x/y/width/height', () => {
    expect(elementCenterFromState(el('rect'), { x: 0, y: 0, width: 10, height: 20 })).toEqual({
      x: 5,
      y: 10,
    });
  });

  it('computes image center like rect', () => {
    expect(elementCenterFromState(el('image'), { x: 4, y: 6, width: 8, height: 12 })).toEqual({
      x: 8,
      y: 12,
    });
  });

  it('returns raw x/y for text', () => {
    expect(elementCenterFromState(el('text'), { x: 30, y: 40 })).toEqual({ x: 30, y: 40 });
  });

  it('returns cx/cy for circle', () => {
    expect(elementCenterFromState(el('circle'), { cx: 15, cy: 25 })).toEqual({ x: 15, y: 25 });
  });

  it('returns midpoint of line coordinates when all present', () => {
    expect(
      elementCenterFromState(el('line'), { x1: 0, y1: 0, x2: 10, y2: 20 }),
    ).toEqual({ x: 5, y: 10 });
  });

  it('returns midpoint for arrow coordinates', () => {
    expect(
      elementCenterFromState(el('arrow'), { x1: 4, y1: 8, x2: 12, y2: 16 }),
    ).toEqual({ x: 8, y: 12 });
  });

  it('returns null for line without full coordinates', () => {
    expect(elementCenterFromState(el('line'), {})).toBeNull();
    expect(elementCenterFromState(el('line'), { x1: 0, y1: 0 })).toBeNull();
  });

  it('returns path origin defaulting to 0/0', () => {
    expect(elementCenterFromState(el('path'), {})).toEqual({ x: 0, y: 0 });
    expect(elementCenterFromState(el('path'), { x: 3, y: 5 })).toEqual({ x: 3, y: 5 });
  });

  it('returns null for unknown element type', () => {
    expect(elementCenterFromState(el('polygon'), { x: 1, y: 2 })).toBeNull();
  });
});

describe('entryStyle', () => {
  const base = el('rect');
  const state = { x: 0, y: 0, width: 10, height: 10 };

  it('returns empty style for instant mode', () => {
    expect(entryStyle('instant', 0.3, base, state)).toEqual({});
  });

  it('returns opacity progress for fade', () => {
    expect(entryStyle('fade', 0.5, base, state)).toEqual({ opacity: 0.5 });
  });

  it('applies zoom transform with scaling', () => {
    const s = entryStyle('zoom', 0.5, base, state);
    expect(s.opacity).toBe(0.5);
    expect(s.transform).toContain('scale(');
  });

  it('applies pop transform with different base scale', () => {
    const s = entryStyle('pop', 0.5, base, state);
    expect(s.opacity).toBe(0.5);
    expect(s.transform).toContain('scale(');
  });

  it('falls back to opacity when zoom center cannot be computed', () => {
    const s = entryStyle('zoom', 0.5, el('polygon'), {});
    expect(s.opacity).toBe(0.5);
    expect(s.transform).toBeUndefined();
  });

  it('translates slide-left in negative x direction', () => {
    const s = entryStyle('slide-left', 0.2, base, state);
    expect(s.transform).toMatch(/translate\(-\d+/);
  });

  it('translates slide-right in positive x direction', () => {
    const s = entryStyle('slide-right', 0.2, base, state);
    expect(s.transform).toMatch(/translate\(\d+/);
  });

  it('translates slide-up in negative y direction', () => {
    const s = entryStyle('slide-up', 0.2, base, state);
    expect(s.transform).toMatch(/translate\(0px -/);
  });

  it('translates slide-down in positive y direction', () => {
    const s = entryStyle('slide-down', 0.2, base, state);
    expect(s.transform).toMatch(/translate\(0px \d+/);
  });
});

describe('exitStyle', () => {
  const base = el('rect');
  const state = { x: 0, y: 0, width: 10, height: 10 };

  it('returns empty style for instant', () => {
    expect(exitStyle('instant', 0.5, base, state)).toEqual({});
  });

  it('returns opacity fade for fade mode', () => {
    expect(exitStyle('fade', 0.25, base, state)).toEqual({ opacity: 0.75 });
  });

  it('applies zoom transform with center', () => {
    const s = exitStyle('zoom', 0.5, base, state);
    expect(s.opacity).toBe(0.5);
    expect(s.transform).toContain('scale(');
  });

  it('applies pop transform with center', () => {
    const s = exitStyle('pop', 0.5, base, state);
    expect(s.transform).toContain('scale(');
  });

  it('falls back to opacity when center is null', () => {
    const s = exitStyle('zoom', 0.5, el('polygon'), {});
    expect(s.opacity).toBe(0.5);
    expect(s.transform).toBeUndefined();
  });

  it('applies each slide direction', () => {
    expect(exitStyle('slide-left', 0.3, base, state).transform).toMatch(/translate\(-/);
    expect(exitStyle('slide-right', 0.3, base, state).transform).toMatch(/translate\(\d/);
    expect(exitStyle('slide-up', 0.3, base, state).transform).toMatch(/0px -/);
    expect(exitStyle('slide-down', 0.3, base, state).transform).toMatch(/0px \d/);
  });
});
