import { describe, expect, it } from 'vitest';
import {
  ID_RE,
  anchorSchema,
  appearanceSchema,
  arrowHeadSchema,
  easeSchema,
  entryModeSchema,
  exitModeSchema,
  idSchema,
  propertyTrackSchema,
  trackKeyframeSchema,
  trackValueSchema,
} from './primitives';

describe('idSchema', () => {
  it('accepts lowercase alphanumeric IDs starting with letter or digit', () => {
    for (const id of ['abc', 'a1', 'a-b', 'a_b', '1foo', 'anim_2']) {
      expect(idSchema.safeParse(id).success).toBe(true);
    }
  });

  it('rejects IDs with uppercase or spaces', () => {
    for (const id of ['ABC', 'foo bar', 'a!b', '-start', '_start']) {
      expect(idSchema.safeParse(id).success).toBe(false);
    }
  });

  it('exports a matching regex constant', () => {
    expect(ID_RE.test('abc-1')).toBe(true);
    expect(ID_RE.test('bad space')).toBe(false);
  });
});

describe('anchorSchema', () => {
  it('applies "auto" as default', () => {
    expect(anchorSchema.parse(undefined)).toBe('auto');
  });

  it('accepts all corner and side values', () => {
    for (const v of ['top', 'right', 'bottom', 'left', 'center', 'top-left']) {
      expect(anchorSchema.safeParse(v).success).toBe(true);
    }
  });

  it('rejects unknown anchor values', () => {
    expect(anchorSchema.safeParse('somewhere').success).toBe(false);
  });
});

describe('arrowHeadSchema', () => {
  it('accepts each documented head', () => {
    for (const v of ['none', 'arrow', 'triangle', 'triangle-open', 'circle', 'diamond', 'bar']) {
      expect(arrowHeadSchema.safeParse(v).success).toBe(true);
    }
  });

  it('rejects unknown heads', () => {
    expect(arrowHeadSchema.safeParse('star').success).toBe(false);
  });
});

describe('easeSchema', () => {
  it('defaults to easeInOut', () => {
    expect(easeSchema.parse(undefined)).toBe('easeInOut');
  });

  it('accepts all documented easing modes', () => {
    for (const v of ['linear', 'easeIn', 'easeOut', 'easeInOut']) {
      expect(easeSchema.safeParse(v).success).toBe(true);
    }
  });
});

describe('entry/exit mode schemas', () => {
  it('default to instant', () => {
    expect(entryModeSchema.parse(undefined)).toBe('instant');
    expect(exitModeSchema.parse(undefined)).toBe('instant');
  });

  it('accept fade, slides, zoom, pop', () => {
    for (const v of ['fade', 'slide-left', 'slide-right', 'zoom', 'pop']) {
      expect(entryModeSchema.safeParse(v).success).toBe(true);
      expect(exitModeSchema.safeParse(v).success).toBe(true);
    }
  });
});

describe('trackValueSchema', () => {
  it('accepts string, number, boolean', () => {
    expect(trackValueSchema.safeParse('x').success).toBe(true);
    expect(trackValueSchema.safeParse(1).success).toBe(true);
    expect(trackValueSchema.safeParse(true).success).toBe(true);
  });

  it('rejects null and objects', () => {
    expect(trackValueSchema.safeParse(null).success).toBe(false);
    expect(trackValueSchema.safeParse({}).success).toBe(false);
  });
});

describe('trackKeyframeSchema', () => {
  it('accepts a valid keyframe', () => {
    const r = trackKeyframeSchema.safeParse({ time: 100, value: 5 });
    expect(r.success).toBe(true);
  });

  it('rejects negative time', () => {
    expect(trackKeyframeSchema.safeParse({ time: -1, value: 0 }).success).toBe(false);
  });

  it('accepts optional ease', () => {
    expect(
      trackKeyframeSchema.safeParse({ time: 0, value: 1, ease: 'linear' }).success,
    ).toBe(true);
  });
});

describe('propertyTrackSchema', () => {
  it('requires at least one keyframe', () => {
    expect(propertyTrackSchema.safeParse({ property: 'x', keyframes: [] }).success).toBe(false);
    expect(
      propertyTrackSchema.safeParse({ property: 'x', keyframes: [{ time: 0, value: 1 }] }).success,
    ).toBe(true);
  });
});

describe('appearanceSchema', () => {
  it('applies default durations for entry/exit', () => {
    const r = appearanceSchema.parse({ start: 0, end: 1000 });
    expect(r.entryDuration).toBe(300);
    expect(r.exitDuration).toBe(300);
  });

  it('accepts custom entry/exit modes', () => {
    const r = appearanceSchema.parse({
      start: 0,
      end: 1000,
      entryMode: 'fade',
      exitMode: 'zoom',
    });
    expect(r.entryMode).toBe('fade');
    expect(r.exitMode).toBe('zoom');
  });

  it('rejects negative start and end', () => {
    expect(appearanceSchema.safeParse({ start: -1, end: 0 }).success).toBe(false);
    expect(appearanceSchema.safeParse({ start: 0, end: -1 }).success).toBe(false);
  });
});
