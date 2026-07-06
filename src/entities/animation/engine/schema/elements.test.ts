import { describe, expect, it } from 'vitest';
import {
  arrowElementSchema,
  circleElementSchema,
  codeElementSchema,
  elementSchema,
  groupElementSchema,
  imageElementSchema,
  lineElementSchema,
  pathElementSchema,
  polygonElementSchema,
  rectElementSchema,
  textElementSchema,
} from './elements';

describe('rectElementSchema', () => {
  it('accepts valid rect with defaults', () => {
    const r = rectElementSchema.parse({
      type: 'rect',
      id: 'r1',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
    });
    expect(r.fill).toBe('#a5b4fc');
    expect(r.cornerRadius).toBe(8);
    expect(r.labelSize).toBe(14);
  });

  it('rejects non-positive width or height', () => {
    expect(
      rectElementSchema.safeParse({ type: 'rect', id: 'r', x: 0, y: 0, width: 0, height: 10 })
        .success,
    ).toBe(false);
    expect(
      rectElementSchema.safeParse({ type: 'rect', id: 'r', x: 0, y: 0, width: 10, height: 0 })
        .success,
    ).toBe(false);
  });
});

describe('circleElementSchema', () => {
  it('accepts valid circle with defaults', () => {
    const r = circleElementSchema.parse({ type: 'circle', id: 'c1', cx: 5, cy: 5, r: 3 });
    expect(r.fill).toBe('#a5b4fc');
    expect(r.strokeWidth).toBe(1.5);
  });

  it('rejects non-positive radius', () => {
    expect(circleElementSchema.safeParse({ type: 'circle', id: 'c', cx: 0, cy: 0, r: 0 }).success).toBe(
      false,
    );
  });
});

describe('lineElementSchema', () => {
  it('accepts explicit endpoints', () => {
    const r = lineElementSchema.parse({
      type: 'line',
      id: 'l1',
      x1: 0,
      y1: 0,
      x2: 10,
      y2: 10,
    });
    expect(r.stroke).toBe('#6366f1');
    expect(r.strokeWidth).toBe(2);
  });

  it('accepts fromId/toId anchor references', () => {
    const r = lineElementSchema.parse({
      type: 'line',
      id: 'l1',
      fromId: 'a',
      toId: 'b',
    });
    expect(r.fromId).toBe('a');
  });
});

describe('arrowElementSchema', () => {
  it('accepts arrow with label and offset defaults', () => {
    const r = arrowElementSchema.parse({
      type: 'arrow',
      id: 'a1',
      x1: 0,
      y1: 0,
      x2: 5,
      y2: 5,
      label: 'x',
    });
    expect(r.labelOffsetY).toBe(4);
    expect(r.curvature).toBe(0);
  });
});

describe('textElementSchema', () => {
  it('requires content and applies defaults', () => {
    const r = textElementSchema.parse({ type: 'text', id: 't', x: 0, y: 0, content: 'hello' });
    expect(r.fontSize).toBe(16);
    expect(r.textAnchor).toBe('start');
  });

  it('rejects missing content', () => {
    expect(textElementSchema.safeParse({ type: 'text', id: 't', x: 0, y: 0 }).success).toBe(false);
  });

  it('accepts fontWeight as number or string', () => {
    expect(
      textElementSchema.safeParse({
        type: 'text',
        id: 't',
        x: 0,
        y: 0,
        content: 'x',
        fontWeight: 700,
      }).success,
    ).toBe(true);
    expect(
      textElementSchema.safeParse({
        type: 'text',
        id: 't',
        x: 0,
        y: 0,
        content: 'x',
        fontWeight: 'bold',
      }).success,
    ).toBe(true);
  });
});

describe('imageElementSchema', () => {
  it('applies preserveAspectRatio and opacity defaults', () => {
    const r = imageElementSchema.parse({
      type: 'image',
      id: 'i',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      src: '/foo.png',
    });
    expect(r.preserveAspectRatio).toBe('xMidYMid meet');
    expect(r.opacity).toBe(1);
  });

  it('rejects opacity outside 0..1', () => {
    expect(
      imageElementSchema.safeParse({
        type: 'image',
        id: 'i',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        src: '/foo.png',
        opacity: 1.5,
      }).success,
    ).toBe(false);
  });
});

describe('pathElementSchema', () => {
  it('requires d and applies defaults', () => {
    const r = pathElementSchema.parse({ type: 'path', id: 'p', d: 'M0 0 L10 10' });
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
    expect(r.fill).toBe('none');
  });
});

describe('polygonElementSchema', () => {
  it('requires points', () => {
    const r = polygonElementSchema.parse({ type: 'polygon', id: 'p', points: '0,0 10,0 5,10' });
    expect(r.opacity).toBe(1);
  });
});

describe('groupElementSchema', () => {
  it('applies childIds default to []', () => {
    const r = groupElementSchema.parse({ type: 'group', id: 'g' });
    expect(r.childIds).toEqual([]);
    expect(r.x).toBe(0);
    expect(r.y).toBe(0);
  });
});

describe('codeElementSchema', () => {
  it('requires content and applies defaults', () => {
    const r = codeElementSchema.parse({
      type: 'code',
      id: 'c',
      x: 0,
      y: 0,
      width: 100,
      height: 50,
      content: 'x',
    });
    expect(r.language).toBe('javascript');
    expect(r.fontSize).toBe(12);
    expect(r.showLineNumbers).toBe(false);
    expect(r.padding).toBe(12);
  });
});

describe('elementSchema discriminator', () => {
  it('rejects unknown type', () => {
    expect(elementSchema.safeParse({ type: 'ellipse', id: 'x' }).success).toBe(false);
  });

  it('dispatches to correct variant', () => {
    const r = elementSchema.parse({ type: 'circle', id: 'c', cx: 0, cy: 0, r: 5 });
    expect(r.type).toBe('circle');
  });
});
