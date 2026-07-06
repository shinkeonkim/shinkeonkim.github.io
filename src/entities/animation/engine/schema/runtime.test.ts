import { describe, expect, it } from 'vitest';
import { activeAppearance, activeEffects, computeSnapshot, currentChapter } from './runtime';
import type { AnimationDef } from './document';
import type { AnimationElement } from './elements';

function makeDef(overrides: Partial<AnimationDef> = {}): AnimationDef {
  return {
    version: 4,
    id: 'a',
    title: '',
    description: '',
    category: 'general',
    tags: [],
    duration: 5000,
    canvas: { width: 800, height: 500, background: 'transparent' },
    elements: [],
    chapters: [],
    effects: [],
    settings: { loop: true, autoplay: true, showCaption: false, showChapterList: false },
    ...overrides,
  };
}

function rectEl(overrides: Partial<AnimationElement> = {}): AnimationElement {
  return {
    type: 'rect',
    id: 'r1',
    rotation: 0,
    appearances: [],
    tracks: [],
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    fill: '#000',
    stroke: '#111',
    strokeWidth: 1,
    cornerRadius: 0,
    labelColor: '#fff',
    labelSize: 14,
    ...overrides,
  } as AnimationElement;
}

describe('activeAppearance', () => {
  const el = rectEl({
    appearances: [
      {
        start: 100,
        end: 1000,
        entryMode: 'fade',
        entryDuration: 100,
        exitMode: 'fade',
        exitDuration: 100,
      },
    ],
  });

  it('returns null when time is before the window', () => {
    expect(activeAppearance(el, 50)).toBeNull();
  });

  it('detects entry phase and computes progress', () => {
    const r = activeAppearance(el, 150);
    expect(r?.phase).toBe('entry');
    expect(r?.phaseProgress).toBeCloseTo(0.5);
  });

  it('detects visible phase between entry and exit', () => {
    const r = activeAppearance(el, 500);
    expect(r?.phase).toBe('visible');
    expect(r?.phaseProgress).toBe(1);
  });

  it('detects exit phase near the end', () => {
    const r = activeAppearance(el, 950);
    expect(r?.phase).toBe('exit');
    expect(r?.phaseProgress).toBeCloseTo(0.5);
  });

  it('returns null when time is after the window', () => {
    expect(activeAppearance(el, 2000)).toBeNull();
  });

  it('returns null for elements with no appearances', () => {
    expect(activeAppearance(rectEl(), 0)).toBeNull();
  });

  it('skips entry/exit durations when mode is instant', () => {
    const instant = rectEl({
      appearances: [
        {
          start: 0,
          end: 500,
          entryMode: 'instant',
          entryDuration: 300,
          exitMode: 'instant',
          exitDuration: 300,
        },
      ],
    });
    const r = activeAppearance(instant, 250);
    expect(r?.phase).toBe('visible');
  });
});

describe('computeSnapshot', () => {
  it('marks elements invisible when appearances are empty', () => {
    const def = makeDef({ elements: [rectEl()] });
    const snap = computeSnapshot(def, 100);
    expect(snap.get('r1')?.visible).toBe(false);
  });

  it('marks visible when appearance covers time', () => {
    const def = makeDef({
      elements: [
        rectEl({
          appearances: [{ start: 0, end: 1000, entryDuration: 0, exitDuration: 0 }],
        }),
      ],
    });
    const snap = computeSnapshot(def, 500);
    expect(snap.get('r1')?.visible).toBe(true);
  });

  it('applies track values at given time (numeric interpolation)', () => {
    const def = makeDef({
      elements: [
        rectEl({
          appearances: [{ start: 0, end: 1000, entryDuration: 0, exitDuration: 0 }],
          tracks: [
            {
              property: 'x',
              keyframes: [
                { time: 0, value: 0, ease: 'linear' },
                { time: 1000, value: 100, ease: 'linear' },
              ],
            },
          ],
        }),
      ],
    });
    const snap = computeSnapshot(def, 500);
    expect(snap.get('r1')?.x).toBeCloseTo(50, 1);
  });

  it('clamps track values before first and after last keyframe', () => {
    const def = makeDef({
      elements: [
        rectEl({
          tracks: [
            {
              property: 'x',
              keyframes: [
                { time: 100, value: 5 },
                { time: 500, value: 50 },
              ],
            },
          ],
        }),
      ],
    });
    const snapBefore = computeSnapshot(def, 0);
    const snapAfter = computeSnapshot(def, 9999);
    expect(snapBefore.get('r1')?.x).toBe(5);
    expect(snapAfter.get('r1')?.x).toBe(50);
  });

  it('interpolates color values on color keys', () => {
    const def = makeDef({
      elements: [
        rectEl({
          tracks: [
            {
              property: 'fill',
              keyframes: [
                { time: 0, value: '#000000', ease: 'linear' },
                { time: 1000, value: '#ffffff', ease: 'linear' },
              ],
            },
          ],
        }),
      ],
    });
    const snap = computeSnapshot(def, 500);
    const fill = snap.get('r1')?.fill as string;
    expect(fill).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('falls back to nearest value when color parse fails', () => {
    const def = makeDef({
      elements: [
        rectEl({
          tracks: [
            {
              property: 'fill',
              keyframes: [
                { time: 0, value: 'bad-color-1' },
                { time: 1000, value: 'bad-color-2' },
              ],
            },
          ],
        }),
      ],
    });
    const snap = computeSnapshot(def, 250);
    expect(snap.get('r1')?.fill).toBe('bad-color-1');
    const snap2 = computeSnapshot(def, 750);
    expect(snap2.get('r1')?.fill).toBe('bad-color-2');
  });

  it('marks entry/exit progress in visual state', () => {
    const def = makeDef({
      elements: [
        rectEl({
          appearances: [
            {
              start: 0,
              end: 1000,
              entryMode: 'fade',
              entryDuration: 100,
              exitMode: 'fade',
              exitDuration: 100,
            },
          ],
        }),
      ],
    });
    const entry = computeSnapshot(def, 50);
    expect(entry.get('r1')?.__entryMode).toBe('fade');
    expect(entry.get('r1')?.__entryProgress).toBeGreaterThan(0);
    const exit = computeSnapshot(def, 950);
    expect(exit.get('r1')?.__exitMode).toBe('fade');
    expect(exit.get('r1')?.__exitProgress).toBeGreaterThan(0);
  });
});

describe('currentChapter', () => {
  it('returns null when there are no chapters', () => {
    expect(currentChapter(makeDef(), 0)).toBeNull();
  });

  it('returns the latest chapter whose time is at or before given time', () => {
    const def = makeDef({
      chapters: [
        { id: 'c1', time: 0, label: '', subtitle: '' },
        { id: 'c2', time: 500, label: '', subtitle: '' },
        { id: 'c3', time: 1000, label: '', subtitle: '' },
      ],
    });
    expect(currentChapter(def, 300)?.chapter.id).toBe('c1');
    expect(currentChapter(def, 700)?.chapter.id).toBe('c2');
    expect(currentChapter(def, 1500)?.chapter.id).toBe('c3');
  });

  it('sorts chapters by time before picking', () => {
    const def = makeDef({
      chapters: [
        { id: 'c3', time: 1000, label: '', subtitle: '' },
        { id: 'c1', time: 0, label: '', subtitle: '' },
        { id: 'c2', time: 500, label: '', subtitle: '' },
      ],
    });
    expect(currentChapter(def, 300)?.chapter.id).toBe('c1');
  });
});

describe('activeEffects', () => {
  it('includes effects whose window contains the time', () => {
    const def = makeDef({
      effects: [
        { type: 'highlight', id: 'e1', elementId: 'x', time: 100, color: '#f00', duration: 200 },
      ],
    });
    expect(activeEffects(def, 200).length).toBe(1);
  });

  it('excludes effects that ended before time', () => {
    const def = makeDef({
      effects: [
        { type: 'highlight', id: 'e1', elementId: 'x', time: 0, color: '#f00', duration: 100 },
      ],
    });
    expect(activeEffects(def, 100).length).toBe(0);
    expect(activeEffects(def, 500).length).toBe(0);
  });
});

describe('color interpolation (via computeSnapshot)', () => {
  it('parses short-form hex (#f00) for interpolation', () => {
    const def = makeDef({
      elements: [
        rectEl({
          tracks: [
            {
              property: 'fill',
              keyframes: [
                { time: 0, value: '#f00', ease: 'linear' },
                { time: 1000, value: '#00f', ease: 'linear' },
              ],
            },
          ],
        }),
      ],
    });
    const snap = computeSnapshot(def, 500);
    expect(snap.get('r1')?.fill).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('parses 8-digit hex (#rrggbbaa) for interpolation', () => {
    const def = makeDef({
      elements: [
        rectEl({
          tracks: [
            {
              property: 'fill',
              keyframes: [
                { time: 0, value: '#ff000080', ease: 'linear' },
                { time: 1000, value: '#0000ff80', ease: 'linear' },
              ],
            },
          ],
        }),
      ],
    });
    const snap = computeSnapshot(def, 500);
    const fill = snap.get('r1')?.fill as string;
    expect(fill).toMatch(/^#[0-9a-f]{8}$/);
  });

  it('applies text keyframes via nearest-neighbor', () => {
    const def = makeDef({
      elements: [
        rectEl({
          tracks: [
            {
              property: 'label',
              keyframes: [
                { time: 0, value: 'A' },
                { time: 1000, value: 'B' },
              ],
            },
          ],
        }),
      ],
    });
    expect(computeSnapshot(def, 100).get('r1')?.label).toBe('A');
    expect(computeSnapshot(def, 900).get('r1')?.label).toBe('B');
  });

  it('handles keyframes with duplicated time (zero span)', () => {
    const def = makeDef({
      elements: [
        rectEl({
          tracks: [
            {
              property: 'x',
              keyframes: [
                { time: 100, value: 5 },
                { time: 100, value: 50 },
                { time: 500, value: 100 },
              ],
            },
          ],
        }),
      ],
    });
    const snap = computeSnapshot(def, 100);
    expect(snap.get('r1')?.x).toBeDefined();
  });

  it('easeIn produces different value from easeOut', () => {
    const withEase = (ease: 'easeIn' | 'easeOut' | 'linear') =>
      makeDef({
        elements: [
          rectEl({
            tracks: [
              {
                property: 'x',
                keyframes: [
                  { time: 0, value: 0 },
                  { time: 1000, value: 100, ease },
                ],
              },
            ],
          }),
        ],
      });
    const inVal = computeSnapshot(withEase('easeIn'), 500).get('r1')?.x as number;
    const outVal = computeSnapshot(withEase('easeOut'), 500).get('r1')?.x as number;
    const linVal = computeSnapshot(withEase('linear'), 500).get('r1')?.x as number;
    expect(inVal).not.toBe(outVal);
    expect(linVal).toBeCloseTo(50);
  });
});
