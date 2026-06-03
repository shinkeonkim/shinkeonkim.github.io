/**
 * Focus capture / restore for panels that rebuild their DOM via innerHTML on
 * every state change. Without this, typing a character into an input fires a
 * state update → subscribe() → render() → innerHTML rewrite → the focused
 * input is destroyed mid-keystroke and focus is lost.
 *
 * Usage:
 *
 *   function render(): void {
 *     if (!panelEl) return;
 *     const snap = captureFocusWithin(panelEl);
 *     renderInner();                  // existing innerHTML-rewriting body
 *     restoreFocusWithin(panelEl, snap);
 *   }
 *
 * The snapshot is keyed on a stable attribute (preferring `data-prop-key`,
 * falling back to `id`). Inputs that share the same `data-prop-key` are
 * disambiguated by `type` (e.g. color field has two inputs: type="color"
 * and type="text").
 */

export interface FocusSnapshot {
  selector: string;
  selectionStart: number | null;
  selectionEnd: number | null;
}

export function captureFocusWithin(root: HTMLElement): FocusSnapshot | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !root.contains(active)) return null;
  const selector = focusSelectorFor(active);
  if (!selector) return null;
  let selectionStart: number | null = null;
  let selectionEnd: number | null = null;
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
    // selectionStart / setSelectionRange throw DOMException on input
    // types color / number / range / date / etc.; null means "skip caret restore".
    try {
      selectionStart = active.selectionStart;
      selectionEnd = active.selectionEnd;
    } catch { /* see note above */ }
  }
  return { selector, selectionStart, selectionEnd };
}

export function restoreFocusWithin(root: HTMLElement, snap: FocusSnapshot | null): void {
  if (!snap) return;
  let target: HTMLElement | null;
  try {
    target = root.querySelector<HTMLElement>(snap.selector);
  } catch {
    return;
  }
  if (!target) return;
  try {
    target.focus({ preventScroll: true });
  } catch {
    return;
  }
  if (
    (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) &&
    snap.selectionStart !== null &&
    snap.selectionEnd !== null
  ) {
    try {
      target.setSelectionRange(snap.selectionStart, snap.selectionEnd);
    } catch { /* same DOMException as capture above */ }
  }
}

function focusSelectorFor(el: HTMLElement): string | null {
  const propKey = el.dataset.propKey;
  if (propKey !== undefined) {
    const tag = el.tagName.toLowerCase();
    const type = el instanceof HTMLInputElement ? el.type : '';
    const keyEsc = cssEscape(propKey);
    if (type) return `${tag}[type="${cssEscape(type)}"][data-prop-key="${keyEsc}"]`;
    return `${tag}[data-prop-key="${keyEsc}"]`;
  }
  if (el.id) return `#${cssEscape(el.id)}`;
  return null;
}

function cssEscape(s: string): string {
  const fn = (globalThis as { CSS?: { escape?: (s: string) => string } }).CSS?.escape;
  if (typeof fn === 'function') return fn(s);
  // Fallback escape (sufficient for our keys — alphanumerics + dots + dashes).
  return s.replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, '\\$&');
}
