# Design Document: Studio V2 Enhancements

## Overview

This document describes the technical design for five enhancements to the animation studio dev tooling: chart-editor BaseLayout integration, asset library animation presets (tracks/appearances), multi-select with marquee and batch operations, Korean IME composition bug fix, and stack/array/graph DFS animation upgrades. All changes target TypeScript modules in `src/dev-only/studio/`, one Astro page, and one static JSON file.

## Architecture

This feature set spans five areas of the animation studio dev tooling. Each enhancement modifies a different subsystem but shares the common TypeScript/Astro runtime and animation schema. The design follows the existing module boundaries: Astro pages for layout, `src/dev-only/studio/` modules for editor logic, and `src/animations/schema.ts` for data types.

```
┌──────────────────────────────────────────────────────┐
│  Astro Pages (BaseLayout Integration)                │
│    chart-editor.astro → wraps in BaseLayout          │
├──────────────────────────────────────────────────────┤
│  Studio Modules                                      │
│    assets.ts    → track/appearance presets            │
│    canvas.ts    → marquee selection, batch drag       │
│    main.ts      → Cmd+A, IME guards                  │
│    properties.ts→ IME composition guards             │
├──────────────────────────────────────────────────────┤
│  Animation Schema                                    │
│    schema.ts    → PropertyTrack, Appearance types     │
├──────────────────────────────────────────────────────┤
│  Static Assets                                       │
│    graph-dfs.json → DFS animation with tracks        │
└──────────────────────────────────────────────────────┘
```

---

## Components and Interfaces

### 1. Chart Editor BaseLayout Integration

**Current state:** `src/dev-only/chart-editor.astro` uses raw `<html>`, `<head>`, `<body>` tags with inline styles and script.

**Target state:** Wrap the entire page in `BaseLayout` (same pattern as `src/dev-only/studio.astro`), move inline styles to a CSS file or `<style>` block within the component, and keep the Chart.js `<script is:inline>` for client-side logic.

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---

<BaseLayout title="Chart.js Editor (dev)" description="차트 편집기" noIndex>
  <section class="chart-editor-shell" data-pagefind-ignore="all">
    <div class="chart-editor-layout">
      <!-- left panel: config -->
      <!-- right panel: preview -->
    </div>
  </section>
</BaseLayout>

<style>
  .chart-editor-shell {
    height: calc(100vh - var(--navbar-height, 56px));
    overflow: hidden;
  }
  .chart-editor-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    height: 100%;
  }
</style>
```

**Key decisions:**
- Use a CSS custom property `--navbar-height` (already defined by BaseLayout or measured at 56px) for the height calculation.
- The existing inline `<script is:inline>` block remains unchanged since Chart.js is loaded from CDN and manipulates a local canvas.
- The two-panel grid structure is preserved by moving it under a `.chart-editor-layout` class.

---

### 2. Asset Library Animation Presets (Tracks & Appearances)

**Current state:** `generate()` functions return `AnimationElement[]` with `tracks: []` and `appearances: []` (empty via `TRACK_FIELDS` constant).

**Target state:** Stack and Queue generators produce elements with populated `tracks` and `appearances` arrays demonstrating enqueue/dequeue and push/pop animations.

#### Interface Changes

No schema changes required — `PropertyTrack` and `Appearance` types already exist in `schema.ts`. The `BuiltinAsset.generate()` return type already includes `tracks` and `appearances` fields on each element.

#### Track Generation Strategy

For the **Queue** preset (enqueue animation):
```typescript
// Element entering from right side to its slot position
const enqueueTrack: PropertyTrack = {
  property: 'x',
  keyframes: [
    { time: 0, value: slotX + slotW * 2 },      // start offscreen right
    { time: defaultDuration * 0.6, value: slotX, ease: 'easeOut' },  // arrive at slot
  ],
};
```

For the **Stack** preset (push/pop):
```typescript
// Push: element descends from above into top slot
const pushTrack: PropertyTrack = {
  property: 'y',
  keyframes: [
    { time: 0, value: topY - slotH * 2 },        // above stack
    { time: defaultDuration * 0.5, value: topY, ease: 'easeOut' },  // lands in top
  ],
};

// Pop: top element rises out of stack
const popTrack: PropertyTrack = {
  property: 'y',
  keyframes: [
    { time: defaultDuration * 0.5, value: topY },
    { time: defaultDuration, value: topY - slotH * 2, ease: 'easeIn' },
  ],
};
```

**Default duration constant:** `const PRESET_DURATION = 3000;` (3 seconds, matching a typical animation duration for presets).

#### Appearance Generation

Elements that should only be visible during specific phases get `appearances`:
```typescript
const pushAppearance: Appearance = {
  start: 0,
  end: Math.floor(PRESET_DURATION * 0.5),
  entryMode: 'slide-down',
  entryDuration: 300,
};
```

---

### 3. Multi-Select (Cmd+A and Marquee)

**Current state:** Selection state supports multi-select (`{ kind: 'elements', elementIds: string[] }`). Canvas already renders selection outlines for multi-select. `toggleSelectionFor` exists in state module.

**Target state:** Add Cmd+A keyboard handler, implement marquee drag rectangle on canvas background, batch delete, and batch move.

#### 3.1 Select All (Cmd+A)

In `main.ts` keyboard handler:
```typescript
function handleSelectAll(e: KeyboardEvent): void {
  if (!(e.metaKey || e.ctrlKey) || e.key !== 'a') return;
  e.preventDefault();
  const def = getDef();
  if (!def) return;
  const visibleIds = getVisibleElementIds(def, getCurrentTime());
  if (visibleIds.length === 0) return;
  if (visibleIds.length === 1) {
    setSelection({ kind: 'element', elementId: visibleIds[0] });
  } else {
    setSelection({ kind: 'elements', elementIds: visibleIds });
  }
}
```

`getVisibleElementIds` filters elements based on their `appearances` at the current time — elements with no appearances are always visible; elements with appearances are visible only if `activeAppearance(el, time)` is non-null.

#### 3.2 Marquee Selection

In `canvas.ts`, detect mousedown on empty canvas background (no element hit):

```typescript
interface MarqueeState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

let marquee: MarqueeState | null = null;
```

On `mousedown` (no element hit, no shift):
- Store start coordinates in SVG space.
- On `mousemove`, update `currentX/currentY` and render a dashed rectangle overlay.
- On `mouseup`, compute intersection with all element bounding boxes, set selection.

**Intersection logic** (`intersectsMarquee`):
```typescript
function intersectsMarquee(
  elBbox: { x: number; y: number; w: number; h: number },
  marquee: { x: number; y: number; w: number; h: number },
): boolean {
  return !(
    elBbox.x + elBbox.w < marquee.x ||
    elBbox.x > marquee.x + marquee.w ||
    elBbox.y + elBbox.h < marquee.y ||
    elBbox.y > marquee.y + marquee.h
  );
}
```

#### 3.3 Batch Delete

In `main.ts` delete handler, extend to handle multi-select:
```typescript
const sel = getSelection();
if (sel.kind === 'elements') {
  for (const id of sel.elementIds) deleteElement(id);
}
```

#### 3.4 Batch Move (Drag)

In `canvas.ts` drag initiation, when dragging an element that's part of a multi-selection:
- Compute `extras: DragExtra[]` for all other selected elements.
- On `mousemove`, apply delta to all extras along with the primary element.
- The existing `DragState.extras` field already supports this pattern.

#### 3.5 Deselect on Empty Click

Already partially implemented. Ensure mousedown on empty area (without marquee drag intent) calls `setSelection({ kind: 'none' })`.

#### 3.6 Shift+Click Toggle

Use existing `toggleSelectionFor(elementId)` from state module on shift+click.

---

### 4. Korean IME Composition Bug Fix

**Current state:** Inline text editor (`startInlineTextEdit()` in `main.ts`) and properties panel inputs handle Enter keypresses without checking `e.isComposing`.

**Target state:** Guard all Enter keypress handlers with `e.isComposing` check.

#### Implementation Pattern

```typescript
// Guard pattern for keydown handlers
function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter') {
    if (e.isComposing) return; // IME still composing — ignore
    commitValue();
  }
}
```

**Affected locations:**
1. `startInlineTextEdit()` in `main.ts` — the foreignObject `<input>` keydown handler.
2. All text/number input `keydown` or `change` handlers in `properties.ts`.

**Event listeners to add:**
- `compositionstart` / `compositionend` are not strictly needed if we rely solely on `e.isComposing` (which is the modern, reliable approach). However, for defensive fallback on older browsers:

```typescript
let isComposingFallback = false;
input.addEventListener('compositionstart', () => { isComposingFallback = true; });
input.addEventListener('compositionend', () => { isComposingFallback = false; });

// In keydown:
if (e.isComposing || isComposingFallback) return;
```

---

### 5. Stack/Array/Graph DFS Animation Upgrades

#### 5.1 Stack Push/Pop Tracks

Covered by Section 2 design. The `stackGenerate` function will include:
- A "push element" (extra rect) with tracks animating `y` from above-stack to top-slot.
- A "pop element" (extra rect) with tracks animating `y` from top-slot to above-stack.
- Appearances controlling visibility phases.

#### 5.2 Array Checkmark Overlays

Add a `showCheckmarks` boolean parameter to `ARRAY_PARAMS`:
```typescript
{ kind: 'boolean', name: 'showCheckmarks', label: '체크마크 표시', default: false }
```

When enabled, generate one text element per cell positioned above the cell:
```typescript
if (showCheckmarks) {
  for (let i = 0; i < size; i++) {
    const checkEl: AnimationElement = {
      type: 'text',
      id: `a-${i}-chk`,
      name: `Check [${i}]`,
      x: cellCenterX,
      y: start.y - 15,
      content: '✓',
      fontSize: 16,
      fontWeight: 700,
      color: '#16a34a',
      textAnchor: 'middle',
      rotation: 0,
      appearances: [{
        start: (i + 1) * stepTime,
        end: PRESET_DURATION,
        entryMode: 'pop',
        entryDuration: 200,
      }],
      tracks: [],
    };
    out.push(checkEl);
  }
}
```

#### 5.3 Graph DFS Animation Replacement

Replace `public/animations/graph-dfs.json` with a track-based version:

**Node coloring strategy:**
- Unvisited: `#e0e7ff` (light indigo)
- Currently visiting: `#f59e0b` (amber)
- Visited: `#22c55e` (green)

Each node gets a `fill` track with keyframes matching DFS traversal timing:
```json
{
  "property": "fill",
  "keyframes": [
    { "time": 0, "value": "#e0e7ff" },
    { "time": 1000, "value": "#f59e0b" },
    { "time": 1500, "value": "#22c55e" }
  ]
}
```

A step-label text element uses a `content` track to show current operation:
```json
{
  "property": "content",
  "keyframes": [
    { "time": 0, "value": "DFS 시작" },
    { "time": 1000, "value": "방문: 1" },
    { "time": 2000, "value": "방문: 2" }
  ]
}
```

Stack visualization elements use appearances synchronized with push/pop timing.

---

## Data Models

No new data types are introduced. All changes use existing types from `schema.ts`:

| Type | Usage |
|------|-------|
| `PropertyTrack` | `{ property: string, keyframes: TrackKeyframe[] }` — used in asset presets |
| `TrackKeyframe` | `{ time: number, value: string\|number\|boolean, ease?: Ease }` |
| `Appearance` | `{ start, end, entryMode?, exitMode?, entryDuration?, exitDuration? }` |
| `Selection` | Extended usage of existing `{ kind: 'elements', elementIds: string[] }` |
| `AnimationElement` | All element types already have `tracks` and `appearances` fields |

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| `generate()` called with invalid params | Param helpers (`num`, `str`, `bool`) clamp/fallback to defaults |
| Keyframe time exceeds duration | Clamp to `[0, PRESET_DURATION]` at generation time |
| Marquee drag with zero area | Ignore (no selection change) |
| Batch delete on empty selection | No-op |
| IME `isComposing` undefined (old browser) | Fallback to `compositionstart/end` flag |
| Graph DFS JSON parse failure | Handled by existing animation loader with fallback |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Asset generation always includes tracks and appearances

*For any* BuiltinAsset and *for any* valid parameter record, calling `generate(params)` SHALL return an array of `AnimationElement` objects where every element contains a `tracks` array and an `appearances` array (both may be empty but must be present).

**Validates: Requirements 2.1**

### Property 2: Track keyframe times are bounded

*For any* BuiltinAsset and *for any* valid parameter record, all `TrackKeyframe.time` values within the generated elements' tracks SHALL satisfy `0 <= time <= PRESET_DURATION`.

**Validates: Requirements 2.5**

### Property 3: Select-all captures all visible elements

*For any* animation definition with N elements where K are visible at the current time (based on their appearances), triggering select-all SHALL produce a Selection containing exactly those K element IDs.

**Validates: Requirements 3.1**

### Property 4: Marquee intersection correctness

*For any* set of elements with axis-aligned bounding boxes and *for any* marquee rectangle (x, y, width, height > 0), the set of selected elements SHALL be exactly those whose bounding box has non-empty intersection with the marquee rectangle.

**Validates: Requirements 3.2**

### Property 5: Batch delete removes exactly the selected elements

*For any* animation definition and *for any* subset of element IDs marked as selected, batch delete SHALL result in an element list containing exactly the elements whose IDs were NOT in the selected set, preserving their order.

**Validates: Requirements 3.3**

### Property 6: Batch move preserves relative positions

*For any* set of selected elements with positions and *for any* drag delta (dx, dy), after batch move every selected element's position SHALL be offset by exactly (dx, dy), and the pairwise distances between selected elements SHALL remain unchanged.

**Validates: Requirements 3.4**

### Property 7: Shift-click toggles exactly one element

*For any* current selection state (containing a set S of element IDs) and *for any* element ID `e`, after shift-click on `e`: if `e ∈ S` then the new selection is `S \ {e}`, otherwise the new selection is `S ∪ {e}`.

**Validates: Requirements 3.7**

### Property 8: IME composition guards Enter commits

*For any* text input value, if a `keydown` event has `key === 'Enter'` and `isComposing === true`, the input handler SHALL NOT commit the value (no state change occurs). If `isComposing === false`, the handler SHALL commit the value.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

### Property 9: Array checkmark count matches cell count

*For any* array size N (1 ≤ N ≤ 20) with checkmarks enabled, the generated output SHALL contain exactly N checkmark overlay elements, each with an `appearances` array containing at least one appearance whose `start` time is sequentially ordered (checkmark i appears at or after checkmark i-1).

**Validates: Requirements 5.3, 5.4**

---

## Testing Strategy

### Property-Based Tests (vitest + fast-check)

| Property | Generator Strategy |
|----------|-------------------|
| 1, 2 | Generate random valid params for each BuiltinAsset using param specs |
| 3 | Generate random AnimationDef with varied element counts and appearances |
| 4 | Generate random element positions + random marquee rectangle |
| 5 | Generate random element lists + random selection subsets |
| 6 | Generate random selected positions + random (dx, dy) deltas |
| 7 | Generate random selection sets + random target element |
| 8 | Generate random text strings + boolean isComposing flag |
| 9 | Generate random N (1-20) for array size |

### Example-Based Tests

- Chart editor renders within BaseLayout (structural assertion)
- Queue generate with defaults includes enqueue track
- Stack generate with defaults includes push/pop tracks
- Graph DFS JSON has fill tracks with 3 distinct colors
- Graph DFS stack appearances synchronized with node visit timing

### Integration Tests

- Asset insertion shows tracks in timeline panel
- Marquee rectangle renders during drag (visual DOM check)
- Entry/exit transitions render during playback
