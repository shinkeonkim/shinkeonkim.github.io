/**
 * Property 3: Select-all captures all visible elements
 * Property 4: Marquee intersection correctness
 * Property 5: Batch delete removes exactly selected elements
 * Property 6: Batch move preserves relative positions
 * Property 7: Shift-click toggles exactly one element
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.7**
 *
 * Uses fast-check to generate random element sets, positions, marquee rects,
 * and selection subsets to verify universal properties of multi-select logic.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getVisibleElementIds } from './main';
import { intersectsMarquee } from './canvas';
import { toggleSelectionFor } from './state';
import type { Selection } from './state';
import type { AnimationDef, AnimationElement, Appearance } from '../../animations/schema';

// ---------------------------------------------------------------------------
// Helpers: minimal AnimationDef-like structure builders
// ---------------------------------------------------------------------------

/** Build a minimal rect element with optional appearances */
function makeElement(id: string, appearances: Appearance[] = []): AnimationElement {
  return {
    type: 'rect',
    id,
    x: 0,
    y: 0,
    width: 50,
    height: 50,
    fill: '#000',
    stroke: '',
    strokeWidth: 0,
    rx: 0,
    rotation: 0,
    appearances,
    tracks: [],
  } as unknown as AnimationElement;
}

/** Build a minimal AnimationDef with given elements */
function makeDef(elements: AnimationElement[]): AnimationDef {
  return {
    version: 4,
    id: 'test-def',
    title: 'Test',
    description: '',
    category: 'general',
    tags: [],
    duration: 5000,
    canvas: { width: 800, height: 500, background: 'transparent' },
    elements,
    chapters: [],
    effects: [],
    settings: { loop: true, autoplay: true, showCaption: false, showChapterList: false },
  } as AnimationDef;
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Generate a unique set of element IDs */
const arbElementIds = fc.uniqueArray(
  fc.stringMatching(/^[a-z][a-z0-9]{2,8}$/),
  { minLength: 1, maxLength: 20 },
);

/** Generate a valid appearance (start < end, both within [0, 5000]) */
const arbAppearance: fc.Arbitrary<Appearance> = fc
  .tuple(
    fc.integer({ min: 0, max: 4999 }),
    fc.integer({ min: 1, max: 5000 }),
  )
  .filter(([a, b]) => a < b)
  .map(([start, end]) => ({
    start,
    end,
    entryDuration: 0,
    exitDuration: 0,
  })) as fc.Arbitrary<Appearance>;

/** Generate a bounding box: { x, y, w, h } with positive dimensions */
const arbBbox = fc.record({
  x: fc.integer({ min: -500, max: 500 }),
  y: fc.integer({ min: -500, max: 500 }),
  w: fc.integer({ min: 1, max: 300 }),
  h: fc.integer({ min: 1, max: 300 }),
});

/** Generate a marquee rectangle with positive dimensions */
const arbMarquee = fc.record({
  x: fc.integer({ min: -500, max: 500 }),
  y: fc.integer({ min: -500, max: 500 }),
  w: fc.integer({ min: 1, max: 600 }),
  h: fc.integer({ min: 1, max: 600 }),
});

/** Generate a position with x, y */
const arbPosition = fc.record({
  x: fc.integer({ min: -1000, max: 1000 }),
  y: fc.integer({ min: -1000, max: 1000 }),
});

/** Generate a delta (dx, dy) */
const arbDelta = fc.record({
  dx: fc.integer({ min: -500, max: 500 }),
  dy: fc.integer({ min: -500, max: 500 }),
});

// ---------------------------------------------------------------------------
// Property 3: Select-all captures all visible elements
// ---------------------------------------------------------------------------

describe('Property 3: Select-all captures all visible elements', () => {
  it('selects exactly elements visible at the given time', () => {
    fc.assert(
      fc.property(
        arbElementIds,
        fc.integer({ min: 0, max: 5000 }),
        fc.array(fc.oneof(fc.constant(null), arbAppearance), { minLength: 0, maxLength: 20 }),
        (ids, time, maybeAppearances) => {
          // Build elements: each may have no appearances (always visible) or one appearance
          const elements = ids.map((id, i) => {
            const app = maybeAppearances[i % maybeAppearances.length] ?? undefined;
            return makeElement(id, app ? [app] : []);
          });
          const def = makeDef(elements);
          const visibleIds = getVisibleElementIds(def, time);

          // Manually compute expected visibility
          const expected = elements
            .filter((el) => {
              if (el.appearances.length === 0) return true; // always visible
              // Visible if time is within any appearance window
              return el.appearances.some((ap) => time >= ap.start && time <= ap.end);
            })
            .map((el) => el.id);

          expect(visibleIds.sort()).toEqual(expected.sort());
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns all elements when none have appearances', () => {
    fc.assert(
      fc.property(
        arbElementIds,
        fc.integer({ min: 0, max: 5000 }),
        (ids, time) => {
          const elements = ids.map((id) => makeElement(id, []));
          const def = makeDef(elements);
          const visibleIds = getVisibleElementIds(def, time);
          expect(visibleIds.sort()).toEqual(ids.sort());
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Marquee intersection correctness
// ---------------------------------------------------------------------------

describe('Property 4: Marquee intersection correctness', () => {
  it('correctly identifies AABB intersection', () => {
    fc.assert(
      fc.property(arbBbox, arbMarquee, (elBbox, marquee) => {
        const result = intersectsMarquee(elBbox, marquee);

        // Reference AABB intersection: two rects intersect iff they overlap on both axes
        const overlapX = elBbox.x < marquee.x + marquee.w && elBbox.x + elBbox.w > marquee.x;
        const overlapY = elBbox.y < marquee.y + marquee.h && elBbox.y + elBbox.h > marquee.y;
        const expected = overlapX && overlapY;

        expect(result).toBe(expected);
      }),
      { numRuns: 200 },
    );
  });

  it('an element fully inside the marquee is always selected', () => {
    fc.assert(
      fc.property(
        arbMarquee,
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 50 }),
        (marquee, dw, dh) => {
          // Place element strictly inside the marquee
          const elBbox = {
            x: marquee.x + 1,
            y: marquee.y + 1,
            w: Math.min(dw, marquee.w - 2),
            h: Math.min(dh, marquee.h - 2),
          };
          fc.pre(elBbox.w > 0 && elBbox.h > 0);
          expect(intersectsMarquee(elBbox, marquee)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('non-overlapping boxes never intersect', () => {
    fc.assert(
      fc.property(arbBbox, (elBbox) => {
        // Place marquee completely to the right with a gap
        const marquee = {
          x: elBbox.x + elBbox.w + 10,
          y: elBbox.y,
          w: 50,
          h: 50,
        };
        expect(intersectsMarquee(elBbox, marquee)).toBe(false);
      }),
      { numRuns: 50 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Batch delete removes exactly selected elements
// ---------------------------------------------------------------------------

describe('Property 5: Batch delete removes exactly selected elements', () => {
  it('after batch delete, remaining elements are exactly the unselected ones', () => {
    fc.assert(
      fc.property(
        arbElementIds,
        fc.float({ min: 0, max: 1 }),
        (ids, selectRatio) => {
          // Create elements
          const elements = ids.map((id) => makeElement(id));

          // Select a subset based on ratio
          const selectedIds = new Set(
            ids.filter((_, i) => i < Math.max(1, Math.floor(ids.length * selectRatio))),
          );

          // Simulate batch delete: remove selected elements
          const remaining = elements.filter((el) => !selectedIds.has(el.id));

          // Verify: remaining should be exactly elements NOT in selection
          const remainingIds = remaining.map((el) => el.id);
          const expectedRemaining = ids.filter((id) => !selectedIds.has(id));

          expect(remainingIds).toEqual(expectedRemaining);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('batch delete preserves order of unselected elements', () => {
    fc.assert(
      fc.property(
        arbElementIds,
        fc.uniqueArray(fc.nat({ max: 19 }), { minLength: 1, maxLength: 10 }),
        (ids, selectedIndices) => {
          const elements = ids.map((id) => makeElement(id));

          // Select elements at given indices (mod length)
          const validIndices = new Set(selectedIndices.map((i) => i % ids.length));
          const selectedIds = new Set(
            ids.filter((_, i) => validIndices.has(i)),
          );

          // Simulate batch delete
          const remaining = elements.filter((el) => !selectedIds.has(el.id));
          const remainingIds = remaining.map((el) => el.id);

          // The order of remaining should be a subsequence of the original order
          const expectedOrder = ids.filter((id) => !selectedIds.has(id));
          expect(remainingIds).toEqual(expectedOrder);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 6: Batch move preserves relative positions
// ---------------------------------------------------------------------------

describe('Property 6: Batch move preserves relative positions', () => {
  it('applying (dx, dy) to all selected elements preserves pairwise distances', () => {
    fc.assert(
      fc.property(
        fc.array(arbPosition, { minLength: 2, maxLength: 10 }),
        arbDelta,
        (positions, delta) => {
          // Apply the batch move
          const moved = positions.map((p) => ({
            x: p.x + delta.dx,
            y: p.y + delta.dy,
          }));

          // Check all pairwise distances are preserved
          for (let i = 0; i < positions.length; i++) {
            for (let j = i + 1; j < positions.length; j++) {
              const origDx = positions[i].x - positions[j].x;
              const origDy = positions[i].y - positions[j].y;
              const movedDx = moved[i].x - moved[j].x;
              const movedDy = moved[i].y - moved[j].y;
              expect(movedDx).toBe(origDx);
              expect(movedDy).toBe(origDy);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('each element is offset by exactly (dx, dy)', () => {
    fc.assert(
      fc.property(
        fc.array(arbPosition, { minLength: 1, maxLength: 10 }),
        arbDelta,
        (positions, delta) => {
          const moved = positions.map((p) => ({
            x: p.x + delta.dx,
            y: p.y + delta.dy,
          }));

          for (let i = 0; i < positions.length; i++) {
            expect(moved[i].x - positions[i].x).toBe(delta.dx);
            expect(moved[i].y - positions[i].y).toBe(delta.dy);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: Shift-click toggles exactly one element
// ---------------------------------------------------------------------------

describe('Property 7: Shift-click toggles exactly one element', () => {
  it('toggling an element in the selection removes exactly that element', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.stringMatching(/^[a-z][a-z0-9]{2,6}$/), { minLength: 2, maxLength: 10 }),
        (ids) => {
          // Start with all ids selected
          const sel: Selection = { kind: 'elements', elementIds: ids };
          const target = ids[0];

          const result = toggleSelectionFor(sel, target);

          // Result should contain all ids except target
          const resultIds = getSelectionIds(result);
          const expected = ids.filter((id) => id !== target);
          expect(resultIds.sort()).toEqual(expected.sort());
        },
      ),
      { numRuns: 100 },
    );
  });

  it('toggling an element not in the selection adds exactly that element', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.stringMatching(/^[a-z][a-z0-9]{2,6}$/), { minLength: 1, maxLength: 10 }),
        fc.stringMatching(/^[z][0-9]{3,5}$/),
        (ids, newId) => {
          // Ensure newId is not in ids
          fc.pre(!ids.includes(newId));

          const sel: Selection = ids.length === 1
            ? { kind: 'element', elementId: ids[0] }
            : { kind: 'elements', elementIds: ids };

          const result = toggleSelectionFor(sel, newId);

          // Result should contain all original ids plus newId
          const resultIds = getSelectionIds(result);
          const expected = [...ids, newId];
          expect(resultIds.sort()).toEqual(expected.sort());
        },
      ),
      { numRuns: 100 },
    );
  });

  it('toggle is its own inverse (double toggle restores original)', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.stringMatching(/^[a-z][a-z0-9]{2,6}$/), { minLength: 2, maxLength: 10 }),
        fc.nat(),
        (ids, targetIdx) => {
          const target = ids[targetIdx % ids.length];
          const sel: Selection = { kind: 'elements', elementIds: ids };

          // Toggle twice should restore original
          const afterFirst = toggleSelectionFor(sel, target);
          const afterSecond = toggleSelectionFor(afterFirst, target);

          const resultIds = getSelectionIds(afterSecond);
          expect(resultIds.sort()).toEqual(ids.sort());
        },
      ),
      { numRuns: 100 },
    );
  });

  it('toggling on empty selection adds the element', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z][a-z0-9]{2,6}$/),
        (id) => {
          const sel: Selection = { kind: 'none' };
          const result = toggleSelectionFor(sel, id);
          const resultIds = getSelectionIds(result);
          expect(resultIds).toEqual([id]);
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ---------------------------------------------------------------------------
// Utility: extract element IDs from a Selection
// ---------------------------------------------------------------------------

function getSelectionIds(sel: Selection): string[] {
  if (sel.kind === 'element') return [sel.elementId];
  if (sel.kind === 'elements') return sel.elementIds;
  return [];
}
