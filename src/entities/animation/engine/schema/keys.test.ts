import { describe, expect, it } from 'vitest';
import { isColorKey, isNumericKey, isTextKey } from './keys';

describe('isNumericKey', () => {
  it('recognizes numeric geometry keys', () => {
    for (const key of ['x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'x1', 'y1', 'x2', 'y2']) {
      expect(isNumericKey(key)).toBe(true);
    }
  });

  it('recognizes numeric visual keys', () => {
    for (const key of ['rotation', 'opacity', 'strokeWidth', 'cornerRadius', 'fontSize']) {
      expect(isNumericKey(key)).toBe(true);
    }
  });

  it('rejects unknown keys', () => {
    expect(isNumericKey('foo')).toBe(false);
    expect(isNumericKey('')).toBe(false);
    expect(isNumericKey('label')).toBe(false);
  });
});

describe('isColorKey', () => {
  it('recognizes color-related keys', () => {
    for (const key of ['fill', 'stroke', 'color', 'labelColor']) {
      expect(isColorKey(key)).toBe(true);
    }
  });

  it('rejects unknown keys', () => {
    expect(isColorKey('x')).toBe(false);
    expect(isColorKey('label')).toBe(false);
  });
});

describe('isTextKey', () => {
  it('recognizes text-related keys', () => {
    for (const key of ['label', 'subtitle', 'content', 'src']) {
      expect(isTextKey(key)).toBe(true);
    }
  });

  it('rejects non-text keys', () => {
    expect(isTextKey('x')).toBe(false);
    expect(isTextKey('color')).toBe(false);
  });
});
