# Animation Creation Context

## Goal

Create REAL animation JSON files (not placeholders) for each Unknown-To-Wellknown wiki topic. Each JSON visualizes the algorithm's core idea in a single 10-15 second loop.

## Output Location

`/Users/koa/004-Projects/0001-Resume/100-github-io/public/animations/<slug>.json`

`<slug>` matches the wiki MDX file's `anim:<slug>` reference (same name as the MDX file, without extension).

## Schema (essentials)

```json
{
  "version": 4,
  "id": "<slug-matching-filename>",
  "title": "<topic name, short clause>",
  "description": "<1-2 sentence Korean description>",
  "category": "algorithm",
  "tags": ["algorithm", "<subcategory>"],
  "duration": 12000,
  "canvas": { "width": 900, "height": 500, "background": "transparent" },
  "elements": [ /* see below */ ],
  "chapters": [ /* see below */ ],
  "effects": [ /* see below */ ],
  "settings": { "loop": true, "autoplay": true, "showCaption": false, "showChapterList": true }
}
```

### Element types (use these only)

```json
// text (titles, labels, step counter)
{ "type": "text", "id": "<id>", "rotation": 0, "x": 450, "y": 28,
  "content": "...", "fontSize": 20, "fontWeight": 700,
  "color": "#18181b", "textAnchor": "middle",
  "appearances": [{ "start": 0, "end": 12000 }], "tracks": [] }

// rect (cells, boxes, nodes)
{ "type": "rect", "id": "<id>", "rotation": 0, "x": 100, "y": 100,
  "width": 80, "height": 80, "fill": "#dbeafe", "stroke": "#2563eb",
  "strokeWidth": 2, "cornerRadius": 8,
  "label": "5", "labelColor": "#1e3a8a", "labelSize": 18,
  "subtitle": "optional",
  "appearances": [{ "start": 0, "end": 12000 }], "tracks": [] }

// circle (graph nodes, points)
{ "type": "circle", "id": "<id>", "rotation": 0, "cx": 100, "cy": 100, "r": 25,
  "fill": "#dbeafe", "stroke": "#2563eb", "strokeWidth": 2,
  "label": "A", "labelColor": "#1e3a8a", "labelSize": 14,
  "appearances": [{ "start": 0, "end": 12000 }], "tracks": [] }

// arrow (edges, transitions)
{ "type": "arrow", "id": "<id>", "rotation": 0,
  "fromId": "node-a", "toId": "node-b",
  "fromAnchor": "right", "toAnchor": "left",
  "stroke": "#7c3aed", "strokeWidth": 2,
  "label": "optional", "labelColor": "#5b21b6",
  "appearances": [{ "start": 0, "end": 12000 }], "tracks": [] }

// line (boundaries, separators, fixed lines)
{ "type": "line", "id": "<id>", "rotation": 0,
  "x1": 0, "y1": 100, "x2": 900, "y2": 100,
  "stroke": "#cbd5e1", "strokeWidth": 1,
  "appearances": [{ "start": 0, "end": 12000 }], "tracks": [] }
```

### Animation tracks (animate properties over time)

A `track` defines keyframes for a single property of an element. Useful for `content` (text), `fill`/`stroke` (colors), positions:

```json
"tracks": [
  { "property": "content", "keyframes": [
    { "time": 0, "value": "Step 1, initial state" },
    { "time": 4000, "value": "Step 2, pivot chosen" },
    { "time": 8000, "value": "Step 3, partition done" }
  ]},
  { "property": "fill", "keyframes": [
    { "time": 0, "value": "#dbeafe" },
    { "time": 4000, "value": "#fde68a" },
    { "time": 8000, "value": "#bbf7d0" }
  ]}
]
```

### Appearances (when an element is visible)

An element can have multiple `appearances` (intervals). It is visible during each interval. Outside intervals it is hidden.

```json
"appearances": [{ "start": 4000, "end": 8000, "entryMode": "fade", "entryDuration": 400 }]
```

`entryMode`: `instant` | `fade` | `slide-left` | `slide-right` | `slide-up` | `slide-down` | `zoom` | `pop`
`exitMode`: same options. `exitDuration` mirrors entry.

### Chapters (navigation labels)

```json
"chapters": [
  { "id": "s1", "time": 0, "label": "초기 상태", "subtitle": "" },
  { "id": "s2", "time": 4000, "label": "Pivot 선택", "subtitle": "" }
]
```

### Effects (visual emphasis)

```json
"effects": [
  { "type": "highlight", "id": "e1", "elementId": "<element-id>", "time": 4000, "color": "#facc15", "duration": 800 },
  { "type": "pulse", "id": "e2", "elementId": "<element-id>", "time": 6000, "scale": 1.15, "duration": 500 },
  { "type": "flow", "id": "e3", "elementId": "<arrow-id>", "time": 8000, "color": "#7c3aed", "particles": 5, "radius": 4, "duration": 1000 }
]
```

## Hard constraints

- `id` for each element MUST be unique within the file, lowercase, `[a-z0-9_-]+`.
- All `appearances` must satisfy `start < end`, both within `[0, duration]`.
- All track `time` values within `[0, duration]`.
- For `arrow` / `line` between elements: use `fromId` + `toId` (NOT raw coordinates) so positions stay linked.
- `version` MUST be 4.
- `category` MUST be `algorithm`.
- File MUST be valid JSON (use a JSON validator or `jq . < file` mentally).
- NO em-dash (U+2014). Use `,`, `:`, `/`, `-` instead.
- All Korean prose in `content`, `title`, `description`, `label`, `subtitle`.

## Style guidance

### Color palette

| Purpose | Fill | Stroke | Text |
|:---|:---|:---|:---|
| Neutral / default | `#e2e8f0` | `#475569` | `#0b0b0f` |
| Info / blue | `#dbeafe` | `#2563eb` | `#1e3a8a` |
| Success / green | `#dcfce7` | `#16a34a` | `#14532d` |
| Active / yellow | `#fef9c3` | `#eab308` | `#713f12` |
| Warning / red | `#fee2e2` | `#dc2626` | `#7f1d1d` |
| Accent / purple | `#ede9fe` | `#7c3aed` | `#5b21b6` |
| Dark / code | `#1e293b` | `#475569` | `#e2e8f0` |

### Layout (900x500 canvas)

- Title: y=28, fontSize=20, fontWeight=700
- Step counter: y=58, fontSize=13, color=#6366f1
- Main visualization area: y=100~400
- Summary / verdict: y=440~480

### Duration

- Default 10000~15000 ms
- 4~6 chapters typical
- Keep individual scene 2000~3500 ms

## Visualization patterns by topic family

| Topic family | Visualization |
|:---|:---|
| DP optimization (Slope, Aliens, Kitamasa) | function graph / state space / monotone heap |
| Segment tree variants | tree structure with active node + tag |
| Tree DS (Link/Cut, BBST, Permutation) | tree morphing (rotate, split, merge) |
| Graph (Push-Relabel, Dominator, MST, Planar) | small graph (4~6 nodes) with edge flow / dominator path |
| String (SAM, eerTree, Run) | character sequence with state automaton |
| Math / polynomial | function plot / butterfly diagram / matrix |
| Number theory (Mobius) | divisor lattice / sieve table |
| Problem type (Minkowski, Sweep) | 2D plane with events |
| Optimization (Fast I/O, Bitset, SIMD, Barrett) | code snippet + timing comparison |

## Minimal template you can mutate

See `/Users/koa/004-Projects/0001-Resume/100-github-io/public/animations/java-treemap-rbtree.json` (50 lines, 5 chapters, ~12 elements). Use this as the structural skeleton. Adjust positions / labels / colors per algorithm.

## What to AVOID

- DO NOT create 1000+ line monsters. Target 50~150 lines per file.
- DO NOT animate physics-style motion. Use discrete state changes (appearances + content tracks).
- DO NOT hallucinate schema fields not listed here.
- DO NOT use `image` (no external assets needed).
- DO NOT skip `appearances` or `tracks` (use empty array `[]` if none).

## Reporting back

When done with your batch:

```
<slug>.json -> N lines (chapters: K, elements: M)
```

NO file contents in your reply.
