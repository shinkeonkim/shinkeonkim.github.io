# Implementation Plan: Local Dev Edit Button

## Overview

Add a floating "Edit" button (FAB) visible only in dev mode on content pages. The button navigates to `/_editor` with `collection` and `slug` query params, and the editor's init logic is extended to parse those params and open the file automatically.

## Tasks

- [ ] 1. Create DevEditButton.astro component
  - [ ] 1.1 Create `src/components/DevEditButton.astro` with Props interface, href construction, and fixed-position styling
    - Define `Props` interface with `collection: string` and `slug: string`
    - Construct `editorUrl` using `encodeURIComponent` for both params
    - Wrap entire output in `{import.meta.env.DEV && (...)}` conditional
    - Render as `<a>` element with `href={editorUrl}`, `class="dev-edit-fab"`, `title` and `aria-label`
    - Add scoped `<style>` for fixed positioning (bottom-right), 3rem diameter, border-radius 50%, min 44px touch target, z-index 9999
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4, 3.1, 6.1, 6.2, 6.3_

- [ ] 2. Integrate DevEditButton into layouts
  - [ ] 2.1 Add DevEditButton to `src/layouts/PostLayout.astro`
    - Import `DevEditButton` from `'../components/DevEditButton.astro'`
    - Add `<DevEditButton collection={collection} slug={slug} />` inside the BaseLayout slot, after the closing `</div>` of `.post-shell`
    - _Requirements: 3.2, 3.3, 5.1, 5.3_

  - [ ] 2.2 Add DevEditButton to `src/layouts/ProjectLayout.astro`
    - Import `DevEditButton` from `'../components/DevEditButton.astro'`
    - Add `<DevEditButton collection="projects" slug={id} />` inside the BaseLayout slot, after the `</article>` element
    - _Requirements: 3.2, 3.3, 5.2, 5.3_

- [ ] 3. Extend editor init to handle URL query params
  - [ ] 3.1 Modify `src/dev-only/editor/main.ts` to parse URL params and open file before session restore
    - In `initEditor()`, replace the existing session-restore IIFE with new logic that first checks `URLSearchParams` for `collection` and `slug`
    - Validate that `collection` is in `COLLECTION_NAMES` array
    - If both params are valid, call `loadFile(collection, slug)` and skip session restore
    - On load failure, call `setStatus` with error message: `파일을 찾을 수 없습니다: ${collection}/${slug}`
    - If params are missing or collection is invalid, fall through to existing session-restore logic unchanged
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 4. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Tests
  - [ ]* 5.1 Write property test for FAB href construction (Property 1)
    - **Property 1: FAB href construction is correct for all valid collection/slug pairs**
    - **Validates: Requirements 3.1, 3.2, 3.3**
    - Create `src/components/__tests__/DevEditButton.test.ts`
    - Use fast-check to generate arbitrary collection names from `['posts', 'wiki', 'notes', 'projects']` and arbitrary slug strings
    - Extract the href construction logic into a pure helper (or inline-test it) and assert the output equals `/_editor?collection=${encodeURIComponent(collection)}&slug=${encodeURIComponent(slug)}`

  - [ ]* 5.2 Write property test for URL param round-trip (Property 2)
    - **Property 2: Editor URL param parsing round-trips the FAB URL**
    - **Validates: Requirements 3.1, 4.1**
    - Create `src/dev-only/editor/__tests__/url-params.test.ts`
    - Use fast-check to generate valid collection/slug pairs
    - Construct the URL the same way the FAB does, then parse it with `URLSearchParams` and assert `collection` and `slug` values match the originals

  - [ ]* 5.3 Write unit tests for editor URL param handling
    - Create test cases in `src/dev-only/editor/__tests__/url-params.test.ts` covering:
      - Valid collection + slug → `loadFile` called with correct args
      - Invalid collection → falls through to session restore
      - Missing slug → falls through to session restore
      - Slug with special chars (slashes, spaces) → decoded correctly
    - _Requirements: 4.1, 4.3, 4.4_

  - [ ]* 5.4 Write unit test verifying production build excludes DevEditButton
    - Verify that when `import.meta.env.DEV` is `false`, the component renders no output
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 6. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The implementation language is TypeScript (Astro components + TS modules), matching the existing codebase
- The `DevEditButton.astro` component is zero-JS — pure HTML/CSS rendered at build time with Astro's compile-time conditional
- Property tests use `fast-check` (already in devDependencies) and `vitest` (already configured)
- The editor's `setCurrent()` already handles tree selection/highlighting, so no additional tree integration code is needed
- `COLLECTION_NAMES` constant from `state.ts` is reused for URL param validation

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "3.1"] },
    { "id": 2, "tasks": ["5.1", "5.2", "5.3", "5.4"] }
  ]
}
```
