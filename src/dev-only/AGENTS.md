# Dev-only tooling — agent checklist

This directory holds the studio (`/_studio`) and editor (`/_editor`) UIs.
They are dev-only: shipped only when running `bun dev`, never built into the
production blog.

## Recurring bug class to check on every change here

### Input focus loss on subscribe-driven rerender

**Symptom**: user types one character in an input (title, description,
duration, element x/y/fill/fontSize, etc.) — focus is lost, next keystroke
goes nowhere. Reported multiple times.

**Cause**: a panel calls `subscribe(render)` (from `state.ts`). User
types → `oninput` → `apply()` → state mutator → `subscribe` callbacks
fire **synchronously** → `render()` → `panel.innerHTML = ...` destroys
the focused input mid-keystroke. Browser is left with no focused element.

**Two valid mitigations**:

1. **Per-input guard** (works for a fixed set of named inputs, like the
   toolbar in `studio/main.ts:reflectState`):

   ```ts
   if (document.activeElement !== ui.titleInput) {
     ui.titleInput.value = def.title;
   }
   ```

2. **Capture/restore wrapper** (works for panels with many dynamic inputs,
   like `studio/properties.ts`). Use `studio-focus.ts`:

   ```ts
   import { captureFocusWithin, restoreFocusWithin } from './studio-focus';

   function render(): void {
     if (!panelEl) return;
     const snap = captureFocusWithin(panelEl);
     renderInner();
     restoreFocusWithin(panelEl, snap);
   }
   ```

   Inputs in the panel must carry a stable `data-prop-key` (or `id`) so
   the restore step can re-target the new DOM node.

**Do NOT**:
- Switch the panel from synchronous to async/debounced rerender as the
  fix. That just hides the bug; arrow-key navigation, undo/redo and
  programmatic state changes still need an up-to-date panel.
- Strip the `data-prop-key` attributes — they are the stable identity
  used by focus restore.

## Mandatory verification step before claiming any dev-only UI work done

Run this end-to-end with the running dev server before committing changes
to anything under `src/dev-only/studio/` or `src/dev-only/editor/` that
touches a `render(...)` function, a `subscribe(...)` callback, or any
`innerHTML = ...` / `.value = ...` / `.textContent = ...` on a container
that holds form inputs:

1. Load `/_studio` (or the affected editor page) in a real browser via
   the `playwright` skill — not just a `curl` HTTP 200 check.
2. With **no element selected** so the meta panel is visible:
   - Focus the **title** field in the right-side properties panel.
   - Type at least 3 characters in one keystroke burst (e.g.
     `browser_type` with `slowly: true`). All characters must appear in
     order. If only the first character is accepted → focus loss bug.
   - Repeat for **description** and **duration**.
3. Select any element on the canvas, then:
   - Type 3+ characters into **x** (number input).
   - Type 3+ characters into **fill** (color field's text variant).
   - For a text element, type 3+ characters into **content**.
4. Open the new-animation dialog and type 3+ chars in the ID + title
   fields (these are NOT subscribe-driven but the dialog reopen logic
   could regress them).

If any of these regresses, the relevant `render()` either lost its
`captureFocusWithin` / `restoreFocusWithin` pair, or a new input was
added that doesn't carry a `data-prop-key`. Fix before commit.

## Module map (dev-only)

- `studio/` — animation studio. Entry: `studio/main.ts` (`initStudio`).
  Subscribe-driven panels: `properties.ts`, `timeline.ts`,
  `element-list.ts`, `canvas.ts`. Only `properties.ts` currently holds
  user-editable text/number inputs; if you add inputs to any of the
  others, wire them through `studio-focus.ts`.
- `editor/` — markdown editor. Entry: `editor/main.ts` (`initEditor`).
  The textarea is the only persistent input; its content is owned by the
  user and never overwritten on state change.
