import { describe, expect, it } from 'vitest';
import { ENGINE_MARKER_DEFS, engineMarkerUrl } from './markers';

describe('ENGINE_MARKER_DEFS', () => {
  it('is a non-empty string containing SVG marker elements', () => {
    expect(typeof ENGINE_MARKER_DEFS).toBe('string');
    expect(ENGINE_MARKER_DEFS.length).toBeGreaterThan(0);
    expect(ENGINE_MARKER_DEFS).toContain('<marker');
    expect(ENGINE_MARKER_DEFS).toContain('id="anim-h-arrow"');
    expect(ENGINE_MARKER_DEFS).toContain('id="anim-h-triangle"');
    expect(ENGINE_MARKER_DEFS).toContain('id="anim-h-circle"');
    expect(ENGINE_MARKER_DEFS).toContain('id="anim-h-diamond"');
    expect(ENGINE_MARKER_DEFS).toContain('id="anim-h-bar"');
  });
});

describe('engineMarkerUrl', () => {
  it('returns undefined for missing or none head', () => {
    expect(engineMarkerUrl(undefined, 'start')).toBeUndefined();
    expect(engineMarkerUrl('none', 'start')).toBeUndefined();
    expect(engineMarkerUrl('none', 'end')).toBeUndefined();
  });

  it('returns non-directional URL for circle heads regardless of end', () => {
    expect(engineMarkerUrl('circle', 'start')).toBe('url(#anim-h-circle)');
    expect(engineMarkerUrl('circle', 'end')).toBe('url(#anim-h-circle)');
    expect(engineMarkerUrl('circle-open', 'start')).toBe('url(#anim-h-circle-open)');
    expect(engineMarkerUrl('circle-open', 'end')).toBe('url(#anim-h-circle-open)');
  });

  it('appends -start suffix for start-end arrow-like heads', () => {
    expect(engineMarkerUrl('arrow', 'start')).toBe('url(#anim-h-arrow-start)');
    expect(engineMarkerUrl('triangle', 'start')).toBe('url(#anim-h-triangle-start)');
    expect(engineMarkerUrl('diamond', 'start')).toBe('url(#anim-h-diamond-start)');
  });

  it('uses base URL for end-end arrow-like heads', () => {
    expect(engineMarkerUrl('arrow', 'end')).toBe('url(#anim-h-arrow)');
    expect(engineMarkerUrl('triangle', 'end')).toBe('url(#anim-h-triangle)');
    expect(engineMarkerUrl('diamond', 'end')).toBe('url(#anim-h-diamond)');
  });
});
