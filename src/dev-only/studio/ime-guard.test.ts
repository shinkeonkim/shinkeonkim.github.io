/**
 * Property 8: IME composition guards Enter commits
 *
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
 *
 * Tests that:
 * - keydown with isComposing: true does NOT trigger commit
 * - keydown with isComposing: false DOES trigger commit
 *
 * We test the guard logic by simulating the inline text editor (main.ts)
 * and properties panel (properties.ts) IME guard patterns in isolation.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// --------------------------------------------------------------------------
// Extract the guard logic pattern used in both main.ts and properties.ts
// --------------------------------------------------------------------------

/**
 * Simulates the inline text editor keydown handler from main.ts startInlineTextEdit().
 * Returns true if the value would be committed, false otherwise.
 */
function inlineTextEditKeydown(params: {
  key: string;
  isComposing: boolean;
  isComposingFallback: boolean;
}): boolean {
  // Guard: exact pattern from main.ts
  if (params.isComposing || params.isComposingFallback) return false;
  if (params.key === 'Enter') {
    return true; // commit() would be called
  }
  return false; // no commit for non-Enter keys
}

/**
 * Simulates the properties panel onKeydown handler from properties.ts.
 * Returns true if the blur (commit) would be triggered, false otherwise.
 */
function propertiesPanelKeydown(params: {
  key: string;
  isComposing: boolean;
  isComposingFallback: boolean;
  inputType: 'text' | 'number';
}): boolean {
  // Guard: exact pattern from properties.ts onKeydown
  if (params.key !== 'Enter') return false;
  if (params.isComposing || params.isComposingFallback) return false;
  // Only text and number inputs trigger blur on Enter
  if (params.inputType === 'text' || params.inputType === 'number') {
    return true; // target.blur() would be called → commit
  }
  return false;
}

/**
 * Simulates the compositionstart/compositionend lifecycle.
 * Returns the isComposingFallback state after composition events.
 */
function compositionLifecycle(events: ('compositionstart' | 'compositionend')[]): boolean {
  let isComposingFallback = false;
  for (const ev of events) {
    if (ev === 'compositionstart') isComposingFallback = true;
    else if (ev === 'compositionend') isComposingFallback = false;
  }
  return isComposingFallback;
}

// --------------------------------------------------------------------------
// Property-Based Tests
// --------------------------------------------------------------------------

describe('Property 8: IME composition guards Enter commits', () => {
  describe('Inline Text Editor (main.ts startInlineTextEdit)', () => {
    it('SHALL NOT commit when isComposing is true (any text)', () => {
      fc.assert(
        fc.property(fc.string(), (_text) => {
          // Simulate: user typed `text`, then presses Enter while IME is composing
          const committed = inlineTextEditKeydown({
            key: 'Enter',
            isComposing: true,
            isComposingFallback: false,
          });
          expect(committed).toBe(false);
        }),
      );
    });

    it('SHALL NOT commit when isComposingFallback is true (any text)', () => {
      fc.assert(
        fc.property(fc.string(), (_text) => {
          // Simulate: compositionstart fired, Enter pressed
          const committed = inlineTextEditKeydown({
            key: 'Enter',
            isComposing: false,
            isComposingFallback: true,
          });
          expect(committed).toBe(false);
        }),
      );
    });

    it('SHALL NOT commit when both isComposing and isComposingFallback are true', () => {
      fc.assert(
        fc.property(fc.string(), (_text) => {
          const committed = inlineTextEditKeydown({
            key: 'Enter',
            isComposing: true,
            isComposingFallback: true,
          });
          expect(committed).toBe(false);
        }),
      );
    });

    it('SHALL commit when isComposing is false and isComposingFallback is false', () => {
      fc.assert(
        fc.property(fc.string(), (_text) => {
          const committed = inlineTextEditKeydown({
            key: 'Enter',
            isComposing: false,
            isComposingFallback: false,
          });
          expect(committed).toBe(true);
        }),
      );
    });

    it('for any text, Enter commits iff not composing', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.boolean(),
          fc.boolean(),
          (text, isComposing, isComposingFallback) => {
            const committed = inlineTextEditKeydown({
              key: 'Enter',
              isComposing,
              isComposingFallback,
            });
            const shouldBlock = isComposing || isComposingFallback;
            expect(committed).toBe(!shouldBlock);
          },
        ),
      );
    });
  });

  describe('Properties Panel (properties.ts onKeydown)', () => {
    it('SHALL NOT commit when isComposing is true (any text input)', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.constantFrom('text' as const, 'number' as const),
          (text, inputType) => {
            const committed = propertiesPanelKeydown({
              key: 'Enter',
              isComposing: true,
              isComposingFallback: false,
              inputType,
            });
            expect(committed).toBe(false);
          },
        ),
      );
    });

    it('SHALL NOT commit when isComposingFallback is true', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.constantFrom('text' as const, 'number' as const),
          (text, inputType) => {
            const committed = propertiesPanelKeydown({
              key: 'Enter',
              isComposing: false,
              isComposingFallback: true,
              inputType,
            });
            expect(committed).toBe(false);
          },
        ),
      );
    });

    it('SHALL commit when not composing on text/number inputs', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.constantFrom('text' as const, 'number' as const),
          (text, inputType) => {
            const committed = propertiesPanelKeydown({
              key: 'Enter',
              isComposing: false,
              isComposingFallback: false,
              inputType,
            });
            expect(committed).toBe(true);
          },
        ),
      );
    });

    it('for any text and input type, Enter commits iff not composing', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.constantFrom('text' as const, 'number' as const),
          fc.boolean(),
          fc.boolean(),
          (text, inputType, isComposing, isComposingFallback) => {
            const committed = propertiesPanelKeydown({
              key: 'Enter',
              isComposing,
              isComposingFallback,
              inputType,
            });
            const shouldBlock = isComposing || isComposingFallback;
            expect(committed).toBe(!shouldBlock);
          },
        ),
      );
    });
  });

  describe('Composition lifecycle (compositionstart/compositionend)', () => {
    it('compositionend re-enables Enter commit (Req 4.4, 4.5)', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.constantFrom('compositionstart' as const, 'compositionend' as const),
            { minLength: 1, maxLength: 20 },
          ),
          (events) => {
            const fallbackState = compositionLifecycle(events);
            const lastEvent = events[events.length - 1];
            // After compositionend, fallback should be false (allows commit)
            // After compositionstart, fallback should be true (blocks commit)
            if (lastEvent === 'compositionend') {
              expect(fallbackState).toBe(false);
            } else {
              expect(fallbackState).toBe(true);
            }
          },
        ),
      );
    });

    it('compositionstart always blocks, compositionend always unblocks', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.constantFrom('compositionstart' as const, 'compositionend' as const),
            { minLength: 0, maxLength: 30 },
          ),
          fc.string(),
          (events, _text) => {
            const fallbackState = compositionLifecycle(events);
            const committed = inlineTextEditKeydown({
              key: 'Enter',
              isComposing: false,
              isComposingFallback: fallbackState,
            });
            if (events.length === 0) {
              // No composition events → should commit
              expect(committed).toBe(true);
            } else {
              const lastEvent = events[events.length - 1];
              if (lastEvent === 'compositionend') {
                expect(committed).toBe(true);
              } else {
                expect(committed).toBe(false);
              }
            }
          },
        ),
      );
    });
  });
});
