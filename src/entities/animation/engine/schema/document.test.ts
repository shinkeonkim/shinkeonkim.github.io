import { describe, expect, it } from 'vitest';
import { animationDefSchema, chapterSchema } from './document';

describe('chapterSchema', () => {
  it('accepts valid chapters and applies defaults for label/subtitle', () => {
    const r = chapterSchema.parse({ id: 'c1', time: 500 });
    expect(r.label).toBe('');
    expect(r.subtitle).toBe('');
  });

  it('rejects negative time', () => {
    expect(chapterSchema.safeParse({ id: 'c1', time: -1 }).success).toBe(false);
  });
});

describe('animationDefSchema', () => {
  it('applies defaults for minimal input', () => {
    const r = animationDefSchema.parse({ id: 'a1' });
    expect(r.version).toBe(4);
    expect(r.category).toBe('general');
    expect(r.duration).toBe(5000);
    expect(r.canvas.width).toBe(800);
    expect(r.canvas.height).toBe(500);
    expect(r.canvas.background).toBe('transparent');
    expect(r.settings.loop).toBe(true);
    expect(r.settings.autoplay).toBe(true);
    expect(r.elements).toEqual([]);
    expect(r.chapters).toEqual([]);
    expect(r.effects).toEqual([]);
    expect(r.tags).toEqual([]);
  });

  it('accepts version 3 and 4', () => {
    expect(animationDefSchema.safeParse({ id: 'a', version: 3 }).success).toBe(true);
    expect(animationDefSchema.safeParse({ id: 'a', version: 4 }).success).toBe(true);
  });

  it('rejects unknown version', () => {
    expect(animationDefSchema.safeParse({ id: 'a', version: 2 }).success).toBe(false);
  });

  it('rejects unknown category', () => {
    expect(
      animationDefSchema.safeParse({ id: 'a', category: 'not-a-category' }).success,
    ).toBe(false);
  });

  it('accepts custom canvas dimensions', () => {
    const r = animationDefSchema.parse({
      id: 'a1',
      canvas: { width: 1000, height: 400, background: '#fff' },
    });
    expect(r.canvas.width).toBe(1000);
    expect(r.canvas.height).toBe(400);
    expect(r.canvas.background).toBe('#fff');
  });

  it('rejects non-positive canvas dimensions', () => {
    expect(
      animationDefSchema.safeParse({ id: 'a', canvas: { width: 0, height: 100 } }).success,
    ).toBe(false);
  });

  it('accepts updatedAt when provided', () => {
    const r = animationDefSchema.parse({ id: 'a', updatedAt: '2024-01-01T00:00:00Z' });
    expect(r.updatedAt).toBe('2024-01-01T00:00:00Z');
  });
});
