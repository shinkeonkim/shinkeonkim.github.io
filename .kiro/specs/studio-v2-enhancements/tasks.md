# Implementation Plan: Studio V2 Enhancements

## Overview

Five incremental enhancements to the animation studio dev tooling: chart-editor BaseLayout integration, asset library track/appearance presets, multi-select with marquee and batch operations, Korean IME composition fix, and DFS animation upgrade. Each task builds on shared TypeScript modules in `src/dev-only/studio/` and the animation schema.

## Tasks

- [x] 1. Chart Editor BaseLayout Integration
  - [x] 1.1 Wrap chart-editor.astro in BaseLayout
    - Import `BaseLayout` from `../../layouts/BaseLayout.astro`
    - Remove raw `<html>`, `<head>`, `<body>` tags
    - Wrap content in `<BaseLayout title="Chart.js Editor (dev)" description="차트 편집기" noIndex>`
    - Move the Chart.js CDN script to remain as `<script is:inline>` within the component
    - Set `.chart-editor-shell` height to `calc(100vh - var(--navbar-height, 56px))` with `overflow: hidden`
    - Preserve the two-panel grid layout under `.chart-editor-layout` with `grid-template-columns: 1fr 1fr`
    - Move inline `<style>` content into a scoped `<style>` block (remove `:root` dark-mode overrides that BaseLayout handles)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Asset Library Animation Presets (Tracks & Appearances)
  - [x] 2.1 Add PRESET_DURATION constant and track helper utilities in assets.ts
    - Add `const PRESET_DURATION = 3000;` at module level
    - Create helper function to build `PropertyTrack` objects with clamped keyframe times
    - Create helper function to build `Appearance` objects with validated start/end times
    - _Requirements: 2.5_

  - [x] 2.2 Add tracks and appearances to Queue generate function
    - Modify `queueGenerate()` to produce elements with enqueue animation tracks (x property, sliding from offscreen to slot position)
    - Add appearance with `entryMode: 'slide-right'` for the enqueue element
    - Ensure keyframe times stay within `[0, PRESET_DURATION]`
    - _Requirements: 2.1, 2.2, 2.5_

  - [x] 2.3 Add tracks and appearances to Stack generate function
    - Modify `stackGenerate()` to produce push animation tracks (y property, element descending from above to top slot)
    - Add pop animation tracks (y property, element rising from top slot to above stack)
    - Add appearances controlling visibility phases for push/pop elements
    - _Requirements: 2.1, 2.3, 2.5_

  - [x] 2.4 Write property tests for asset generation (Properties 1, 2)
    - **Property 1: Asset generation always includes tracks and appearances**
    - **Property 2: Track keyframe times are bounded by [0, PRESET_DURATION]**
    - Use fast-check to generate random valid params for each BuiltinAsset
    - Assert every generated element has `tracks` and `appearances` arrays present
    - Assert all keyframe time values satisfy `0 <= time <= PRESET_DURATION`
    - **Validates: Requirements 2.1, 2.5**

- [x] 3. Multi-Select: Cmd+A, Marquee, Batch Operations
  - [x] 3.1 Implement Cmd+A select-all handler in main.ts
    - Add `handleSelectAll` function checking `(e.metaKey || e.ctrlKey) && e.key === 'a'`
    - Implement `getVisibleElementIds(def, time)` helper that filters elements by current appearances
    - Set selection to `{ kind: 'elements', elementIds }` for multiple visible elements
    - Wire into the keyboard event listener in `initStudio()`
    - _Requirements: 3.1, 3.8_

  - [x] 3.2 Implement marquee selection in canvas.ts
    - Add `MarqueeState` interface (`startX`, `startY`, `currentX`, `currentY`)
    - On mousedown on empty canvas background (no element hit, no shift key), start marquee
    - On mousemove during marquee, update coordinates and render a dashed rectangle SVG overlay
    - On mouseup, compute bounding box intersection with all elements using `intersectsMarquee()`
    - Set selection to matching element IDs; clear marquee state
    - Skip selection change if marquee area is zero
    - _Requirements: 3.2, 3.5, 3.6, 3.8_

  - [x] 3.3 Implement batch delete for multi-selection in main.ts
    - Extend the existing Delete/Backspace handler to check `sel.kind === 'elements'`
    - Iterate over `sel.elementIds` and call `deleteElement(id)` for each
    - Clear selection after batch delete
    - _Requirements: 3.3_

  - [x] 3.4 Implement batch move (drag) for multi-selection in canvas.ts
    - When dragging an element that is part of a multi-selection, use `collectDragExtras` to include all selected elements
    - On mousemove, apply the same delta (dx, dy) to all extras preserving relative positions
    - Ensure the existing `DragState.extras` field is populated for all selected elements
    - _Requirements: 3.4_

  - [x] 3.5 Implement Shift+Click toggle in canvas.ts
    - In `onCanvasClick`, detect shift key held and call `toggleSelectionFor(sel, elementId)`
    - Update selection state with the toggled result
    - _Requirements: 3.7, 3.8_

  - [x] 3.6 Write property tests for multi-select logic (Properties 3–7)
    - **Property 3: Select-all captures all visible elements**
    - **Property 4: Marquee intersection correctness**
    - **Property 5: Batch delete removes exactly selected elements**
    - **Property 6: Batch move preserves relative positions**
    - **Property 7: Shift-click toggles exactly one element**
    - Use fast-check to generate random element sets, positions, marquee rects, and selection subsets
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.7**

- [x] 4. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Korean IME Composition Bug Fix
  - [x] 5.1 Add isComposing guard to startInlineTextEdit in main.ts
    - In the `<input>` keydown handler inside `startInlineTextEdit()`, add `if (e.isComposing) return;` before processing Enter
    - Add `compositionstart`/`compositionend` listeners as fallback flag (`isComposingFallback`)
    - Guard: `if (e.isComposing || isComposingFallback) return;`
    - _Requirements: 4.1, 4.2, 4.4, 4.6_

  - [x] 5.2 Add isComposing guard to properties panel inputs in properties.ts
    - In `onInput` and any keydown handlers that commit on Enter, add `if (e.isComposing) return;`
    - Add `compositionstart`/`compositionend` fallback listeners for text inputs
    - Ensure `compositionend` correctly re-enables Enter commit behavior
    - _Requirements: 4.3, 4.5_

  - [x] 5.3 Write unit tests for IME guard behavior (Property 8)
    - **Property 8: IME composition guards Enter commits**
    - Test that keydown with `isComposing: true` does not trigger commit
    - Test that keydown with `isComposing: false` does trigger commit
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

- [x] 6. Stack/Array Asset Upgrade and Graph DFS Replacement
  - [x] 6.1 Add checkmark overlay to Array generate function in assets.ts
    - Add `showCheckmarks` boolean param to `ARRAY_PARAMS` (default: `false`)
    - When enabled, generate one text element per cell with `content: '✓'` positioned above the cell
    - Add sequential appearances to each checkmark (checkmark i appears at `(i+1) * stepTime`)
    - _Requirements: 5.3, 5.4_

  - [x] 6.2 Replace public/animations/graph-dfs.json with track-based version
    - Create new DFS animation with graph nodes that use `fill` property tracks
    - Use three distinct colors: unvisited `#e0e7ff`, visiting `#f59e0b`, visited `#22c55e`
    - Add `content` track on step-label text element showing current operation (e.g., "방문: 1")
    - Include stack visualization elements with appearances synchronized to push/pop timing
    - Synchronize node fill keyframes with DFS traversal order
    - _Requirements: 5.5, 5.6, 5.7, 5.8_

  - [x] 6.3 Write property test for array checkmark generation (Property 9)
    - **Property 9: Array checkmark count matches cell count**
    - Use fast-check to generate random array sizes (1–20) with checkmarks enabled
    - Assert exactly N checkmark overlay elements are produced
    - Assert appearance start times are sequentially ordered
    - **Validates: Requirements 5.3, 5.4**

- [x] 7. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Task 6 (DFS) depends on Task 2 (asset tracks) since DFS uses the upgraded stack/array assets with tracks
- The design uses TypeScript throughout, all implementations target `.ts` and `.astro` files
- The `--navbar-height` CSS custom property is assumed at 56px as per the existing BaseLayout convention

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "5.1", "5.2"] },
    { "id": 1, "tasks": ["2.2", "2.3", "3.1", "3.5", "5.3"] },
    { "id": 2, "tasks": ["2.4", "3.2", "3.3"] },
    { "id": 3, "tasks": ["3.4", "3.6", "6.1"] },
    { "id": 4, "tasks": ["6.2", "6.3"] }
  ]
}
```
