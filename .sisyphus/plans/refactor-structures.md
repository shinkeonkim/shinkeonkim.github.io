# Refactor Structures - feature/refactor-structures

## Goal

Apply a Feature-Sliced Design (FSD)-inspired layered architecture to the Astro
blog so:

1. The blog engine (content collections + Astro pipelines + reusable widgets) can
   be extracted to a standalone package later without rewriting imports.
2. Every source file stays under **300 lines** (data tables and Astro page lists
   are exempt where splitting is artificial; documented case-by-case below).
3. Cross-cutting code (config, types, utilities) lives in a single `shared/`
   layer and is referenced through the `@/` path alias only.
4. Existing design, behavior, and dev-only tooling (`/_editor`, `/_studio`,
   `/_chart-editor`) keep working byte-for-byte at runtime.
5. Each logical unit of work is its own commit on `feature/refactor-structures`,
   with type-check + tests green on every commit.

## Out-of-scope (explicitly excluded this PR)

- Behavioral or visual changes to any page.
- Astro version upgrade, dependency upgrades, ESLint rule changes.
- Content (`src/content/`, `_posts/`, `public/animations/*.json`) edits.
- Test additions beyond updating existing tests for new import paths.
- Dev-only studio rewrites (focus-loss bug class in
  [src/dev-only/AGENTS.md](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/dev-only/AGENTS.md)
  means we **move** files into subfolders but never restructure
  `subscribe(render)` or `innerHTML = ...` patterns inside them).

## Baseline (verified before any change)

- `bun astro check` , 0 errors, 0 warnings, 16 hints (all pre-existing
  `ts(6133)` unused-name warnings in dev-only test files).
- `bun run test` , 9 files, 119 tests pass.
- `git status` , clean working tree on `master` at `f8a840d`.

## Current pain points (audited from
`find src -type f | xargs wc -l | sort -rn`)

| Path | Lines | Issue |
| --- | --- | --- |
| `src/dev-only/studio/icon-data.ts` | 2016 | Pure data table (kept whole, exempt). |
| `src/dev-only/studio/canvas.ts` | 1216 | Mixed concerns: hit-test, pan/zoom, drag, render. |
| `src/dev-only/studio/main.ts` | 742 | Entrypoint + toolbar + reflectState + setup. |
| `src/components/SearchModal.astro` | 695 | Single component: command palette + tag + help + pagefind + style. |
| `src/layouts/PostLayout.astro` | 642 | Frontmatter logic + breadcrumbs + cover + series UI + style. |
| `src/dev-only/studio/properties.ts` | 623 | Subscribe-driven panel; defer (focus-loss risk). |
| `src/dev-only/editor/main.ts` | 600 | Editor entry + toolbar + autosave wiring. |
| `src/dev-only/studio/state.ts` | 583 | Mutators + history wiring + selectors. |
| `src/dev-only/chart-editor.astro` | 563 | Page entry. |
| `src/components/Hero3D.tsx` | 561 | Single React component: laptop + screen + words. |
| `src/dev-only/editor/git-panel.ts` | 556 | Subscribe-driven (focus-loss class); defer rewrite. |
| `src/dev-only/api-render.ts` | 537 | API handler. |
| `src/components/AnimationLoader.astro` | 535 | Inline React via `createElement`; player + modal + lazy. |
| `src/pages/animations/[...page].astro` | 508 | Page + filter UI + sort UI + inline style. |
| `src/animations/schema.ts` | 490 | Zod schemas + types + interpolation helpers + active phase logic. |

> The dev-only files marked "focus-loss" risk per
> [src/dev-only/AGENTS.md](file:///Users/koa/004-Projects/0001-Resume/100-github-io/src/dev-only/AGENTS.md)
> get **directory moves only** in this refactor. Internal splits land in a
> separate follow-up PR with the full Playwright re-verification flow.

## Target layout

```
src/
├── shared/                            # FSD shared layer
│   ├── config/                        # was: consts.ts
│   │   ├── site.ts                    # SITE_TITLE/DESCRIPTION/URL/AUTHOR/LOCALE
│   │   ├── seo.ts                     # SITE_KEYWORDS, SITE_SOCIAL
│   │   ├── nav.ts                     # NAV_ITEMS, EXTERNAL_NAV_ITEMS, DEV_NAV_ITEMS
│   │   ├── pagination.ts              # POSTS_PER_PAGE, NOTES_PER_PAGE, WIKI_PER_PAGE, ANIMATIONS_PER_PAGE
│   │   ├── editor.ts                  # FILE_UPLOAD_MAX_BYTES, EDITOR_AUTOSAVE_INTERVAL_MS, WIKILINK_AUTOCOMPLETE_MAX
│   │   ├── graph.ts                   # MAX_GRAPH_NODES
│   │   └── index.ts                   # barrel re-export to preserve `from '@/consts'` semantics
│   ├── lib/                           # was: lib/ flattened
│   │   ├── content/                   # content-queries, content-graph, related, taxonomy, slug-map, reading-time, frontmatter, notes
│   │   ├── seo/                       # schema, feed, og-image, sitemap-images.mjs, sitemap-lastmod.mjs
│   │   ├── references/                # bibtex, references
│   │   ├── external/                  # giscus-counts, url-preview, external-profiles
│   │   └── modulepreload-integration.mjs
│   ├── types/                         # NEW , extracted shared types
│   │   ├── content.ts                 # CollectionEntry aliases, Post/Note/Wiki types
│   │   ├── graph.ts                   # GraphNode, GraphLink, GraphNodeKind, GraphLinkKind
│   │   └── index.ts
│   ├── ui/                            # tiny reusable Astro primitives
│   │   ├── BackToTop.astro
│   │   ├── Pagination.astro
│   │   ├── ImageLightbox.astro
│   │   ├── KatexCopy.astro
│   │   ├── CodeCopy.astro
│   │   ├── ReadingProgress.astro
│   │   └── TopProgressBar.astro
│   └── analytics/
│       ├── GoogleAnalytics.astro
│       ├── GaEvents.astro
│       └── ServiceWorkerRegister.astro
├── entities/                          # FSD entities (content domain + per-entity UI)
│   ├── post/
│   │   └── ui/
│   │       ├── AuthorCard.astro
│   │       └── RelatedPosts.astro
│   ├── note/
│   │   └── ui/
│   │       ├── NoteCard.astro
│   │       └── NoteCardScript.astro
│   ├── wiki/
│   │   └── ui/                        # empty initially, scaffold only
│   ├── source/
│   │   └── ui/
│   │       └── ReferencesBlock.astro
│   └── animation/
│       ├── engine/                    # was: src/animations/
│       │   ├── engine.tsx             # main loop
│       │   ├── render-elements.tsx    # was engine-render-elements.tsx (renamed for brevity)
│       │   ├── phase-styles.ts        # was engine-phase-styles.*
│       │   ├── markers.ts             # was engine-markers.*
│       │   └── schema/                # split of schema.ts (490 → 4 files ≤200)
│       │       ├── elements.ts        # rect/circle/line/arrow/text/image/path/polygon/group/code element schemas
│       │       ├── effects.ts         # highlight/pulse/flow effect schemas
│       │       ├── document.ts        # chapter, animationDef root schema
│       │       └── runtime.ts         # easeApply, lerp, parseColor, computeSnapshot, activeAppearance, currentChapter, activeEffects, key helpers
│       └── ui/
│           ├── AnimationLoader.astro  # CSS + bootstrap split out
│           ├── AnimationPlayer.tsx    # NEW , extracted PlayerWrapper React tree
│           └── AnimationBacklinks.astro
├── features/                          # user-facing features
│   ├── search/
│   │   ├── ui/
│   │   │   ├── SearchButton.astro
│   │   │   └── SearchModal.astro      # shell only , markup, opens dialog, mounts script
│   │   ├── lib/
│   │   │   ├── pagefind.ts            # loadPagefind, doSearch
│   │   │   ├── modes.ts               # detectMode, MODE_LABELS, HELP_ITEMS
│   │   │   ├── render.ts              # renderHelp/renderCommands/renderTags/renderSearchHits/updateSelection
│   │   │   ├── commands.ts            # commandList + runCommand
│   │   │   └── escape.ts              # escapeHtml
│   │   └── styles/search-modal.css    # the `<style is:global>` block lifted out
│   ├── theme-toggle/
│   │   └── ui/ThemeToggle.astro
│   ├── share/
│   │   └── ui/ShareButtons.astro
│   ├── comments/
│   │   └── ui/Comments.astro
│   ├── url-preview/
│   │   └── ui/
│   │       ├── UrlPreview.astro
│   │       └── WikilinkHoverPreview.astro
│   ├── code-with-output/
│   │   └── ui/
│   │       ├── CodeWithOutput.astro
│   │       └── CodeWithOutputLoader.astro
│   ├── mermaid/
│   │   ├── ui/MermaidLoader.astro     # shell only
│   │   ├── lib/
│   │   │   ├── render.ts              # loadMermaid, renderNodes, snapshot
│   │   │   ├── zoom.ts                # pan/zoom + open/close
│   │   │   └── export.ts              # SVG/PNG download
│   │   └── styles/mermaid.css
│   ├── backlinks/
│   │   └── ui/Backlinks.astro
│   ├── dev-edit/
│   │   └── ui/DevEditButton.astro
│   └── reading-progress/
│       └── ui/ReadingProgress.astro
├── widgets/                           # compound page-level UI
│   ├── header/
│   │   ├── Header.astro
│   │   └── MobileNav.astro
│   ├── footer/
│   │   └── Footer.astro
│   ├── post-toc/
│   │   └── PostToc.astro
│   ├── post-article/                  # NEW , extracted from PostLayout
│   │   ├── PostBreadcrumbs.astro
│   │   ├── PostHeader.astro
│   │   ├── PostCover.astro
│   │   ├── PostAdjacent.astro
│   │   ├── PostSeriesNav.astro
│   │   └── styles/post-article.css
│   ├── hero-3d/                       # NEW , split from Hero3D.tsx
│   │   ├── Hero3D.tsx                 # public component (mounts + lifecycle)
│   │   ├── theme.ts                   # readTheme, ThemeColors
│   │   ├── keyboard.ts                # KEYBOARD_ROWS + key meshes builder
│   │   ├── screen.ts                  # canvas2D screen renderer
│   │   ├── words.ts                   # FloatingWord pool + textures
│   │   └── camera.ts                  # pointer-driven orbit, hinge open
│   ├── graph-view/
│   │   ├── Graph.tsx
│   │   ├── Graph3D.tsx
│   │   ├── GraphView.tsx
│   │   └── LocalGraph.astro
│   └── chart-js/
│       └── ChartJs.tsx
├── pages/                             # Astro pages (unchanged routes; only imports updated)
├── layouts/                           # thin shells; heavy logic moved out
│   ├── BaseLayout.astro               # unchanged shape; imports updated
│   └── PostLayout.astro               # ≤300 lines , pulls in widgets/post-article/*
├── content/                           # Astro content collections (UNCHANGED)
├── content.config.ts
├── plugins/                           # Markdown plugins (UNCHANGED)
├── styles/                            # Global CSS (UNCHANGED)
└── dev-only/
    ├── integration.mjs
    ├── shared/                        # NEW , utilities shared across editor/studio/api
    │   ├── api-utils.ts
    │   ├── api-utils.test.ts
    │   ├── git-utils.ts
    │   └── path-utils.ts
    ├── api/                           # NEW , endpoints grouped by surface
    │   ├── content/                   # api-file, api-files, api-file-ops
    │   ├── git/                       # api-git
    │   ├── render/                    # api-render
    │   ├── upload/                    # api-upload
    │   ├── fetch/                     # api-fetch
    │   ├── animations/                # api-animation, api-animations
    │   ├── sources/                   # api-sources
    │   ├── url-preview/               # api-url-preview
    │   └── grep/                      # api-grep
    ├── editor/                        # entrypoint + modules (moves only , see Phase 7)
    ├── studio/                        # entrypoint + modules (moves only , see Phase 7)
    ├── chart-editor/                  # NEW , split of chart-editor.astro
    │   ├── chart-editor.astro         # shell only
    │   ├── lib/state.ts
    │   └── styles/chart-editor.css
    ├── editor.astro                   # shell only (kept; routes inject path)
    └── studio.astro                   # shell only (kept; routes inject path)
```

`@/*` already maps to `src/*` (see [tsconfig.json](file:///Users/koa/004-Projects/0001-Resume/100-github-io/tsconfig.json#L7-L11)).
Every new import inside `src/` MUST use `@/...`; existing relative imports stay
relative within their own slice (e.g. `widgets/post-article/PostHeader.astro`
referring to `./styles/post-article.css`) but cross-slice imports always use
`@/`.

## Phase plan (each phase = one or more atomic commits)

### Phase 0, branch + paperwork

1. `git checkout -b feature/refactor-structures` (current `master`, clean WT).
2. `.sisyphus/plans/refactor-structures.md` (this file) committed first so the
   plan is visible in history.

**Verification**: `git status` clean, `bun astro check` clean, `bun run test`
green.

### Phase 1, shared config split (consts.ts → shared/config/*)

1. Create `src/shared/config/site.ts`, `seo.ts`, `nav.ts`, `pagination.ts`,
   `editor.ts`, `graph.ts`.
2. Create `src/shared/config/index.ts` re-exporting **every public symbol** so
   `import { SITE_TITLE } from '@/shared/config'` works.
3. Replace `src/consts.ts` with a thin re-export shim
   (`export * from '@/shared/config';`) so the 30+ existing relative imports
   (`'../consts'`, `'../../consts'`, `'../../../consts'`) keep compiling.
4. Mass-update those imports in a second commit using ast-grep, so the shim can
   be deleted later. **Do not delete the shim in this PR** to keep blast radius
   small.

**Risk**: 30 files import `../consts`. Path replacement must be exact: every
match should become `'@/shared/config'`. Use ast-grep with explicit `pattern`
per file extension.

**Verification**: `bun astro check`, `bun run test`, `bun run build` produce the
same dist hash on a control file (read `dist/index.html` first 200 bytes
before/after , they should match because no runtime behavior changed).

### Phase 2, lib/ → shared/lib/ subgrouped

1. Move files via `git mv` (preserves history). Target subfolders:
   - `content/`: `content-queries.ts(+test)`, `content-graph.ts`,
     `related.ts`, `taxonomy.ts`, `slug-map.ts`, `reading-time.ts(+test)`,
     `frontmatter.ts`, `notes.ts`.
   - `seo/`: `schema.ts(+test)`, `feed.ts`, `og-image.ts`,
     `sitemap-images.mjs(+test)`, `sitemap-lastmod.mjs(+test)`.
   - `references/`: `bibtex.ts`, `references.ts`.
   - `external/`: `giscus-counts.ts`, `url-preview.ts`,
     `external-profiles.ts`.
   - Top-level: `modulepreload-integration.mjs(+test)`.
2. Update every importer to use `@/shared/lib/<subgroup>/<file>` (this is
   bigger: ~80 importers across `pages/`, `layouts/`, `components/`,
   `dev-only/`, `astro.config.mjs`). Use ast-grep batch replace + verify by
   `bun astro check` after each subgroup.
3. Update `astro.config.mjs` paths for `sitemap-images.mjs`,
   `sitemap-lastmod.mjs`, `modulepreload-integration.mjs`. These are
   `import` statements relative to repo root , change to `./src/shared/lib/...`
   form.
4. Update vitest config if it has `src/lib/**` patterns.

**Risk**: `astro.config.mjs` is loaded by Astro itself at build start. Wrong
path → entire build dies. Verify with `bun run build` after this phase.

**Commit boundaries**: one commit per subgroup (content, seo, references,
external, top-level) so a regression bisects cleanly.

### Phase 3, shared types

1. Create `src/shared/types/`:
   - `graph.ts`: lift `GraphNode`, `GraphLink`, `GraphNodeKind`,
     `GraphLinkKind` out of `Graph.tsx`.
   - `content.ts`: aliases for collection entries (`PostEntry`, `NoteEntry`,
     `WikiEntry`, `SourceEntry`) using `CollectionEntry<'posts'>` etc.
   - `index.ts`: barrel.
2. Re-import in `Graph.tsx`, `Graph3D.tsx`, `GraphView.tsx`, content-graph,
   related, etc.

**Verification**: `bun astro check` clean; `Graph.tsx` line count drops below
300 (was 300 exactly).

### Phase 4, components/ → entities|features|widgets|shared/ui

Mechanical move, no logic edits. One commit per slice for bisectability:

1. **shared/ui** commit: BackToTop, Pagination, ImageLightbox, KatexCopy,
   CodeCopy, TopProgressBar, ReadingProgress (note: ReadingProgress could be
   `features/reading-progress`; decision: keep in shared/ui only if it has no
   business logic. Audit on move; if it does, redirect to
   `features/reading-progress`).
2. **shared/analytics** commit: GoogleAnalytics, GaEvents, ServiceWorkerRegister.
3. **entities** commit: AuthorCard, RelatedPosts (post), NoteCard +
   NoteCardScript (note), ReferencesBlock (source), AnimationBacklinks
   (animation/ui).
4. **widgets** commit: Header, MobileNav, Footer, PostToc, Graph, Graph3D,
   GraphView, LocalGraph, ChartJs, Hero3D (placeholder , split happens in
   Phase 6).
5. **features** commit: SearchButton+SearchModal, ThemeToggle, ShareButtons,
   Comments, UrlPreview, WikilinkHoverPreview, CodeWithOutput+Loader,
   MermaidLoader, Backlinks, DevEditButton.
6. **animation engine** commit: move `src/animations/` →
   `src/entities/animation/engine/`. Rename `engine-render-elements.tsx` →
   `render-elements.tsx`, `engine-phase-styles.*` → `phase-styles.ts`,
   `engine-markers.*` → `markers.ts`. Update imports in `AnimationLoader.astro`,
   `pages/animations/[id].astro`, `dev-only/studio/api.ts` (if any).
7. **Delete `src/components/`** once empty (verify with `ls`).
8. Update `astro.config.mjs` `AutoImport` paths:
   `./src/components/CodeWithOutput.astro` →
   `./src/features/code-with-output/ui/CodeWithOutput.astro`,
   `./src/components/ChartJs.tsx` → `./src/widgets/chart-js/ChartJs.tsx`.

**Verification per commit**: `bun astro check` clean, `bun run test` green,
`bun run build` succeeds.

### Phase 5, split oversized components (target ≤300 lines)

Each split is its own commit. Order chosen by ease of verification (easiest
first so we accumulate confidence before touching the trickier ones).

1. **`Graph.tsx` (300)** , already at threshold. Move types to
   `shared/types/graph.ts` (Phase 3 does this), brings it to ~270 lines. ✓
2. **`AnimationLoader.astro` (535)** , extract React tree into
   `entities/animation/ui/AnimationPlayer.tsx`. The `.astro` file then just
   ships CSS + script that loads the player. Targets: `.astro` ~150,
   `.tsx` ~350 (or further split into Modal sub-component to land below 300).
3. **`MermaidLoader.astro` (462)** , split as planned:
   `features/mermaid/lib/{render,zoom,export}.ts` +
   `features/mermaid/ui/MermaidLoader.astro` (~120 lines) +
   `features/mermaid/styles/mermaid.css`.
4. **`SearchModal.astro` (695)** , split as planned. CSS to
   `features/search/styles/search-modal.css`. Script body into
   `features/search/lib/*.ts` modules (compiled by Vite; loaded via
   `<script>` block). The `.astro` shell stays under 100 lines.
5. **`Hero3D.tsx` (561)** , split as planned into
   `widgets/hero-3d/{Hero3D,theme,keyboard,screen,words,camera}.ts(x)`.
   The exported `Hero3D` component orchestrates; helpers are pure.
6. **`PostLayout.astro` (642)** , extract:
   - `widgets/post-article/PostBreadcrumbs.astro`
   - `widgets/post-article/PostHeader.astro` (h1 + meta + tags + cover)
   - `widgets/post-article/PostCover.astro`
   - `widgets/post-article/PostSeriesNav.astro` (the windowed series block)
   - `widgets/post-article/PostAdjacent.astro` (prev/next)
   - `widgets/post-article/styles/post-article.css` (the `<style is:global>`
     block)
   - Keep frontmatter logic + JSON-LD assembly in `PostLayout.astro`
     (it composes everything; target ~200 lines).
7. **`schema.ts` (490)** , split into `engine/schema/{elements,effects,document,runtime}.ts`.
   Re-export from `engine/schema/index.ts` to preserve `from '@/entities/animation/engine/schema'`
   imports.
8. **`engine-render-elements.tsx` (468)** , split:
   - `render-elements/{rect,circle,line-arrow,text,image,path,polygon,group,code}.tsx`
   - Top-level `render-elements/index.tsx` (or `render-elements.tsx`)
     re-exports `RenderElement` switch.

For **`pages/animations/[...page].astro` (508)** and
**`pages/wiki/[...page].astro` (478)**, extract their filter/sort UI into
`features/animation-filter/` and `features/wiki-toc/` accordingly. These are
page-local UI; one extraction each.

### Phase 6, Astro → tsx where Astro features unused

Audit each `.astro` file for usage of Astro-specific features:

- `getCollection`, `Astro.props`, `Astro.url`, `Astro.glob`, `Astro.site`,
  `<slot />`, `<style is:global>`, `<script is:inline>`, build-time fetches , 
  **keep as Astro**.
- Pure markup + classes, props, no Astro globals , **convert to tsx React
  component**, mount via `client:load` or `client:visible` from a parent
  `.astro`.

Targets identified now (will re-confirm during implementation):

- `KatexCopy.astro` , only attaches an event listener to clipboard. Pure JS in
  a `<script>` tag. Conversion adds no value because there's no JSX/state.
  **DECISION: keep Astro** (Astro feature used: zero-JS shell).
- `BackToTop.astro` , pure markup + small script. **Keep Astro**.
- `Pagination.astro` , uses Astro props but no runtime. **Keep Astro**.
- `embed/*.astro` , pure prop-driven markup, often a single `<iframe>`. Could
  be tsx, but conversion requires `client:idle` and forces React bundling for
  static iframes. **Keep Astro** (no benefit).
- `Backlinks.astro`, `RelatedPosts.astro`, `LocalGraph.astro` , use
  `getCollection` at build time. **Keep Astro**.
- `ChartJs.tsx`, `Graph*.tsx`, `Hero3D.tsx`, `AnimationPlayer.tsx` , already
  tsx. Used as React islands. ✓
- `WikilinkHoverPreview.astro` , script-only Astro shell. Could be tsx but
  conversion would change the hydration model. **Keep Astro**.

**Conclusion**: under the explicit "Astro features required" filter from the
brief, the inventory yields **zero new conversions** that actually meet the
criterion. The win the user asked for is already realized: heavy UI logic
(animations, graphs, Hero3D) is `.tsx`; thin Astro shells handle SSR and
script registration. Document this finding in the phase commit message and
move on.

### Phase 7, dev-only API surface split

**Pure file moves**, no internal rewrites of editor/studio modules (see scope
exclusion above).

1. `git mv` each `api-*.ts` into `dev-only/api/<purpose>/<name>.ts`. Update
   `integration.mjs` `injectRoute` entrypoints to new paths.
2. `api-utils.ts(+test)`, `git-utils.ts`, `path-utils.ts` →
   `dev-only/shared/`.
3. `chart-editor.astro` → `dev-only/chart-editor/chart-editor.astro` with CSS
   block moved to `dev-only/chart-editor/styles/chart-editor.css`. Update
   `integration.mjs`.
4. `editor.css` → `dev-only/editor/styles/editor.css`.
5. `studio.css` → `dev-only/studio/styles/studio.css`.

**No** changes to:
- `dev-only/editor/main.ts` or any of its 25 module siblings.
- `dev-only/studio/main.ts` or any of its 25 module siblings.
- Anything that handles `subscribe()`, `render()`, `innerHTML`, focus.

### Phase 8, performance pass

A focused audit. We only land changes that are demonstrably safe and ship
without behavior regressions:

1. **Lighthouse measurement** of the existing `dist/` (after baseline build)
   for `/`, `/posts/`, `/posts/<slug>/`, `/graph/`. Record numbers in the
   commit message.
2. **Pinpoint regressions** vs prior baseline (if any).
3. **Likely wins** to evaluate (each is its own commit, gated by Lighthouse
   delta):
   - **Defer Hero3D**: only mount on `client:idle` (currently `client:load`
     or similar) , verify after move in Phase 5.
   - **AnimationLoader IO threshold**: currently `rootMargin: '200px 0px'`.
     Consider raising for below-the-fold to skip first-paint cost.
   - **Mermaid eager-load detection**: currently dynamic import on first
     viewport hit , keep as-is, but ensure the `MutationObserver` on
     `<html class>` doesn't trigger reflow on every theme toggle. Audit only.
   - **Pretendard preload**: currently `as="font"` of variable subset 91.
     Check actual hit rate via build output.
   - **manualChunks tuning**: already separates react/three/d3/katex.
     Investigate splitting `chart.js` into its own chunk if used only on
     one page.

Only changes with a measured Lighthouse improvement land. Each change is
its own commit with before/after numbers in the message.

### Phase 9, final cleanup

1. Delete the `src/consts.ts` shim if no importers remain (grep clean).
2. Delete empty `src/components/` directory.
3. Update `README.md` `## 구조` section to reflect new layout.
4. Update `src/dev-only/AGENTS.md` module-map paths if file moves require it.

## Order, dependency, and parallelism

Phases must run **strictly in sequence**: each phase modifies the imports the
next phase reads. No parallel branches.

Within a phase, commits are atomic and bisectable.

## Verification gates (per commit)

1. `bun astro check` , must report 0 errors (warnings/hints unchanged from
   baseline).
2. `bun run test` , all 119 tests must pass.
3. `bun run build` , must complete with exit 0.
4. Manual smoke (only after Phase 5 and Phase 7 commits):
   - `/`, `/posts/`, `/posts/<any slug>/`, `/graph/`, `/animations/`, `/about/`
     load with no console errors.
5. Dev-only smoke (only after Phase 7 commits):
   - Run `bun dev`, open `/_editor`, type into title field 3 chars, no focus
     loss. Open `/_studio`, type into title field 3 chars, no focus loss.

## Rollback strategy

Every commit is bisectable. If `bun run build` breaks mid-PR, `git revert`
the offending commit; do not amend.

For broad blast radius commits (Phase 2 lib moves, Phase 4 components moves),
the commit message includes:

- `Renames:` block listing every `git mv`.
- `Importers updated:` count.
- `Verification: typecheck=PASS tests=119/119 build=PASS`.

## Open questions for the user

None , request is concrete enough to proceed once plan is signed off.

## Estimated commit count

~25 commits total:

- Phase 0: 1 (plan).
- Phase 1: 2 (split + shim + sweep).
- Phase 2: 5 (one per subgroup).
- Phase 3: 1.
- Phase 4: 6 (one per slice + animation engine + cleanup).
- Phase 5: 8 (one per oversized file).
- Phase 6: 1 (audit commit message).
- Phase 7: 2 (api moves + chart-editor split).
- Phase 8: up to 4 (only those that measurably win).
- Phase 9: 1.

## Self-review addendum (post-Momus)

Externally-rooted assumptions verified by `grep` sweeps before kickoff:

- [vitest.config.ts](file:///Users/koa/004-Projects/0001-Resume/100-github-io/vitest.config.ts#L19)
  pins `coverage.include` to `src/lib/**/*.ts` and `src/dev-only/api-utils.ts`.
  Both move in Phase 2 + Phase 7 → vitest config must be updated in the same
  commits that move the files (avoid coverage gaps between commits).
- [scripts/audit-alt-text.mjs](file:///Users/koa/004-Projects/0001-Resume/100-github-io/scripts/audit-alt-text.mjs#L8)
  scans `'src/components'`. After Phase 4 that directory is empty, then
  deleted in Phase 9. Update the script in the **last commit of Phase 4** to
  scan `'src/widgets'`, `'src/features'`, `'src/entities'`, `'src/shared/ui'`,
  `'src/layouts'`.
- [scripts/fetch-url-previews.mjs](file:///Users/koa/004-Projects/0001-Resume/100-github-io/scripts/fetch-url-previews.mjs#L10)
  hard-codes `'src/lib/external-profiles.ts'`. After Phase 2 `external/` move,
  update to `'src/shared/lib/external/external-profiles.ts'`.
- [scripts/build-studio-icons.mjs](file:///Users/koa/004-Projects/0001-Resume/100-github-io/scripts/build-studio-icons.mjs#L7)
  writes `'src/dev-only/studio/icon-data.ts'`. Studio internals are NOT moved
  (per scope exclusion). No update needed.
- `.github/workflows/{codeql,deploy,lighthouse,pr-checks}.yml` , no `src/`
  paths. No update needed.
- `eslint.config.js`, `.prettierrc*` , no `src/` paths. No update needed.

SearchModal `<script is:inline define:vars={{ tagList, commandList }}>` split
caveat: removing `is:inline` lets the bundled `<script>` use `import`. The
`define:vars` injection becomes static imports:

- `tagList` already imports from `@/data/search-tags.json` → continue.
- `commandList` moves to `@/features/search/lib/commands.ts` as a static
  export → import directly. No build-time injection needed.

Phase 6 (tsx migration) audit conclusion confirmed:

- `embed/*.astro` use `<style is:global>`, optional `<script>` blocks, and
  zero-JS SSR by default. Converting to `.tsx` forces `client:*` hydration or
  loses style scoping. **Astro features ARE required.** No conversion.
- All heavy interactive UI (animations, graphs, Hero3D) is already `.tsx`. ✓

Decision: proceed to Phase 0 now.
